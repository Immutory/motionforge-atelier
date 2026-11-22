"""Bangun audio master Teaser Vertikal 9:16 (26.0 detik = 780 frame @ 30 fps) untuk:
- YouTube Shorts, TikTok, Instagram Reels, dan Facebook Reels!
- Menggunakan 100% potongan suara rekaman VO asli user (`vo_bang_utoh.wav`) tanpa TTS,
  dirangkai menjadi trailer cliffhanger cepat yang bikin penasaran (STOP sebelum bocorin 'lupa titik koma!')
  lalu mengarahkan penonton ke Full Episode #1 di YouTube Bang Utoh!

Pakai: node pipeline/py.mjs productions/ep01_bang_utoh_short/build_short_audio.py
"""
import json
import math
import re
import shutil
import subprocess
import sys
import wave
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT / "sound"))
from dsp import SR, env_ad, lowpass, normalize  # noqa: E402
from sfx import LIBRARY  # noqa: E402

PROD_DIR = Path(__file__).resolve().parent
VOICE_SRC = ROOT / "productions" / "ep01_bang_utoh_vlog" / "voice" / "vo_bang_utoh.wav"
VOICE_DIR = PROD_DIR / "voice"
VOICE_DIR.mkdir(parents=True, exist_ok=True)
OUT_DIR = ROOT / "out" / "ep01-bang-utoh-short"
OUT_DIR.mkdir(parents=True, exist_ok=True)
PUBLIC_DIR = ROOT / "public"
PUBLIC_DIR.mkdir(parents=True, exist_ok=True)

FPS = 30
TOTAL_SEC = 26.0
TOTAL_FRAMES = int(TOTAL_SEC * FPS)  # 780 frame

# Potongan klip dari vo_bang_utoh.wav asli user -> disusun menjadi Teaser Cliffhanger 26.0 detik:
# Format: (src_start, src_end, dst_start, tag, text)
# Perhatikan: sengaja TIDAK memasukkan "Ya ampun, lupa titik koma!" (64.86..67.21) agar penonton penasaran!
CLIPS = [
    # 1. HOOK CEPAT (0.08s..3.15s): "Halo teman-teman! Kenalin, nama asli gue Bolohoutoh. Tapi panggil aja Bang Utoh."
    (0.08, 0.97, 0.08, "hook", "Halo teman-teman!"),
    (4.13, 4.62, 1.08, "hook", "Kenalin,"),
    (4.96, 6.54, 1.62, "hook_name", "nama asli gue Bolohoutoh."),
    (7.00, 8.42, 3.28, "hook_name", "Tapi panggil aja Bang Utoh."),

    # 2. IDENTITAS & OOTD RAPID CUTS (4.82s..9.45s): "hoodie himpunan, headphone, kacamata anti-radiasi!"
    (8.88, 11.32, 4.82, "identity", "Gue mahasiswa S1 Teknik Informatika"),
    (15.87, 16.82, 7.36, "ootd_hoodie", "hoodie himpunan,"),
    (17.09, 17.68, 8.38, "ootd_hp", "headphone,"),
    (18.02, 19.37, 9.05, "ootd_glass", "kacamata anti-radiasi,"),

    # 3. FAST ROOM TOUR MONTAGE (10.55s..14.60s): "Yuk, gue ajak tur markas kecil gue! Meja ngoding dual-monitor, dua kardus mie instan,"
    (22.24, 24.18, 10.52, "tour_lead", "Yuk, gue ajak tur markas kecil gue!"),
    (35.87, 37.35, 12.58, "desk_mon", "Meja ngoding dual-monitor,"),
    (49.83, 51.12, 14.15, "surv_mie", "dua kardus mie instan,"),

    # 4. SETUP KEBAHAGIAAN PALSU (15.58s..19.25s): "Asyik! Kodingan tugas hari ini udah kelar 100%. Tinggal tidur nyenyak!"
    (55.23, 55.95, 15.58, "setup_joy", "Asyik!"),
    (56.40, 58.82, 16.38, "setup_smug", "Kodingan tugas hari ini udah kelar 100%."),
    (59.20, 60.13, 18.88, "setup_smug", "Tinggal tidur nyenyak!"),

    # 5. THE CLIFFHANGER PLOT-TWIST (19.95s..23.30s): "Eh, tunggu... Loh?! Kok tiba-tiba muncul error 47 baris?!" -> CUT/FREEZE PENASARAN!
    (60.66, 61.14, 19.95, "shock_wait", "Eh, tunggu..."),
    (61.57, 61.74, 20.65, "shock_hit", "Loh?!"),
    (62.20, 64.44, 21.02, "shock_err", "Kok tiba-tiba muncul error 47 baris?!"),

    # 6. CTA YOUTUBE OUTRO (23.55s..25.75s): "Jangan lupa like, komen, dan subscribe! Dadah!"
    (73.28, 75.46, 23.48, "cta_yt", "Jangan lupa like, komen, dan subscribe"),
    (78.66, 79.09, 25.35, "cta_bye", "Dadah!"),
]

