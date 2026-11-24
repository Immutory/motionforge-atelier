"""Mixer: events.json + voice.wav (+ timeline.json) -> mix.wav 48 kHz mono, siap mux.

Pakai: python3 sound/mix.py <slug> [--seconds 60] [--lufs -16] [--tp -1]

events.json (semua kunci selain "events" opsional):
  {
    "fps": 30,
    "master": {"lufs": -16, "true_peak_db": -1.0},
    "duck":   {"depth_db": -6, "pre_ms": 120, "post_ms": 180, "smooth_ms": 160},
    "levels": {"music_lu": -12, "ambience_lu": -20},          # relatif loudness voice.wav
    "music":    {"sections": [{"from": 0, "to": 456, "style": "lazy", "gain_db": 0, "fade_out": 2}]},
    "ambience": {"sections": [{"from": 0, "to": 1175, "style": "warkop"}]},
    "events": [ {"frame": 456, "sfx": "slap", "gain_db": -3, "duck": false},
                {"at": 3.40, "file": "assets/voices/oyen.wav", "gain_db": -2},
                {"frame": 1539, "sfx": "cricket", "params": {"seconds": 0.7}} ]
  }
Waktu event: "frame" (diutamakan, pada fps) atau "at" (detik). Kunci waktu gambar DULU; perubahan timing = jalankan ulang.

Ducking: musik, ambience, dan SFX turun `depth_db` (default -6 dB) dengan kurva halus di setiap jendela
`audibleStart..audibleEnd` baris VO dan setiap momen `nonverbal` di voice/timeline.json (napas, tawa, hirupan, jeda).
Tanpa timeline.json, mixer jatuh ke ducking berbasis envelope voice (perilaku lama).
Durasi keluaran = timeline.totalFrames / fps tepat (atau panjang voice.wav / --seconds).
"""
import json
import sys
import wave
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from dsp import SR  # noqa: E402
from loudness import integrated_lufs, master, true_peak_dbtp  # noqa: E402
from music import render_bed  # noqa: E402
from sfx import LIBRARY  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent


def read_wav(path: Path) -> np.ndarray:
    with wave.open(str(path), "rb") as w:
        assert w.getframerate() == SR, f"{path.name} harus {SR} Hz (ffmpeg -ar {SR})"
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
    """Muat klip SFX sintetis (`ev['sfx']`, argumen opsional `ev['params']`) atau WAV 48 kHz eksternal (`ev['file']`)."""
    if "file" in ev and ev["file"]:
        rel = Path(ev["file"])
        cand = rel if rel.is_absolute() else (ROOT / rel if (ROOT / rel).exists() else prod / rel)
        if not cand.exists():
            raise FileNotFoundError(f"File audio event tidak ditemukan: {ev['file']}")
        return read_wav(cand)
    return LIBRARY[ev["sfx"]](**ev.get("params", {}))


def event_sample(ev: dict, fps: float) -> int:
    if "frame" in ev:
        return int(round(ev["frame"] / fps * SR))
    return int(round(ev["at"] * SR))


def duck_windows(timeline: dict) -> list[tuple[float, float]]:
    """Jendela (detik) yang wajib jernih: setiap baris VO terdengar + setiap momen non-verbal."""
    wins = [(l["audibleStart"], l["audibleEnd"]) for l in timeline.get("lines", []) if "audibleStart" in l]
    wins += [(nv["start"], nv["end"]) for nv in timeline.get("nonverbal", [])]
    return sorted(wins)


