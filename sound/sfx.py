"""Pustaka efek suara sintetis. Setiap fungsi mengembalikan mono float32 pada 48 kHz."""
import numpy as np

from dsp import SR, env_ad, highpass, lowpass, noise, normalize, sine, sweep


def _n(seconds: float) -> int:
    """Jumlah sampel sinkron 100% dengan `dsp.t_axis` (anti broadcast mismatch IEEE-754)."""
    return max(0, int(round(seconds * SR)))


def whoosh(seconds: float = 0.5) -> np.ndarray:
    n = _n(seconds)
    if n == 0 or seconds <= 0:
        return np.zeros(0, dtype=np.float32)
    x = noise(seconds, seed=3)
    sweepy = lowpass(x, 2500) * np.linspace(0.2, 1, len(x)) ** 2 + highpass(x, 3000) * 0.15
    return normalize(sweepy * env_ad(len(x), seconds * 0.6, seconds * 0.5))


def thud(seconds: float = 0.45) -> np.ndarray:
    n = _n(seconds)
    if n == 0 or seconds <= 0:
        return np.zeros(0, dtype=np.float32)
    body = sweep(110, 38, seconds) * env_ad(n, 0.002, 0.14)
    click = lowpass(noise(seconds, 5), 900) * env_ad(n, 0.001, 0.03) * 0.4
    return normalize(body + click)


def ding(freq: float = 1318.5, seconds: float = 0.9) -> np.ndarray:
    n = _n(seconds)
    if n == 0 or seconds <= 0:
        return np.zeros(0, dtype=np.float32)
    tone = sine(freq, seconds) + 0.4 * sine(freq * 2.01, seconds) + 0.2 * sine(freq * 3.97, seconds)
    # Dering pendek (seconds < 0,9) luruh lebih cepat supaya tidak terpotong mendadak; default tetap 0,28 dtk.
    return normalize(tone * env_ad(n, 0.002, min(0.28, seconds / 3)))


def pop(seconds: float = 0.12) -> np.ndarray:
    n = _n(seconds)
    if n == 0 or seconds <= 0:
        return np.zeros(0, dtype=np.float32)
    return normalize(sweep(900, 220, seconds) * env_ad(n, 0.001, 0.035))


def snap(seconds: float = 0.25) -> np.ndarray:
    n = _n(seconds)
    if n == 0 or seconds <= 0:
        return np.zeros(0, dtype=np.float32)
    crack = highpass(noise(seconds, 9), 1800) * env_ad(n, 0.0005, 0.02)
    return normalize(crack + thud(seconds) * 0.5)


def slap(seconds: float = 0.3) -> np.ndarray:
    n = _n(seconds)
    if n == 0 or seconds <= 0:
        return np.zeros(0, dtype=np.float32)
    crack = highpass(noise(seconds, 17), 1200) * env_ad(n, 0.0005, 0.035)
    body = sweep(190, 55, seconds) * env_ad(n, 0.001, 0.09)
    return normalize(crack * 0.9 + body * 0.7)


def keyclick(seconds: float = 0.08) -> np.ndarray:
    n = _n(seconds)
    if n == 0 or seconds <= 0:
        return np.zeros(0, dtype=np.float32)
    tick = highpass(noise(seconds, 23), 2400) * env_ad(n, 0.0005, 0.012)
    body = sweep(1600, 620, seconds) * env_ad(n, 0.0005, 0.018)
    return normalize(tick * 0.7 + body * 0.6)


def skid(seconds: float = 0.36) -> np.ndarray:
    n = _n(seconds)
    if n == 0 or seconds <= 0:
        return np.zeros(0, dtype=np.float32)
    t = np.arange(n, dtype=np.float32) / SR
    squeal = (sweep(1950, 1280, seconds) + 0.35 * sine(2480, seconds)) * (0.7 + 0.3 * np.sin(2 * np.pi * 24 * t))
    grit = highpass(noise(seconds, 31), 2200) * 0.25
    return normalize((squeal * 0.75 + grit) * env_ad(n, 0.01, 0.14))


