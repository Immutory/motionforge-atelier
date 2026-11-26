"""Loudness ITU-R BS.1770-4 (LUFS terintegrasi bergating), true peak 4x oversampling, dan limiter true-peak.

Murni numpy + scipy. Dipakai `mix.py` untuk mastering ke target short-form (default -16 LUFS, <= -1.5 dBTP).
"""
from __future__ import annotations

import numpy as np
from scipy.ndimage import minimum_filter1d, uniform_filter1d
from scipy.signal import lfilter, resample_poly

from dsp import SR

# Koefisien K-weighting BS.1770 untuk 48 kHz (pre-filter shelf + RLB high-pass).
_PRE_B = [1.53512485958697, -2.69169618940638, 1.19839281085285]
_PRE_A = [1.0, -1.69065929318241, 0.73248077421585]
_RLB_B = [1.0, -2.0, 1.0]
_RLB_A = [1.0, -1.99004745483398, 0.99007225036621]


def integrated_lufs(x: np.ndarray, sr: int = SR) -> float:
    if sr != 48000:
        raise ValueError(f"koefisien K-weighting khusus 48000 Hz, bukan {sr} Hz")
    block, hop = int(0.4 * sr), int(0.1 * sr)
    if len(x) < block:
        return -70.0
    y = lfilter(_RLB_B, _RLB_A, lfilter(_PRE_B, _PRE_A, x.astype(np.float64)))
    sq = np.concatenate([[0.0], np.cumsum(y * y)])
    starts = np.arange(0, len(y) - block + 1, hop)
    ms = (sq[starts + block] - sq[starts]) / block
    lk = -0.691 + 10 * np.log10(np.maximum(ms, 1e-12))
    ms = ms[lk > -70]
    if not len(ms):
        return -70.0
    rel = -0.691 + 10 * np.log10(ms.mean()) - 10
    lk = -0.691 + 10 * np.log10(np.maximum(ms, 1e-12))
    gated = ms[lk > rel]
    return float(-0.691 + 10 * np.log10(gated.mean())) if len(gated) else -70.0


def _oversampled_peaks(x: np.ndarray, os: int = 4) -> np.ndarray:
    """Puncak absolut antar-sampel per sampel asli (maks dari os sub-sampel + tetangga edge-padded)."""
    if len(x) == 0:
        return np.zeros(0, dtype=np.float64)
    up = resample_poly(x.astype(np.float64), os, 1)[: len(x) * os]
    pk = np.abs(up).reshape(len(x), os).max(axis=1)
    if len(pk) == 1:
        return pk
    left = np.concatenate([[pk[0]], pk[:-1]])
    right = np.concatenate([pk[1:], [pk[-1]]])
    return np.maximum(pk, np.maximum(left, right))


def true_peak_dbtp(x: np.ndarray) -> float:
    if len(x) == 0:
        return -120.0
    return float(20 * np.log10(max(1e-12, float(_oversampled_peaks(x).max()))))


def tp_limit(x: np.ndarray, ceiling_db: float = -1.5, lookahead_ms: float = 1.5, release_ms: float = 60.0) -> np.ndarray:
    """Limiter brickwall true-peak dengan lookahead; gain(n) <= ceiling/puncak(n) untuk setiap n."""
    if len(x) == 0:
        return np.zeros(0, dtype=np.float32)
    ceil = 10 ** (ceiling_db / 20)
    req = np.minimum(1.0, ceil / np.maximum(_oversampled_peaks(x), 1e-12))
    a = max(1, int(lookahead_ms / 1000 * SR))
    r = max(a, int(release_ms / 1000 * SR))
    # g1(n) = min req di [n - r, n + 2a]; rata-rata g1 di [n - a, n + a] tetap <= req(n).
    size = r + 2 * a + 1
    h = size // 2
    cen = minimum_filter1d(req, size=size, mode="nearest")  # mencakup [c - h, c + (size-1-h)]
    shift = h - r  # g1(n) = cen(n + shift) -> jendela [n - r, n + 2a]
    idx = np.clip(np.arange(len(req)) + shift, 0, len(req) - 1)
    g1 = cen[idx]
    g = uniform_filter1d(g1, size=2 * a + 1, mode="nearest")
    g = np.minimum(g, req)
    return (x * g).astype(np.float32)


def master(x: np.ndarray, target_lufs: float = -16.0, tp_db: float = -1.5, margin_db: float = 0.5) -> tuple[np.ndarray, dict]:
    """Gain ke target LUFS lalu limiter true-peak; iterasi sampai keduanya tepat (±0,1 LU).

    Aman terhadap audio hening, terlalu pendek (< 0.4 dtk), atau di bawah -70 LUFS (tidak meledakkan gain).
    """
    ceiling = tp_db - margin_db
    y = x.astype(np.float32)
    in_lufs = integrated_lufs(y)
    if len(y) == 0 or not np.any(y) or len(y) < int(0.4 * SR) or in_lufs <= -69.9:
        out = tp_limit(y, ceiling_db=ceiling) if len(y) > 0 else y
        return out, {
            "lufs": integrated_lufs(out),
            "true_peak_dbtp": true_peak_dbtp(out),
            "gain_db": 0.0,
            "ceiling_db": ceiling,
        }

    gain_db = float(np.clip(target_lufs - in_lufs, -40.0, 30.0))
    used_gain = gain_db
    used_ceiling = ceiling
    out = y
    for _ in range(6):
        used_gain = gain_db
        used_ceiling = ceiling
        out = tp_limit(y * (10 ** (used_gain / 20)), ceiling_db=used_ceiling)
        l = integrated_lufs(out)
        tp = true_peak_dbtp(out)
        if abs(l - target_lufs) <= 0.05 and tp <= tp_db - 0.2:
            break
        if tp > tp_db - 0.2:
            ceiling -= 0.2
        if l > -69.9:
            gain_db = float(np.clip(gain_db + (target_lufs - l), -40.0, 30.0))
    return out, {
        "lufs": integrated_lufs(out),
        "true_peak_dbtp": true_peak_dbtp(out),
        "gain_db": used_gain,
        "ceiling_db": used_ceiling,
    }
