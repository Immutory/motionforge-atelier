"""Ubah file SRT menjadi words.json kasar (waktu per kata dibagi rata di dalam tiap cue).
Hasilnya HARUS dikoreksi tangan atau diganti keluaran speech-to-text berwaktu kata.

Pakai: node pipeline/py.mjs pipeline/voice/srt_to_words.py voice.srt productions/<slug>/voice/words.json
"""
import json
from pathlib import Path
import re
import sys

_TS_RE = re.compile(r"(\d+):(\d+):(\d+)[,.](\d+)")


def ts(s: str) -> float:
    m = _TS_RE.search(s.strip())
    if not m:
        raise ValueError(f"Format timestamp SRT tidak valid: {s!r}")
    h, mn, sec, frac = m.groups()
    return int(h) * 3600 + int(mn) * 60 + float(f"{int(sec)}.{frac}")


def main(src: str, dst: str) -> None:
    with open(src, encoding="utf-8-sig") as f:
        text = f.read().replace("\r", "")
    words = []
    for block in re.split(r"\n\s*\n", text.strip()):
        lines = block.split("\n")
        if len(lines) < 3 or "-->" not in lines[1]:
            continue
        parts = lines[1].split("-->")
        if len(parts) < 2:
            continue
        a, b = ts(parts[0]), ts(parts[1])
        if b < a:
            b = a
        toks = " ".join(lines[2:]).split()
        if not toks:
            continue
        step = max(0.04, (b - a) / len(toks)) if b > a else 0.04
        for i, w in enumerate(toks):
            st = round(a + i * step, 3)
            en = round(max(st + 0.04, a + (i + 1) * step), 3)
            words.append({"text": w, "start": st, "end": en})
    dst_p = Path(dst)
    dst_p.parent.mkdir(parents=True, exist_ok=True)
    with open(dst_p, "w", encoding="utf-8") as f:
        json.dump(words, f, ensure_ascii=False, indent=1)
    print(f"{len(words)} kata -> {dst_p}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
