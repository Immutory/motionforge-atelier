"""Primitif DSP murni numpy. Semua fungsi mengembalikan array float32 pada SR."""
import numpy as np

SR = 48000


def t_axis(seconds: float) -> np.ndarray:
    return np.arange(int(seconds * SR), dtype=np.float64) / SR


def sine(freq, seconds: float, phase: float = 0.0) -> np.ndarray:
    t = t_axis(seconds)
    f = np.broadcast_to(np.asarray(freq, dtype=np.float64), t.shape)
    return np.sin(2 * np.pi * np.cumsum(f) / SR + phase).astype(np.float32)


def noise(seconds: float, seed: int = 0) -> np.ndarray:
    return np.random.default_rng(seed).uniform(-1, 1, int(seconds * SR)).astype(np.float32)


def env_ad(n: int, attack: float, decay: float) -> np.ndarray:
    """Envelope serang-luruh eksponensial, panjang n sampel."""
    a = max(1, int(attack * SR))
    e = np.exp(-np.arange(n) / max(1.0, decay * SR))
    e[:a] *= np.linspace(0, 1, a)
    return e.astype(np.float32)


def lowpass(x: np.ndarray, cutoff: float) -> np.ndarray:
    spec = np.fft.rfft(x)
    freqs = np.fft.rfftfreq(len(x), 1 / SR)
    spec[freqs > cutoff] = 0
    return np.fft.irfft(spec, len(x)).astype(np.float32)


def highpass(x: np.ndarray, cutoff: float) -> np.ndarray:
    return (x - lowpass(x, cutoff)).astype(np.float32)


def sweep(f0: float, f1: float, seconds: float) -> np.ndarray:
    """Frekuensi bergerak eksponensial dari f0 ke f1."""
    t = t_axis(seconds)
    return sine(f0 * (f1 / f0) ** (t / seconds), seconds)


def normalize(x: np.ndarray, peak: float = 0.9) -> np.ndarray:
    m = float(np.max(np.abs(x))) or 1.0
    return (x * (peak / m)).astype(np.float32)
