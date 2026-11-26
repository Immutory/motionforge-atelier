"""Bed musik orisinal + ambience sintetis per lokasi. Mono float32 48 kHz, murni numpy.

Musik: progresi orisinal (bukan sampel), petikan aditif + bas + shaker. Setiap section dirender
mulai dari birama 1 tepat di frame `from`, sehingga downbeat selalu jatuh di frame aksi (mis. sprint).

Spesifikasi di `events.json`:
  "music":    {"sections": [{"from": 0, "to": 456, "style": "lazy", "gain_db": -6, "fade_in": 0, "fade_out": 3}, ...]}
  "ambience": {"sections": [{"from": 0, "to": 1175, "style": "warkop", "gain_db": -6}, ...]}
`from`/`to`/`fade_*` dalam frame. Gain relatif terhadap bed ternormalisasi (puncak 0,9).
"""
from __future__ import annotations

from functools import lru_cache

import numpy as np

from dsp import SR, env_ad, highpass, lowpass, noise, sine

A4 = 440.0


def midi_hz(m: float) -> float:
    return A4 * 2 ** ((m - 69) / 12)


@lru_cache(maxsize=256)
def pluck(midi: int, seconds: float = 0.9, bright: float = 1.0) -> np.ndarray:
    """Petikan senar aditif (mirip ukulele/kentrung): harmonik atas luruh lebih cepat."""
    n = max(0, int(round(seconds * SR)))
    if n == 0:
        return np.zeros(0, dtype=np.float32)
    f = midi_hz(midi)
    t = np.arange(n, dtype=np.float64) / SR
    out = np.zeros(n, dtype=np.float64)
    for h in range(1, 8):
        if f * h > 9000:
            break
        amp = (1.0 / h) * (bright if h > 2 else 1.0)
        dec = 0.55 / (1 + 0.65 * (h - 1))
        out += amp * np.sin(2 * np.pi * f * h * t * (1 + 0.0004 * h)) * np.exp(-t / dec)
    atk = min(n, int(0.003 * SR))
    if atk > 0:
        out[:atk] *= np.linspace(0, 1, atk)
    return out.astype(np.float32)


@lru_cache(maxsize=64)
def bass(midi: int, seconds: float) -> np.ndarray:
    n = max(0, int(round(seconds * SR)))
    if n == 0 or seconds <= 0:
        return np.zeros(0, dtype=np.float32)
    f = midi_hz(midi)
    t = np.arange(n, dtype=np.float64) / SR
    x = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t) + 0.08 * np.sin(6 * np.pi * f * t)
    e = np.minimum(1, t / 0.008) * np.exp(-t / (seconds * 0.7))
    return (x * e).astype(np.float32)


@lru_cache(maxsize=4)
def shaker(seed: int = 7) -> np.ndarray:
    s = 0.07
    return (highpass(noise(s, seed), 5200) * env_ad(int(s * SR), 0.004, 0.018)).astype(np.float32)


@lru_cache(maxsize=4)
def kick() -> np.ndarray:
    s = 0.25
    n = int(s * SR)
    t = np.arange(n) / SR
    f = 50 + 70 * np.exp(-t / 0.03)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.09)).astype(np.float32)


# Progresi orisinal (MIDI root + triad), 1 akor per birama.
PROG_MAJOR = [(60, (0, 4, 7)), (57, (0, 3, 7)), (62, (0, 3, 7)), (55, (0, 4, 7, 10))]  # C  Am  Dm  G7
PROG_MINOR = [(57, (0, 3, 7)), (53, (0, 4, 7)), (62, (0, 3, 7)), (52, (0, 4, 7))]  # Am F  Dm E

STYLES = {
    # bpm, progresi, pola petik (indeks nada per 8th, None = diam), bas per ketukan, kick, shaker per ketukan, lowpass
    "lazy": dict(bpm=96, prog=PROG_MAJOR, pat=[0, 2, 1, 2, 3, 2, 1, 2], bass_beats=(0, 2), kick=False, shk=2, lp=None),
    "bright": dict(bpm=104, prog=PROG_MAJOR, pat=[0, 2, 1, 3, 2, 3, 1, 3], bass_beats=(0, 2, 3), kick=False, shk=2, lp=None),
    "chase": dict(bpm=144, prog=PROG_MAJOR, pat=[0, 2, 1, 2, 0, 2, 1, 3], bass_beats=(0, 1, 2, 3), kick=True, shk=4, lp=None),
    "tense": dict(bpm=96, prog=PROG_MINOR, pat=[0, None, None, 2, None, None, 1, None], bass_beats=(0, 2), kick=False, shk=0, lp=None),
    "sepia": dict(bpm=96, prog=PROG_MAJOR, pat=[0, 2, 1, 2, 3, 2, 1, 2], bass_beats=(0, 2), kick=False, shk=0, lp=1700),
}


