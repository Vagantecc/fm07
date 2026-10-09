#!/usr/bin/env python3
"""Análise do áudio -> src/data/audio.json

Exporta: bpm, beats, downbeats, kicks, snares, energy (60 fps), sections, silences.
Uso: .venv/bin/python scripts/analyze.py [assets/audio.mp3]
"""
import json
import sys
from pathlib import Path

import librosa
import numpy as np
import scipy.signal as sps

ROOT = Path(__file__).resolve().parent.parent
AUDIO = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "assets" / "audio.mp3"
OUT = ROOT / "src" / "data" / "audio.json"

FPS = 60
SR = 48000
HOP_VIDEO = SR // FPS  # 800 amostras = 1 frame de vídeo
HOP = 512              # hop de análise para onsets/beats

# Mapa de seções da direção (hipótese) — usado para nomear os limites detectados
HYPOTHESIS = [
    ("intro_verso1", 0.0),
    ("pre", 16.0),
    ("stop", 34.0),
    ("refrao1", 44.0),
    ("ponte", 64.0),
    ("refrao_final", 70.0),
]


def r3(x):
    return float(round(float(x), 3))


def bandpass(y, lo, hi, sr, order=4):
    sos = sps.butter(order, [lo, hi], btype="band", fs=sr, output="sos")
    return sps.sosfiltfilt(sos, y)


def norm01(x, pct=99.0):
    x = np.asarray(x, dtype=float)
    hi = np.percentile(x, pct)
    return np.clip(x / (hi + 1e-12), 0.0, 1.0)


def pick_onsets(env, sr, hop, delta, wait_s):
    frames = librosa.util.peak_pick(
        env, pre_max=3, post_max=3, pre_avg=10, post_avg=10,
        delta=delta, wait=max(1, int(wait_s * sr / hop)),
    )
    return frames