def rewind(seconds: float = 0.45) -> np.ndarray:
    n = _n(seconds)
    if n == 0 or seconds <= 0:
        return np.zeros(0, dtype=np.float32)
    whirr = sweep(340, 1850, seconds) * 0.6 + sweep(680, 2600, seconds) * 0.3
    tape = highpass(noise(seconds, 41), 1600) * 0.2
    return normalize((whirr + tape) * env_ad(n, 0.03, 0.18))


def cricket(seconds: float = 0.95) -> np.ndarray:
    n = _n(seconds)
    if n == 0 or seconds <= 0:
        return np.zeros(0, dtype=np.float32)
    t = np.arange(n, dtype=np.float32) / SR
    carrier = sine(4250, seconds) + 0.35 * sine(8500, seconds)
    chirp_env = (np.sin(2 * np.pi * 4.2 * t) > 0.25).astype(np.float32) * (0.5 + 0.5 * np.sin(2 * np.pi * 38 * t))
    return normalize(carrier * chirp_env * env_ad(n, 0.04, 0.32))


def cup(seconds: float = 0.22) -> np.ndarray:
    """Gelas kaca/keramik diletakkan di meja kayu: *tak* bening + ketuk badan meja."""
    n = _n(seconds)
    if n == 0 or seconds <= 0:
        return np.zeros(0, dtype=np.float32)
    ring = (sine(2350, seconds) + 0.55 * sine(3720, seconds) + 0.3 * sine(5210, seconds)) * env_ad(n, 0.0004, 0.045)
    knock = lowpass(noise(seconds, 51), 700) * env_ad(n, 0.0005, 0.012) * 2.2
    wood = sweep(240, 120, seconds) * env_ad(n, 0.0008, 0.03) * 0.5
    return normalize(ring * 0.5 + knock + wood)


def swish(seconds: float = 0.16) -> np.ndarray:
    """Ayunan tangan pendek (wind-up), puncak di ujung."""
    n = _n(seconds)
    if n == 0 or seconds <= 0:
        return np.zeros(0, dtype=np.float32)
    x = lowpass(highpass(noise(seconds, 61), 600), 4200)
    shape = np.linspace(0, 1, n, dtype=np.float32) ** 2.2
    shape[int(n * 0.85):] *= np.linspace(1, 0, n - int(n * 0.85), dtype=np.float32)
    return normalize(x * shape)


def step(seconds: float = 0.11, seed: int = 71) -> np.ndarray:
    """Tapak sandal/sepatu di tanah: tumpul + sedikit pasir."""
    n = _n(seconds)
    if n == 0 or seconds <= 0:
        return np.zeros(0, dtype=np.float32)
    body = lowpass(noise(seconds, seed), 380) * env_ad(n, 0.002, 0.025) * 2.0
    grit = highpass(noise(seconds, seed + 1), 2500) * env_ad(n, 0.001, 0.012) * 0.25
    return normalize(body + grit)


def blip(seconds: float = 0.12) -> np.ndarray:
    """Angka error naik satu: bip digital pendek dua nada."""
    n = _n(seconds)
    if n == 0 or seconds <= 0:
        return np.zeros(0, dtype=np.float32)
    half = n // 2
    tone = np.concatenate([sine(880, half / SR), sine(1175, (n - half) / SR)])[:n]
    tone = np.pad(tone, (0, n - len(tone)))
    return normalize(np.sign(tone) * 0.4 * env_ad(n, 0.001, 0.06))