SPOKEN_VOWELS = {
    "100": 5,
    "47": 6,
    "s1": 3,
}

SPOKEN_PHONETIC = {
    "100": "seratuspersen",
    "47": "empatpuluhtujuh",
    "s1": "essatu",
}

CUSTOM_CHUNKS: dict[str, list[str]] = {
    "nama asli gue Bolohoutoh.": ["nama asli gue", "Bolohoutoh."],
    "Tapi panggil aja Bang Utoh.": ["Tapi panggil aja", "Bang Utoh."],
    "Gue mahasiswa S1 Teknik Informatika": ["Gue mahasiswa", "S1 Teknik", "Informatika"],
    "Yuk, gue ajak tur markas kecil gue!": ["Yuk, gue ajak", "tur markas", "kecil gue!"],
    "Kodingan tugas hari ini udah kelar 100%.": ["Kodingan tugas", "hari ini", "udah kelar", "100%."],
    "Kok tiba-tiba muncul error 47 baris?!": ["Kok tiba-tiba", "muncul error", "47 baris?!"],
    "Jangan lupa like, komen, dan subscribe": ["Jangan lupa", "like, komen,", "dan subscribe!"],
}


def read_wav_mono(path: Path) -> np.ndarray:
    with wave.open(str(path), "rb") as w:
        raw = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0
        return raw.reshape(-1, w.getnchannels()).mean(axis=1)


def write_wav_mono(path: Path, x: np.ndarray) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    pcm = (np.clip(x, -1.0, 1.0) * 32767.0).astype(np.int16)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def syllable_weight(word: str) -> float:
    w = re.sub(r"[^a-zA-Z0-9]", "", word).lower()
    if not w:
        return 1.0
    if w in SPOKEN_VOWELS:
        return float(SPOKEN_VOWELS[w]) + 0.35
    v = len(re.findall(r"[aiueo]+", w))
    return float(max(1, v)) + 0.12 * len(w)


