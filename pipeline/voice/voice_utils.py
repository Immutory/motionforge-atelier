"""Utilitas inti pipeline Voice-Over MotionForge Atelier (tanpa dependensi GPU berat).

Menangani:
- Normalisasi audio ke 48 kHz mono 16-bit PCM via ffmpeg
- Penggabungan banyak klip dialog WAV dengan jeda natural (0.15–0.35 dtk)
- Validasi skrip dialog multi-karakter JSON
- Pembersihan & pergeseran timestamp per kata untuk `words.json` (sinkron `talkAt`)
"""
from __future__ import annotations

import json
import math
import os
import re
import subprocess
import tempfile
import wave
from pathlib import Path
from typing import Any

STUDIO_SR = 48000
DEFAULT_GAP_SEC = 0.24

_INDO_TTS_REPLACEMENTS: list[tuple[str, str]] = [
    (r"\bS1\s+TI\b", "es satu te i"),
    (r"\bS1\b", "es satu"),
    (r"\bTI\b", "te i"),
    (r"\bRT\s*(0?)(\d+)\b", lambda m: f"er te {_spell_short_num(m.group(2), leading_zero=bool(m.group(1)))}"),  # type: ignore[list-item]
    (r"\bRW\s*(0?)(\d+)\b", lambda m: f"er we {_spell_short_num(m.group(2), leading_zero=bool(m.group(1)))}"),  # type: ignore[list-item]
    (r"\bRT\b", "er te"),
    (r"\bRW\b", "er we"),
    (r"\bWi-?Fi\b", "waifai"),
    (r"\bKTM\b", "ka te em"),
    (r"\bATM\b", "a te em"),
    (r"\bHP\b", "ha pe"),
    (r"\bPC\b", "pi si"),
    (r"\bAC\b", "a se"),
    (r"\bSMA\b", "es em a"),
    (r"\bSD\b", "es de"),
    (r"\b24\s*jam\b", "dua puluh empat jam"),
]

_DIGITS_ID = {
    "0": "nol",
    "1": "satu",
    "2": "dua",
    "3": "tiga",
    "4": "empat",
    "5": "lima",
    "6": "enam",
    "7": "tujuh",
    "8": "delapan",
    "9": "sembilan",
}


def _spell_short_num(num_str: str, leading_zero: bool = False) -> str:
    val = int(num_str)
    if val < 10:
        word = _DIGITS_ID[str(val)]
        return f"nol {word}" if leading_zero else word
    if val == 10:
        return "sepuluh"
    if val == 11:
        return "sebelas"
    if val < 20:
        return f"{_DIGITS_ID[str(val - 10)]} belas"
    if val < 100:
        tens, ones = divmod(val, 10)
        return f"{_DIGITS_ID[str(tens)]} puluh" + (f" {_DIGITS_ID[str(ones)]}" if ones else "")
    return " ".join(_DIGITS_ID[ch] for ch in str(val))


def normalize_indo_tts_text(text: str) -> str:
    """Rapikan singkatan & tanda baca agar pelafalan TTS Bahasa Indonesia terdengar alami."""
    out = clean_word_token(text)
    for pattern, repl in _INDO_TTS_REPLACEMENTS:
        out = re.sub(pattern, repl, out, flags=re.IGNORECASE if pattern in (r"\bWi-?Fi\b", r"\b24\s*jam\b") else 0)
    # Lunakkan tanda seru/tanya berulang agar TTS tidak melengking kaku
    out = re.sub(r"!{2,}", "!", out)
    out = re.sub(r"\?{2,}", "?", out)
    return clean_word_token(out)


def normalize_wav(src: str | Path, dst: str | Path, sr: int = STUDIO_SR) -> Path:
    """Konversi file audio apa pun (.mp3/.m4a/.wav) menjadi WAV 48 kHz mono 16-bit PCM (aman bila src == dst)."""
    src_p = Path(src)
    dst_p = Path(dst)
    dst_p.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(prefix=".norm_", suffix=".wav", dir=str(dst_p.parent))
    os.close(fd)
    tmp_p = Path(tmp_name)
    try:
        cmd = [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            str(src_p),
            "-ar",
            str(sr),
            "-ac",
            "1",
            "-c:a",
            "pcm_s16le",
            str(tmp_p),
        ]
        res = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
        if res.returncode != 0:
            raise RuntimeError(f"ffmpeg gagal mengonversi {src_p}: {res.stderr.strip()}")
        os.replace(tmp_p, dst_p)
    except Exception:
        tmp_p.unlink(missing_ok=True)
        raise
    return dst_p


def read_wav_pcm(path: str | Path) -> tuple[bytes, int, float]:
    """Baca frame PCM 16-bit mono dari file WAV dan kembalikan (frames, sample_rate, durasi_detik)."""
    with wave.open(str(path), "rb") as wf:
        if wf.getnchannels() != 1 or wf.getsampwidth() != 2:
            raise ValueError(f"{path} harus 16-bit mono WAV (gunakan normalize_wav terlebih dahulu).")
        sr = wf.getframerate()
        nframes = wf.getnframes()
        data = wf.readframes(nframes)
    return data, sr, nframes / float(sr)


