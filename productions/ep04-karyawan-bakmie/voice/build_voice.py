"""Susun timeline master EP04 -> voice.wav + words.json + timeline.json + rms.json.

Pakai:
  node pipeline/py.mjs productions/ep04-karyawan-bakmie/voice/build_voice.py
  .venv-vo/Scripts/python.exe productions/ep04-karyawan-bakmie/voice/build_voice.py
"""
from __future__ import annotations

import difflib
import json
import math
import re
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
sys.path.insert(0, str(ROOT / "pipeline" / "voice"))
from align_words import load_whisper_model  # noqa: E402
from voice_utils import STUDIO_SR, normalize_wav  # noqa: E402

SR = STUDIO_SR
FPS = 30
HOP = 0.01
TRIM_HEAD = 0.04
TRIM_TAIL = 0.08
AUDIBLE_GAP = 0.06
WORK = ROOT / "out" / "ep04-karyawan-bakmie" / "voice_clips"

ALIASES = {
    "gua": "gue", "gw": "gue", "lu": "lo", "loe": "lo", "lho": "lho", "lo": "lo",
    "kyusi": "qc", "kusi": "qc", "qc": "qc", "rikues": "request", "request": "request",
    "risors": "resource", "resource": "resource", "multitreding": "multithreading",
    "multithreading": "multithreading", "diploy": "deploy", "deploy": "deploy",
    "bakmi": "bakmie", "bakmie": "bakmie", "mi": "mie", "mie": "mie", "nggi": "nggih",
    "nggih": "nggih", "cepet": "cepet", "cepat": "cepet", "siji": "siji", "vip": "vip",
    "training": "training", "duapuluh": "duapuluh", "dua": "dua", "puluh": "puluh",
    "sembilan": "sembilan", "ribu": "ribu", "shift": "shift", "sif": "shift", "it": "it",
}


def canon(tok: str) -> str:
    t = re.sub(r"[^0-9a-zA-Z]", "", tok.lower())
    return ALIASES.get(t, t)


def tokens(text: str) -> list[str]:
    return [t for t in text.replace("...", " ").replace("…", " ").replace("—", " ").split() if canon(t)]


def read_mono(path: Path) -> tuple[np.ndarray, int]:
    with wave.open(str(path), "rb") as w:
        sr = w.getframerate()
        ch = w.getnchannels()
        raw = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0
    return raw.reshape(-1, ch).mean(axis=1), sr


def write_mono(path: Path, x: np.ndarray, sr: int = SR) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    pcm = (np.clip(x, -1.0, 1.0) * 32767.0).astype(np.int16)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(pcm.tobytes())