def synth_upbeat_short_bgm(seconds: float) -> np.ndarray:
    """BGM 94 BPM snappy Lo-Fi/Chill-Hop khusus Short/TikTok/Reels agar ritme terasa cepat & nagih."""
    n = int(seconds * SR)
    bgm = np.zeros(n, dtype=np.float32)
    beat = 60.0 / 94.0
    bar = beat * 4.0
    chords = [
        [174.61, 220.00, 261.63, 329.63],
        [146.83, 174.61, 220.00, 261.63],
        [164.81, 196.00, 246.94, 293.66],
        [130.81, 164.81, 196.00, 246.94],
    ]
    for b in range(int(math.ceil(seconds / bar))):
        s0 = b * bar
        i0 = int(s0 * SR)
        seg_n = min(n - i0, int(bar * SR))
        if seg_n <= 0:
            break
        lt = np.arange(seg_n, dtype=np.float32) / SR
        env = np.minimum(1.0, lt / 0.03) * np.exp(-lt * 0.65)
        chord = np.zeros(seg_n, dtype=np.float32)
        for freq in chords[b % len(chords)]:
            chord += np.sin(2 * np.pi * freq * lt) * 0.21 + np.sin(2 * np.pi * freq * 2 * lt) * 0.04
        bass = np.sin(2 * np.pi * (chords[b % len(chords)][0] * 0.5) * lt) * 0.30 * np.exp(-lt * 0.8)
        bgm[i0 : i0 + seg_n] += (chord + bass) * env
        for kb in [0.0, 1.5, 2.5]:
            ki = int((s0 + kb * beat) * SR)
            kn = min(n - ki, int(0.14 * SR))
            if kn > 0 and ki < n:
                kt = np.arange(kn, dtype=np.float32) / SR
                ph = 2 * np.pi * np.cumsum(98.0 * np.exp(-kt * 28.0) + 44.0) / SR
                bgm[ki : ki + kn] += np.sin(ph) * np.exp(-kt * 20.0) * 0.24
        for sb in [1.0, 3.0]:
            si = int((s0 + sb * beat) * SR)
            sn = min(n - si, int(0.07 * SR))
            if sn > 0 and si < n:
                st = np.arange(sn, dtype=np.float32) / SR
                rng = np.random.default_rng(500 + b * 13 + int(sb))
                bgm[si : si + sn] += rng.standard_normal(sn).astype(np.float32) * np.exp(-st * 52.0) * 0.085

    bgm = lowpass(bgm, 2300.0)
    fi, fo = min(n, int(0.35 * SR)), min(n, int(0.9 * SR))
    bgm[:fi] *= np.linspace(0, 1, fi, dtype=np.float32)
    bgm[-fo:] *= np.linspace(1, 0, fo, dtype=np.float32)
    return normalize(bgm) * 0.19


def sfx_error_buzz(seconds: float = 0.48) -> np.ndarray:
    n = int(seconds * SR)
    t = np.arange(n, dtype=np.float32) / SR
    sq = np.sign(np.sin(2 * np.pi * 150.0 * t)) * 0.5 + np.sign(np.sin(2 * np.pi * 158.0 * t)) * 0.5
    sq = lowpass(sq.astype(np.float32), 1400.0)
    return normalize(sq * env_ad(n, 0.004, seconds * 0.80))


