"""Mixer: events.json + voice.wav (opsional) -> mix.wav 48 kHz mono, SFX di-duck di bawah suara.

Pakai: python3 sound/mix.py <slug> [--seconds 60]
events.json:
  { "events": [ {"at": 1.25, "sfx": "whoosh", "gain_db": -6}, ... ] }
Waktu "at" dalam detik. Kunci waktu gambar DULU, baru jalankan mixer. Perubahan timing = jalankan ulang.
"""
import json
import sys
import wave
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from dsp import SR  # noqa: E402
from sfx import LIBRARY  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent


def read_wav(path: Path) -> np.ndarray:
    with wave.open(str(path), "rb") as w:
        assert w.getframerate() == SR, f"voice.wav harus {SR} Hz (ffmpeg -ar {SR})"
        raw = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
        return raw.reshape(-1, w.getnchannels()).mean(axis=1)


def write_wav(path: Path, x: np.ndarray) -> None:
    pcm = (np.clip(x, -1, 1) * 32767).astype(np.int16)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def envelope(x: np.ndarray, win: float = 0.05) -> np.ndarray:
    k = max(1, int(win * SR))
    return np.convolve(np.abs(x), np.ones(k) / k, mode="same")


def load_event_clip(ev: dict, prod: Path) -> np.ndarray:
    """Muat klip SFX sintetis (`ev['sfx']`) atau file WAV 48 kHz eksternal (`ev['file']`, mis. `assets/voices/oyen.wav`)."""
    if "file" in ev and ev["file"]:
        rel = Path(ev["file"])
        cand = rel if rel.is_absolute() else (ROOT / rel if (ROOT / rel).exists() else prod / rel)
        if not cand.exists():
            raise FileNotFoundError(f"File audio event tidak ditemukan: {ev['file']}")
        return read_wav(cand)
    return LIBRARY[ev["sfx"]]()


def main(slug: str, seconds: float | None) -> None:
    prod = ROOT / "productions" / slug
    if not prod.exists():  # slug "starter" tersimpan di folder _starter
        prod = ROOT / "productions" / f"_{slug}"
    events = json.loads((prod / "audio" / "events.json").read_text())["events"]
    voice_path = prod / "voice" / "voice.wav"
    voice = read_wav(voice_path) if voice_path.exists() else None

    total = len(voice) / SR if voice is not None else (seconds or 10.0)
    if seconds:
        total = seconds
    n = int(total * SR)
    sfx_bus = np.zeros(n, dtype=np.float32)
    for ev in events:
        clip = load_event_clip(ev, prod) * (10 ** (ev.get("gain_db", -6) / 20))
        i = int(ev["at"] * SR)
        j = min(n, i + len(clip))
        if i < n:
            sfx_bus[i:j] += clip[: j - i]

    out = sfx_bus.copy()
    if voice is not None:
        v = np.zeros(n, dtype=np.float32)
        v[: min(n, len(voice))] = voice[:n]
        duck = 1.0 - 0.5 * np.clip(envelope(v) * 12, 0, 1)  # SFX turun hingga ~6 dB saat ada suara
        out = v + sfx_bus * duck

    dest = ROOT / "out" / slug
    dest.mkdir(parents=True, exist_ok=True)
    write_wav(dest / "mix.wav", out)
    print(f"mix.wav {total:.2f}s, {len(events)} event -> {dest / 'mix.wav'}")


if __name__ == "__main__":
    a = [x for x in sys.argv[1:] if not x.startswith("--")]
    if not a:
        sys.exit(__doc__)
    secs = float(sys.argv[sys.argv.index("--seconds") + 1]) if "--seconds" in sys.argv else None
    main(a[0], secs)
