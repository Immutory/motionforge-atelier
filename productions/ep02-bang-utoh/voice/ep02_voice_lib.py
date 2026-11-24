"""Utilitas analisis klip suara EP02 (dipakai gen_tts.py dan build_voice.py).

- Deteksi wilayah bersuara via RMS 10 ms (untuk trim dan cek onset/offset kata).
- Cek "salah ucap" objektif: transkripsi faster-whisper TANPA prompt naskah lalu dibandingkan ke naskah.
- Pemetaan timestamp Whisper ke token naskah asli (ejaan naskah dipertahankan di words.json).
Jalankan dengan Python .venv-vo (butuh numpy + faster-whisper).
"""
from __future__ import annotations

import difflib
import re
import sys
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "pipeline" / "voice"))
from voice_utils import STUDIO_SR, normalize_wav  # noqa: E402

FPS = 30
HOP = 0.01  # 10 ms

# Ejaan alternatif yang dianggap sama saat membandingkan transkripsi dengan naskah
ALIASES = {
    "waifai": "wifi", "wifi": "wifi", "wi": "wifi",
    "tivi": "tv", "tipi": "tv", "tv": "tv", "teve": "tv",
    "eror": "error", "error": "error", "errornya": "error",
    "ran": "run", "run": "run", "rann": "run",
    "plis": "please", "please": "please", "pliss": "please",
    "gua": "gue", "gw": "gue",
    "lu": "lo", "loe": "lo", "elo": "lo", "lho": "lho",
    "ok": "oke", "okay": "oke", "oke": "oke",
    "hijau": "ijo",
    "a": "a", "ah": "a",
    "gak": "nggak", "ga": "nggak", "engga": "nggak", "enggak": "nggak", "ngga": "nggak",
}


DIGITS = {"0": "nol", "1": "satu", "2": "dua", "3": "tiga", "4": "empat", "5": "lima",
          "6": "enam", "7": "tujuh", "8": "delapan", "9": "sembilan", "47": "empattujuh", "100": "seratus"}


def canon(tok: str) -> str:
    t = re.sub(r"[^0-9a-zA-Z]", "", tok.lower())
    if t in DIGITS:
        return DIGITS[t]
    return ALIASES.get(t, t)


def tokens(text: str) -> list[str]:
    return [t for t in text.replace("...", " ").split() if canon(t)]


def read_mono(path: Path) -> tuple[np.ndarray, int]:
    with wave.open(str(path), "rb") as w:
        sr = w.getframerate()
        ch = w.getnchannels()
        raw = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0
    return raw.reshape(-1, ch).mean(axis=1), sr


def write_mono(path: Path, x: np.ndarray, sr: int = STUDIO_SR) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    pcm = (np.clip(x, -1.0, 1.0) * 32767.0).astype(np.int16)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(pcm.tobytes())


def ensure_48k(src: Path, dst: Path) -> Path:
    """Konversi wav/mp3/m4a apa pun ke 48 kHz mono 16-bit."""
    return normalize_wav(src, dst)


