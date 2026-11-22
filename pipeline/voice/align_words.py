"""Auto Word-Level Lip-Sync Aligner memakai `faster-whisper` (CUDA RTX 3060 / CPU fallback).

Mengonversi rekaman suara atau hasil TTS (`.wav`, `.mp3`, `.m4a`, dll.) menjadi `words.json`
ber-timestamp akurat per kata yang langsung sinkron dengan `talkAt()` di Remotion.

Contoh pakai:
  npm run vo:align -- productions/ep02/voice/raw.m4a productions/ep02/voice/words.json --speaker bangUtoh --normalize-wav productions/ep02/voice/voice.wav
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

# Pastikan utilitas lokal di folder yang sama selalu bisa diimpor
sys.path.insert(0, str(Path(__file__).resolve().parent))
from voice_utils import normalize_wav, shift_words, summarize_words


def detect_device() -> tuple[str, str]:
    try:
        import torch

        if torch.cuda.is_available():
            return "cuda", "float16"
    except Exception:
        pass
    return "cpu", "int8"


def load_whisper_model(model_size: str = "small", device: str | None = None, compute_type: str | None = None):
    from faster_whisper import WhisperModel

    dev, comp = detect_device()
    dev = device or dev
    comp = compute_type or ("float16" if dev == "cuda" else "int8")
    return WhisperModel(model_size, device=dev, compute_type=comp)


def transcribe_words(
    audio_path: str | Path,
    *,
    model=None,
    model_size: str = "small",
    language: str = "id",
    speaker: str | None = None,
    offset_sec: float = 0.0,
    initial_prompt: str | None = None,
) -> list[dict[str, Any]]:
    """Transkripsi 1 klip audio menjadi daftar token kata ber-timestamp presisi."""
    mdl = model or load_whisper_model(model_size=model_size)
    segments, _info = mdl.transcribe(
        str(audio_path),
        language=language,
        word_timestamps=True,
        vad_filter=True,
        vad_parameters={"min_silence_duration_ms": 220},
        initial_prompt=initial_prompt,
    )
    raw_words: list[dict[str, Any]] = []
    for seg in segments:
        if not seg.words:
            continue
        for w in seg.words:
            raw_words.append({"text": w.word, "start": w.start, "end": w.end})
    return shift_words(raw_words, offset_sec=offset_sec, speaker=speaker)


def main() -> None:
    ap = argparse.ArgumentParser(description="Auto word-level aligner (faster-whisper) -> words.json")
    ap.add_argument("audio", help="Path file audio sumber (.wav/.mp3/.m4a)")
    ap.add_argument("out_json", help="Path output words.json")
    ap.add_argument("--speaker", default=None, help="Label speaker opsional (mis. bangUtoh, pakUjang, tio)")
    ap.add_argument("--model", default="small", help="Ukuran model Whisper: tiny | base | small | medium | large-v3")
    ap.add_argument("--language", default="id", help="Kode bahasa ISO (default: id)")
    ap.add_argument("--prompt", default=None, help="Teks naskah asli (membantu akurasi ejaan nama lokal)")
    ap.add_argument("--normalize-wav", default=None, help="Opsional: ekspor WAV 48 kHz mono bersih ke path ini")
    ap.add_argument("--device", default=None, choices=["cuda", "cpu"], help="Paksa device (default: auto CUDA)")
    args = ap.parse_args()

    src = Path(args.audio)
    if not src.exists():
        raise SystemExit(f"File audio tidak ditemukan: {src}")

    align_input = src
    if args.normalize_wav:
        align_input = normalize_wav(src, args.normalize_wav)
        print(f"[vo:align] Normalized 48 kHz mono -> {align_input}")

    dev, comp = detect_device()
    chosen_dev = args.device or dev
    chosen_comp = "float16" if chosen_dev == "cuda" else "int8"
    print(f"[vo:align] Memuat faster-whisper ({args.model}, {chosen_dev}/{chosen_comp})...")
    model = load_whisper_model(model_size=args.model, device=chosen_dev, compute_type=chosen_comp)

    words = transcribe_words(
        align_input,
        model=model,
        language=args.language,
        speaker=args.speaker,
        initial_prompt=args.prompt,
    )

    out_p = Path(args.out_json)
    out_p.parent.mkdir(parents=True, exist_ok=True)
    out_p.write_text(json.dumps(words, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    stats = summarize_words(words)
    print(
        f"[vo:align] {stats['wordCount']} kata -> {out_p} "
        f"(akhir kata: {stats['lastWordEndSec']}s | total+napas: {stats['totalSecWithTail']}s = {stats['framesAt30Fps']} frame @ 30fps)"
    )


if __name__ == "__main__":
    main()