def duck_curve(n: int, windows: list[tuple[float, float]], cfg: dict) -> np.ndarray:
    """Gain linear 1..10^(depth/20): masker jendela (+pre/post roll) dihaluskan Hann -> ramp mulus tanpa klik."""
    depth = cfg.get("depth_db", -6.0)
    pre, post = cfg.get("pre_ms", 120) / 1000, cfg.get("post_ms", 180) / 1000
    smooth = cfg.get("smooth_ms", 160) / 1000
    step = SR // 1000  # resolusi 1 ms
    m = np.zeros(n // step + 2, dtype=np.float64)
    for a, b in windows:
        i, j = int(max(0, a - pre) * 1000), int(min(n / SR, b + post) * 1000)
        m[i : j + 1] = 1.0
    k = max(3, int(smooth * 1000) | 1)
    h = np.hanning(k)
    m = np.clip(np.convolve(m, h / h.sum(), mode="same"), 0, 1)
    db = depth * m
    g = 10 ** (np.repeat(db, step)[:n] / 20)
    return g.astype(np.float32)


def bed_to_lu(bed: np.ndarray, ref_lufs: float, rel_lu: float) -> np.ndarray:
    if not np.any(bed):
        return bed
    l = integrated_lufs(bed)
    return (bed * 10 ** ((ref_lufs + rel_lu - l) / 20)).astype(np.float32)


def main(slug: str, seconds: float | None, lufs: float | None, tp: float | None) -> None:
    prod = ROOT / "productions" / slug
    if not prod.exists():  # slug "starter" tersimpan di folder _starter
        prod = ROOT / "productions" / f"_{slug}"
    spec = json.loads((prod / "audio" / "events.json").read_text(encoding="utf-8"))
    events = spec["events"]
    voice_path = prod / "voice" / "voice.wav"
    voice = read_wav(voice_path) if voice_path.exists() else None
    tl_path = prod / "voice" / "timeline.json"
    timeline = json.loads(tl_path.read_text(encoding="utf-8")) if tl_path.exists() else None
    fps = float(spec.get("fps") or (timeline or {}).get("fps") or 30)

    if seconds:
        n = int(round(seconds * SR))
    elif timeline and timeline.get("totalFrames"):
        n = int(round(timeline["totalFrames"] / fps * SR))  # panjang gambar persis
    elif voice is not None:
        n = len(voice)
    else:
        n = int(10.0 * SR)

    v = np.zeros(n, dtype=np.float32)
    if voice is not None:
        v[: min(n, len(voice))] = voice[:n]
    voice_lufs = integrated_lufs(v) if voice is not None else -23.0

    # SFX bus: dua grup, ter-duck (default) dan tidak (hit kunci di luar dialog).
    sfx_duck = np.zeros(n, dtype=np.float32)
    sfx_free = np.zeros(n, dtype=np.float32)
    for ev in events:
        clip = load_event_clip(ev, prod) * (10 ** (ev.get("gain_db", -6) / 20))
        i = event_sample(ev, fps)
        j = min(n, i + len(clip))
        if 0 <= i < n:
            (sfx_duck if ev.get("duck", True) else sfx_free)[i:j] += clip[: j - i]

    levels = spec.get("levels", {})
    music = bed_to_lu(render_bed(spec.get("music"), "music", n, fps), voice_lufs, levels.get("music_lu", -12))
    amb = bed_to_lu(render_bed(spec.get("ambience"), "ambience", n, fps), voice_lufs, levels.get("ambience_lu", -20))

    if timeline:
        duck = duck_curve(n, duck_windows(timeline), spec.get("duck", {}))
    elif voice is not None:
        duck = 1.0 - 0.5 * np.clip(envelope(v) * 12, 0, 1)  # SFX turun hingga ~6 dB saat ada suara
    else:
        duck = np.ones(n, dtype=np.float32)

    pre = v + (music + amb + sfx_duck) * duck + sfx_free
    m = spec.get("master", {})
    target = lufs if lufs is not None else m.get("lufs", -16.0)
    tpmax = tp if tp is not None else m.get("true_peak_db", -1.0)
    out, rep = master(pre, target_lufs=target, tp_db=tpmax)

    dest = ROOT / "out" / slug
    dest.mkdir(parents=True, exist_ok=True)
    write_wav(dest / "mix.wav", out)
    print(
        f"mix.wav {n / SR:.3f}s ({n} sampel, {n / SR * fps:.2f} frame), {len(events)} event -> {dest / 'mix.wav'}\n"
        f"voice {voice_lufs:.1f} LUFS | master gain {rep['gain_db']:+.2f} dB, ceiling {rep['ceiling_db']:.1f} dBTP | "
        f"hasil {rep['lufs']:.2f} LUFS, true peak {rep['true_peak_dbtp']:.2f} dBTP (pre-master TP {true_peak_dbtp(pre):.2f})"
    )


if __name__ == "__main__":
    argv = sys.argv[1:]
    a = [x for i, x in enumerate(argv) if not x.startswith("--") and (i == 0 or not argv[i - 1].startswith("--"))]
    if not a:
        sys.exit(__doc__)

    def opt(name: str) -> float | None:
        return float(argv[argv.index(name) + 1]) if name in argv else None

    main(a[0], opt("--seconds"), opt("--lufs"), opt("--tp"))
