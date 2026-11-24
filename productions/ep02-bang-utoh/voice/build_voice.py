"""Susun timeline EP02 Master Cut v5.0 -> voice/voice.wav + words.json + timeline.json + rms.json.

Sumber per baris (lines.json), semuanya REKAMAN FINAL (tidak ada placeholder lagi):
- Bang Utoh: `voice/utoh_0N.*`   (kolom `real`)
- Bu Siti  : `voice/buSiti_0N.*` (kolom `clip`)
- Rara     : `voice/rara_0N.*`   (kolom `clip`)
- Oyen     : `assets/voices/oyen.wav` (kolom `audio`)
Semua klip dipakai pada kecepatan natural 1.0x. Tidak ada atempo.

Langkah:
1. Trim longgar (napas/tawa di awal & akhir tetap utuh), samakan level bicara antar pembicara.
2. Align per kata (faster-whisper + snap ke jeda RMS).
3. Momen non-verbal (`nonverbal` di lines.json: napas, tawa, hirupan, jeda) diberi timestamp dari RMS:
   celah antara dua kata dicari bagian bersuaranya. Bila Whisper "menelan" napas ke dalam kata tetangga
   (kata terlalu panjang), kata itu dipotong di lembah energinya.
4. Layout: kata pertama baris mulai `gap` detik setelah kata terakhir baris sebelumnya, tetapi suara
   (termasuk napas) tidak pernah menimpa ekor suara baris sebelumnya.
5. rms.json: amplitudo per frame (30 fps) per pembicara, 0..1, untuk lip-sync RMS-gated.

Pakai (dari root repo):
  .venv-vo/Scripts/python.exe productions/ep02-bang-utoh/voice/build_voice.py
"""
from __future__ import annotations

import json
import math
import re
import subprocess
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from ep02_voice_lib import (  # noqa: E402
    FPS,
    HOP,
    ROOT,
    analyze_clip,
    canon,
    loudness_stats,
    prepare_clip,
    read_mono,
    rms_db,
    transcribe,
    write_mono,
)

sys.path.insert(0, str(ROOT / "pipeline" / "voice"))
from align_words import load_whisper_model  # noqa: E402

SR = 48000
REAL_EXTS = (".wav", ".m4a", ".mp3", ".aac", ".ogg", ".flac", ".opus")
WORK = ROOT / "out" / "ep02-bang-utoh" / "voice_clips"
MIN_GAP = 0.12        # jeda minimum antar-kata baris (dtk)
AUDIBLE_GAP = 0.08    # jeda minimum antara ekor suara baris sebelumnya dan awal suara baris berikutnya
END_MARGIN = 0.3      # suara terakhir selesai minimal 0,3 dtk sebelum cut loop
TRIM_HEAD = 0.12      # trim longgar: napas awal tetap utuh
TRIM_TAIL = 0.30      # trim longgar: helaan napas akhir tetap utuh
NV_MIN = 0.10         # durasi minimum momen non-verbal bersuara (dtk)


def find_real(stem: str) -> Path | None:
    for ext in REAL_EXTS:
        p = HERE / f"{stem}{ext}"
        if p.exists():
            return p
    return None


def lufs(path: Path) -> float | None:
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-af", "ebur128", "-f", "null", "-"],
                       capture_output=True, text=True)
    m = re.findall(r"^\s+I:\s+(-?[\d.]+) LUFS", r.stderr, re.M)
    return float(m[-1]) if m else None


def audible_span(x: np.ndarray, sr: int) -> tuple[float, float, float]:
    """Onset/offset suara termasuk napas: ambang relatif ke noise floor, bukan ke puncak."""
    db = rms_db(x, sr)
    floor = float(np.percentile(db, 5))
    thr = max(floor + 10.0, float(db.max()) - 50.0)
    idx = np.where(db > thr)[0]
    if len(idx) == 0:
        return 0.0, len(x) / sr, thr
    return idx[0] * HOP, (idx[-1] + 1) * HOP, thr


def _find_word(words: list[dict], key: str) -> int:
    """`key` = kata naskah; `kata#2` = kemunculan kedua."""
    word, _, nth = key.partition("#")
    k, want = canon(word), int(nth or 1)
    seen = 0
    for i, w in enumerate(words):
        if canon(w["text"]) == k:
            seen += 1
            if seen == want:
                return i
    raise SystemExit(f"[ep02:build] kata penanda non-verbal '{key}' tidak ada di baris")


