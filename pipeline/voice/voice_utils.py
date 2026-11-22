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
import subprocess
import wave
from pathlib import Path
from typing import Any

STUDIO_SR = 48000
DEFAULT_GAP_SEC = 0.24


def normalize_wav(src: str | Path, dst: str | Path, sr: int = STUDIO_SR) -> Path:
    """Konversi file audio apa pun (.mp3/.m4a/.wav) menjadi WAV 48 kHz mono 16-bit PCM."""
    src_p = Path(src)
    dst_p = Path(dst)
    dst_p.parent.mkdir(parents=True, exist_ok=True)
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
        str(dst_p),
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError(f"ffmpeg gagal mengonversi {src_p}: {res.stderr.strip()}")
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
    """Muat & validasi skrip dialog multi-karakter JSON untuk generator VO lokal."""
    raw = json.loads(Path(path).read_text(encoding="utf-8"))
    if not isinstance(raw, list) or not raw:
        raise ValueError("Skrip dialog harus berupa array JSON berisi minimal 1 baris dialog.")
    lines: list[dict[str, Any]] = []
    for i, row in enumerate(raw):
        if not isinstance(row, dict):
            raise ValueError(f"Baris skrip ke-{i} harus berupa object JSON.")
        speaker = str(row.get("speaker", "narrator")).strip()
        text = clean_word_token(str(row.get("text", "")))
        if not text:
            raise ValueError(f"Baris skrip ke-{i} ({speaker}) memiliki teks kosong.")
        lines.append(
            {
                "speaker": speaker,
                "text": text,
                "ref": row.get("ref"),
                "exaggeration": float(row["exaggeration"]) if "exaggeration" in row else None,
                "cfg": float(row["cfg"]) if "cfg" in row else None,
                "temperature": float(row["temperature"]) if "temperature" in row else None,
                "gap": float(row.get("gap", DEFAULT_GAP_SEC)),
            }
        )
    return lines


def summarize_words(words: list[dict[str, Any]], fps: int = 30, tail_sec: float = 0.5) -> dict[str, Any]:
    """Hitung ringkasan durasi audio & jumlah frame 30 fps (selaras dengan `durationFromWords`)."""
    last_end = max((float(w["end"]) for w in words), default=0.0)
    total_sec = round(last_end + tail_sec, 3) if words else 0.0
    frames = int(math.ceil(total_sec * fps)) if words else 0
    return {
        "wordCount": len(words),
        "lastWordEndSec": round(last_end, 3),
        "totalSecWithTail": total_sec,
        "framesAt30Fps": frames,
    }