def render_music(style: str, seconds: float) -> np.ndarray:
    st = STYLES[style]
    if seconds <= 0:
        return np.zeros(0, dtype=np.float32)
    n = max(1, int(round(seconds * SR)))
    out = np.zeros(n + SR, dtype=np.float32)
    beat = 60.0 / st["bpm"]
    eighth = beat / 2
    bar = beat * 4
    n_bars = int(np.ceil(seconds / bar)) + 1

    def put(clip: np.ndarray, at: float, g: float) -> None:
        i = int(at * SR)
        if i >= n:
            return
        j = min(len(out), i + len(clip))
        out[i:j] += clip[: j - i] * g

    for b in range(n_bars):
        root, tri = st["prog"][b % len(st["prog"])]
        notes = [root + iv for iv in tri] + [root + 12]
        t0 = b * bar
        for k, idx in enumerate(st["pat"]):
            if idx is None:
                continue
            m = notes[min(idx, len(notes) - 1)]
            vel = 0.55 if k % 2 else 0.75
            put(pluck(m, 0.9 if style != "chase" else 0.5), t0 + k * eighth, vel)
        for q in st["bass_beats"]:
            put(bass(root - 24 + (7 if q == 3 and len(st["bass_beats"]) == 4 else 0), beat * 0.95), t0 + q * beat, 0.9)
        if st["kick"]:
            for q in range(4):
                put(kick(), t0 + q * beat, 0.8)
        if st["shk"]:
            step = beat / st["shk"]
            for q in range(4 * st["shk"]):
                put(shaker(7 + q % 3), t0 + q * step + step / 2, 0.22 if q % 2 else 0.14)
    out = out[:n]
    if st["lp"]:
        hiss = highpass(noise(len(out) / SR, 5), 3000)
        out = lowpass(out, st["lp"]) + hiss[: len(out)] * 0.004
    return out


def _brown(seconds: float, seed: int, hp_hz: float = 20.0) -> np.ndarray:
    """Noise coklat (-6 dB/oktaf) dibentuk di domain frekuensi + highpass ~20 Hz (orde 2).

    Dulu: cumsum lalu kurangi rata-rata bergerak `mode="same"` -> bocor di tepi (drift DC/infrasonik
    hingga -9 dBFS di 50 ms terakhir, terdengar sebagai "dug"/klik di akhir file & titik loop).
    Sintesis spektral ini periodik (tanpa tepi), rata-rata nol, dan tanpa energi < hp_hz.
    """
    w = noise(seconds, seed).astype(np.float64)
    if len(w) == 0:
        return np.zeros(0, dtype=np.float32)
    spec = np.fft.rfft(w)
    f = np.fft.rfftfreq(len(w), 1 / SR)
    f[0] = 1e-9
    shape = (1.0 / np.maximum(f, hp_hz)) * (f**2 / (f**2 + hp_hz**2))  # 1/f di atas hp, highpass 12 dB/okt di bawah
    shape[0] = 0.0
    b = np.fft.irfft(spec * shape, len(w))
    return (b / (np.max(np.abs(b)) or 1)).astype(np.float32)


