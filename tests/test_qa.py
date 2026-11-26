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

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.tmp, ignore_errors=True)

    def test_video_beku_sampai_akhir_terdeteksi(self):
        r = report(make(self.tmp, "freeze.mp4", "color=c=red:size=160x288:rate=30:duration=2"))
        self.assertEqual(len(r["freeze_spans"]), 1)
        self.assertGreater(r["freeze_spans"][0]["seconds"], 1.5)
        joined = " ".join(r["problems"]).lower()
        self.assertNotIn("creep push-in", joined)
        self.assertIn("akting", joined)

    def test_kamera_diam_dengan_akting_hidup_tidak_dianggap_beku(self):
        # Simulasi v2.0 (DEFAULT_CREEP=0): latar diam 100%, hanya kotak kecil (mulut/kedip/subtitle) berkedip
        src = "color=c=0x223344:size=160x288:rate=30:duration=2,drawbox=x=70:y=220:w=20:h=16:color=white:t=fill:enable='lt(mod(t,0.3),0.15)'"
        r = report(make(self.tmp, "static_cam_live_acting.mp4", src))
        self.assertEqual(r["freeze_spans"], [])

    def test_video_bergerak_tidak_dianggap_beku(self):
        r = report(make(self.tmp, "moving.mp4", "testsrc=size=160x288:rate=30:duration=2"))
        self.assertEqual(r["freeze_spans"], [])

    def test_frame_hitam_terdeteksi(self):
        r = report(make(self.tmp, "black.mp4", "color=c=black:size=160x288:rate=30:duration=2"))
        self.assertTrue(r["black_frames"])

    def test_file_hilang_gagal_bukan_lulus(self):
        missing = str(self.tmp / "tidak_ada.mp4")
        proc = subprocess.run([sys.executable, str(QA), missing, "--json"], capture_output=True, text=True)
        self.assertNotEqual(proc.returncode, 0)
        data = json.loads(proc.stdout)
        self.assertTrue(data["problems"])

    def test_video_tanpa_audio_gagal_qa(self):
        out = str(self.tmp / "no_audio.mp4")
        subprocess.run(
            ["ffmpeg", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "testsrc=size=160x288:rate=30:duration=2", "-an", out],
            check=True,
        )
        proc = subprocess.run([sys.executable, str(QA), out, "--json"], capture_output=True, text=True)
        self.assertNotEqual(proc.returncode, 0)
        data = json.loads(proc.stdout)
        self.assertIsNone(data["lufs"])
        self.assertTrue(any("audio" in p.lower() for p in data["problems"]))

        # Dengan --no-audio, video bergerak bersih tanpa track audio harus LULUS (rc == 0)
        proc_no_aud = subprocess.run([sys.executable, str(QA), out, "--json", "--no-audio"], capture_output=True, text=True)
        self.assertEqual(proc_no_aud.returncode, 0)
        data_no_aud = json.loads(proc_no_aud.stdout)
        self.assertEqual(data_no_aud["problems"], [])

    def test_video_valid_master_lulus_qa_dan_flag_asing_ditolak(self):
        out = str(self.tmp / "valid_pass.mp4")
        subprocess.run(
            [
                "ffmpeg", "-loglevel", "error", "-y",
                "-f", "lavfi", "-i", "testsrc=size=160x288:rate=30:duration=2",
                "-f", "lavfi", "-i", "sine=frequency=440:duration=2",
                "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
                "-shortest", out,
            ],
            check=True,
        )
        proc = subprocess.run([sys.executable, str(QA), out, "--json"], capture_output=True, text=True)
        self.assertEqual(proc.returncode, 0, proc.stdout + proc.stderr)
        data = json.loads(proc.stdout)
        self.assertEqual(data["problems"], [])
        self.assertTrue(-17.0 <= data["lufs"] <= -13.0)
        self.assertLessEqual(data["true_peak_dbfs"], -1.0)

        bad_flag = subprocess.run([sys.executable, str(QA), out, "--unknown-flag"], capture_output=True, text=True)
        self.assertNotEqual(bad_flag.returncode, 0)


if __name__ == "__main__":
    unittest.main()
