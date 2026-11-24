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


def slap(seconds: float = 0.3) -> np.ndarray:
    crack = highpass(noise(seconds, 17), 1200) * env_ad(int(seconds * SR), 0.0005, 0.035)
    body = sweep(190, 55, seconds) * env_ad(int(seconds * SR), 0.001, 0.09)
    return normalize(crack * 0.9 + body * 0.7)


def keyclick(seconds: float = 0.08) -> np.ndarray:
    n = int(seconds * SR)
    tick = highpass(noise(seconds, 23), 2400) * env_ad(n, 0.0005, 0.012)
    body = sweep(1600, 620, seconds) * env_ad(n, 0.0005, 0.018)
    return normalize(tick * 0.7 + body * 0.6)


def skid(seconds: float = 0.36) -> np.ndarray:
    n = int(seconds * SR)
    t = np.arange(n, dtype=np.float32) / SR
    squeal = (sweep(1950, 1280, seconds) + 0.35 * sine(2480, seconds)) * (0.7 + 0.3 * np.sin(2 * np.pi * 24 * t))
    grit = highpass(noise(seconds, 31), 2200) * 0.25
    return normalize((squeal * 0.75 + grit) * env_ad(n, 0.01, 0.14))


def rewind(seconds: float = 0.45) -> np.ndarray:
    n = int(seconds * SR)
    whirr = sweep(340, 1850, seconds) * 0.6 + sweep(680, 2600, seconds) * 0.3
    tape = highpass(noise(seconds, 41), 1600) * 0.2
    return normalize((whirr + tape) * env_ad(n, 0.03, 0.18))


def cricket(seconds: float = 0.95) -> np.ndarray:
    n = int(seconds * SR)
    t = np.arange(n, dtype=np.float32) / SR
    carrier = sine(4250, seconds) + 0.35 * sine(8500, seconds)
    chirp_env = (np.sin(2 * np.pi * 4.2 * t) > 0.25).astype(np.float32) * (0.5 + 0.5 * np.sin(2 * np.pi * 38 * t))
    return normalize(carrier * chirp_env * env_ad(n, 0.04, 0.32))


def cup(seconds: float = 0.22) -> np.ndarray:
    """Gelas kaca/keramik diletakkan di meja kayu: *tak* bening + ketuk badan meja."""
    n = int(seconds * SR)
    ring = (sine(2350, seconds) + 0.55 * sine(3720, seconds) + 0.3 * sine(5210, seconds)) * env_ad(n, 0.0004, 0.045)
    knock = lowpass(noise(seconds, 51), 700) * env_ad(n, 0.0005, 0.012) * 2.2
    wood = sweep(240, 120, seconds) * env_ad(n, 0.0008, 0.03) * 0.5
    return normalize(ring * 0.5 + knock + wood)


def swish(seconds: float = 0.16) -> np.ndarray:
    """Ayunan tangan pendek (wind-up), puncak di ujung."""
    n = int(seconds * SR)
    x = lowpass(highpass(noise(seconds, 61), 600), 4200)
    shape = np.linspace(0, 1, n, dtype=np.float32) ** 2.2
    shape[int(n * 0.85):] *= np.linspace(1, 0, n - int(n * 0.85), dtype=np.float32)
    return normalize(x * shape)


def step(seconds: float = 0.11, seed: int = 71) -> np.ndarray:
    """Tapak sandal/sepatu di tanah: tumpul + sedikit pasir."""
    n = int(seconds * SR)
    body = lowpass(noise(seconds, seed), 380) * env_ad(n, 0.002, 0.025) * 2.0
    grit = highpass(noise(seconds, seed + 1), 2500) * env_ad(n, 0.001, 0.012) * 0.25
    return normalize(body + grit)


def blip(seconds: float = 0.12) -> np.ndarray:
    """Angka error naik satu: bip digital pendek dua nada."""
    n = int(seconds * SR)
    half = n // 2
    tone = np.concatenate([sine(880, half / SR), sine(1175, (n - half) / SR)])[:n]
    tone = np.pad(tone, (0, n - len(tone)))
    return normalize(np.sign(tone) * 0.4 * env_ad(n, 0.001, 0.06))


