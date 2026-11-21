"""Pustaka efek suara sintetis. Setiap fungsi mengembalikan mono float32 pada 48 kHz."""
import numpy as np

from dsp import SR, env_ad, highpass, lowpass, noise, normalize, sine, sweep


def whoosh(seconds: float = 0.5) -> np.ndarray:
    n = noise(seconds, seed=3)
    sweepy = lowpass(n, 2500) * np.linspace(0.2, 1, len(n)) ** 2 + highpass(n, 3000) * 0.15
    return normalize(sweepy * env_ad(len(n), seconds * 0.6, seconds * 0.5))


def thud(seconds: float = 0.45) -> np.ndarray:
    body = sweep(110, 38, seconds) * env_ad(int(seconds * SR), 0.002, 0.14)
    click = lowpass(noise(seconds, 5), 900) * env_ad(int(seconds * SR), 0.001, 0.03) * 0.4
    return normalize(body + click)


def ding(freq: float = 1318.5, seconds: float = 0.9) -> np.ndarray:
    n = int(seconds * SR)
    tone = sine(freq, seconds) + 0.4 * sine(freq * 2.01, seconds) + 0.2 * sine(freq * 3.97, seconds)
    return normalize(tone * env_ad(n, 0.002, 0.28))


def pop(seconds: float = 0.12) -> np.ndarray:
    return normalize(sweep(900, 220, seconds) * env_ad(int(seconds * SR), 0.001, 0.035))


def snap(seconds: float = 0.25) -> np.ndarray:
    crack = highpass(noise(seconds, 9), 1800) * env_ad(int(seconds * SR), 0.0005, 0.02)
    return normalize(crack + thud(seconds) * 0.5)


LIBRARY = {"whoosh": whoosh, "thud": thud, "ding": ding, "pop": pop, "snap": snap}
