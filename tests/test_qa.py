"""Tes qa_check: deteksi frame hitam, video beku (termasuk sampai akhir), dan video normal."""
import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
QA = ROOT / "pipeline" / "qa" / "qa_check.py"


def make(tmp: Path, name: str, src: str) -> str:
    out = str(tmp / name)
    subprocess.run(
        ["ffmpeg", "-loglevel", "error", "-y", "-f", "lavfi", "-i", src,
         "-f", "lavfi", "-i", "sine=frequency=440:duration=2", "-shortest", out],
        check=True,
    )
    return out


def report(path: str) -> dict:
    r = subprocess.run([sys.executable, str(QA), path, "--json"], capture_output=True, text=True)
    return json.loads(r.stdout)


@unittest.skipUnless(shutil.which("ffmpeg") and shutil.which("ffprobe"), "ffmpeg tidak tersedia")
class QaCheck(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = Path(tempfile.mkdtemp())

    def test_video_beku_sampai_akhir_terdeteksi(self):
        r = report(make(self.tmp, "freeze.mp4", "color=c=red:size=160x288:rate=30:duration=2"))
        self.assertEqual(len(r["freeze_spans"]), 1)
        self.assertGreater(r["freeze_spans"][0]["seconds"], 1.5)

    def test_video_bergerak_tidak_dianggap_beku(self):
        r = report(make(self.tmp, "moving.mp4", "testsrc=size=160x288:rate=30:duration=2"))
        self.assertEqual(r["freeze_spans"], [])

    def test_frame_hitam_terdeteksi(self):
        r = report(make(self.tmp, "black.mp4", "color=c=black:size=160x288:rate=30:duration=2"))
        self.assertTrue(r["black_frames"])


if __name__ == "__main__":
    unittest.main()
