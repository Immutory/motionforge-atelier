"""Primitif DSP murni numpy. Semua fungsi mengembalikan array float32 pada SR."""
import numpy as np

SR = 48000


def t_axis(seconds: float) -> np.ndarray:
    n = max(0, int(round(seconds * SR)))
    return np.arange(n, dtype=np.float64) / SR


def sine(freq, seconds: float, phase: float = 0.0) -> np.ndarray:
    t = t_axis(seconds)
    if len(t) == 0:
        return np.zeros(0, dtype=np.float32)
    f = np.broadcast_to(np.asarray(freq, dtype=np.float64), t.shape)
    return np.sin(2 * np.pi * np.cumsum(f) / SR + phase).astype(np.float32)


def noise(seconds: float, seed: int = 0) -> np.ndarray:
    n = max(0, int(round(seconds * SR)))
    return np.random.default_rng(seed).uniform(-1, 1, n).astype(np.float32)


def env_ad(n: int, attack: float, decay: float) -> np.ndarray:
    """Envelope serang-luruh eksponensial, panjang n sampel."""
    if n <= 0:
        return np.zeros(0, dtype=np.float32)
    a = min(n, max(1, int(round(attack * SR))))
    e = np.exp(-np.arange(n, dtype=np.float64) / max(1.0, decay * SR))
    e[:a] *= np.linspace(0, 1, a)
    return e.astype(np.float32)


def lowpass(x: np.ndarray, cutoff: float) -> np.ndarray:
    if len(x) == 0:
        return np.zeros(0, dtype=np.float32)
    spec = np.fft.rfft(x)
    freqs = np.fft.rfftfreq(len(x), 1 / SR)
    spec[freqs > cutoff] = 0
    return np.fft.irfft(spec, len(x)).astype(np.float32)


def highpass(x: np.ndarray, cutoff: float) -> np.ndarray:
    if len(x) == 0:
        return np.zeros(0, dtype=np.float32)
    return (x - lowpass(x, cutoff)).astype(np.float32)


def sweep(f0: float, f1: float, seconds: float) -> np.ndarray:
    """Frekuensi bergerak eksponensial dari f0 ke f1 (fallback linear bila f0/f1 <= 0)."""
    if seconds <= 0:
        return np.zeros(0, dtype=np.float32)
    t = t_axis(seconds)
    if len(t) == 0:
        return np.zeros(0, dtype=np.float32)
    if f0 > 0 and f1 > 0:
        f = f0 * (f1 / f0) ** (t / seconds)
    else:
        f = f0 + (f1 - f0) * (t / seconds)
    return sine(f, seconds)


def normalize(x: np.ndarray, peak: float = 0.9) -> np.ndarray:
    if len(x) == 0:
        return np.zeros(0, dtype=np.float32)
    m = float(np.max(np.abs(x))) or 1.0
    return (x * (peak / m)).astype(np.float32)