def alarm(seconds: float = 0.9, beeps: int = 4) -> np.ndarray:
    """Alarm jam digital: bip-bip-bip-bip persegi 2,7 kHz."""
    n = max(0, int(round(seconds * SR)))
    if n == 0 or beeps <= 0:
        return np.zeros(n, dtype=np.float32)
    t = np.arange(n, dtype=np.float32) / SR
    sq = np.sign(np.sin(2 * np.pi * 2730 * t)).astype(np.float32)
    gate = np.zeros(n, dtype=np.float32)
    period = seconds / beeps
    on = period * 0.55
    for b in range(beeps):
        i, j = int(b * period * SR), min(n, int((b * period + on) * SR))
        if j <= i:
            continue
        a = np.ones(j - i, dtype=np.float32)
        r = min(96, (j - i) // 4)
        if r > 0:
            a[:r] = np.linspace(0, 1, r)
            a[-r:] = np.linspace(1, 0, r)
        gate[i:j] = a
    return normalize(lowpass(sq * gate, 7000))


def typing(seconds: float = 0.75, clicks: int = 9, seed: int = 81) -> np.ndarray:
    """Ketikan cepat progresif (replay): rentetan keyclick dengan jitter kecil."""
    n = max(0, int(round(seconds * SR)))
    if n == 0 or clicks <= 0:
        return np.zeros(n, dtype=np.float32)
    out = np.zeros(n, dtype=np.float32)
    rng = np.random.default_rng(seed)
    k = keyclick()
    span = max(0, n - len(k))
    for c in range(clicks):
        i = int((c / clicks) * span + rng.uniform(-0.01, 0.01) * SR)
        i = max(0, min(span, i))
        m = min(len(k), n - i)
        if m > 0:
            out[i : i + m] += k[:m] * rng.uniform(0.55, 1.0)
    return normalize(out)


def book(seconds: float = 0.2) -> np.ndarray:
    """Buku nilai ditutup: tepuk kertas tumpul."""
    n = _n(seconds)
    if n == 0 or seconds <= 0:
        return np.zeros(0, dtype=np.float32)
    flap = lowpass(noise(seconds, 91), 1800) * env_ad(n, 0.003, 0.03)
    body = sweep(160, 70, seconds) * env_ad(n, 0.002, 0.05) * 0.6
    return normalize(flap + body)


def scribble(seconds: float = 2.0, rate_hz: float = 2.15, seed: int = 97) -> np.ndarray:
    """Pena mencoret buku nilai: desis kertas bandpass bergelombang mengikuti ayun tangan."""
    n = _n(seconds)
    if n == 0 or seconds <= 0:
        return np.zeros(0, dtype=np.float32)
    t = np.arange(n, dtype=np.float32) / SR
    x = lowpass(highpass(noise(seconds, seed), 1800), 6500)
    stroke = (0.5 + 0.5 * np.sin(2 * np.pi * rate_hz * t)) ** 2 * (0.7 + 0.3 * np.sin(2 * np.pi * 7.3 * t))
    edge = np.minimum(1, np.minimum(t, seconds - t) / 0.05)
    return normalize(x * stroke * edge)


def sruput(seconds: float = 0.3, seed: int = 113) -> np.ndarray:
    """Sesapan kopi panas *sruput*: hisap udara+cairan (desis bandpass naik) dengan gelembung halus, pendek & lembut.

    Energi di depan (bibir menempel), lalu meluruh cepat agar tidak menutupi kata yang menyusul.
    """
    n = max(0, int(round(seconds * SR)))
    if n == 0 or seconds <= 0:
        return np.zeros(0, dtype=np.float32)
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
        if m > 0:
            bubbles[i : i + m] += sine(f, m / SR)[:m] * env_ad(m, 0.001, 0.006) * rng.uniform(0.15, 0.3)
    shape = env_ad(n, seconds * 0.12, seconds * 0.35)
    return normalize((hiss * gurgle + bubbles) * shape, 0.7)


def pour(seconds: float = 0.7, seed: int = 131) -> np.ndarray:
    """Tuang es teh dari teko ke gelas: aliran cair (noise bandpass) dengan nada naik saat gelas terisi + denting es."""
    n = max(0, int(round(seconds * SR)))
    if n == 0 or seconds <= 0:
        return np.zeros(0, dtype=np.float32)
    t = np.arange(n, dtype=np.float32) / SR
    stream = lowpass(highpass(noise(seconds, seed), 500), 3500)
    gurgle = 0.6 + 0.4 * np.sin(2 * np.pi * (9 + 6 * t / seconds) * t)
    fill = sine(np.linspace(380, 900, n), seconds) * 0.12
    ice = np.zeros(n, dtype=np.float32)
    rng = np.random.default_rng(seed)
    for _ in range(3):
        i = int(rng.uniform(0.1, 0.7) * n)
        m = min(n - i, int(0.05 * SR))
        if m > 0:
            ice[i : i + m] += sine(rng.uniform(2600, 3400), m / SR)[:m] * env_ad(m, 0.0005, 0.015) * 0.35
    edge = np.minimum(1, np.minimum(t / 0.04, (seconds - t) / 0.12))
    return normalize((stream * gurgle + fill + ice) * edge, 0.7)


def velcro(seconds: float = 0.32, seed: int = 141) -> np.ndarray:
    """Dompet dibuka: sobekan perekat (rentetan klik kasar highpass) yang melambat."""
    n = max(0, int(round(seconds * SR)))
    if n == 0 or seconds <= 0:
        return np.zeros(0, dtype=np.float32)
    x = np.zeros(n, dtype=np.float32)
    rng = np.random.default_rng(seed)
    pos = 0.0
    gap = 0.004
    while pos < seconds * 0.9:
        i = int(pos * SR)
        m = min(n - i, int(0.006 * SR))
        if m > 0:
            x[i : i + m] += highpass(noise(m / SR, int(rng.integers(1, 9999))), 1500)[:m] * env_ad(m, 0.0003, 0.003)
        pos += gap
        gap *= 1.06
    return normalize(x * env_ad(n, 0.002, seconds * 0.6), 0.8)


def flutter(seconds: float = 1.0, wing_hz: float = 24.0, seed: int = 151) -> np.ndarray:
    """Kepak sayap ngengat: desis lembut teramplitudo cepat, menjauh (meredup) ke arah bohlam."""
    n = max(0, int(round(seconds * SR)))
    if n == 0 or seconds <= 0:
        return np.zeros(0, dtype=np.float32)
    t = np.arange(n, dtype=np.float32) / SR
    air = lowpass(highpass(noise(seconds, seed), 600), 4000)
    flap = (0.5 + 0.5 * np.sin(2 * np.pi * wing_hz * t)) ** 3
    away = np.clip(1 - t / seconds, 0, 1) ** 0.7
    return normalize(air * flap * away * np.minimum(1, t / 0.05), 0.6)


def ladle(seconds: float = 0.45, seed: int = 161) -> np.ndarray:
    """Sodet mengangkat mi dari dandang: kecipak air terangkat + tetes tiris + denting tipis sodet di bibir dandang."""
    n = max(0, int(round(seconds * SR)))
    if n == 0 or seconds <= 0:
        return np.zeros(0, dtype=np.float32)
    t = np.arange(n, dtype=np.float32) / SR
    rng = np.random.default_rng(seed)
    slosh = lowpass(highpass(noise(seconds, seed), 350), 1800) * env_ad(n, 0.03, 0.09)
    slosh *= 0.7 + 0.3 * np.sin(2 * np.pi * 13 * t)
    drips = np.zeros(n, dtype=np.float32)
    for k in range(5):
        i = max(0, int((0.12 + k * 0.055 + rng.uniform(-0.015, 0.015)) * SR))
        m = min(n - i, int(0.04 * SR))
        if m > 0:
            f0 = rng.uniform(1400, 2400)
            drips[i : i + m] += sine(np.linspace(f0, f0 * 1.4, m), m / SR)[:m] * env_ad(m, 0.0005, 0.008) * (0.45 - k * 0.06)
    m = min(n, int(0.12 * SR))
    rim = np.zeros(n, dtype=np.float32)
    if m > 0:
        rim[:m] = (sine(2650, m / SR)[:m] + 0.5 * sine(4130, m / SR)[:m]) * env_ad(m, 0.0005, 0.02) * 0.25
    edge = np.minimum(1, (seconds - t) / 0.05)
    return normalize((slosh + drips + rim) * edge, 0.7)


LIBRARY = {
    "ladle": ladle,
    "pour": pour,
    "velcro": velcro,
    "flutter": flutter,
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