def concat_wavs_with_gaps(
    clips: list[tuple[str | Path, float]],
    out_wav: str | Path,
    sr: int = STUDIO_SR,
) -> list[tuple[float, float]]:
    """Gabungkan daftar `(path_wav_48k_mono, jeda_setelah_detik)` ke satu file `out_wav`.

    Mengembalikan daftar `(start_sec, end_sec)` tiap klip di timeline gabungan.
    """
    out_p = Path(out_wav)
    out_p.parent.mkdir(parents=True, exist_ok=True)
    chunks: list[bytes] = []
    spans: list[tuple[float, float]] = []
    cursor = 0.0

    for idx, (clip_path, gap_after) in enumerate(clips):
        data, clip_sr, dur = read_wav_pcm(clip_path)
        if clip_sr != sr:
            raise ValueError(f"Sample rate {clip_path} ({clip_sr}) != target {sr} Hz.")
        start = round(cursor, 3)
        end = round(cursor + dur, 3)
        spans.append((start, end))
        chunks.append(data)
        cursor += dur

        if idx < len(clips) - 1 and gap_after > 0:
            gap_frames = int(round(gap_after * sr))
            chunks.append(b"\x00\x00" * gap_frames)
            cursor += gap_frames / float(sr)

    with wave.open(str(out_p), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(b"".join(chunks))

    return spans


def clean_word_token(raw: str) -> str:
    """Rapikan spasi berlebih pada token kata hasil ASR."""
    return " ".join(raw.strip().split())


def shift_words(
    words: list[dict[str, Any]],
    offset_sec: float = 0.0,
    speaker: str | None = None,
) -> list[dict[str, Any]]:
    """Geser dan normalkan daftar word-timestamps ke format resmi `words.json`."""
    out: list[dict[str, Any]] = []
    for item in words:
        text = clean_word_token(str(item.get("text", "")))
        if not text:
            continue
        start = max(0.0, round(float(item["start"]) + offset_sec, 3))
        end = round(float(item["end"]) + offset_sec, 3)
        if end <= start:
            end = round(start + 0.04, 3)
        entry: dict[str, Any] = {"text": text, "start": start, "end": end}
        spk = speaker if speaker is not None else item.get("speaker")
        if spk:
            entry["speaker"] = str(spk)
        out.append(entry)
    return out


def load_dialogue_script(path: str | Path) -> list[dict[str, Any]]:
    """Muat & validasi skrip dialog hybrid JSON (mendukung TTS `text` maupun rekaman asli `audio`)."""
    raw = json.loads(Path(path).read_text(encoding="utf-8"))
    if not isinstance(raw, list) or not raw:
        raise ValueError("Skrip dialog harus berupa array JSON berisi minimal 1 baris dialog.")
    lines: list[dict[str, Any]] = []
    for i, row in enumerate(raw):
        if not isinstance(row, dict):
            raise ValueError(f"Baris skrip ke-{i} harus berupa object JSON.")
        raw_spk = row.get("speaker")
        speaker = re.sub(r"[^A-Za-z0-9_-]", "_", str(raw_spk if raw_spk is not None else "narrator").strip()) or "narrator"
        raw_text = row.get("text")
        text = clean_word_token(str(raw_text)) if raw_text is not None else ""
        raw_audio = row.get("audio")
        audio = str(raw_audio).strip() if raw_audio is not None and str(raw_audio).strip() else None
        if not text and not audio:
            raise ValueError(f"Baris skrip ke-{i} ({speaker}) wajib memiliki `text` atau `audio`.")
        lines.append(
            {
                "speaker": speaker,
                "text": text,
                "audio": audio,
                "ref": row.get("ref"),
                "exaggeration": float(row["exaggeration"]) if row.get("exaggeration") is not None else None,
                "cfg": float(row["cfg"]) if row.get("cfg") is not None else None,
                "temperature": float(row["temperature"]) if row.get("temperature") is not None else None,
                "seed": int(row["seed"]) if row.get("seed") is not None else None,
                "align": bool(row["align"]) if row.get("align") is not None else (speaker not in ("oyen", "abu", "belang")),
                "gap": float(row["gap"]) if row.get("gap") is not None else DEFAULT_GAP_SEC,
            }
        )
    return lines


def summarize_words(words: list[dict[str, Any]], fps: int = 30, tail_sec: float = 1.2) -> dict[str, Any]:
    """Hitung ringkasan durasi audio & jumlah frame 30 fps (selaras dengan `durationFromWords`, default tail 1.2 dtk)."""
    last_end = max((float(w["end"]) for w in words), default=0.0)
    total_sec = round(last_end + tail_sec, 3) if words else 0.0
    frames = int(math.ceil(total_sec * fps)) if words else 0
    return {
        "wordCount": len(words),
        "lastWordEndSec": round(last_end, 3),
        "totalSecWithTail": total_sec,
        "framesAt30Fps": frames,
    }
