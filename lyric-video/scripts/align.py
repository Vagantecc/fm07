#!/usr/bin/env python3
"""Alinhamento forçado da letra -> src/data/lyrics.json (+ lyrics_raw.json com os tempos antes do snap)

A letra (LYRICS) manda; o whisper só fornece o tempo.
Uso: .venv/bin/python scripts/align.py
"""
import json
import re
import sys
from pathlib import Path

import librosa
import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from whisper_onnx import Whisper  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
AUDIO = ROOT / "assets" / "audio.mp3"
MODEL = ROOT / "models" / "whisper-small"
DATA = ROOT / "src" / "data"

# Letra transcrita do MP3 (opção 3). Linhas com `uncertain` precisam de confirmação.
# (section, lineId, text, uncertain_words)
LYRICS = [
    ("verso1", "v1-1", "É o cartão que te acompanha no rolê", []),
    ("verso1", "v1-2", "O investimento que cresce junto com você", []),
    ("verso1", "v1-3", "O seguro que protege o que é seu", []),
    ("verso1", "v1-4", "O consórcio pra sonhar e realizar", []),
    ("pre", "p-1", "O app é completo", ["app"]),
    ("pre", "p-2", "Te acompanha de perto e pra viajar", []),
    ("pre", "p-3", "Você tem com quem contar", []),
    ("gatilho", "g-1", "Na tua cidade", []),
    ("gatilho", "g-2", "Eu tô no teu negócio", []),
    ("gatilho", "g-3", "Eu tô lá no campo", ["lá"]),
    ("gatilho", "g-4", "Stop!", []),
    ("gatilho", "g-5", "Também tô!", []),
    ("refrao1", "r-1", "Me chama que eu vou", []),
    ("refrao1", "r-2", "No presencial e digital", []),
    ("refrao1", "r-3", "Não tem “fica pra depois”", []),
    ("refrao1", "r-4", "Pessoa, empresa ou lá no agro", []),
    ("refrao1", "r-5", "Conta comigo pra tudo", []),
    ("refrao1", "r-6", "Pra tudo", []),
    ("ponte", "b-1", "Sicredi 125 anos", ["Sicredi"]),
    ("ponte", "b-2", "Não é só dinheiro", []),
    ("ponte", "b-3", "É ter com quem contar", []),
]

# Janelas de alinhamento (s): grupos de linhas separados por respiros/quedas detectados no audio.json
CHUNKS = [
    (5.0, 15.45, ["v1-1"]),
    (15.45, 33.95, ["v1-2", "v1-3", "v1-4", "p-1", "p-2"]),
    (33.95, 47.6, ["p-3", "g-1", "g-2", "g-3", "g-4", "g-5", "r-1", "r-2"]),
    (47.55, 63.3, ["r-3", "r-4", "r-5", "r-6"]),
    (61.5, 71.5, ["b-1", "b-2", "b-3"]),
]

EMPHASIS = {
    "cartão", "investimento", "seguro", "consórcio", "completo", "contar", "cidade", "negócio", "campo",
    "stop", "também", "tô", "me", "chama", "presencial", "digital", "agro", "tudo", "125",
}
# "tô" e "me" só contam como ênfase dentro destas linhas
EMPH_LINE_ONLY = {"tô": {"g-5"}, "me": {"r-1"}, "também": {"g-5"}}

FILLER = "♪"
SNAP_TOL = 0.060
MIN_WORD = 0.10  # s (6 frames)


def norm(w):
    return re.sub(r"[^\wà-ú0-9]", "", w.lower())


def syllables(w):
    return max(1, len(re.findall(r"[aeiouáéíóúâêôãõàü]+", w.lower())))