def render_ambience(style: str, seconds: float, seed: int = 0) -> np.ndarray:
    n = max(0, int(round(seconds * SR)))
    if n == 0:
        return np.zeros(0, dtype=np.float32)
    t = np.arange(n, dtype=np.float32) / SR
    rng = np.random.default_rng(100 + seed)
    if style in ("warkop", "warkop-sepia"):
        # Teras warkop pagi: desis jalan jauh + dengung kulkas 100 Hz tipis + denting sendok jarang.
        x = lowpass(_brown(seconds, 11 + seed), 900) * 0.8 + lowpass(highpass(noise(seconds, 12 + seed), 300), 2500) * 0.05
        x += sine(100, seconds) * 0.025 + sine(200, seconds) * 0.01
        for at in np.arange(1.7, seconds, 5.3):
            i = int((at + rng.uniform(-0.6, 0.6)) * SR)
            dur = 0.25
            m = int(dur * SR)
            if 0 <= i < n - m:
                x[i : i + m] += (sine(3100, dur) + 0.5 * sine(4650, dur)) * env_ad(m, 0.0005, 0.04) * 0.05
        if style == "warkop-sepia":
            x = lowpass(x, 1500)
    elif style == "kampung":
        # Jalan kampung siang: angin + kicau burung sintetis.
        x = lowpass(_brown(seconds, 21 + seed), 1400) * 0.7 + lowpass(highpass(noise(seconds, 22 + seed), 800), 5000) * 0.04
        for at in np.arange(0.4, seconds, 1.1):
            i = int((at + rng.uniform(-0.3, 0.3)) * SR)
            dur = 0.16
            m = int(dur * SR)
            if 0 <= i < n - m:
                f0 = rng.uniform(3200, 4200)
                ch = sine(np.linspace(f0, f0 * 1.35, m), dur) * env_ad(m, 0.01, 0.05)
                x[i : i + m] += ch * 0.08
    elif style == "pedagang-malam":
        # Area pedagang malam: jangkrik berdenyut, motor lewat jauh sesekali, desis wajan/dandang tipis.
        x = lowpass(_brown(seconds, 41 + seed), 500) * 0.45 + lowpass(highpass(noise(seconds, 42 + seed), 2500), 7000) * 0.03
        chirp = (sine(4300, seconds) * 0.5 + sine(4700, seconds) * 0.3) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 18 * t)))
        x += chirp * (0.5 + 0.5 * np.sin(2 * np.pi * 0.7 * t)) ** 2 * 0.018
        for at in np.arange(3.0, seconds, 11.0):
            i = int((at + rng.uniform(-1.5, 1.5)) * SR)
            dur = 3.2
            m = int(dur * SR)
            if 0 <= i < n - m:
                tm = np.arange(m, dtype=np.float32) / SR
                engine = sine(np.linspace(85, 70, m), dur) * (0.6 + 0.4 * np.sin(2 * np.pi * 11 * tm))
                x[i : i + m] += lowpass(engine, 400) * np.sin(np.pi * tm / dur) ** 2 * 0.12
        x += lowpass(highpass(noise(seconds, 43 + seed), 3000), 9000) * 0.012 * (1 + 0.3 * np.sin(2 * np.pi * 0.13 * t))
    elif style == "lab":
        # Lab komputer: AC + kipas PC/proyektor (dengung 120 Hz + desis halus).
        x = lowpass(_brown(seconds, 31 + seed), 600) * 0.5 + lowpass(highpass(noise(seconds, 32 + seed), 1500), 6000) * 0.05
        x += (sine(120, seconds) * 0.03 + sine(240, seconds) * 0.012) * (1 + 0.1 * np.sin(2 * np.pi * 0.3 * t))
    else:
        raise KeyError(f"ambience style tidak dikenal: {style}")
    return x.astype(np.float32)


def _fade(n: int, fin: int, fout: int) -> np.ndarray:
    g = np.ones(n, dtype=np.float32)
    if fin > 0:
        g[: min(n, fin)] = np.linspace(0, 1, min(n, fin))
    if fout > 0:
        g[-min(n, fout) :] *= np.linspace(1, 0, min(n, fout))
    return g


def render_bed(spec: dict | None, kind: str, n_total: int, fps: float) -> np.ndarray:
    """Render bed (music/ambience) sepanjang n_total sampel dari daftar section berbasis frame."""
    out = np.zeros(n_total, dtype=np.float32)
    if not spec:
        return out
    for k, sec in enumerate(spec.get("sections", [])):
        i = max(0, int(round(sec["from"] / fps * SR)))
        j = min(n_total, int(round(sec["to"] / fps * SR)))
        if j <= i:
            continue
        dur = (j - i) / SR
        clip = render_music(sec["style"], dur) if kind == "music" else render_ambience(sec["style"], dur, seed=k)
        clip = clip[: j - i]
        peak = float(np.max(np.abs(clip))) or 1.0
        clip = clip * (0.9 / peak) * (10 ** (sec.get("gain_db", 0) / 20))
        spf = SR / fps
        clip *= _fade(len(clip), int(sec.get("fade_in", 0) * spf), int(sec.get("fade_out", 0) * spf))
        out[i : i + len(clip)] += clip
    return out
