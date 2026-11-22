"""Bangun audio master 80.0 detik (2400 frame @ 30 fps) dari VO rekaman asli user (`vo_bang_utoh.wav`):
- Menjaga suara asli user 100% natural (tanpa atempo/speedup!).
- Memetakan 37 frasa ucapan eksak hasil analisis waveform menjadi:
  - `EP01_WORDS` (auto lip-sync vokal per suku kata)
  - `EP01_CAPTIONS` (subtitle punchy 1-2 kata ala contohvideo, tanpa box!)
  - `EP01_VOICE_ENV` (energi RMS per-frame 0..100 agar mulut 100% sinkron dengan suara nyata)
- Mencampur BGM Lo-Fi anak kost + SFX sinematik (whoosh wipe, pop, ding, snap/thud/error saat 'Loh?!')
  dan normalisasi EBU R128 (-14.5 LUFS) lulus npm run qa.

Pakai: node pipeline/py.mjs productions/ep01_bang_utoh_vlog/build_ep01_audio.py
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
VOICE_DIR = PROD_DIR / "voice"
OUT_DIR = ROOT / "out" / "ep01-bang-utoh-vlog"
OUT_DIR.mkdir(parents=True, exist_ok=True)
PUBLIC_DIR = ROOT / "public"
PUBLIC_DIR.mkdir(parents=True, exist_ok=True)

FPS = 30
TOTAL_SEC = 80.0
TOTAL_FRAMES = int(TOTAL_SEC * FPS)

# 37 frasa eksak hasil deteksi waveform pada vo_bang_utoh.wav (79.308s) + teks asli user
# Format: (start_s, end_s, tag, text)
PHRASES = [
    (0.09, 0.96, "opening", "Halo teman-teman!"),
    (1.29, 3.62, "opening", "Selamat datang di episode pertama vlog gue."),
    (4.14, 4.61, "intro_name", "Kenalin,"),
    (4.97, 6.53, "intro_name", "nama asli gue Bolohoutoh."),
    (7.01, 8.41, "intro_name", "Tapi panggil aja Bang Utoh."),
    (8.89, 13.56, "identity", "Gue mahasiswa S1 Teknik Informatika yang hidup merantau sebagai anak kos."),
    (14.10, 15.49, "identity", "Sehari-hari ya begini,"),
    (15.88, 16.81, "ootd_hoodie", "hoodie himpunan,"),
    (17.10, 17.67, "ootd_hp", "headphone,"),
    (18.03, 19.36, "ootd_glass", "kacamata anti-radiasi,"),
    (19.67, 21.72, "ootd_laptop", "sama laptop yang hampir nggak pernah tidur."),
    (22.25, 22.42, "tour_lead", "Yuk,"),
    (22.71, 24.17, "tour_lead", "gue ajak tur markas kecil gue!"),
    (24.80, 31.87, "bed_tour", "Di sebelah kiri ini ada kasur andalan plus jam weker merah yang tiap pagi selalu kalah lawan rasa ngantuk kuliah jam tujuh."),
    (32.34, 32.71, "desk_lead", "Nah,"),
    (33.01, 35.49, "desk_lead", "di tengah ini surganya anak Informatika!"),
    (35.88, 37.34, "desk_mon", "Meja ngoding dual-monitor,"),
    (37.62, 38.73, "desk_pc", "PC menyala biru,"),
    (38.96, 44.20, "desk_wall", "papan deadline skripsi yang penuh catatan, plus poster kebanggaan S1 Informatika di dinding."),
    (44.68, 47.92, "surv_lead", "Geser ke kanan, ada amunisi bertahan hidup tanggal tua."),
    (48.38, 49.61, "surv_books", "Rak buku algoritma,"),
    (49.84, 51.11, "surv_mie", "dua kardus mie instan,"),
    (51.34, 54.63, "surv_fan", "galon air dingin, dan kipas angin setia nemenin begadang."),
    (55.24, 55.94, "setup_joy", "Asyik!"),
    (56.41, 58.81, "setup_smug", "Kodingan tugas hari ini udah kelar 100%."),
    (59.21, 60.12, "setup_smug", "Tinggal tidur nyenyak!"),
    (60.67, 61.13, "shock_wait", "Eh, tunggu..."),
    (61.58, 61.73, "shock_hit", "Loh?!"),
    (62.21, 64.43, "shock_err", "Kok tiba-tiba muncul error 47 baris?!"),
    (64.86, 65.87, "shock_cry", "Ya ampun,"),
    (66.16, 67.21, "shock_cry", "lupa titik koma!"),
    (67.71, 68.17, "outro_laugh", "Hahaha!"),
    (68.45, 70.40, "outro", "Begitulah nasib mahasiswa IT."),
    (70.86, 72.93, "outro", "Makasih udah mampir ke kamar kos Bang Utoh."),
    (73.29, 74.12, "outro_cta", "Jangan lupa like,"),
    (74.46, 78.20, "outro_cta", "komen, dan subscribe biar gue makin semangat bikin episode selanjutnya."),
    (78.67, 79.08, "outro_bye", "Dadah!"),
]


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


# Spoken syllable overrides untuk angka & singkatan agar durasi & lip-sync 100% sesuai pengucapan asli VO!
SPOKEN_VOWELS = {
    "100": 5,   # "seratus persen"
    "47": 6,    # "empat puluh tujuh"
    "s1": 3,    # "es satu"
    "it": 2,    # "ai ti"
    "pc": 2,    # "pi si"
}

SPOKEN_PHONETIC = {
    "100": "seratuspersen",
    "47": "empatpuluhtujuh",
    "s1": "essatu",
    "it": "aiti",
    "pc": "pisi",
}


def syllable_weight(word: str) -> float:
    w = re.sub(r"[^a-zA-Z0-9]", "", word).lower()
    if not w:
        return 1.0
    if w in SPOKEN_VOWELS:
        return float(SPOKEN_VOWELS[w]) + 0.35
    v = len(re.findall(r"[aiueo]+", w))
    return float(max(1, v)) + 0.12 * len(w)


# Pemetaan chunking subtitle manual untuk frasa yang perlu pasangan kata semantik sempurna (0 kata yatim!)
CUSTOM_CHUNKS: dict[str, list[str]] = {
    "Selamat datang di episode pertama vlog gue.": ["Selamat datang", "di episode", "pertama", "vlog gue."],
    "nama asli gue Bolohoutoh.": ["nama asli gue", "Bolohoutoh."],
    "Tapi panggil aja Bang Utoh.": ["Tapi panggil aja", "Bang Utoh."],
    "Gue mahasiswa S1 Teknik Informatika yang hidup merantau sebagai anak kos.": [
        "Gue mahasiswa",
        "S1 Teknik",
        "Informatika",
        "yang hidup",
        "merantau sebagai",
        "anak kos.",
    ],
    "Geser ke kanan, ada amunisi bertahan hidup tanggal tua.": [
        "Geser ke kanan,",
        "ada amunisi",
        "bertahan hidup",
        "tanggal tua.",
    ],
    "Kodingan tugas hari ini udah kelar 100%.": [
        "Kodingan tugas",
        "hari ini",
        "udah kelar",
        "100%.",
    ],
    "Kok tiba-tiba muncul error 47 baris?!": [
        "Kok tiba-tiba",
        "muncul error",
        "47 baris?!",
    ],
    "lupa titik koma!": [
        "lupa",
        "titik koma! (;)",
    ],
}


def build_words_and_punchy_captions() -> tuple[list[dict], list[dict]]:
    """Buat daftar kata presisi (untuk lip-sync) dan subtitle punchy 1-2 kata (0 overlap, 0 kata yatim, >=0.32s)!"""
    words_out = []
    caps_out = []

    for st, en, tag, text in PHRASES:
        toks = text.split()
        weights = [syllable_weight(t) for t in toks]
        tot_w = sum(weights) or 1.0
        dur = max(0.08, en - st)
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
            c_weights = [sum(syllable_weight(x) for x in ch.replace("(;)", "").split()) for ch in chunks]
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
            continue

        # Bagi tiap frasa lainnya menjadi subtitle punchy 1-2 kata ala contohvideo!
        i = 0
        while i < len(phrase_words):
            w1 = phrase_words[i]
            solo_triggers = ("headphone", "asyik", "loh", "hahaha", "dadah", "subscribe", "like", "kenalin", "yuk", "nah")
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
                clean2 = re.sub(r"[^a-z0-9]", "", w2["text"].lower())
                if len(w1["text"]) + len(w2["text"]) <= 15 and not any(k in clean2 for k in ("bolohoutoh", "loh", "subscribe")):
                    caps_out.append({
                        "start": w1["start"],
                        "end": round(w2["end"], 3),
                        "text": f"{w1['text']} {w2['text']}",
                        "tag": tag,
                    })
                    i += 2
                else:
                    caps_out.append({
                        "start": w1["start"],
                        "end": round(w1["end"], 3),
                        "text": w1["text"],
                        "tag": tag,
                    })
                    i += 1

    # Post-pass:
    # 1. Tahan caption singkat di akhir frasa selama jeda napas (hingga +0.42s) agar minimal >= 0.34s terbaca nyaman!
    # 2. Gunakan interval setengah-terbuka [start, end) tanpa celah 15ms di dalam kalimat yang sama (0 blink, 0 overlap)!
    for idx in range(len(caps_out)):
        c = caps_out[idx]
        next_start = caps_out[idx + 1]["start"] if idx + 1 < len(caps_out) else TOTAL_SEC
        gap_avail = next_start - c["end"]
        cur_dur = c["end"] - c["start"]
        if gap_avail > 0.02:
            need = max(0.06, 0.52 - cur_dur)
            c["end"] = round(c["end"] + min(gap_avail - 0.01, need), 3)
        else:
            c["end"] = round(min(c["end"], next_start), 3)

    return words_out, caps_out


def synth_lofi_bgm(seconds: float) -> np.ndarray:
    """BGM Lo-Fi chill orisinal 80 BPM, bebas hak cipta."""
    n = int(seconds * SR)
    bgm = np.zeros(n, dtype=np.float32)
    beat = 60.0 / 80.0
    bar = beat * 4.0
    chords = [
        [174.61, 220.00, 261.63, 329.63],  # Fmaj7
        [164.81, 196.00, 246.94, 293.66],  # Em7
        [146.83, 174.61, 220.00, 261.63],  # Dm7
        [130.81, 164.81, 196.00, 246.94],  # Cmaj7
    ]
    for b in range(int(math.ceil(seconds / bar))):
        s0 = b * bar
        i0 = int(s0 * SR)
        seg_n = min(n - i0, int(bar * SR))
        if seg_n <= 0:
            break
        lt = np.arange(seg_n, dtype=np.float32) / SR
        env = np.minimum(1.0, lt / 0.04) * np.exp(-lt * 0.55)
        chord = np.zeros(seg_n, dtype=np.float32)
        for freq in chords[b % len(chords)]:
            chord += np.sin(2 * np.pi * freq * lt) * 0.22 + np.sin(2 * np.pi * freq * 2 * lt) * 0.035
        bass = np.sin(2 * np.pi * (chords[b % len(chords)][0] * 0.5) * lt) * 0.28 * np.exp(-lt * 0.7)
        bgm[i0 : i0 + seg_n] += (chord + bass) * env
        for kb in [0.0, 2.5]:
            ki = int((s0 + kb * beat) * SR)
            kn = min(n - ki, int(0.16 * SR))
            if kn > 0 and ki < n:
                kt = np.arange(kn, dtype=np.float32) / SR
                ph = 2 * np.pi * np.cumsum(92.0 * np.exp(-kt * 25.0) + 42.0) / SR
                bgm[ki : ki + kn] += np.sin(ph) * np.exp(-kt * 18.0) * 0.22
        for sb in [1.0, 3.0]:
            si = int((s0 + sb * beat) * SR)
            sn = min(n - si, int(0.08 * SR))
            if sn > 0 and si < n:
                st = np.arange(sn, dtype=np.float32) / SR
                rng = np.random.default_rng(200 + b * 11 + int(sb))
                bgm[si : si + sn] += rng.standard_normal(sn).astype(np.float32) * np.exp(-st * 48.0) * 0.075

    bgm = lowpass(bgm, 2100.0)
    fi, fo = min(n, int(0.8 * SR)), min(n, int(1.6 * SR))
    bgm[:fi] *= np.linspace(0, 1, fi, dtype=np.float32)
    bgm[-fo:] *= np.linspace(1, 0, fo, dtype=np.float32)
    return normalize(bgm) * 0.19


def sfx_error_buzz(seconds: float = 0.44) -> np.ndarray:
    n = int(seconds * SR)
    t = np.arange(n, dtype=np.float32) / SR
    sq = np.sign(np.sin(2 * np.pi * 150.0 * t)) * 0.5 + np.sign(np.sin(2 * np.pi * 158.0 * t)) * 0.5
    sq = lowpass(sq.astype(np.float32), 1350.0)
    return normalize(sq * env_ad(n, 0.004, seconds * 0.78))


def main() -> None:
    vo_raw = read_wav_mono(VOICE_DIR / "vo_bang_utoh.wav")
    n_total = int(TOTAL_SEC * SR)
    voice_bus = np.zeros(n_total, dtype=np.float32)
    voice_bus[: min(n_total, len(vo_raw))] = vo_raw[:n_total]

    # Hitung amplop RMS per-frame (2400 nilai 0..100) untuk lip-sync 100% presisi!
    spf = SR // FPS  # 1600 sampel per frame
    frame_rms = []
    for f in range(TOTAL_FRAMES):
        chunk = voice_bus[f * spf : (f + 1) * spf]
        r = float(np.sqrt(np.mean(chunk * chunk))) if len(chunk) else 0.0
        frame_rms.append(r)
    rms_p95 = float(np.percentile(frame_rms, 95)) or 0.1
    voice_env_int = [int(round(min(1.0, r / rms_p95) * 100)) for r in frame_rms]

    # Normalisasi puncak vokal ke ~0.85 agar jernih & dominan
    vp = float(np.max(np.abs(voice_bus))) or 1.0
    voice_bus = voice_bus * (0.85 / vp)

    # SFX sinematik sinkron ke momen-momen kunci VO asli user!
    sfx_events = [
        (0.08, "pop", -8),
        (4.10, "whoosh", -9),
        (5.65, "ding", -10),       # "Bolohoutoh"
        (7.80, "pop", -8),         # "Bang Utoh"
        (15.85, "pop", -8),        # "hoodie himpunan"
        (17.08, "pop", -7),        # "headphone"
        (18.00, "ding", -10),      # "kacamata anti-radiasi"
        (19.65, "whoosh", -8),     # whip-pan ke meja laptop
        (24.42, "whoosh", -5),     # FOREGROUND WIPE ke Kasur!
        (25.90, "pop", -9),        # "kasur andalan"
        (32.25, "whoosh", -6),     # Reveal pull-back Meja Ngoding!
        (33.90, "ding", -9),       # "surganya anak Informatika!"
        (35.85, "pop", -9),        # "Meja ngoding dual-monitor"
        (37.60, "pop", -9),        # "PC menyala biru"
        (41.80, "ding", -10),      # "poster kebanggaan S1 Informatika"
        (44.45, "whoosh", -5),     # FOREGROUND WIPE ke Survival Kit Kanan!
        (48.35, "pop", -9),        # "Rak buku algoritma"
        (49.82, "pop", -8),        # "dua kardus mie instan"
        (55.20, "ding", -8),       # "Asyik!" (lompat girang!)
        (58.00, "pop", -9),        # "kelar 100%"
        (60.62, "pop", -8),        # "Eh, tunggu..."
        (60.82, "snap", -11),      # kedipan merah peringatan #1 di monitor belakang!
        (61.18, "snap", -10),      # kedipan merah peringatan #2 di monitor belakang!
        # PLOT-TWIST SHOCK TEPAT DI "LOH?!" (61.55s = f1846)!
        (61.52, "snap", -2),
        (61.55, "thud", -2),
        (61.62, "error_buzz", -6),
        (63.40, "thud", -6),       # "error 47 baris!"
        (64.85, "whoosh", -9),     # deflation "Ya ampun..."
        (66.55, "ding", -8),       # punchline "titik koma! (;)"
        (67.65, "whoosh", -8),     # kembali cozy outro
        (73.85, "pop", -8),        # "like,"
        (74.46, "pop", -8),        # "komen,"
        (75.00, "ding", -8),       # "subscribe"
        (78.65, "pop", -8),        # "Dadah!"
    ]

    sfx_bus = np.zeros(n_total, dtype=np.float32)
    for at, name, gain_db in sfx_events:
        clip = sfx_error_buzz() if name == "error_buzz" else LIBRARY[name]()
        clip = clip * (10.0 ** (gain_db / 20.0))
        i = max(0, int(at * SR))
        j = min(n_total, i + len(clip))
        if i < n_total:
            sfx_bus[i:j] += clip[: j - i]

    bgm_bus = synth_lofi_bgm(TOTAL_SEC)
    # Matikan BGM seketika saat Plot-Twist ("Eh, tunggu... Loh?! ... lupa titik koma!")
    bgm_bus[int(60.6 * SR) : int(67.6 * SR)] *= 0.08

    # Ducking otomatis di bawah suara asli Bang Utoh
    k = int(0.08 * SR)
    v_env = np.convolve(np.abs(voice_bus), np.ones(k, dtype=np.float32) / k, mode="same")
    speech_mask = np.clip(v_env * 10.0, 0.0, 1.0)
    raw_mix = voice_bus + bgm_bus * (1.0 - 0.65 * speech_mask) + sfx_bus * (1.0 - 0.30 * speech_mask)

    raw_mix_path = OUT_DIR / "mix_raw.wav"
    norm_mix_path = OUT_DIR / "mix.wav"
    write_wav_mono(raw_mix_path, raw_mix)

    # Normalisasi EBU R128 -> -14.5 LUFS, TP <= -1.8 dBFS
    subprocess.run(
        [
            "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
            "-i", str(raw_mix_path),
            "-af", "loudnorm=I=-14.5:TP=-1.8:LRA=9:linear=true",
            "-ar", str(SR), "-ac", "2", str(norm_mix_path),
        ],
        check=True,
    )
    shutil.copy2(norm_mix_path, PUBLIC_DIR / "ep01_bang_utoh_mix.wav")

    words_out, caps_out = build_words_and_punchy_captions()

    ts = [
        "import type { Word } from '../../../engine';",
        "",
        f"export const EP01_FPS = {FPS};",
        f"export const EP01_FRAMES = {TOTAL_FRAMES};",
        "export const EP01_AUDIO = 'ep01_bang_utoh_mix.wav';",
        f"export const EP01_SHOCK_FRAME = {round(61.55 * FPS)};",
        "",
        "export type Ep01Caption = { start: number; end: number; text: string; tag: string };",
        f"export const EP01_CAPTIONS: Ep01Caption[] = {json.dumps(caps_out, indent=2, ensure_ascii=False)};",
        "",
        f"export const EP01_WORDS: Word[] = {json.dumps([{'text': w['text'], 'start': w['start'], 'end': w['end']} for w in words_out], indent=2, ensure_ascii=False)};",
        "",
        "/** Amplitudo RMS per-frame (0..100) dari VO asli user untuk mengunci tutup-buka mulut presisi! */",
        f"export const EP01_VOICE_ENV: number[] = {json.dumps(voice_env_int)};",
        "",
    ]
    (VOICE_DIR / "words_ep01.ts").write_text("\n".join(ts), encoding="utf-8")

    # Cek loudness
    chk = subprocess.run(
        ["ffmpeg", "-hide_banner", "-nostats", "-i", str(norm_mix_path), "-af", "ebur128=peak=true", "-vn", "-f", "null", "-"],
        capture_output=True, text=True,
    ).stderr
    summary = chk.split("Summary:")[-1].strip()
    print(f"BUILT {TOTAL_SEC}s ({TOTAL_FRAMES}f) master audio from REAL user VO! Words={len(words_out)}, PunchyCaps={len(caps_out)}")
    print("Loudness:\n" + "\n".join(summary.splitlines()[:6]))


if __name__ == "__main__":
    main()