def main() -> None:
    vo_src = read_wav_mono(VOICE_SRC)
    n_total = int(TOTAL_SEC * SR)
    voice_bus = np.zeros(n_total, dtype=np.float32)

    words_out = []
    caps_out = []

    fade_n = int(0.018 * SR)
    fade_in = np.linspace(0.0, 1.0, fade_n, dtype=np.float32)
    fade_out = np.linspace(1.0, 0.0, fade_n, dtype=np.float32)

    for src_st, src_en, dst_st, tag, text in CLIPS:
        i_src0 = max(0, int(src_st * SR))
        i_src1 = min(len(vo_src), int(src_en * SR))
        seg = vo_src[i_src0:i_src1].copy()
        if len(seg) > 2 * fade_n:
            seg[:fade_n] *= fade_in
            seg[-fade_n:] *= fade_out
        i_dst0 = max(0, int(dst_st * SR))
        i_dst1 = min(n_total, i_dst0 + len(seg))
        voice_bus[i_dst0:i_dst1] += seg[: i_dst1 - i_dst0]

        dur = max(0.08, (i_dst1 - i_dst0) / SR)
        st = dst_st
        en = dst_st + dur

        toks = text.split()
        weights = [syllable_weight(t) for t in toks]
        tot_w = sum(weights) or 1.0
        cur = st
        phrase_words = []
        for tok, wt in zip(toks, weights):
            wdur = dur * (wt / tot_w)
            clean_tok = re.sub(r"[^a-zA-Z0-9]", "", tok).lower()
            spoken_tok = SPOKEN_PHONETIC.get(clean_tok, tok)
            wobj = {"text": spoken_tok, "display": tok, "start": round(cur, 3), "end": round(cur + wdur, 3), "tag": tag}
            words_out.append(wobj)
            phrase_words.append({"text": tok, "start": wobj["start"], "end": wobj["end"], "tag": tag})
            cur += wdur

        if text in CUSTOM_CHUNKS:
            chunks = CUSTOM_CHUNKS[text]
            c_weights = [sum(syllable_weight(x) for x in ch.split()) for ch in chunks]
            c_tot = sum(c_weights) or 1.0
            ccur = st
            for ch, cwt in zip(chunks, c_weights):
                cdur = dur * (cwt / c_tot)
                caps_out.append({
                    "start": round(ccur, 3),
                    "end": round(ccur + cdur, 3),
                    "text": ch,
                    "tag": tag,
                })
                ccur += cdur
        else:
            i = 0
            while i < len(phrase_words):
                w1 = phrase_words[i]
                solo_triggers = ("headphone", "asyik", "loh", "dadah", "kenalin")
                clean1 = re.sub(r"[^a-z0-9]", "", w1["text"].lower())
                if i + 1 >= len(phrase_words) or any(k in clean1 for k in solo_triggers) or len(w1["text"]) >= 11:
                    caps_out.append({
                        "start": w1["start"],
                        "end": round(w1["end"], 3),
                        "text": w1["text"],
                        "tag": tag,
                    })
                    i += 1
                else:
                    w2 = phrase_words[i + 1]
                    caps_out.append({
                        "start": w1["start"],
                        "end": round(w2["end"], 3),
                        "text": f"{w1['text']} {w2['text']}",
                        "tag": tag,
                    })
                    i += 2

    # Post-pass: 0 overlap, tahan caption singkat memanfaatkan jeda napas
    for idx in range(len(caps_out)):
        c = caps_out[idx]
        next_start = caps_out[idx + 1]["start"] if idx + 1 < len(caps_out) else TOTAL_SEC
        gap_avail = next_start - c["end"]
        cur_dur = c["end"] - c["start"]
        if gap_avail > 0.02:
            need = max(0.05, 0.48 - cur_dur)
            c["end"] = round(c["end"] + min(gap_avail - 0.01, need), 3)
        else:
            c["end"] = round(min(c["end"], next_start), 3)

    # Hitung amplop RMS per-frame (780 nilai 0..100) untuk lip-sync
    spf = SR // FPS
    frame_rms = []
    for f in range(TOTAL_FRAMES):
        chunk = voice_bus[f * spf : (f + 1) * spf]
        r = float(np.sqrt(np.mean(chunk * chunk))) if len(chunk) else 0.0
        frame_rms.append(r)
    rms_p95 = float(np.percentile(frame_rms, 95)) or 0.1
    voice_env_int = [int(round(min(1.0, r / rms_p95) * 100)) for r in frame_rms]

    vp = float(np.max(np.abs(voice_bus))) or 1.0
    voice_bus = voice_bus * (0.85 / vp)

    # SFX sinematik rapat untuk retensi Short/TikTok/Reels!
    sfx_events = [
        (0.06, "pop", -7),
        (1.05, "whoosh", -8),
        (2.40, "ding", -9),        # "Bolohoutoh."
        (4.05, "pop", -7),         # "Bang Utoh."
        (4.80, "whoosh", -8),      # S1 TI
        (7.34, "pop", -7),         # "hoodie himpunan"
        (8.36, "pop", -6),         # "headphone"
        (9.03, "ding", -8),        # "kacamata anti-radiasi"
        (10.48, "whoosh", -6),     # "Yuk, gue ajak tur!"
        (12.48, "whoosh", -5),     # Wipe #1 -> Dual monitor
        (14.08, "whoosh", -5),     # Wipe #2 -> Mie instan
        (15.55, "ding", -7),       # "Asyik!"
        (18.10, "pop", -8),        # "100%"
        (19.92, "pop", -7),        # "Eh, tunggu..."
        (20.15, "snap", -10),      # Monitor flicker merah #1
        (20.42, "snap", -9),       # Monitor flicker merah #2
        # CLIFFHANGER EXPLOSION DI "LOH?!" (20.65s = f619)!
        (20.62, "snap", -2),
        (20.65, "thud", -2),
        (20.72, "error_buzz", -5),
        (22.35, "thud", -5),       # "47 baris?!"
        (23.38, "whoosh", -5),     # Kartu CTA "FULL EP. 1 DI YOUTUBE!" masuk!
        (23.45, "ding", -7),
        (24.80, "ding", -8),       # "subscribe!"
        (25.32, "pop", -7),        # "Dadah!"
    ]

    sfx_bus = np.zeros(n_total, dtype=np.float32)
    for at, name, gain_db in sfx_events:
        clip = sfx_error_buzz() if name == "error_buzz" else LIBRARY[name]()
        clip = clip * (10.0 ** (gain_db / 20.0))
        i = max(0, int(at * SR))
        j = min(n_total, i + len(clip))
        if i < n_total:
            sfx_bus[i:j] += clip[: j - i]

    bgm_bus = synth_upbeat_short_bgm(TOTAL_SEC)
    # Matikan BGM mendadak saat Cliffhanger ("Eh, tunggu... Loh?! ... error 47 baris?!")
    bgm_bus[int(19.90 * SR) : int(23.40 * SR)] *= 0.06

    k = int(0.08 * SR)
    v_env = np.convolve(np.abs(voice_bus), np.ones(k, dtype=np.float32) / k, mode="same")
    speech_mask = np.clip(v_env * 10.0, 0.0, 1.0)
    raw_mix = voice_bus + bgm_bus * (1.0 - 0.65 * speech_mask) + sfx_bus * (1.0 - 0.28 * speech_mask)

    raw_mix_path = OUT_DIR / "mix_raw.wav"
    norm_mix_path = OUT_DIR / "mix.wav"
    write_wav_mono(raw_mix_path, raw_mix)

    subprocess.run(
        [
            "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
            "-i", str(raw_mix_path),
            "-af", "loudnorm=I=-14.5:TP=-1.8:LRA=9:linear=true",
            "-ar", str(SR), "-ac", "2", str(norm_mix_path),
        ],
        check=True,
    )
    shutil.copy2(norm_mix_path, PUBLIC_DIR / "ep01_bang_utoh_short_mix.wav")

    ts = [
        "import type { Word } from '../../../engine';",
        "",
        f"export const SHORT_FPS = {FPS};",
        f"export const SHORT_FRAMES = {TOTAL_FRAMES};",
        "export const SHORT_AUDIO = 'ep01_bang_utoh_short_mix.wav';",
        f"export const SHORT_SHOCK_FRAME = {round(20.65 * FPS)};",
        f"export const SHORT_CTA_FRAME = {round(23.40 * FPS)};",
        "",
        "export type ShortCaption = { start: number; end: number; text: string; tag: string };",
        f"export const SHORT_CAPTIONS: ShortCaption[] = {json.dumps(caps_out, indent=2, ensure_ascii=False)};",
        "",
        f"export const SHORT_WORDS: Word[] = {json.dumps([{'text': w['text'], 'start': w['start'], 'end': w['end']} for w in words_out], indent=2, ensure_ascii=False)};",
        "",
        f"export const SHORT_VOICE_ENV: number[] = {json.dumps(voice_env_int)};",
        "",
    ]
    (VOICE_DIR / "words_short.ts").write_text("\n".join(ts), encoding="utf-8")
    print(f"BUILT {TOTAL_SEC}s ({TOTAL_FRAMES}f) 9:16 Short/TikTok/Reels master audio! Words={len(words_out)}, Caps={len(caps_out)}")


if __name__ == "__main__":
    main()