def main():
    audio, _ = librosa.load(AUDIO, sr=16000)
    wh = Whisper(MODEL)
    mel = wh.log_mel(audio)
    meta = json.loads((DATA / "audio.json").read_text())
    beats = np.array(meta["beats"])
    eighths = np.sort(np.r_[beats, (beats[:-1] + beats[1:]) / 2])

    by_id = {l[1]: l for l in LYRICS}

    # Passada 1: blocos grandes, com ♪ nas pontas para absorver o instrumental
    raw = []
    for t0, t1, ids in CHUNKS:
        words, owners = [FILLER], [None]
        for lid in ids:
            for w in by_id[lid][2].split():
                words.append(w)
                owners.append(lid)
        words.append(FILLER)
        owners.append(None)
        res = wh.align(audio, t0, t1, words, mel_full=mel)
        for (w, s, e, p), lid in zip(res, owners):
            if lid is not None:
                raw.append(dict(lineId=lid, w=w, start=s, end=e, prob=p))

    # Passada 2 (x2): linha a linha, com a palavra vizinha de cada lado como contexto
    order = [l[1] for l in LYRICS]
    for _ in range(2):
        new = []
        for li, lid in enumerate(order):
            mine = [r for r in raw if r["lineId"] == lid]
            prev = [r for r in raw if r["lineId"] == order[li - 1]][-1] if li > 0 else None
            nxt = [r for r in raw if r["lineId"] == order[li + 1]][0] if li + 1 < len(order) else None
            t0 = prev["start"] - 0.05 if prev else max(0.0, mine[0]["start"] - 1.5)
            t1 = nxt["end"] + 0.05 if nxt else mine[-1]["end"] + 1.0
            words = [prev["w"] if prev else FILLER] + [r["w"] for r in mine] + [nxt["w"] if nxt else FILLER]
            res = wh.align(audio, t0, t1, words, mel_full=mel)[1:-1]
            for r, (w, s, e, p) in zip(mine, res):
                new.append(dict(lineId=lid, w=w, start=s, end=e, prob=p))
        raw = new

    # Pós-processo: limita durações absurdas (DTW tende a esticar a palavra antes de uma pausa)
    for i, r in enumerate(raw):
        nxt = raw[i + 1] if i + 1 < len(raw) else None
        last_in_line = nxt is None or nxt["lineId"] != r["lineId"]
        max_d = 0.22 * syllables(r["w"]) + 0.25 + (1.6 if last_in_line else 0.0)
        if r["end"] - r["start"] > max_d:
            first_in_line = i == 0 or raw[i - 1]["lineId"] != r["lineId"]
            if first_in_line and not last_in_line:
                r["start"] = round(r["end"] - (0.22 * syllables(r["w"]) + 0.1), 3)
            else:
                r["end"] = round(r["start"] + max_d, 3)

    # Fim de linha: corta a cauda onde a energia despenca (< 35% do pico da palavra), útil no corte seco do "Stop!"
    energy = np.array(meta["energy"])
    for i, r in enumerate(raw):
        nxt = raw[i + 1] if i + 1 < len(raw) else None
        if nxt is not None and nxt["lineId"] == r["lineId"]:
            continue
        a, b = int(r["start"] * 60), int(r["end"] * 60)
        seg = energy[a:b]
        if len(seg) < 6:
            continue
        peak_i = int(np.argmax(seg))
        below = np.where(seg[peak_i:] < 0.35 * seg[peak_i])[0]
        if len(below):
            r["end"] = round(max(r["start"] + MIN_WORD, (a + peak_i + below[0]) / 60), 3)

    (DATA / "lyrics_raw.json").write_text(json.dumps(raw, ensure_ascii=False, indent=1))

    # Snap ao grid (beat ou colcheia) + ênfase
    out = []
    prev_start = -1.0
    for r in raw:
        s = r["start"]
        g = eighths[np.argmin(np.abs(eighths - s))]
        if abs(g - s) < SNAP_TOL:
            s = float(g)
        s = max(s, prev_start + 0.05)
        e = max(r["end"], s + MIN_WORD)
        prev_start = s
        n = norm(r["w"])
        emph = n in EMPHASIS and (n not in EMPH_LINE_ONLY or r["lineId"] in EMPH_LINE_ONLY[n])
        word = dict(w=r["w"], start=round(s, 3), end=round(e, 3), emphasis=bool(emph))
        lid = r["lineId"]
        unc = by_id[lid][3]
        if unc and r["w"].strip(",.!?") in unc:
            word["uncertain"] = True
        if not out or out[-1]["lineId"] != lid:
            out.append(dict(section=by_id[lid][0], lineId=lid, text=by_id[lid][2], start=0, end=0, words=[]))
        out[-1]["words"].append(word)
    # sem sobreposição dentro da linha (o snap pode puxar o início da palavra seguinte)
    for line in out:
        ws = line["words"]
        for a, b in zip(ws, ws[1:]):
            a["end"] = round(max(a["start"] + 0.05, min(a["end"], b["start"])), 3)
    for line in out:
        line["start"] = line["words"][0]["start"]
        line["end"] = line["words"][-1]["end"]

    # lyrics.json: uma palavra por linha de texto, fácil de editar à mão
    lines_txt = []
    for line in out:
        head = {k: line[k] for k in ("section", "lineId", "text", "start", "end")}
        h = json.dumps(head, ensure_ascii=False)[:-1]
        ws = ",\n".join("      " + json.dumps(w, ensure_ascii=False) for w in line["words"])
        lines_txt.append(f"  {h}, \"words\": [\n{ws}\n  ]}}")
    (DATA / "lyrics.json").write_text("[\n" + ",\n".join(lines_txt) + "\n]\n")
    # Marcadores: stop (fim do "Stop!" -> início do "Também") e outro instrumental
    stop_w = next(l for l in out if l["lineId"] == "g-4")["words"][-1]
    back_w = next(l for l in out if l["lineId"] == "g-5")["words"][0]
    markers = {
        "stop": {"start": float(stop_w["end"]), "end": float(back_w["start"])},
        "outro": {"start": float(out[-1]["end"]), "end": float(meta["duration"])},
    }
    (DATA / "markers.json").write_text(json.dumps(markers, indent=1))
    print("markers:", markers)
    print(f"OK: {sum(len(l['words']) for l in out)} palavras em {len(out)} linhas -> src/data/lyrics.json")


if __name__ == "__main__":
    main()