def rms_db(x: np.ndarray, sr: int) -> np.ndarray:
    hop = int(sr * HOP)
    n = max(1, len(x) // hop)
    fr = x[: n * hop].reshape(n, hop)
    return 20 * np.log10(np.sqrt((fr ** 2).mean(axis=1)) + 1e-9)


def voiced_span(x: np.ndarray, sr: int) -> tuple[float, float, float]:
    """(onset_s, offset_s, ambang_db) dari wilayah bersuara."""
    db = rms_db(x, sr)
    thr = max(-48.0, float(db.max()) - 32.0)
    idx = np.where(db > thr)[0]
    if len(idx) == 0:
        return 0.0, len(x) / sr, thr
    return idx[0] * HOP, (idx[-1] + 1) * HOP, thr


def loudness_stats(x: np.ndarray, sr: int) -> dict:
    db = rms_db(x, sr)
    on, off, thr = voiced_span(x, sr)
    voiced = db[db > thr]
    return {
        "peakDb": round(float(20 * np.log10(np.abs(x).max() + 1e-9)), 1),
        "voicedRmsDb": round(float(10 * np.log10(np.mean(10 ** (voiced / 10)) + 1e-12)) if len(voiced) else -99.0, 1),
        "onset": round(on, 3),
        "offset": round(off, 3),
    }


def level_match(x: np.ndarray, sr: int, target_rms_db: float = -20.0, peak_ceiling_db: float = -1.5) -> np.ndarray:
    st = loudness_stats(x, sr)
    gain = target_rms_db - st["voicedRmsDb"]
    gain = min(gain, peak_ceiling_db - st["peakDb"])
    return x * (10 ** (gain / 20))


def transcribe(model, path: Path, prompt: str | None) -> list[dict]:
    segs, _ = model.transcribe(
        str(path),
        language="id",
        word_timestamps=True,
        vad_filter=False,
        initial_prompt=prompt,
        beam_size=5,
        condition_on_previous_text=False,
        temperature=0.0,  # deterministik: build ulang menghasilkan timestamp yang sama persis
    )
    out = []
    for s in segs:
        for w in s.words or []:
            if w.word.strip():
                out.append({"text": w.word.strip(), "start": float(w.start), "end": float(w.end)})
    return out


def match_score(expected: str, heard_words: list[dict]) -> tuple[float, str]:
    exp = "".join(canon(t) for t in tokens(expected))
    got = "".join(canon(t) for w in heard_words for t in w["text"].replace("%", " persen").split())
    return round(difflib.SequenceMatcher(None, exp, got).ratio(), 3), " ".join(w["text"] for w in heard_words)


def word_recall(expected: str, heard_words: list[dict]) -> float:
    """Porsi kata naskah yang terdengar persis (setelah kanonisasi). Menangkap punch word yang salah ucap."""
    got = [canon(t) for w in heard_words for t in w["text"].replace("%", " persen").replace(".", " ").split()]
    got = [g for g in got if g]
    exp = [canon(t) for t in tokens(expected)]
    pool = list(got)
    hit = 0
    for e in exp:
        if e in pool:
            pool.remove(e)
            hit += 1
    return round(hit / max(1, len(exp)), 3)


def map_to_script(script_text: str, wwords: list[dict]) -> list[dict]:
    """Petakan timestamp kata Whisper ke token naskah lewat penjajaran karakter kanonik."""
    stoks = tokens(script_text)
    # karakter whisper + waktu per karakter (linear di dalam kata)
    wchars: list[str] = []
    wtimes: list[tuple[float, float]] = []
    for w in wwords:
        c = "".join(canon(t) for t in w["text"].replace("%", " persen").split())
        if not c:
            continue
        d = (w["end"] - w["start"]) / len(c)
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
            ti = sowner[a + k]
            tok_times[ti].extend(wtimes[b + k])
    res: list[dict | None] = []
    for t, tt in zip(stoks, tok_times):
        res.append({"text": t, "start": min(tt), "end": max(tt)} if tt else None)
    # isi token tanpa pasangan dengan interpolasi tetangga
    for i, r in enumerate(res):
        if r is None:
            prev_end = next((res[j]["end"] for j in range(i - 1, -1, -1) if res[j]), wwords[0]["start"] if wwords else 0.0)
            nxt_start = next((res[j]["start"] for j in range(i + 1, len(res)) if res[j]), prev_end + 0.3)
            res[i] = {"text": stoks[i], "start": prev_end, "end": max(prev_end + 0.08, nxt_start), "interpolated": True}
    # monoton dan tidak tumpang tindih
    out = []
    last = 0.0
    for r in res:
        s = max(r["start"], last)
        e = max(r["end"], s + 0.06)
        out.append({**r, "start": s, "end": e})
        last = e
    return out


def snap_edges(words: list[dict], onset: float, offset: float, tol_frames: float = 2.0) -> list[dict]:
    """Rapatkan awal kata pertama & akhir kata terakhir ke onset/offset RMS bila meleset > tol."""
    if not words:
        return words
    tol = tol_frames / FPS
    w = [dict(x) for x in words]
    if abs(w[0]["start"] - onset) > tol:
        w[0]["start"] = onset
        w[0]["snapped"] = True
    if abs(w[-1]["end"] - offset) > tol:
        w[-1]["end"] = max(w[-1]["start"] + 0.06, offset)
        w[-1]["snapped"] = True
    return w


def rms_pauses(x: np.ndarray, sr: int, min_len: float = 0.08, merge: float = 0.03) -> list[tuple[float, float]]:
    """Jeda hening internal (di antara onset dan offset) dari RMS 10 ms."""
    db = rms_db(x, sr)
    on, off, thr = voiced_span(x, sr)
    runs: list[list[float]] = []
    start = None
    for i, v in enumerate(db < thr):
        t = i * HOP
        if v and start is None:
            start = t
        if not v and start is not None:
            if start > on and t < off:
                if runs and start - runs[-1][1] <= merge:
                    runs[-1][1] = t
                else:
                    runs.append([start, t])
            start = None
    return [(round(a, 3), round(b, 3)) for a, b in runs if b - a >= min_len]


def snap_to_pauses(words: list[dict], pauses: list[tuple[float, float]], reach: float = 0.25) -> list[dict]:
    """Batas antar-kata yang berada di dekat jeda RMS dirapatkan ke tepi jeda (kata tidak boleh mulai di hening)."""
    w = [dict(x) for x in words]
    used: set[int] = set()
    for ps, pe in pauses:
        best, best_d = None, None
        for i in range(len(w) - 1):
            if i in used:
                continue
            b = (w[i]["end"] + w[i + 1]["start"]) / 2
            d = 0.0 if ps <= b <= pe else min(abs(b - ps), abs(b - pe))
            if d <= reach and (best_d is None or d < best_d):
                best, best_d = i, d
        if best is None:
            continue
        used.add(best)
        a, n = w[best], w[best + 1]
        a["end"] = max(a["start"] + 0.06, ps)
        n["start"] = min(pe, n["end"] - 0.06)
        n["pauseSnapped"] = True
    return w


def prepare_clip(src: Path, dst: Path, head: float = 0.05, tail: float = 0.12, level: bool = True) -> dict:
    """Trim ke wilayah bersuara (+napas kecil) dan samakan level. Tulis dst (48 kHz mono)."""
    tmp = dst.with_suffix(".tmp48.wav")
    ensure_48k(src, tmp)
    x, sr = read_mono(tmp)
    tmp.unlink(missing_ok=True)
    on, off, _ = voiced_span(x, sr)
    a = max(0, int((on - head) * sr))
    b = min(len(x), int((off + tail) * sr))
    y = x[a:b]
    # fade 5 ms supaya tidak klik
    f = int(0.005 * sr)
    if len(y) > 2 * f:
        y[:f] *= np.linspace(0, 1, f)
        y[-f:] *= np.linspace(1, 0, f)
    if level:
        y = level_match(y, sr)
    write_mono(dst, y, sr)
    return {"srcDur": round(len(x) / sr, 3), "dur": round(len(y) / sr, 3)}


def _badness(words: list[dict], pauses: list[tuple[float, float]]) -> int:
    """Kata interpolasi + kata yang mulai di tengah hening + kata yang terlalu pendek (< 40 ms)."""
    bad = 0
    for w in words:
        if w.get("interpolated"):
            bad += 1
        if any(ps + 0.03 < w["start"] < pe - 0.03 for ps, pe in pauses):
            bad += 1
        if w["end"] - w["start"] < 0.04:
            bad += 1
    return bad


def _valley(db: np.ndarray, t_a: float, t_b: float) -> float:
    lo, hi = min(t_a, t_b) - 0.03, max(t_a, t_b) + 0.03
    i0, i1 = max(0, int(lo / HOP)), min(len(db), int(hi / HOP) + 1)
    if i1 <= i0:
        return (t_a + t_b) / 2
    return (i0 + int(np.argmin(db[i0:i1]))) * HOP


def analyze_clip(model, path: Path, script_text: str) -> dict:
    """Cek objektif + kata ber-timestamp (relatif terhadap awal klip).

    1. Lintasan buta (tanpa prompt) -> skor cocok-naskah & recall (deteksi salah ucap).
    2. Lintasan ber-prompt naskah -> timestamp. Keduanya dipetakan ke token naskah dan di-snap ke jeda RMS.
    3. Dipilih lintasan yang paling sedikit melanggar (kata di dalam hening / interpolasi).
    4. Batas kata yang kedua lintasan berselisih > 2 frame dipindah ke lembah energi di antara keduanya.
    """
    x, sr = read_mono(path)
    st = loudness_stats(x, sr)
    db = rms_db(x, sr)
    pauses = rms_pauses(x, sr)
    blind = transcribe(model, path, None)
    score, heard = match_score(script_text, blind)
    recall = word_recall(script_text, blind)
    prompted = transcribe(model, path, script_text.replace("...", " "))

    def prep(ws: list[dict]) -> list[dict]:
        return snap_edges(snap_to_pauses(map_to_script(script_text, ws), pauses), st["onset"], st["offset"])

    cands = []
    if prompted:
        cands.append(("prompted", prep(prompted)))
    if blind:
        cands.append(("blind", prep(blind)))
    cands.sort(key=lambda c: _badness(c[1], pauses))  # stabil: prompted menang bila seri
    chosen_name, words = cands[0]
    other = cands[1][1] if len(cands) > 1 else None

    deltas: list[float] = []
    refined: list[str] = []
    if other:
        for i, (w1, w2) in enumerate(zip(words, other)):
            if w1.get("interpolated") or w2.get("interpolated"):
                continue
            d = abs(w1["start"] - w2["start"]) * FPS
            deltas.append(d)
            if i > 0 and d > 2.0 and not w1.get("pauseSnapped"):
                t = _valley(db, w1["start"], w2["start"])
                t = min(max(t, words[i - 1]["start"] + 0.06), w1["end"] - 0.04)
                w1["start"] = round(t, 3)
                if words[i - 1]["end"] > w1["start"]:
                    words[i - 1]["end"] = w1["start"]
                w1["valleyRefined"] = True
                refined.append(f"{w1['text']}({d:.1f}f)")
    # kata < 100 ms yang diikuti celah: rentangkan sampai awal kata berikutnya (mulut tidak boleh "kedip")
    for i, w in enumerate(words):
        nxt = words[i + 1]["start"] if i + 1 < len(words) else st["offset"]
        if w["end"] - w["start"] < 0.10 and nxt > w["end"]:
            w["end"] = round(min(nxt, w["start"] + 0.35), 3)
    n_interp = sum(1 for w in words if w.get("interpolated"))
    return {
        "dur": round(len(x) / sr, 3),
        "heard": heard,
        "score": score,
        "recall": recall,
        "wordsPerSec": round(len(tokens(script_text)) / max(0.1, st["offset"] - st["onset"]), 2),
        "interpolatedWords": n_interp,
        "pauses": pauses,
        "chosenPass": chosen_name,
        "valleyRefined": refined,
        "passDeltaMaxFrames": round(max(deltas), 2) if deltas else None,
        "passDeltaMedianFrames": round(float(np.median(deltas)), 2) if deltas else None,
        **st,
        "words": [{k: (round(v, 3) if isinstance(v, float) else v) for k, v in w.items()} for w in words],
    }