def main():
    y_st, _ = librosa.load(AUDIO, sr=SR, mono=False)
    y = librosa.to_mono(y_st)
    duration = len(y) / SR
    n_video_frames = int(np.ceil(duration * FPS))

    # ---------------- BPM / beats ----------------
    onset_env = librosa.onset.onset_strength(y=y, sr=SR, hop_length=HOP, aggregate=np.median)
    tempo, beat_frames = librosa.beat.beat_track(
        onset_envelope=onset_env, sr=SR, hop_length=HOP, start_bpm=112, tightness=120, units="frames"
    )
    tempo = float(np.atleast_1d(tempo)[0])

    # Checagem meio/dobro: compara autocorrelação do tempograma em T, T/2, 2T
    tg = librosa.feature.tempogram(onset_envelope=onset_env, sr=SR, hop_length=HOP)
    ac = tg.mean(axis=1)
    bpms = librosa.tempo_frequencies(tg.shape[0], sr=SR, hop_length=HOP)

    def ac_at(b):
        i = np.argmin(np.abs(bpms - b))
        return float(ac[i])

    tempo_check = {f"{b:.1f}": round(ac_at(b), 4) for b in (tempo / 2, tempo, tempo * 2)}

    beat_times = librosa.frames_to_time(beat_frames, sr=SR, hop_length=HOP)
    # BPM refinado pela mediana dos intervalos
    ibi = np.diff(beat_times)
    bpm_refined = 60.0 / float(np.median(ibi))

    # ---------------- Kicks (20–150 Hz) ----------------
    y_low = bandpass(y, 20, 150, SR)
    low_env = librosa.onset.onset_strength(y=y_low, sr=SR, hop_length=HOP, n_mels=32, fmax=300)
    low_env_n = norm01(low_env)
    kf = pick_onsets(low_env_n, SR, HOP, delta=0.12, wait_s=0.18)
    kicks = [{"t": r3(librosa.frames_to_time(f, sr=SR, hop_length=HOP)), "strength": r3(low_env_n[f])} for f in kf]

    # ---------------- Snares (150 Hz–4 kHz, percussivo) ----------------
    _, y_perc = librosa.effects.hpss(y, margin=2.0)
    y_mid = bandpass(y_perc, 150, 4000, SR)
    mid_env = librosa.onset.onset_strength(y=y_mid, sr=SR, hop_length=HOP)
    mid_env_n = norm01(mid_env)
    sf = pick_onsets(mid_env_n, SR, HOP, delta=0.18, wait_s=0.2)
    snares = [{"t": r3(librosa.frames_to_time(f, sr=SR, hop_length=HOP)), "strength": r3(mid_env_n[f])} for f in sf]

    # ---------------- Downbeats: fase pelo kick mais forte ----------------
    low_at_beats = np.array([low_env_n[min(f, len(low_env_n) - 1)] for f in beat_frames])
    phase_scores = [float(low_at_beats[p::4].mean()) for p in range(4)]
    phase = int(np.argmax(phase_scores))
    downbeats = beat_times[phase::4]

    # ---------------- Energy (RMS por frame de vídeo) ----------------
    rms = librosa.feature.rms(y=y, frame_length=HOP_VIDEO * 2, hop_length=HOP_VIDEO, center=True)[0]
    rms = rms[:n_video_frames]
    if len(rms) < n_video_frames:
        rms = np.pad(rms, (0, n_video_frames - len(rms)), mode="edge")
    # suavização: média móvel de ~83 ms
    k = 5
    rms_s = np.convolve(rms, np.ones(k) / k, mode="same")
    energy = norm01(rms_s, 99.5)

    # ---------------- Silêncios (RMS < 15% da média) ----------------
    thr = 0.15 * float(rms.mean())
    quiet = rms < thr
    silences = []
    i = 0
    while i < len(quiet):
        if quiet[i]:
            j = i
            while j < len(quiet) and quiet[j]:
                j += 1
            if (j - i) >= 3:  # >= 50 ms
                silences.append({"start": r3(i / FPS), "end": r3(j / FPS), "dur": r3((j - i) / FPS)})
            i = j
        else:
            i += 1

    # Quedas bruscas (não necessariamente silêncio): RMS < 35% da média local (janela 4 s)
    win = FPS * 4
    local_mean = np.convolve(rms, np.ones(win) / win, mode="same")
    dips_mask = rms < 0.35 * local_mean
    dips = []
    i = 0
    while i < len(dips_mask):
        if dips_mask[i]:
            j = i
            while j < len(dips_mask) and dips_mask[j]:
                j += 1
            if (j - i) >= 6:
                dips.append({"start": r3(i / FPS), "end": r3(j / FPS), "dur": r3((j - i) / FPS)})
            i = j
        else:
            i += 1

    # ---------------- Seções: novidade espectral (checkerboard em SSM, sincronizado ao beat) ----------------
    hop_s = 2048
    chroma = librosa.feature.chroma_cqt(y=librosa.resample(y, orig_sr=SR, target_sr=22050), sr=22050, hop_length=hop_s // 4)
    mfcc = librosa.feature.mfcc(y=librosa.resample(y, orig_sr=SR, target_sr=22050), sr=22050, hop_length=hop_s // 4, n_mfcc=20)
    bf22 = librosa.time_to_frames(beat_times, sr=22050, hop_length=hop_s // 4)
    feat = np.vstack([librosa.util.normalize(chroma, axis=0), librosa.util.normalize(mfcc[1:], axis=1)])
    feat_sync = librosa.util.sync(feat, bf22, aggregate=np.median)
    ssm = librosa.segment.recurrence_matrix(feat_sync, mode="affinity", sym=True, width=1)
    ssm = ssm + np.eye(ssm.shape[0])
    L = 8  # kernel de 8 beats (2 compassos)
    g = np.outer(sps.windows.gaussian(2 * L, L / 2), sps.windows.gaussian(2 * L, L / 2))
    sign = np.sign(np.outer(np.r_[-np.ones(L), np.ones(L)], np.r_[-np.ones(L), np.ones(L)]))
    kernel = g * sign
    n = ssm.shape[0]
    pad = np.pad(ssm, L, mode="constant")
    nov = np.array([np.sum(pad[i:i + 2 * L, i:i + 2 * L] * kernel) for i in range(n)])
    nov = np.maximum(nov, 0)
    nov = nov / (nov.max() + 1e-9)
    peaks, _ = sps.find_peaks(nov, distance=12, height=0.15)
    sync_times = np.r_[0.0, beat_times]  # sync() cria um bloco antes do primeiro beat
    nov_bounds = sorted({r3(sync_times[min(p, len(sync_times) - 1)]) for p in peaks})

    # Energia também acusa limites (subidas/quedas fortes de RMS em 1 s)
    e1 = np.convolve(energy, np.ones(FPS) / FPS, mode="same")
    de = np.abs(e1[FPS:] - e1[:-FPS])
    ep, _ = sps.find_peaks(de, distance=FPS * 4, height=0.18)
    energy_bounds = [r3((p + FPS / 2) / FPS) for p in ep]

    candidates = sorted(set(nov_bounds) | set(energy_bounds))

    # Cruza com a hipótese: cada limite hipotético vai para o candidato mais próximo (±3 s), snapado ao downbeat/beat
    def snap_beat(t):
        return float(beat_times[np.argmin(np.abs(beat_times - t))])

    sections = []
    for idx, (name, t_h) in enumerate(HYPOTHESIS):
        if t_h == 0.0:
            t = 0.0
            src = "start"
        else:
            near = [c for c in candidates if abs(c - t_h) <= 3.0]
            if near:
                t = min(near, key=lambda c: abs(c - t_h))
                src = "detected"
            else:
                t = t_h
                src = "hypothesis"
            t = snap_beat(t)
        sections.append({"name": name, "start": r3(t), "source": src})
    for i, s in enumerate(sections):
        s["end"] = sections[i + 1]["start"] if i + 1 < len(sections) else r3(duration)

    out = {
        "duration": r3(duration),
        "fps": FPS,
        "bpm": round(bpm_refined, 2),
        "bpm_librosa": round(tempo, 2),
        "tempo_check": tempo_check,
        "beatPeriod": r3(60.0 / bpm_refined),
        "beats": [r3(t) for t in beat_times],
        "downbeatPhase": phase,
        "downbeats": [r3(t) for t in downbeats],
        "kicks": kicks,
        "snares": snares,
        "energy": [r3(e) for e in energy],
        "sections": sections,
        "sectionCandidates": candidates,
        "silences": silences,
        "dips": dips,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False))

    # ---------------- Checkpoint 1 ----------------
    print(f"Duração: {duration:.3f} s  |  frames @60: {n_video_frames}")
    print(f"BPM: {bpm_refined:.2f}  (librosa: {tempo:.2f})  check meio/1x/dobro (autocorr. tempograma): {tempo_check}")
    print(f"Beats: {len(beat_times)}  | fase downbeat: {phase} (scores {np.round(phase_scores, 3).tolist()})")
    print("Primeiros 16 beats:", [r3(t) for t in beat_times[:16]])
    print("Primeiros downbeats:", [r3(t) for t in downbeats[:8]])
    print(f"Kicks: {len(kicks)} | Snares: {len(snares)}")
    print("Candidatos a limite (novidade):", nov_bounds)
    print("Candidatos a limite (energia):", energy_bounds)
    print("Seções:")
    for s in sections:
        print(f"  {s['name']:<14} {s['start']:7.3f} → {s['end']:7.3f}  ({s['source']})")
    print("Silêncios (RMS < 15% média):", silences if silences else "nenhum")
    print("Quedas bruscas (RMS < 35% média local 4 s):", dips)
    # energia média por janela de 2 s
    print("Energia média por 2 s:")
    print("  " + " ".join(f"{int(i*2):>2}s:{energy[i*2*FPS:(i+1)*2*FPS].mean():.2f}" for i in range(int(np.ceil(duration / 2)))))


if __name__ == "__main__":
    main()