def rms_db(x: np.ndarray, sr: int) -> np.ndarray:
    hop = int(sr * HOP)
    n = max(1, len(x) // hop)
    fr = x[: n * hop].reshape(n, hop)
    return 20.0 * np.log10(np.sqrt((fr ** 2).mean(axis=1)) + 1e-9)


def voiced_span(x: np.ndarray, sr: int) -> tuple[float, float, float]:
    db = rms_db(x, sr)
    thr = max(-44.0, float(db.max()) - 29.0)
    idx = np.where(db > thr)[0]
    if len(idx) == 0:
        return 0.0, len(x) / sr, thr
    return idx[0] * HOP, (idx[-1] + 1) * HOP, thr


def level_match(x: np.ndarray, sr: int, target_rms_db: float = -20.0, peak_ceiling_db: float = -1.5) -> np.ndarray:
    db = rms_db(x, sr)
    _, _, thr = voiced_span(x, sr)
    voiced = db[db > thr]
    v_rms = float(10.0 * np.log10(np.mean(10.0 ** (voiced / 10.0)) + 1e-12)) if len(voiced) else -20.0
    pk = float(20.0 * np.log10(np.abs(x).max() + 1e-9))
    gain = min(target_rms_db - v_rms, peak_ceiling_db - pk)
    return x * (10.0 ** (gain / 20.0))


def map_to_script(script_text: str, wwords: list[dict], onset: float, offset: float) -> list[dict]:
    stoks = tokens(script_text)
    if not wwords:
        dur = max(0.2, offset - onset) / max(1, len(stoks))
        return [{"text": t, "start": round(onset + i * dur, 3), "end": round(onset + (i + 1) * dur, 3)} for i, t in enumerate(stoks)]
    wchars: list[str] = []
    wtimes: list[tuple[float, float]] = []
    for w in wwords:
        c = "".join(canon(t) for t in w["text"].split())
        if not c:
            continue
        d = max(0.02, w["end"] - w["start"]) / len(c)
        for i, ch in enumerate(c):
            wchars.append(ch)
            wtimes.append((w["start"] + i * d, w["start"] + (i + 1) * d))
    schars: list[str] = []
    sowner: list[int] = []
    for ti, t in enumerate(stoks):
        for ch in canon(t):
            schars.append(ch)
            sowner.append(ti)
    sm = difflib.SequenceMatcher(None, schars, wchars, autojunk=False)
    tok_times: list[list[float]] = [[] for _ in stoks]
    for a, b, n in sm.get_matching_blocks():
        for k in range(n):
            tok_times[sowner[a + k]].extend(wtimes[b + k])
    res: list[dict | None] = [
        {"text": t, "start": min(tt), "end": max(tt)} if tt else None
        for t, tt in zip(stoks, tok_times)
    ]
    for i, r in enumerate(res):
        if r is None:
            prev_end = next((res[j]["end"] for j in range(i - 1, -1, -1) if res[j]), onset)
            nxt_start = next((res[j]["start"] for j in range(i + 1, len(res)) if res[j]), offset)
            res[i] = {"text": stoks[i], "start": prev_end, "end": max(prev_end + 0.07, nxt_start)}
    out = []
    last = onset
    for r in res:
        s = max(r["start"], last)
        e = max(r["end"], s + 0.06)
        out.append({"text": r["text"], "start": round(s, 3), "end": round(min(offset, e), 3)})
        last = out[-1]["end"]
    if out:
        out[0]["start"] = round(min(out[0]["start"], onset + 0.06), 3)
        out[-1]["end"] = round(max(out[-1]["end"], offset - 0.04), 3)
    return out


def frame_rms(x: np.ndarray, sr: int, n_frames: int) -> np.ndarray:
    hop = sr // FPS
    y = np.zeros(n_frames, dtype=np.float32)
    for f in range(n_frames):
        seg = x[f * hop : (f + 1) * hop]
        if len(seg):
            y[f] = float(np.sqrt(np.mean(seg ** 2)))
    return y


def main() -> None:
    spec = json.loads((HERE / "lines.json").read_text(encoding="utf-8"))
    WORK.mkdir(parents=True, exist_ok=True)
    wmodel = load_whisper_model("small")

    tts_tempo = float(spec.get("ttsTempo", 1.0))
    items = []
    for ln in [x for x in spec["lines"] if not x.get("skip")]:
        sp = ln["speaker"]
        src = (ROOT / ln["audio"]) if sp == "oyen" else (HERE / ln["file"])
        if not src.exists():
            raise SystemExit(f"Sumber tidak ditemukan: {src}")
        clip = WORK / f"{ln['id']}.wav"
        tmp = clip.with_suffix(".tmp.wav")
        if sp != "oyen" and abs(tts_tempo - 1.0) > 1e-3:
            subprocess.run(
                ["ffmpeg", "-y", "-v", "error", "-i", str(src), "-af", f"atempo={tts_tempo:.3f}", "-ar", str(SR), "-ac", "1", "-c:a", "pcm_s16le", str(tmp)],
                check=True,
            )
        else:
            normalize_wav(src, tmp)
        x, sr = read_mono(tmp)
        tmp.unlink(missing_ok=True)
        tr = ln.get("trim")
        if isinstance(tr, list) and len(tr) == 2:
            x = x[int(tr[0] * sr) : int(tr[1] * sr)].copy()
        on, off, _ = voiced_span(x, sr)
        a = max(0, int((on - TRIM_HEAD) * sr))
        b = min(len(x), int((off + TRIM_TAIL) * sr))
        y = x[a:b].copy()
        f = int(0.005 * sr)
        if len(y) > 2 * f:
            y[:f] *= np.linspace(0, 1, f)
            y[-f:] *= np.linspace(1, 0, f)
        y = level_match(y, sr)
        if abs(float(ln.get("gainDb", 0.0))) > 1e-6:
            y = np.clip(y * (10.0 ** (float(ln["gainDb"]) / 20.0)), -0.98, 0.98)
        write_mono(clip, y, sr)
        on2, off2, _ = voiced_span(y, sr)
        if sp == "oyen":
            rel = [{"text": ln["text"], "start": round(on2, 3), "end": round(off2, 3)}]
        else:
            segs, _ = wmodel.transcribe(
                str(clip), language="id", word_timestamps=True, vad_filter=False,
                initial_prompt=ln["text"], beam_size=5, condition_on_previous_text=False, temperature=0.0,
            )
            ww = [{"text": w.word.strip(), "start": float(w.start), "end": float(w.end)} for s in segs for w in (s.words or []) if w.word.strip()]
            rel = map_to_script(ln["text"], ww, on2, off2)
        items.append({"ln": ln, "x": y, "rel": rel, "on": on2, "off": off2, "gap": float(ln.get("gap", 0.2)), "anchor": ln.get("start")})

    starts: list[float] = []
    prev_word_end = 0.0
    prev_aud_end = 0.0
    for it in items:
        first = it["rel"][0]["start"]
        if not starts:
            t0 = max(it["anchor"] or 0.0, 0.0)
        else:
            t0 = max(it["anchor"] or 0.0, prev_word_end + it["gap"] - first, prev_aud_end + AUDIBLE_GAP - it["on"])
        t0 = round(t0, 3)
        starts.append(t0)
        prev_word_end = t0 + it["rel"][-1]["end"]
        prev_aud_end = t0 + it["off"]

    last_aud = starts[-1] + items[-1]["off"]
    # Bulatkan ke kelipatan 90 frame (>= 1890f / 63s) agar BREATH_PERIOD = 90 membagi habis TOTAL_FRAMES!
    min_frames = max(1890, int(math.ceil((last_aud + 0.85) * FPS)))
    total_frames = int(math.ceil(min_frames / 90.0)) * 90
    loop_cut_frame = total_frames - 15
    total_sec = total_frames / FPS

    n_samples = int(round(total_sec * SR))
    master = np.zeros(n_samples, dtype=np.float32)
    per_speaker: dict[str, np.ndarray] = {}
    all_words = []
    rows = []

    for t0, it in zip(starts, items):
        ln, x, rel, sp = it["ln"], it["x"], it["rel"], it["ln"]["speaker"]
        a0 = int(round(t0 * SR))
        m = min(len(x), n_samples - a0)
        if m > 0:
            master[a0 : a0 + m] += x[:m]
            per_speaker.setdefault(sp, np.zeros(n_samples, dtype=np.float32))[a0 : a0 + m] += x[:m]
        words = [{"text": w["text"], "start": round(t0 + w["start"], 3), "end": round(t0 + w["end"], 3), "speaker": sp} for w in rel]
        all_words.extend(words)
        s0, s1 = words[0]["start"], words[-1]["end"]
        aud0, aud1 = round(t0 + it["on"], 3), round(t0 + it["off"], 3)
        rows.append({
            "id": ln["id"], "beat": ln["beat"], "speaker": sp, "text": ln["text"],
            "start": s0, "end": s1, "startFrame": int(math.floor(s0 * FPS)), "endFrame": int(math.ceil(s1 * FPS)),
            "audibleStart": aud0, "audibleEnd": aud1,
            "audibleStartFrame": int(math.floor(aud0 * FPS)), "audibleEndFrame": int(math.ceil(aud1 * FPS)),
            "clipDur": round(len(x) / SR, 3),
        })

    # Beat bounds
    sb_map = {b["beat"]: b for b in spec["scriptBeats"]}
    beat_ids = sorted(sb_map)
    first_b = {b: min(r["audibleStart"] for r in rows if r["beat"] == b) for b in beat_ids}
    last_b = {b: max(r["audibleEnd"] for r in rows if r["beat"] == b) for b in beat_ids}
    bounds = {beat_ids[0]: 0}
    for prev, b in zip(beat_ids, beat_ids[1:]):
        t = (last_b[prev] + first_b[b]) / 2.0
        bounds[b] = round(t * FPS)
    beats = []
    for i, b in enumerate(beat_ids):
        f0 = bounds[b]
        f1 = bounds[beat_ids[i + 1]] if i + 1 < len(beat_ids) else loop_cut_frame
        beats.append({"beat": b, "name": sb_map[b]["name"], "from": f0, "to": f1, "fromSec": round(f0 / FPS, 3), "toSec": round(f1 / FPS, 3)})

    peak = float(np.abs(master).max())
    gain = 0.98 / peak if peak > 0.98 else 1.0
    master *= gain
    write_mono(HERE / "voice.wav", master, SR)
    all_words.sort(key=lambda w: w["start"])
    (HERE / "words.json").write_text(json.dumps(all_words, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    rms_out = {"fps": FPS, "frames": total_frames, "speakers": {}}
    for sp, xs in per_speaker.items():
        env = frame_rms(xs * gain, SR, total_frames)
        voiced = env[env > 1e-3]
        ref = float(np.percentile(voiced, 95)) if len(voiced) else 1.0
        rms_out["speakers"][sp] = [round(float(min(1.0, v / ref)), 3) for v in env]
    (HERE / "rms.json").write_text(json.dumps(rms_out, separators=(",", ":")) + "\n", encoding="utf-8")

    tl = {
        "fps": FPS, "totalFrames": total_frames, "totalSec": total_sec, "loopCutFrame": loop_cut_frame,
        "lastAudibleEnd": round(last_aud, 3), "beats": beats, "nonverbal": [], "lines": rows,
    }
    (HERE / "timeline.json").write_text(json.dumps(tl, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"[ep04:build] voice.wav {total_sec:.2f}s ({total_frames}f, loop f{loop_cut_frame}) | suara terakhir {last_aud:.2f}s | {len(all_words)} kata")
    for b in beats:
        print(f"  B{b['beat']} f{b['from']}-f{b['to']} ({b['fromSec']:.2f}-{b['toSec']:.2f}s) {b['name']}")


if __name__ == "__main__":
    main()
