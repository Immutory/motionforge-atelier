"""Pemeriksaan otomatis video akhir: frame hitam, frame beku, loudness.

Pakai: python3 pipeline/qa/qa_check.py out/<slug>/<slug>_final.mp4 [--json]
Butuh ffmpeg di PATH. Keluar dengan kode 1 jika ada temuan serius.
"""
import json
import re
import subprocess
import sys


def run_filter(path: str, vf: str | None = None, af: str | None = None) -> str:
    cmd = ["ffmpeg", "-hide_banner", "-nostats", "-i", path]
    if vf:
        cmd += ["-vf", vf, "-an"]
    if af:
        cmd += ["-af", af, "-vn"]
    cmd += ["-f", "null", "-"]
    return subprocess.run(cmd, capture_output=True, text=True).stderr


def probe_duration(path: str) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
        capture_output=True, text=True,
    ).stdout.strip()
    return float(out) if out else 0.0


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


def main(path: str, as_json: bool) -> int:
    black = re.findall(r"black_start:([\d.]+) black_end:([\d.]+)", run_filter(path, vf="blackdetect=d=0.05:pix_th=0.05"))
    freeze_log = run_filter(path, vf="freezedetect=n=-60dB:d=0.4")
    freezes = parse_freezes(freeze_log, probe_duration(path))
    loud = run_filter(path, af="ebur128=peak=true")
    summary = loud.split("Summary:")[-1]
    lufs = re.search(r"I:\s+(-?[\d.]+) LUFS", summary)
    peak = re.search(r"Peak:\s+(-?[\d.]+) dBFS", summary)

    report = {
        "black_frames": [{"start": float(a), "end": float(b)} for a, b in black],
        "freeze_spans": freezes,
        "lufs": float(lufs.group(1)) if lufs else None,
        "true_peak_dbfs": float(peak.group(1)) if peak else None,
    }
    problems = []
    if report["black_frames"]:
        problems.append("ada frame hitam")
    if report["freeze_spans"]:
        problems.append("ada bagian video yang beku (cek creep push-in kamera)")
    if report["lufs"] is not None and not (-16.0 <= report["lufs"] <= -13.0):
        problems.append("loudness di luar -16..-13 LUFS")
    if report["true_peak_dbfs"] is not None and report["true_peak_dbfs"] > -1.0:
        problems.append("peak terlalu tinggi")
    report["problems"] = problems

    if as_json:
        print(json.dumps(report, indent=2))
    else:
        for k, v in report.items():
            print(f"{k}: {v}")
        print("HASIL:", "LULUS" if not problems else "PERLU PERBAIKAN")
    return 1 if problems else 0


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if len(args) != 1:
        sys.exit(__doc__)
    sys.exit(main(args[0], "--json" in sys.argv))