def _expected_word_dur(text: str) -> float:
    return 0.10 + 0.085 * len(canon(text))


LAUGH_RE = re.compile(r"^(h+[aeiou]+)+h*$|^(w+k+)+$")
BREATHY_ZCR = 0.07    # rasio zero-crossing per sampel: napas/hirupan/desis jauh lebih "berdesis" dari vokal
RUN_MERGE = 0.20      # gabungkan potongan napas yang berjarak <= 0,2 dtk (tarik + hembus)


def _zcr(x: np.ndarray, sr: int) -> np.ndarray:
    """Zero-crossing rate per hop 10 ms (jendela 30 ms)."""
    hop = int(sr * HOP)
    n = max(1, len(x) // hop)
    s = np.sign(x)
    s[s == 0] = 1
    zc = np.abs(np.diff(s)) / 2
    out = np.zeros(n, dtype=np.float32)
    for i in range(n):
        a, b = max(0, (i - 1) * hop), min(len(zc), (i + 2) * hop)
        out[i] = float(zc[a:b].mean()) if b > a else 0.0
    return out


def _runs(mask: np.ndarray, i0: int, merge: float, min_len: float) -> list[tuple[float, float]]:
    runs: list[list[int]] = []
    for i in np.where(mask)[0]:
        if runs and i - runs[-1][1] <= int(merge / HOP):
            runs[-1][1] = i
        else:
            runs.append([i, i])
    return [((i0 + a) * HOP, (i0 + b + 1) * HOP) for a, b in runs if (b - a + 1) * HOP >= min_len]


def _speech_edge(db: np.ndarray, w: dict, side: str, drop: float = 20.0) -> float:
    """Tepi inti bicara sebuah kata: frame pertama/terakhir yang masih dalam `drop` dB dari puncak kata."""
    i0, i1 = int(w["start"] / HOP), max(int(w["start"] / HOP) + 1, int(math.ceil(w["end"] / HOP)))
    seg = db[i0:i1]
    if len(seg) == 0:
        return w["start"] if side == "start" else w["end"]
    idx = np.where(seg > float(seg.max()) - drop)[0]
    return (i0 + idx[0]) * HOP if side == "start" else (i0 + idx[-1] + 1) * HOP


def _push_words(words: list[dict], wi: int, new_start: float) -> None:
    """Geser awal kata wi ke `new_start` dan dorong kata-kata sesudahnya bila jadi tumpang tindih."""
    t = new_start
    for j in range(wi, len(words)):
        w = words[j]
        if w["start"] >= t:
            break
        exp = _expected_word_dur(w["text"])
        w["start"] = round(t, 3)
        w["end"] = round(max(w["end"], t + max(0.06, 0.5 * exp)), 3)
        w["nonverbalShift"] = True
        t = w["end"]


def _smooth(db: np.ndarray, n: int = 5) -> np.ndarray:
    k = np.ones(n) / n
    return np.convolve(db, k, mode="same")


def _sustained_onset(db: np.ndarray, zcr: np.ndarray, t_from: float, t_to: float) -> float | None:
    """Awal bicara pertama yang berkelanjutan (>= 150 ms, energi dekat puncak, tidak berdesis) setelah t_from,
    dimundurkan ke lembah energi tepat sebelumnya. Membedakan kata dari napas/kekeh/desah di depannya."""
    sm = _smooth(db)
    i0, i1 = int(t_from / HOP), min(len(sm), int(math.ceil(t_to / HOP)))
    if i1 - i0 < 15:
        return None
    ref = float(sm[i0:i1].max())
    for i in range(i0, i1 - 15):
        if sm[i] > ref - 14 and float(sm[i:i + 15].mean()) > ref - 10 and float(zcr[i:i + 15].mean()) < 0.045:
            j0 = max(i0, i - 30)
            jm = j0 + int(np.argmin(sm[j0:i + 1]))
            return (jm + 1) * HOP if sm[i] - sm[jm] >= 6 else i * HOP
    return None


def nonverbal_events(ln: dict, words: list[dict], x: np.ndarray, sr: int, blind: list[dict]) -> list[dict]:
    """Timestamp relatif-klip untuk tiap penanda non-verbal di lines.json, dan rapikan kata tetangga.

    Whisper sering "menelan" napas/hirupan/tawa ke kata di sebelahnya. Petunjuk yang dipakai:
    - token tawa Whisper tanpa prompt (haha/hehe),
    - potongan berdesis (zero-crossing tinggi, di atas noise floor) = napas, hirupan, desahan, kekeh,
    - untuk penanda di depan kata: awal bicara berkelanjutan pertama (kata sebenarnya) setelah napas,
    - untuk penanda di belakang kata: potongan yang didahului hening (bukan ekor kata itu sendiri).
    Kata tetangga dipotong ke inti bicaranya supaya mulut tidak "bicara" saat tokoh bernapas atau tertawa.
    """
    marks = ln.get("nonverbal", [])
    if not marks:
        return []
    db = rms_db(x, sr)
    sm = _smooth(db)
    zcr = _zcr(x, sr)
    on, off, thr = audible_span(x, sr)
    floor = float(np.percentile(db, 5))
    peak = float(np.percentile(db[db > thr], 95)) if np.any(db > thr) else float(db.max())
    breathy = (zcr > BREATHY_ZCR) & (db > floor + 25.0)
    audible = db > thr + 4.0
    laughs = [w for w in blind if LAUGH_RE.match(canon(w["text"]) or "-")]

    def silent_before(t: float) -> bool:
        i0, i1 = max(0, int((t - 0.15) / HOP)), max(1, int(t / HOP))
        return float(sm[i0:i1].min()) < peak - 30 if i1 > i0 else True

    out = []
    for m in marks:
        if "before" in m:
            ni = _find_word(words, m["before"])
            pi = ni - 1
        else:
            pi = _find_word(words, m["after"])
            ni = pi + 1
        prev = words[pi] if pi >= 0 else None
        nxt = words[ni] if ni < len(words) else None
        lo = prev["start"] + 0.6 * _expected_word_dur(prev["text"]) if prev else max(0.0, on - 0.05)
        hi = (max(nxt["end"], lo + 0.5) + 0.8) if nxt else off
        span: tuple[float, float] | None = None
        how = "gap"
        if m["kind"] != "pause":
            i0, i1 = int(lo / HOP), int(math.ceil(hi / HOP))
            tok = [(w["start"], w["end"]) for w in laughs if w["end"] > lo and w["start"] < hi]                 if m["kind"] in ("laugh", "chuckle") else []
            runs = _runs(breathy[i0:i1], i0, 0.08, 0.10)
            if "before" in m:
                onset = _sustained_onset(db, zcr, lo, hi) if nxt else None
                limit = onset if onset is not None else (nxt["start"] if nxt else off)
                cands = [c for c in tok + runs if c[0] < limit - 0.05]
                if cands or (onset is not None and onset > (nxt["start"] if nxt else 0) + 0.1):
                    s = min([c[0] for c in cands] + ([limit] if not cands else []))
                    if prev is None and not cands:
                        s = on
                    e = limit if onset is not None else max(c[1] for c in cands)
                    if e - s >= NV_MIN:
                        span, how = (s, e), ("asr-laugh" if tok else "breathy" if runs else "onset")
            else:
                # napas/hirupan/desah harus didahului hening; kekeh/tawa boleh menempel di ujung kata
                attached_ok = m["kind"] in ("laugh", "chuckle")
                cands = tok + [c for c in runs if attached_ok or silent_before(c[0])]
                if cands:
                    boundary = ((prev["end"] if prev else on) + (nxt["start"] if nxt else off)) / 2
                    best = min(cands, key=lambda c: 0.0 if c[0] <= boundary <= c[1]
                               else min(abs(c[0] - boundary), abs(c[1] - boundary)))
                    s, e = best
                    for c in sorted(cands):
                        if c[0] >= s and c[0] <= e + RUN_MERGE:
                            e = max(e, c[1])
                    span, how = (s, e), ("asr-laugh" if best in tok else "breathy")
                # tawa bersuara (bukan desis) sering tidak terdeteksi: kata berikutnya baru mulai di awal
                # bicara berkelanjutan setelah tawa. Token tawa Whisper tidak selalu muncul (fallback suhu acak).
                if attached_ok and nxt is not None and prev is not None:
                    onset = _sustained_onset(db, zcr, prev["end"], hi)
                    if onset is not None and onset > nxt["start"] + 0.1:
                        s0 = span[0] if span else _speech_edge(db, prev, "end")
                        span, how = (s0, max(span[1] if span else 0.0, onset)), (how if span else "onset")
        if prev is not None and span:
            prev["end"] = round(max(prev["start"] + 0.06, min(prev["end"], span[0])), 3)
        if prev is not None and (span or not nxt) and "after" in m:
            prev["end"] = round(max(prev["start"] + 0.06, min(prev["end"], _speech_edge(db, prev, "end"))), 3)
        if nxt is not None and span:
            _push_words(words, ni, span[1])
            if "after" in m:
                nxt["start"] = round(min(nxt["end"] - 0.06, max(nxt["start"], _speech_edge(db, nxt, "start"))), 3)
        if span is None:
            a = prev["end"] if prev else on
            b = nxt["start"] if nxt else off
            part = None
            if m["kind"] != "pause" and b > a:
                i0, i1 = int(a / HOP), int(math.ceil(b / HOP))
                r = _runs(audible[i0:i1], i0, 0.05, NV_MIN)
                part = (r[0][0], r[-1][1]) if r else None
            span, how = (part, "audible") if part else ((a, b), "silence")
        s, e = span
        out.append({"kind": m["kind"], "label": m.get("label", m["kind"]), "start": round(s, 3),
                    "end": round(max(e, s + 0.04), 3), "voiced": how != "silence", "detect": how})
    return out


def frame_rms(x: np.ndarray, sr: int, n_frames: int) -> np.ndarray:
    hop = sr // FPS
    y = np.zeros(n_frames, dtype=np.float32)
    for f in range(n_frames):
        seg = x[f * hop:(f + 1) * hop]
        if len(seg):
            y[f] = float(np.sqrt(np.mean(seg ** 2)))
    return y


def layout(items: list[dict]) -> list[float]:
    """Awal klip tiap baris (jeda ideal = jangkar / gap antar kata, tanpa menimpa suara baris sebelumnya)."""
    starts: list[float] = []
    prev_word_end = 0.0
    prev_audible_end = 0.0
    for it in items:
        first = it["rel"][0]["start"]
        if not starts:
            t0 = max(it["anchor"] or 0.0, 0.0)
        else:
            t0 = max(it["anchor"] or 0.0, prev_word_end + it["gap"] - first,
                     prev_audible_end + AUDIBLE_GAP - it["on"])
        t0 = round(t0, 3)
        starts.append(t0)
        prev_word_end = t0 + it["rel"][-1]["end"]
        prev_audible_end = t0 + it["off"]
    return starts


def main() -> None:
    spec = json.loads((HERE / "lines.json").read_text(encoding="utf-8"))
    total_sec = spec["totalFrames"] / FPS
    loop_cut = spec["loopCutFrame"] / FPS
    script_beats = {b["beat"]: b for b in spec["scriptBeats"]}

    WORK.mkdir(parents=True, exist_ok=True)
    wmodel = load_whisper_model("small")

    # ---- fase 1: siapkan + analisis setiap klip
    items: list[dict] = []
    for ln in spec["lines"]:
        sp = ln["speaker"]
        if sp == "oyen":
            src, source = ROOT / ln["audio"], "rekaman kucing asli (assets/voices/oyen.wav)"
        else:
            stem = ln["real"] if sp == "bangUtoh" else ln["clip"]
            src = find_real(stem)
            if src is None:
                raise SystemExit(f"[ep02:build] Rekaman final {ln['id']} tidak ada: voice/{stem}.(wav|mp3|...)")
            source = f"REKAMAN FINAL voice/{src.name}"
        if not src.exists():
            raise SystemExit(f"[ep02:build] Sumber {ln['id']} tidak ada: {src}")

        clip = WORK / f"{ln['id']}.wav"
        prep = prepare_clip(src, clip, head=TRIM_HEAD, tail=TRIM_TAIL, level=True)
        x, _ = read_mono(clip)
        on, off, _ = audible_span(x, SR)

        issues: list[str] = []
        if sp == "oyen":
            st = loudness_stats(x, SR)
            rel = [{"text": ln["text"], "start": st["onset"], "end": st["offset"]}]
            check = {"score": None, "recall": None, "heard": "(kucing, tidak di-ASR; batas dari RMS)"}
        else:
            a = analyze_clip(wmodel, clip, ln["text"])
            rel = a["words"]
            check = {k: a[k] for k in ("score", "recall", "heard", "passDeltaMaxFrames", "passDeltaMedianFrames",
                                       "interpolatedWords", "pauses", "chosenPass", "valleyRefined")}
            if a["score"] < 0.85:
                issues.append(f"transkripsi kurang cocok naskah (skor {a['score']}): {a['heard']!r}")
        nv = []
        if ln.get("nonverbal"):
            blind = transcribe(wmodel, clip, None) if any(m["kind"] in ("laugh", "chuckle") for m in ln["nonverbal"]) else []
            nv = nonverbal_events(ln, rel, x, SR, blind)
        gap = float(ln.get("gap", 0.25))
        items.append({"ln": ln, "x": x, "rel": rel, "check": check, "issues": issues, "source": source,
                      "anchor": ln.get("start"), "gap": gap, "on": on, "off": off, "nv": nv,
                      "srcDur": prep["srcDur"], "lufs": lufs(clip)})

    # ---- fase 2: layout alami (tidak ada kompresi: klip final tidak boleh dipercepat)
    starts = layout(items)
    audible_end = starts[-1] + items[-1]["off"]
    limit = loop_cut - END_MARGIN
    if audible_end > limit:
        print(f"[ep02:build] !!! suara terakhir selesai {audible_end:.2f}s, melewati batas {limit:.2f}s "
              f"(cut loop f{spec['loopCutFrame']}). Naikkan totalFrames/loopCutFrame di lines.json "
              f"(minimal loopCutFrame = {math.ceil((audible_end + END_MARGIN) * FPS)}).")

    # ---- fase 2b: jendela beat dari layout (batas = awal suara baris pertama beat - lead)
    spans = [(it["ln"]["beat"], t0 + min(it["on"], it["rel"][0]["start"]), t0 + max(it["off"], it["rel"][-1]["end"]))
             for t0, it in zip(starts, items)]
    beat_ids = sorted(script_beats)
    first = {b: min(s0 for bb, s0, _ in spans if bb == b) for b in beat_ids}
    lastw = {b: max(s1 for bb, _, s1 in spans if bb == b) for b in beat_ids}
    bounds = {beat_ids[0]: 0}
    for prev, b in zip(beat_ids, beat_ids[1:]):
        lo = lastw[prev] + 0.1
        hi = first[b] - 0.05
        pref = first[b] - float(script_beats[b].get("lead", 0.3))
        t = min(max(pref, lo), hi) if lo <= hi else (lastw[prev] + first[b]) / 2
        f = round(t * FPS)
        f = max(f, math.ceil(lastw[prev] * FPS))
        f = min(f, math.floor(first[b] * FPS))
        bounds[b] = f
    new_beats = []
    for i, b in enumerate(beat_ids):
        f0 = bounds[b]
        f1 = bounds[beat_ids[i + 1]] if i + 1 < len(beat_ids) else spec["loopCutFrame"]
        sb = script_beats[b]
        new_beats.append({"beat": b, "name": sb["name"], "from": f0, "to": f1,
                          "fromSec": round(f0 / FPS, 3), "toSec": round(f1 / FPS, 3)})
    beats = {b["beat"]: b for b in new_beats}

    # ---- fase 3: tempatkan, cek, tulis
    need_sec = max(t0 + len(it["x"]) / SR for t0, it in zip(starts, items))
    n_samples = int(round(max(total_sec, need_sec + 0.3) * SR))
    master = np.zeros(n_samples, dtype=np.float32)
    per_speaker: dict[str, np.ndarray] = {}
    all_words: list[dict] = []
    all_nv: list[dict] = []
    rows: list[dict] = []
    for t0, it in zip(starts, items):
        ln, x, rel, sp = it["ln"], it["x"], it["rel"], it["ln"]["speaker"]
        a0 = int(round(t0 * SR))
        master[a0:a0 + len(x)] += x
        per_speaker.setdefault(sp, np.zeros(n_samples, dtype=np.float32))[a0:a0 + len(x)] += x
        words = [{"text": w["text"], "start": round(t0 + w["start"], 3), "end": round(t0 + w["end"], 3), "speaker": sp}
                 for w in rel]
        all_words.extend(words)
        nv = [{**e, "line": ln["id"], "speaker": sp, "start": round(t0 + e["start"], 3), "end": round(t0 + e["end"], 3),
               "startFrame": int(math.floor((t0 + e["start"]) * FPS)), "endFrame": int(math.ceil((t0 + e["end"]) * FPS))}
              for e in it["nv"]]
        all_nv.extend(nv)
        b = beats[ln["beat"]]
        s0, s1 = words[0]["start"], words[-1]["end"]
        aud0, aud1 = round(t0 + it["on"], 3), round(t0 + it["off"], 3)
        issues = it["issues"]
        if aud0 * FPS < b["from"] - 1e-6 or aud1 * FPS > b["to"] + 1e-6:
            issues.append(f"suara f{aud0*FPS:.1f}-f{aud1*FPS:.1f} di luar jendela beat f{b['from']}-f{b['to']}")
        if aud1 > loop_cut:
            issues.append(f"melewati cut loop f{spec['loopCutFrame']}")
        rows.append({
            "id": ln["id"], "beat": ln["beat"], "speaker": sp, "text": ln["text"],
            "performance": ln.get("performance"),
            "start": s0, "end": s1,
            "startFrame": int(math.floor(s0 * FPS)), "endFrame": int(math.ceil(s1 * FPS)),
            "audibleStart": aud0, "audibleEnd": aud1,
            "audibleStartFrame": int(math.floor(aud0 * FPS)), "audibleEndFrame": int(math.ceil(aud1 * FPS)),
            "clipStart": t0, "clipEnd": round(t0 + len(x) / SR, 3), "clipDur": round(len(x) / SR, 3),
            "srcDur": it["srcDur"], "lufs": it["lufs"],
            "beatWindow": [round(b["from"] / FPS, 3), round(b["to"] / FPS, 3)],
            "cue": ln.get("cue"), "gapIdeal": it["gap"],
            "source": it["source"], "placeholder": False,
            "nonverbal": nv,
            "check": it["check"], "issues": issues,
        })
    for r, nxt in zip(rows, rows[1:]):
        r["gapAfter"] = round(nxt["start"] - r["end"], 3)
        if r["gapAfter"] < MIN_GAP:
            r["issues"].append(f"jeda ke {nxt['id']} hanya {r['gapAfter']:.2f}s")

    peak = float(np.abs(master).max())
    gain = 0.98 / peak if peak > 0.98 else 1.0
    master *= gain
    write_mono(HERE / "voice.wav", master, SR)
    all_words.sort(key=lambda w: w["start"])
    (HERE / "words.json").write_text(json.dumps(all_words, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    # ---- rms.json: amplitudo per frame per pembicara, dinormalisasi ke persentil 95 bagian bersuara
    n_frames = max(spec["totalFrames"], int(math.ceil(n_samples / SR * FPS)))
    rms_out = {"_doc": "Dihasilkan build_voice.py. Amplitudo RMS per frame (30 fps), 0..1 per pembicara "
                       "(1 = persentil 95 saat bicara). Untuk lip-sync RMS-gated & micro-life.",
               "fps": FPS, "frames": n_frames, "speakers": {}}
    for sp, xs in per_speaker.items():
        env = frame_rms(xs * gain, SR, n_frames)
        voiced = env[env > 1e-3]
        ref = float(np.percentile(voiced, 95)) if len(voiced) else 1.0
        rms_out["speakers"][sp] = [round(float(min(1.0, v / ref)), 3) for v in env]
    (HERE / "rms.json").write_text(json.dumps(rms_out, separators=(",", ":")) + "\n", encoding="utf-8")

    out = {
        "_doc": "Dihasilkan build_voice.py. JANGAN edit tangan; ubah lines.json lalu build ulang.",
        "fps": FPS, "totalFrames": spec["totalFrames"], "totalSec": total_sec, "loopCutFrame": spec["loopCutFrame"],
        "voiceWavSec": round(n_samples / SR, 3),
        "lastAudibleEnd": round(audible_end, 3),
        "placeholderLines": [],
        "beats": new_beats,
        "nonverbal": sorted(all_nv, key=lambda e: e["start"]),
        "lines": rows,
    }
    (HERE / "timeline.json").write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"[ep02:build] voice.wav {n_samples / SR:.2f}s | suara terakhir {audible_end:.2f}s | {len(all_words)} kata | "
          f"{len(all_nv)} momen non-verbal | placeholder: 0")
    for b in new_beats:
        print(f"  B{b['beat']} f{b['from']}-f{b['to']} ({b['fromSec']:.2f}-{b['toSec']:.2f}s) {b['name']}")
    for r in rows:
        print(f"  B{r['beat']} {r['id']:3s} {r['speaker']:9s} suara {r['audibleStart']:6.2f}-{r['audibleEnd']:6.2f}s "
              f"kata {r['start']:6.2f}-{r['end']:6.2f}s jeda->{r.get('gapAfter', '-')} skor={r['check'].get('score')} "
              f"LUFS={r['lufs']}")
        for e in r["nonverbal"]:
            print(f"      ~ {e['label']:28s} {e['start']:6.2f}-{e['end']:6.2f}s f{e['startFrame']}-f{e['endFrame']}"
                  f" [{e['detect']}]")
        for i in r["issues"]:
            print(f"      ! {i}")


if __name__ == "__main__":
    main()
