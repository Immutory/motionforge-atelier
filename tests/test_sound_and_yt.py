"""Tes regresi mendalam untuk sound/ (DSP, loudness, music, sfx) dan pipeline/voice (voice_utils, SRT)."""
import json
import shutil
import sys
import tempfile
import unittest
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "sound"))
sys.path.insert(0, str(ROOT / "pipeline" / "voice"))

import dsp  # noqa: E402
import loudness  # noqa: E402
import mix  # noqa: E402
import music  # noqa: E402
import sfx  # noqa: E402
import srt_to_words  # noqa: E402
import voice_utils  # noqa: E402


class SoundAndVoiceRegressionTest(unittest.TestCase):
    def test_all_sfx_fractional_and_edge_durations_no_broadcast_crash(self) -> None:
        # Durasi pecahan IEEE-754 (0.29, 0.57, 0.58, 1.15) sebelumnya memicu ValueError broadcast mismatch
        for name, fn in sfx.LIBRARY.items():
            for dur in (0.29, 0.57, 0.58, 1.15, 0.0, -0.2):
                clip = fn(seconds=dur) if name == "ding" else fn(dur)
                self.assertTrue(np.all(np.isfinite(clip)), f"SFX {name}({dur}) menghasilkan NaN/Inf")
                if dur <= 0:
                    self.assertEqual(len(clip), 0, f"SFX {name}({dur}) harus kosong")

        # render_music aman pada durasi <= 0 & duck_curve akurat pada klip lebih pendek dari smooth_ms
        self.assertEqual(len(music.render_music("sepia", 0.0)), 0)
        self.assertEqual(len(music.render_music("sepia", -0.5)), 0)
        short_duck = mix.duck_curve(int(0.05 * dsp.SR), [(0.0, 0.05)], {"depth_db": -6.0, "smooth_ms": 160})
        self.assertEqual(len(short_duck), int(0.05 * dsp.SR))
        self.assertLess(float(np.min(short_duck)), 0.85, "duck_curve klip pendek harus tetap meredam gain")
    def test_music_sepia_and_short_sfx_no_broadcast_crash(self) -> None:
        # Sebelumnya render_music('sepia', 60/30) crash ValueError karena int(seconds * SR) truncation
        for frames in (30, 45, 60, 75, 90, 120):
            out = music.render_music("sepia", frames / 30.0)
            self.assertGreater(len(out), 0)
            self.assertTrue(np.all(np.isfinite(out)))

        for clip in (
            sfx.sruput(0.02),
            sfx.pour(0.03),
            sfx.velcro(0.02),
            sfx.ladle(0.05),
            sfx.typing(0.05, clicks=3),
            sfx.alarm(0.2, beeps=0),
            sfx.cricket(0.02),
        ):
            self.assertTrue(np.all(np.isfinite(clip)))

    def test_empty_arrays_safe_in_dsp_and_loudness(self) -> None:
        empty = np.zeros(0, dtype=np.float32)
        self.assertEqual(len(dsp.lowpass(empty, 1000)), 0)
        self.assertEqual(len(dsp.normalize(empty)), 0)
        self.assertEqual(len(dsp.env_ad(0, 0.01, 0.1)), 0)
        self.assertEqual(len(dsp.sweep(0, 200, 0)), 0)
        self.assertEqual(loudness.true_peak_dbtp(empty), -120.0)
        self.assertEqual(len(loudness.tp_limit(empty)), 0)

    def test_loudness_master_no_runaway_gain_on_silence_or_short_clip(self) -> None:
        sil = np.zeros(dsp.SR, dtype=np.float32)
        out_sil, rep_sil = loudness.master(sil, target_lufs=-16.0, tp_db=-1.5)
        self.assertEqual(rep_sil["gain_db"], 0.0)
        self.assertEqual(float(np.max(np.abs(out_sil))), 0.0)

        short = sfx.slap(0.3)
        _out_short, rep_short = loudness.master(short, target_lufs=-16.0, tp_db=-1.5)
        self.assertEqual(rep_short["gain_db"], 0.0)

        # Nada 1.5 dtk harus terkontrol ke ~ -16.0 LUFS & TP <= -1.5 dBTP dengan laporan akurat
        tone = dsp.sine(440, 1.5) * 0.2
        out_tone, rep_tone = loudness.master(tone, target_lufs=-16.0, tp_db=-1.5)
        self.assertAlmostEqual(rep_tone["lufs"], loudness.integrated_lufs(out_tone), places=3)
        self.assertLessEqual(rep_tone["true_peak_dbtp"], -1.5)
        self.assertGreaterEqual(rep_tone["lufs"], -16.3)
        self.assertLessEqual(rep_tone["lufs"], -15.7)

    def test_voice_utils_rt_rw_and_null_json_and_srt_ms(self) -> None:
        # RT04 tanpa spasi dan RT 100 tiga digit tidak crash & pertahankan nol di depan
        norm = voice_utils.normalize_indo_tts_text("RT04 RW09 RT 100")
        self.assertIn("er te nol empat", norm)
        self.assertIn("er we nol sembilan", norm)
        self.assertIn("er te satu nol nol", norm)

        # JSON null di field opsional tidak crash TypeError
        with tempfile.TemporaryDirectory() as td:
            sp = Path(td) / "nulls.json"
            sp.write_text(
                json.dumps([{"speaker": "bangUtoh", "text": "Halo", "exaggeration": None, "cfg": None, "gap": None}]),
                encoding="utf-8",
            )
            lines = voice_utils.load_dialogue_script(sp)
            self.assertEqual(len(lines), 1)
            self.assertIsNone(lines[0]["exaggeration"])
            self.assertAlmostEqual(lines[0]["gap"], voice_utils.DEFAULT_GAP_SEC)

            # srt_to_words menangani 2-digit desimal (.50 == 0.50 dtk, bukan 0.05)
            self.assertAlmostEqual(srt_to_words.ts("00:00:01,50"), 1.5, places=3)
            self.assertAlmostEqual(srt_to_words.ts("00:00:01,500 X1:0 Y1:0"), 1.5, places=3)

    @unittest.skipUnless(shutil.which("ffmpeg"), "ffmpeg tidak tersedia")
    def test_normalize_wav_inplace_does_not_truncate(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            wav = Path(td) / "same.wav"
            with wave.open(str(wav), "wb") as wf:
                wf.setnchannels(1)
                wf.setsampwidth(2)
                wf.setframerate(dsp.SR)
                wf.writeframes(b"\x10\x00" * (dsp.SR // 4))
            voice_utils.normalize_wav(wav, wav)
            _, sr, dur = voice_utils.read_wav_pcm(wav)
            self.assertEqual(sr, dsp.SR)
            self.assertAlmostEqual(dur, 0.25, places=2)


if __name__ == "__main__":
    unittest.main()
