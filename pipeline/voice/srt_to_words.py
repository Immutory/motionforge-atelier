"""Ubah file SRT menjadi words.json kasar (waktu per kata dibagi rata di dalam tiap cue).
Hasilnya HARUS dikoreksi tangan atau diganti keluaran speech-to-text berwaktu kata.

Pakai: python3 pipeline/voice/srt_to_words.py voice.srt productions/<slug>/voice/words.json
"""
import json
import re
import sys


def ts(s: str) -> float:
    h, m, rest = s.strip().split(":")
    sec, ms = rest.replace(",", ".").split(".")
    return int(h) * 3600 + int(m) * 60 + int(sec) + int(ms) / 1000


def main(src: str, dst: str) -> None:
    text = open(src, encoding="utf-8").read().replace("\r", "")
    words = []
    for block in re.split(r"\n\s*\n", text.strip()):
        lines = block.split("\n")
        if len(lines) < 3 or "-->" not in lines[1]:
            continue
        a, b = (ts(x) for x in lines[1].split("-->"))
        toks = " ".join(lines[2:]).split()
        if not toks:
            continue
        step = (b - a) / len(toks)
        for i, w in enumerate(toks):
            words.append({"text": w, "start": round(a + i * step, 3), "end": round(a + (i + 1) * step, 3)})
    with open(dst, "w", encoding="utf-8") as f:
        json.dump(words, f, ensure_ascii=False, indent=1)
    print(f"{len(words)} kata -> {dst}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
