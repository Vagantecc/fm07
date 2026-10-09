"""Whisper (small, ONNX q8) via onnxruntime — transcrição com timestamps e alinhamento forçado por DTW.

Reimplementa o mesmo algoritmo do openai-whisper / stable-ts (`find_alignment`):
cross-attention das alignment heads -> normalização -> filtro de mediana -> DTW.
Usado porque o ambiente não alcança Hugging Face nem o CDN da OpenAI; os pesos
vêm do pacote npm `sts-whisper-small` (export Xenova/whisper-small).
"""
from __future__ import annotations

import json
from pathlib import Path

import librosa
import numpy as np
import onnxruntime as ort
from scipy.ndimage import median_filter
from tokenizers import Tokenizer

SR = 16000
N_FFT = 400
HOP = 160
CHUNK_S = 30
N_FRAMES = CHUNK_S * SR // HOP  # 3000 frames de mel
TOKENS_PER_SECOND = 50          # 1500 posições de encoder / 30 s

SOT = 50258
EOT = 50257
TRANSCRIBE = 50359
NO_TIMESTAMPS = 50363
TS_BEGIN = 50364
LANG_PT = 50267


class Whisper:
    def __init__(self, model_dir: Path):
        model_dir = Path(model_dir)
        opts = ort.SessionOptions()
        opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        self.enc = ort.InferenceSession(str(model_dir / "onnx/encoder_model_quantized.onnx"), opts)
        self.dec = ort.InferenceSession(str(model_dir / "onnx/decoder_model_merged_quantized.onnx"), opts)
        self.tok = Tokenizer.from_file(str(model_dir / "tokenizer.json"))
        gen = json.loads((model_dir / "generation_config.json").read_text())
        self.alignment_heads = gen["alignment_heads"]
        self.suppress = set(gen.get("suppress_tokens", [])) | set(gen.get("begin_suppress_tokens", []))
        self.mel_filters = librosa.filters.mel(sr=SR, n_fft=N_FFT, n_mels=80).astype(np.float32)
        self.dec_inputs = [i.name for i in self.dec.get_inputs()]
        self.n_layers = sum(1 for n in self.dec_inputs if n.endswith(".decoder.key"))
        self.cross_names = [o.name for o in self.dec.get_outputs() if o.name.startswith("cross_attentions")]

    # ---------------- áudio ----------------
    def log_mel(self, audio: np.ndarray) -> np.ndarray:
        """log-Mel como whisper.audio.log_mel_spectrogram (com 30 s de padding no fim)."""
        audio = np.concatenate([audio.astype(np.float32), np.zeros(CHUNK_S * SR, np.float32)])
        stft = librosa.stft(audio, n_fft=N_FFT, hop_length=HOP, window="hann", center=True, pad_mode="reflect")
        mag = np.abs(stft[:, :-1]) ** 2
        mel = self.mel_filters @ mag
        log_spec = np.log10(np.maximum(mel, 1e-10))
        log_spec = np.maximum(log_spec, log_spec.max() - 8.0)
        return ((log_spec + 4.0) / 4.0).astype(np.float32)

    def encode(self, mel_seg: np.ndarray) -> np.ndarray:
        if mel_seg.shape[1] < N_FRAMES:
            mel_seg = np.pad(mel_seg, ((0, 0), (0, N_FRAMES - mel_seg.shape[1])))
        return self.enc.run(["last_hidden_state"], {"input_features": mel_seg[None, :, :N_FRAMES]})[0]

    # ---------------- decoder (sem cache: sequências curtas) ----------------
    def decode(self, tokens: list[int], enc_out: np.ndarray, want_cross=False):
        feed = {
            "input_ids": np.array([tokens], dtype=np.int64),
            "encoder_hidden_states": enc_out,
            "use_cache_branch": np.array([False]),
        }
        for n in self.dec_inputs:
            if n.startswith("past_key_values"):
                feed[n] = np.zeros((1, 12, 0, 64), dtype=np.float32)
        outs = ["logits"] + (self.cross_names if want_cross else [])
        res = self.dec.run(outs, feed)
        return res[0], (res[1:] if want_cross else None)

    # ---------------- tokenização ----------------
    def encode_text(self, text: str) -> list[int]:
        return self.tok.encode(text, add_special_tokens=False).ids

    def decode_text(self, ids: list[int]) -> str:
        return self.tok.decode([i for i in ids if i < EOT], skip_special_tokens=True)

    # ---------------- transcrição com timestamps (greedy, regras de timestamp do whisper) ----------------
    def transcribe(self, audio: np.ndarray, max_tokens=200, verbose=True):
        mel = self.log_mel(audio)
        total = int(len(audio) / HOP)
        seek = 0
        segments = []
        sot_seq = [SOT, LANG_PT, TRANSCRIBE]
        while seek < total - 50:
            seg_frames = min(N_FRAMES, total - seek)
            enc_out = self.encode(mel[:, seek:seek + N_FRAMES])
            tokens = list(sot_seq)
            sum_lp = 0.0
            max_ts = TS_BEGIN + seg_frames // 2
            for step in range(max_tokens):
                logits, _ = self.decode(tokens, enc_out)
                lg = logits[0, -1].astype(np.float64)
                lg[list(self.suppress)] = -np.inf
                lg[NO_TIMESTAMPS] = -np.inf
                lg[SOT:TS_BEGIN] = -np.inf  # especiais (SOT, línguas, tasks...)
                gen = tokens[len(sot_seq):]
                last_ts = len(gen) >= 1 and gen[-1] >= TS_BEGIN
                penult_ts = len(gen) < 2 or gen[-2] >= TS_BEGIN
                if last_ts:
                    if penult_ts:
                        lg[TS_BEGIN:] = -np.inf
                    else:
                        lg[:EOT] = -np.inf
                ts_prev = [t for t in gen if t >= TS_BEGIN]
                if ts_prev:
                    floor = ts_prev[-1] if (last_ts and not penult_ts) else ts_prev[-1] + 1
                    lg[TS_BEGIN:floor] = -np.inf
                if step == 0:
                    lg[:TS_BEGIN] = -np.inf
                    lg[TS_BEGIN + 50 + 1:] = -np.inf  # max_initial_timestamp = 1.0 s
                lg[max_ts + 1:] = -np.inf
                lp = lg - np.logaddexp.reduce(lg[np.isfinite(lg)])
                # se a massa de probabilidade dos timestamps supera o melhor token de texto, força timestamp
                ts_lp = np.logaddexp.reduce(lp[TS_BEGIN:][np.isfinite(lp[TS_BEGIN:])]) if np.isfinite(lp[TS_BEGIN:]).any() else -np.inf
                if ts_lp > np.max(lp[:TS_BEGIN]):
                    lp[:TS_BEGIN] = -np.inf
                nxt = int(np.argmax(lp))
                sum_lp += lp[nxt]
                tokens.append(nxt)
                if nxt == EOT:
                    break
            gen = tokens[len(sot_seq):]
            if gen and gen[-1] == EOT:
                gen = gen[:-1]
            # quebra em segmentos por pares de timestamps
            seg_list = []
            cur = []
            start_ts = None
            for t in gen:
                if t >= TS_BEGIN:
                    if start_ts is None:
                        start_ts = t
                    else:
                        if cur:
                            seg_list.append((start_ts, t, cur))
                        cur = []
                        start_ts = None
                else:
                    if start_ts is None:
                        start_ts = TS_BEGIN
                    cur.append(t)
            single_ts_ending = len(gen) >= 2 and gen[-1] >= TS_BEGIN and gen[-2] < TS_BEGIN
            if cur:  # texto sem timestamp final
                seg_list.append((start_ts or TS_BEGIN, TS_BEGIN + seg_frames // 2, cur))
            off = seek / 100.0
            for a, b, toks in seg_list:
                s = dict(start=round(off + (a - TS_BEGIN) * 0.02, 2), end=round(off + (b - TS_BEGIN) * 0.02, 2),
                         text=self.decode_text(toks).strip())
                segments.append(s)
                if verbose:
                    print(f"  [{s['start']:6.2f} → {s['end']:6.2f}] {s['text']}")
            ts_all = [t for t in gen if t >= TS_BEGIN]
            if single_ts_ending or not ts_all or not seg_list:
                seek += seg_frames
            else:
                last = ts_all[-1] - TS_BEGIN
                adv = max(last * 2, 100)  # em frames de mel (100/s)
                seek += min(adv, seg_frames)
        return segments

    # ---------------- alinhamento forçado ----------------
    def align(self, audio: np.ndarray, t0: float, t1: float, words: list[str], mel_full: np.ndarray | None = None):
        """Alinha `words` (texto oficial) na janela [t0, t1] (<= 30 s). Retorna [(w, start, end, prob)]."""
        assert t1 - t0 <= CHUNK_S + 1e-6
        mel = mel_full if mel_full is not None else self.log_mel(audio)
        f0 = int(round(t0 * 100))
        num_frames = int(round((t1 - t0) * 100))
        enc_out = self.encode(mel[:, f0:f0 + N_FRAMES])
        word_tokens = [self.encode_text(" " + w) for w in words]
        text_tokens = [t for wt in word_tokens for t in wt]
        sot_seq = [SOT, LANG_PT, TRANSCRIBE]
        tokens = sot_seq + [NO_TIMESTAMPS] + text_tokens + [EOT]
        logits, cross = self.decode(tokens, enc_out, want_cross=True)
        # probabilidade por token (diagnóstico de confiança)
        lp = logits[0] - np.log(np.exp(logits[0] - logits[0].max(-1, keepdims=True)).sum(-1, keepdims=True)) - logits[0].max(-1, keepdims=True)
        tok_probs = [float(np.exp(lp[len(sot_seq) + i, t])) for i, t in enumerate(text_tokens)]
        w = np.stack([cross[l][0, h] for l, h in self.alignment_heads])  # [heads, tokens, 1500]
        w = w[:, :, : num_frames // 2]
        w = w / (w.sum(-1, keepdims=True) + 1e-12)  # re-softmax restrito à janela
        std = w.std(axis=-2, keepdims=True)
        mean = w.mean(axis=-2, keepdims=True)
        w = (w - mean) / (std + 1e-9)
        w = median_filter(w, size=(1, 1, 7))
        matrix = w.mean(axis=0)[len(sot_seq):-1]
        text_idx, time_idx = dtw(-matrix.astype(np.float64))
        boundaries = np.pad(np.cumsum([len(t) for t in word_tokens]), (1, 0))
        jumps = np.pad(np.diff(text_idx), (1, 0), constant_values=1).astype(bool)
        jump_times = time_idx[jumps] / TOKENS_PER_SECOND
        out = []
        for i, wd in enumerate(words):
            s = t0 + float(jump_times[boundaries[i]])
            e = t0 + float(jump_times[boundaries[i + 1]]) if boundaries[i + 1] < len(jump_times) else t1
            p = float(np.mean(tok_probs[boundaries[i]:boundaries[i + 1]]))
            out.append((wd, round(s, 3), round(e, 3), round(p, 3)))
        return out


def dtw(x: np.ndarray):
    """DTW do whisper (passos diagonal / vertical / horizontal)."""
    N, M = x.shape
    cost = np.full((N + 1, M + 1), np.inf)
    trace = -np.ones((N + 1, M + 1), dtype=np.int8)
    cost[0, 0] = 0
    for j in range(1, M + 1):
        cj = cost[:, j - 1]
        col = cost[:, j]
        xj = x[:, j - 1]
        for i in range(1, N + 1):
            c0 = cj[i - 1]   # cost[i-1, j-1]
            c1 = col[i - 1]  # cost[i-1, j]
            c2 = cj[i]       # cost[i, j-1]
            if c0 < c1 and c0 < c2:
                c, t = c0, 0
            elif c1 < c0 and c1 < c2:
                c, t = c1, 1
            else:
                c, t = c2, 2
            col[i] = xj[i - 1] + c
            trace[i, j] = t
    i, j = N, M
    trace[0, :] = 2
    trace[:, 0] = 1
    path = []
    while i > 0 or j > 0:
        path.append((i - 1, j - 1))
        t = trace[i, j]
        if t == 0:
            i -= 1
            j -= 1
        elif t == 1:
            i -= 1
        else:
            j -= 1
    path = np.array(path[::-1])
    return path[:, 0], path[:, 1]
