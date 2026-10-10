#!/usr/bin/env python3
"""Tabela tempo | palavra | beat mais próximo, para revisar o lyrics.json.

Uso: .venv/bin/python scripts/preview_timing.py [lineId ...]   (ex.: v1-1 g-4 g-5; sem args = tudo)
"""
import json
import sys
from pathlib import Path

import numpy as np

DATA = Path(__file__).resolve().parent.parent / "src" / "data"
FPS = 60


def main():
    lyrics = json.loads((DATA / "lyrics.json").read_text())
    meta = json.loads((DATA / "audio.json").read_text())
    beats = np.array(meta["beats"])
    downbeats = np.array(meta["downbeats"])
    sel = set(sys.argv[1:])
    print(f"{'tempo':>8} {'frame':>6} {'fim':>7}  {'palavra':<16} {'beat + próx.':>12} {'Δ ms':>6}  compasso.tempo  flags")
    for line in lyrics:
        if sel and line["lineId"] not in sel:
            continue
        print(f"── [{line['lineId']}] {line['section']}: {line['text']}  ({line['start']:.2f}–{line['end']:.2f})")
        for w in line["words"]:
            i = int(np.argmin(np.abs(beats - w["start"])))
            b = beats[i]
            bar = int(np.searchsorted(downbeats, b + 1e-3))  # nº do compasso (0 = anacruse)
            prev_db = downbeats[bar - 1] if bar > 0 else None
            pos = int(round((b - prev_db) / meta["beatPeriod"])) + 1 if prev_db is not None else 0
            flags = []
            if w.get("emphasis"):
                flags.append("ÊNFASE")
            if w.get("uncertain"):
                flags.append("conferir")
            if (w["end"] - w["start"]) * FPS < 6:
                flags.append("<6f")
            print(f"{w['start']:8.3f} {int(round(w['start']*FPS)):6d} {w['end']:7.3f}  {w['w']:<16} {b:12.3f} {1000*(w['start']-b):+6.0f}  {bar:>4}.{pos}  {' '.join(flags)}")


if __name__ == "__main__":
    main()
