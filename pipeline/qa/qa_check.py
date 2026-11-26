"""Pemeriksaan otomatis video akhir: frame hitam, frame beku, loudness.

Pakai: node pipeline/py.mjs pipeline/qa/qa_check.py out/<slug>/<slug>_final.mp4 [--json] [--no-audio]
Butuh ffmpeg di PATH. Keluar dengan kode 1 jika ada temuan serius.

Catatan v2.0/v3.0: kamera diam (`DEFAULT_CREEP = 0`, Move -> Settle) dengan akting karakter/kedip/
lip-sync/uap/kursor/subtitle aktif adalah VALID. Deteksi beku memakai toleransi ketat
(`n=-70dB:d=0.8`) agar hanya menangkap video yang benar-benar beku/macet.
"""
import argparse
import json
from pathlib import Path
import re
import subprocess
import sys


def run_filter(path: str, vf: str | None = None, af: str | None = None) -> tuple[int, str]:
    cmd = ["ffmpeg", "-hide_banner", "-nostats", "-i", path]
    if vf:
        cmd += ["-vf", vf, "-an"]
    if af:
        cmd += ["-af", af, "-vn"]
    cmd += ["-f", "null", "-"]
    res = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    return res.returncode, res.stderr


def probe_duration(path: str) -> float | None:
    res = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    if res.returncode != 0:
        return None
    raw = res.stdout.strip()
    try:
        val = float(raw)
        return val if val >= 0 else None
    except ValueError:
        return None


def parse_freezes(log: str, total: float) -> list[dict]:
    """freeze_duration hanya dicetak saat freeze berakhir. Freeze yang berlangsung sampai akhir
    video hanya punya freeze_start, jadi durasinya dihitung dari total durasi."""
    spans, start = [], None
    for line in log.splitlines():
        m = re.search(r"freeze_start: ([\d.]+)", line)
        if m:
            start = float(m.group(1))
            continue
        m = re.search(r"freeze_duration: ([\d.]+)", line)
        if m and start is not None:
            spans.append({"start": start, "seconds": float(m.group(1))})
            start = None
    if start is not None:
        spans.append({"start": start, "seconds": round(max(0.0, total - start), 3)})
    return spans


def main(path: str, as_json: bool = False, no_audio: bool = False) -> int:
    report: dict = {
        "black_frames": [],
        "freeze_spans": [],
        "lufs": None,
        "true_peak_dbfs": None,
        "problems": [],
    }

    if not Path(path).is_file():
        report["problems"].append(f"file tidak ditemukan: {path}")
        if as_json:
            print(json.dumps(report, indent=2))
        else:
            print(f"problems: {report['problems']}")
            print("HASIL: PERLU PERBAIKAN")
        return 1

    dur = probe_duration(path)
    problems: list[str] = []
    if dur is None or dur <= 0:
        problems.append("durasi video tidak valid / file rusak (ffprobe gagal)")
        dur = 0.0

    rc_b, black_log = run_filter(path, vf="blackdetect=d=0.05:pix_th=0.05")
    if rc_b != 0:
        problems.append("ffmpeg blackdetect gagal membaca video")
    black = re.findall(r"black_start:([\d.]+) black_end:([\d.]+)", black_log)

    # Toleransi ketat (n=-70dB, d=0.8s): kamera diam (DEFAULT_CREEP=0) dengan akting/kedip/uap/subtitle
    # tetap menghasilkan delta piksel > -70dB, sedangkan frame benar-benar beku/duplikat tetap tertangkap.
    rc_f, freeze_log = run_filter(path, vf="freezedetect=n=-70dB:d=0.8")
    if rc_f != 0:
        problems.append("ffmpeg freezedetect gagal membaca video")
    freezes = parse_freezes(freeze_log, dur)

    lufs = None
    peak = None
    if not no_audio:
        rc_a, loud = run_filter(path, af="ebur128=peak=true")
        if rc_a == 0 and "Summary:" in loud:
            summary = loud.split("Summary:")[-1]
            m_lufs = re.search(r"I:\s+(-?[\d.]+) LUFS", summary)
            m_peak = re.search(r"Peak:\s+(-?[\d.]+) dBFS", summary)
            lufs = float(m_lufs.group(1)) if m_lufs else None
            peak = float(m_peak.group(1)) if m_peak else None

    report["black_frames"] = [{"start": float(a), "end": float(b)} for a, b in black]
    report["freeze_spans"] = freezes
    report["lufs"] = lufs
    report["true_peak_dbfs"] = peak

    if report["black_frames"]:
        problems.append("ada frame hitam")
    if report["freeze_spans"]:
        problems.append("ada bagian video yang benar-benar beku (cek akting/kedip/lip-sync/uap/kursor/subtitle)")
    if not no_audio:
        if lufs is None or peak is None:
            problems.append("track audio tidak ditemukan atau gagal diukur (ebur128)")
        else:
            if not (-17.0 <= lufs <= -13.0):
                problems.append("loudness di luar -17..-13 LUFS (target studio -16.0 LUFS)")
            if peak > -1.0:
                problems.append("true peak melebihi -1.0 dBTP (target master <= -1.5 dBTP)")
    report["problems"] = problems

    if as_json:
        print(json.dumps(report, indent=2))
    else:
        for k, v in report.items():
            print(f"{k}: {v}")
        print("HASIL:", "LULUS" if not problems else "PERLU PERBAIKAN")
    return 1 if problems else 0


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Pemeriksaan QA video MotionForge Atelier")
    ap.add_argument("path", help="Path file video MP4")
    ap.add_argument("--json", action="store_true", dest="as_json", help="Cetak hasil dalam format JSON")
    ap.add_argument("--no-audio", action="store_true", dest="no_audio", help="Lewati cek audio/loudness (untuk preview/video bisu)")
    ns = ap.parse_args()
    sys.exit(main(ns.path, as_json=ns.as_json, no_audio=ns.no_audio))
