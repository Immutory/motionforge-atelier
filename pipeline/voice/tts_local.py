"""Local Commercial-Safe Indonesian TTS & Hybrid VO Engine — Chatterbox-TTS-Indonesian (MIT / Apache-2.0).

Fitur utama:
- Sintesis dialog Bahasa Indonesia natural & ekspresif di GPU lokal (CUDA RTX 3060)
- Zero-shot voice cloning otomatis dari `assets/voices/<speaker>.wav` + `assets/voices/presets.json`
- Normalisasi singkatan Bahasa Indonesia otomatis (`RT 04` -> `er te nol empat`, `WiFi` -> `waifai`, dll.)
- Mode Hybrid Timeline di `script.json`: campur rekaman suara asli (`"audio": "..."`), TTS lokal (`"text": "..."`),
  dan suara kucing asli (`assets/voices/oyen.wav`) menjadi 1 `voice.wav` (48 kHz mono) + `words.json` multi-speaker!
- Auto-fallback ke cache Hugging Face offline + opsi `--seed` deterministik.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from voice_utils import (
    concat_wavs_with_gaps,
    load_dialogue_script,
    normalize_indo_tts_text,
    normalize_wav,
    summarize_words,
)

INDO_REPO_ID = "grandhigh/Chatterbox-TTS-Indonesian"
INDO_T3_FILE = "t3_cfg.safetensors"
PROJECT_ROOT = Path(__file__).resolve().parents[2]
VOICES_DIR = PROJECT_ROOT / "assets" / "voices"


def _apply_seed(seed: int | None) -> None:
    if seed is None:
        return
    import random
    import numpy as np
    import torch

    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


def load_chatterbox_indo(device: str = "cuda", use_indo_weights: bool = True):
    """Muat base ChatterboxTTS lalu pasang bobot Bahasa Indonesia (dengan auto-fallback cache offline)."""
    import perth
    import torch
    from chatterbox.tts import ChatterboxTTS
    from huggingface_hub import hf_hub_download
    from safetensors.torch import load_file

    if getattr(perth, "PerthImplicitWatermarker", None) is None and hasattr(perth, "DummyWatermarker"):
        perth.PerthImplicitWatermarker = perth.DummyWatermarker

    actual_device = device
    if device == "cuda" and not torch.cuda.is_available():
        print("[vo:gen] CUDA tidak terdeteksi, fallback ke CPU.")
        actual_device = "cpu"

    print(f"[vo:gen] Memuat ChatterboxTTS di {actual_device}...")
    try:
        model = ChatterboxTTS.from_pretrained(device=actual_device)
    except (OSError, ConnectionError) as net_err:
        print(f"[vo:gen] Koneksi HuggingFace gagal ({net_err}), mencoba cache lokal...")
        prev_off = os.environ.get("HF_HUB_OFFLINE")
        os.environ["HF_HUB_OFFLINE"] = "1"
        try:
            model = ChatterboxTTS.from_pretrained(device=actual_device)
        finally:
            if prev_off is None:
                os.environ.pop("HF_HUB_OFFLINE", None)
            else:
                os.environ["HF_HUB_OFFLINE"] = prev_off

    if use_indo_weights:
        print(f"[vo:gen] Memuat bobot Bahasa Indonesia: {INDO_REPO_ID}/{INDO_T3_FILE} ...")
        try:
            ckpt_path = hf_hub_download(repo_id=INDO_REPO_ID, filename=INDO_T3_FILE)
        except (OSError, ConnectionError):
            ckpt_path = hf_hub_download(repo_id=INDO_REPO_ID, filename=INDO_T3_FILE, local_files_only=True)
        t3_state = load_file(ckpt_path, device="cpu")
        model.t3.load_state_dict(t3_state)
        if actual_device == "cuda":
            if torch.cuda.is_bf16_supported():
                model.t3.to(dtype=torch.bfloat16)
            torch.cuda.empty_cache()

    return model, actual_device


def resolve_path(raw: str, base_dir: Path | None = None) -> Path:
    p = Path(raw)
    if p.is_absolute() and p.exists():
        return p
    if base_dir and (base_dir / p).exists():
        return base_dir / p
    if (PROJECT_ROOT / p).exists():
        return PROJECT_ROOT / p
    return p


def resolve_voice_ref(speaker: str | None, explicit_ref: str | None) -> str | None:
    if explicit_ref:
        p = resolve_path(explicit_ref)
        if not p.exists():
            raise FileNotFoundError(f"Referensi suara tidak ditemukan: {p}")
        return str(p)
    if speaker:
        for ext in (".wav", ".mp3", ".m4a"):
            cand = VOICES_DIR / f"{speaker}{ext}"
            if cand.exists():
                return str(cand)
    return None


def load_voice_presets() -> dict[str, dict]:
    p = VOICES_DIR / "presets.json"
    if p.exists():
        return json.loads(p.read_text(encoding="utf-8"))
    return {}


def resolve_voice_params(
    speaker: str | None,
    presets: dict[str, dict],
    exaggeration: float | None,
    cfg: float | None,
    temperature: float | None,
) -> tuple[float, float, float]:
    sp = presets.get(speaker or "", {})
    ex = exaggeration if exaggeration is not None else float(sp.get("exaggeration", 0.52))
    cf = cfg if cfg is not None else float(sp.get("cfg", 0.50))
    tp = temperature if temperature is not None else float(sp.get("temperature", 0.72))
    return ex, cf, tp


def synth_to_studio_wav(
    model,
    text: str,
    out_wav: Path,
    *,
    audio_prompt_path: str | None = None,
    exaggeration: float = 0.52,
    cfg_weight: float = 0.50,
    temperature: float = 0.72,
    seed: int | None = None,
) -> Path:
    """Sintesis 1 kalimat ke WAV 48 kHz mono 16-bit PCM."""
    import torch
    import torchaudio as ta

    _apply_seed(seed)
    kwargs = {
        "exaggeration": exaggeration,
        "cfg_weight": cfg_weight,
        "temperature": temperature,
    }
    if audio_prompt_path:
        kwargs["audio_prompt_path"] = audio_prompt_path

    use_bf16 = (
        torch.cuda.is_available()
        and torch.cuda.is_bf16_supported()
        and str(getattr(model, "device", "")).startswith("cuda")
    )
    with torch.inference_mode():
        if use_bf16:
            with torch.amp.autocast("cuda", dtype=torch.bfloat16):
                wav = model.generate(text, **kwargs)
        else:
            wav = model.generate(text, **kwargs)
    if wav.dim() == 1:
        wav = wav.unsqueeze(0)
    wav = wav.float()

    out_wav.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as td:
        raw_path = Path(td) / "raw.wav"
        ta.save(str(raw_path), wav.cpu(), model.sr)
        normalize_wav(raw_path, out_wav)
    return out_wav


def main() -> None:
    ap = argparse.ArgumentParser(description="Chatterbox-TTS-Indonesian & Hybrid VO generator")
    mode = ap.add_mutually_exclusive_group(required=True)
    mode.add_argument("--text", help="Teks tunggal untuk disintesis cepat")
    mode.add_argument("--script", help="Path JSON skrip dialog hybrid/multi-karakter")

    ap.add_argument("--out", help="Path output WAV (untuk mode --text)")
    ap.add_argument("--out-dir", help="Folder output klip + voice.wav + words.json (untuk mode --script)")
    ap.add_argument("--speaker", default=None, help="Nama karakter (auto-cari ref & preset di assets/voices/)")
    ap.add_argument("--ref", default=None, help="Path klip referensi suara 5–10 dtk (opsional)")
    ap.add_argument("--exaggeration", type=float, default=None, help="Tingkat ekspresi 0.2..1.0")
    ap.add_argument("--cfg", type=float, default=None, help="Guidance weight 0.2..1.0 (rendah = lebih mengalir)")
    ap.add_argument("--temperature", type=float, default=None, help="Sampling temperature 0.4..1.0")
    ap.add_argument("--seed", type=int, default=None, help="Seed acak opsional agar take bisa diulang persis")
    ap.add_argument("--raw-text", action="store_true", help="Lewati normalisasi singkatan Bahasa Indonesia")
    ap.add_argument("--device", default="cuda", choices=["cuda", "cpu"], help="Device inferensi (default: cuda)")
    ap.add_argument("--base-only", action="store_true", help="Pakai bobot base Chatterbox tanpa fine-tune Indonesia")
    ap.add_argument("--no-align", action="store_true", help="Lewati auto-generate words.json via faster-whisper")
    ap.add_argument("--whisper-model", default="small", help="Model faster-whisper untuk auto-align (default: small)")
    args = ap.parse_args()

    presets = load_voice_presets()

    if args.text is not None:
        if not args.text.strip():
            raise SystemExit("Mode --text tidak boleh kosong.")
        if not args.out:
            raise SystemExit("Mode --text membutuhkan --out <path.wav>")
        model, actual_device = load_chatterbox_indo(device=args.device, use_indo_weights=not args.base_only)
        ref = resolve_voice_ref(args.speaker, args.ref)
        ex, cf, tp = resolve_voice_params(args.speaker, presets, args.exaggeration, args.cfg, args.temperature)
        spoken_text = args.text if args.raw_text else normalize_indo_tts_text(args.text)
        out_wav = Path(args.out)
        print(
            f"[vo:gen] Sintesis tunggal -> {out_wav} (ex={ex}, cfg={cf}, temp={tp})"
            + (f" | ref={Path(ref).name}" if ref else " | suara default Indo")
        )
        synth_to_studio_wav(
            model,
            spoken_text,
            out_wav,
            audio_prompt_path=ref,
            exaggeration=ex,
            cfg_weight=cf,
            temperature=tp,
            seed=args.seed,
        )
        print(f"[vo:gen] Selesai: {out_wav}")

        if not args.no_align:
            from align_words import load_whisper_model, transcribe_words

            w_model = load_whisper_model(args.whisper_model, device=actual_device)
            words = transcribe_words(out_wav, model=w_model, speaker=args.speaker, initial_prompt=args.text)
            words_path = out_wav.with_suffix(".words.json")
            words_path.write_text(json.dumps(words, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            stats = summarize_words(words)
            print(f"[vo:gen] Auto-align {stats['wordCount']} kata -> {words_path} ({stats['totalSecWithTail']}s / {stats['framesAt30Fps']}f)")
        return

    # Mode --script (Hybrid: bisa mencampur rekaman suara asli `audio` + TTS lokal `text` + suara kucing!)
    if not args.out_dir:
        raise SystemExit("Mode --script membutuhkan --out-dir <folder>")
    script_path = Path(args.script)
    lines = load_dialogue_script(script_path)
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    needs_tts = any(not line["audio"] for line in lines)
    model = None
    actual_device = args.device
    if needs_tts:
        model, actual_device = load_chatterbox_indo(device=args.device, use_indo_weights=not args.base_only)
    else:
        from align_words import detect_device

        detected_dev, _ = detect_device()
        actual_device = detected_dev if args.device == "cuda" and detected_dev != "cuda" else args.device

    clip_entries: list[tuple[Path, float, dict]] = []
    for idx, line in enumerate(lines, start=1):
        spk = line["speaker"]
        clip_path = out_dir / f"{idx:02d}_{spk}.wav"
        if line["audio"]:
            src_audio = resolve_path(line["audio"], base_dir=script_path.parent)
            if not src_audio.exists():
                raise FileNotFoundError(f"Audio baris ke-{idx} ({spk}) tidak ditemukan: {src_audio}")
            print(f"[vo:gen] [{idx}/{len(lines)}] {spk} [REKAMAN ASLI]: {src_audio.name}")
            normalize_wav(src_audio, clip_path)
        else:
            ref = resolve_voice_ref(spk, line["ref"])
            ex, cf, tp = resolve_voice_params(spk, presets, line["exaggeration"], line["cfg"], line["temperature"])
            spoken_text = line["text"] if args.raw_text else normalize_indo_tts_text(line["text"])
            seed = line["seed"] if line["seed"] is not None else args.seed
            print(f"[vo:gen] [{idx}/{len(lines)}] {spk} [TTS ex={ex}, cfg={cf}, temp={tp}]: \"{spoken_text}\"")
            synth_to_studio_wav(
                model,
                spoken_text,
                clip_path,
                audio_prompt_path=ref,
                exaggeration=ex,
                cfg_weight=cf,
                temperature=tp,
                seed=seed,
            )
        clip_entries.append((clip_path, line["gap"], line))

    master_wav = out_dir / "voice.wav"
    spans = concat_wavs_with_gaps([(p, g) for p, g, _ in clip_entries], master_wav)
    print(f"[vo:gen] Gabungan master -> {master_wav} ({len(clip_entries)} klip)")

    if not args.no_align:
        all_words = []
        if any(line["align"] for _, _, line in clip_entries):
            from align_words import load_whisper_model, transcribe_words

            w_model = load_whisper_model(args.whisper_model, device=actual_device)
            for (clip_path, _gap, line), (start_sec, _end_sec) in zip(clip_entries, spans):
                if not line["align"]:
                    continue
                w = transcribe_words(
                    clip_path,
                    model=w_model,
                    speaker=line["speaker"],
                    offset_sec=start_sec,
                    initial_prompt=line["text"] or None,
                )
                all_words.extend(w)

        words_path = out_dir / "words.json"
        words_path.write_text(json.dumps(all_words, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        stats = summarize_words(all_words)
        print(
            f"[vo:gen] Auto-align {stats['wordCount']} kata multi-speaker -> {words_path} "
            f"(total+napas: {stats['totalSecWithTail']}s = {stats['framesAt30Fps']} frame @ 30fps)"
        )


if __name__ == "__main__":
    main()