def alarm(seconds: float = 0.9, beeps: int = 4) -> np.ndarray:
    """Alarm jam digital: bip-bip-bip-bip persegi 2,7 kHz."""
    n = int(seconds * SR)
    t = np.arange(n, dtype=np.float32) / SR
    sq = np.sign(np.sin(2 * np.pi * 2730 * t)).astype(np.float32)
    gate = np.zeros(n, dtype=np.float32)
    period = seconds / beeps
    on = period * 0.55
    for b in range(beeps):
        i, j = int(b * period * SR), int((b * period + on) * SR)
        a = np.ones(j - i, dtype=np.float32)
        r = min(96, (j - i) // 4)
        a[:r] = np.linspace(0, 1, r)
        a[-r:] = np.linspace(1, 0, r)
        gate[i:j] = a
    return normalize(lowpass(sq * gate, 7000))


def typing(seconds: float = 0.75, clicks: int = 9, seed: int = 81) -> np.ndarray:
    """Ketikan cepat progresif (replay): rentetan keyclick dengan jitter kecil."""
    n = int(seconds * SR)
    out = np.zeros(n, dtype=np.float32)
    rng = np.random.default_rng(seed)
    k = keyclick()
    for c in range(clicks):
        i = int((c / clicks) * (n - len(k)) + rng.uniform(-0.01, 0.01) * SR)
        i = max(0, min(n - len(k), i))
        out[i:i + len(k)] += k * rng.uniform(0.55, 1.0)
    return normalize(out)


def book(seconds: float = 0.2) -> np.ndarray:
    """Buku nilai ditutup: tepuk kertas tumpul."""
    n = int(seconds * SR)
    flap = lowpass(noise(seconds, 91), 1800) * env_ad(n, 0.003, 0.03)
    body = sweep(160, 70, seconds) * env_ad(n, 0.002, 0.05) * 0.6
    return normalize(flap + body)


def scribble(seconds: float = 2.0, rate_hz: float = 2.15, seed: int = 97) -> np.ndarray:
    """Pena mencoret buku nilai: desis kertas bandpass bergelombang mengikuti ayun tangan."""
    n = int(seconds * SR)
    t = np.arange(n, dtype=np.float32) / SR
    x = lowpass(highpass(noise(seconds, seed), 1800), 6500)
    stroke = (0.5 + 0.5 * np.sin(2 * np.pi * rate_hz * t)) ** 2 * (0.7 + 0.3 * np.sin(2 * np.pi * 7.3 * t))
    edge = np.minimum(1, np.minimum(t, seconds - t) / 0.05)
    return normalize(x * stroke * edge)


def sruput(seconds: float = 0.3, seed: int = 113) -> np.ndarray:
    """Sesapan kopi panas *sruput*: hisap udara+cairan (desis bandpass naik) dengan gelembung halus, pendek & lembut.

    Energi di depan (bibir menempel), lalu meluruh cepat agar tidak menutupi kata yang menyusul.
    """
    n = int(seconds * SR)
    t = np.arange(n, dtype=np.float32) / SR
    air = noise(seconds, seed)
    lo = lowpass(highpass(air, 900), 3200)
    hi = lowpass(highpass(air, 2600), 6000)
    rise = np.clip(t / (seconds * 0.45), 0, 1)
    hiss = lo * (1 - rise) + hi * rise
    rng = np.random.default_rng(seed + 1)
    gurgle = 0.55 + 0.45 * np.sin(2 * np.pi * (28 + 14 * t / seconds) * t + rng.uniform(0, 6.28))
    bubbles = np.zeros(n, dtype=np.float32)
    for c in range(5):
        i = int(rng.uniform(0.04, 0.6) * n)
        f = rng.uniform(700, 1300)
        m = min(n - i, int(0.025 * SR))
        bubbles[i:i + m] += sine(f, m / SR) * env_ad(m, 0.001, 0.006) * rng.uniform(0.15, 0.3)
    shape = env_ad(n, seconds * 0.12, seconds * 0.35)
    return normalize((hiss * gurgle + bubbles) * shape, 0.7)


LIBRARY = {
    "whoosh": whoosh,
    "thud": thud,
    "ding": ding,
    "pop": pop,
    "snap": snap,
    "slap": slap,
    "keyclick": keyclick,
    "skid": skid,
    "rewind": rewind,
    "cricket": cricket,
    "cup": cup,
    "swish": swish,
    "step": step,
    "blip": blip,
    "alarm": alarm,
    "typing": typing,
    "book": book,
    "scribble": scribble,
    "sruput": sruput,
}
