"""Tes unit untuk utilitas pipeline VO lokal (`pipeline/voice/voice_utils.py`)."""
import json
import sys
import tempfile
import unittest
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "pipeline" / "voice"))

from voice_utils import (  # noqa: E402
    STUDIO_SR,
    concat_wavs_with_gaps,
    load_dialogue_script,
    normalize_indo_tts_text,
    read_wav_pcm,
    shift_words,
    summarize_words,
)

sys.path.insert(0, str(ROOT / "sound"))
from mix import load_event_clip  # noqa: E402


def _write_silence_wav(path: Path, dur_sec: float, sr: int = STUDIO_SR) -> None:
    nframes = int(round(dur_sec * sr))
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(b"\x01\x00" * nframes)


class VoicePipelineUtilsTest(unittest.TestCase):
    def test_concat_wavs_with_gaps_preserves_exact_spans(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            d = Path(td)
            c1 = d / "01_pakUjang.wav"
            c2 = d / "02_tio.wav"
            out = d / "voice.wav"
            _write_silence_wav(c1, 0.5)
            _write_silence_wav(c2, 0.75)

            spans = concat_wavs_with_gaps([(c1, 0.25), (c2, 0.25)], out)
            self.assertEqual(spans, [(0.0, 0.5), (0.75, 1.5)])

            _, sr, total_dur = read_wav_pcm(out)
            self.assertEqual(sr, STUDIO_SR)
            self.assertAlmostEqual(total_dur, 1.5, places=3)

    def test_shift_words_and_summarize(self) -> None:
        raw = [
            {"text": "  Pagi  ", "start": 0.0, "end": 0.28},
            {"text": "Bang", "start": 0.30, "end": 0.30},  # zero-length clamped
            {"text": "  ", "start": 0.40, "end": 0.50},  # empty ignored
            {"text": "Utoh!", "start": 0.45, "end": 0.85},
        ]
        shifted = shift_words(raw, offset_sec=1.2, speaker="pakUjang")
        self.assertEqual(len(shifted), 3)
        self.assertEqual(shifted[0], {"text": "Pagi", "start": 1.2, "end": 1.48, "speaker": "pakUjang"})
        self.assertGreater(shifted[1]["end"], shifted[1]["start"])
        self.assertEqual(shifted[2]["speaker"], "pakUjang")

        stats = summarize_words(shifted, fps=30, tail_sec=0.5)
        self.assertEqual(stats["wordCount"], 3)
        self.assertAlmostEqual(stats["lastWordEndSec"], 2.05, places=3)
        self.assertEqual(stats["framesAt30Fps"], 77)

    def test_load_dialogue_script_defaults_and_validation(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            sp = Path(td) / "script.json"
            sp.write_text(
                json.dumps([{"speaker": "tio", "text": "Bakmie ayam siap!"}]),
                encoding="utf-8",
            )
            lines = load_dialogue_script(sp)
            self.assertEqual(len(lines), 1)
            self.assertEqual(lines[0]["speaker"], "tio")
            self.assertIsNone(lines[0]["exaggeration"])
            self.assertIsNone(lines[0]["cfg"])
            self.assertIsNone(lines[0]["audio"])
            self.assertTrue(lines[0]["align"])
            self.assertAlmostEqual(lines[0]["gap"], 0.24)

    def test_hybrid_script_audio_and_cat_align_flag(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            sp = Path(td) / "hybrid.json"
            sp.write_text(
                json.dumps(
                    [
                        {"speaker": "bangUtoh", "audio": "raw/utoh.wav", "text": "Halo warga"},
                        {"speaker": "oyen", "audio": "assets/voices/oyen.wav"},
                        {"speaker": "pakUjang", "text": "Aman Mas!", "seed": 42},
                    ]
                ),
                encoding="utf-8",
            )
            lines = load_dialogue_script(sp)
            self.assertEqual(lines[0]["audio"], "raw/utoh.wav")
            self.assertTrue(lines[0]["align"])
            self.assertFalse(lines[1]["align"])
            self.assertEqual(lines[2]["seed"], 42)

    def test_normalize_indo_tts_text_expands_local_abbreviations(self) -> None:
        s = normalize_indo_tts_text("Warga RT 04 & RW 02, WiFi Warkop 24 jam anak S1 TI lancar!!")
        self.assertIn("er te nol empat", s)
        self.assertIn("er we nol dua", s)
        self.assertIn("waifai", s)
        self.assertIn("dua puluh empat jam", s)
        self.assertIn("es satu te i", s)
        self.assertFalse("!!" in s)

    def test_sound_mix_loads_external_cat_wav(self) -> None:
        clip = load_event_clip({"at": 0.5, "file": "assets/voices/oyen.wav"}, ROOT / "productions" / "_starter")
        self.assertGreater(len(clip), 1000)


if __name__ == "__main__":
    unittest.main()
