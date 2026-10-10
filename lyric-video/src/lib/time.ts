import { useCurrentFrame, random, interpolate, Easing } from "remotion";
import audio from "../data/audio.json";
import lyricsJson from "../data/lyrics.json";
import markers from "../data/markers.json";
import { FPS } from "../theme";

export type Word = { w: string; start: number; end: number; emphasis: boolean; uncertain?: boolean };
export type Line = { section: string; lineId: string; text: string; start: number; end: number; words: Word[] };
export type Hit = { t: number; strength: number };

export const AUDIO = audio as unknown as {
  duration: number;
  bpm: number;
  beatPeriod: number;
  beats: number[];
  downbeats: number[];
  kicks: Hit[];
  snares: Hit[];
  energy: number[];
};
export const LYRICS = lyricsJson as Line[];
export const MARKERS = markers as { stop: { start: number; end: number }; outro: { start: number; end: number } };

export const DURATION_IN_FRAMES = Math.ceil(84.96 * FPS);

export const line = (id: string): Line => {
  const l = LYRICS.find((x) => x.lineId === id);
  if (!l) throw new Error(`lineId ${id} não existe no lyrics.json`);
  return l;
};

/** Mapa de cenas (s). As fronteiras ficam entre a última palavra de uma cena e a primeira da próxima. */
export const SCENES = {
  intro: [0, line("v1-1").start - 0.35],
  verso: [line("v1-1").start - 0.35, line("p-1").start - 0.3],
  pre: [line("p-1").start - 0.3, line("g-1").start - 0.3],
  gatilho: [line("g-1").start - 0.3, line("r-1").start - 0.12],
  refrao: [line("r-1").start - 0.12, line("b-1").start - 0.35],
  ponte: [line("b-1").start - 0.35, MARKERS.outro.start + 0.05],
  outro: [MARKERS.outro.start + 0.05, 84.96],
} as const;
export type SceneName = keyof typeof SCENES;

export const sceneAt = (t: number): SceneName => {
  for (const k of Object.keys(SCENES) as SceneName[]) {
    const [a, b] = SCENES[k];
    if (t >= a && t < b) return k;
  }
  return "outro";
};

/** Frame de referência das animações. No "stop" tudo congela no frame do corte. */
const STOP_A = Math.round(MARKERS.stop.start * FPS);
const STOP_B = Math.round(MARKERS.stop.end * FPS);
export const freezeFrame = (f: number) => (f >= STOP_A && f < STOP_B ? STOP_A : f);
export const isStopped = (f: number) => f >= STOP_A && f < STOP_B;
export const STOP_FRAMES = { a: STOP_A, b: STOP_B };

/** Tempo (s) congelável. Usa useCurrentFrame, então funciona dentro de <Trail>/<Freeze>. */
export const useT = () => {
  const f = useCurrentFrame();
  const ff = freezeFrame(f);
  return { f: ff, t: ff / FPS, realF: f, realT: f / FPS };
};

// ---------------- busca em listas ordenadas ----------------
const lastIndexLE = (arr: number[], t: number) => {
  let lo = 0;
  let hi = arr.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const m = (lo + hi) >> 1;
    if (arr[m] <= t) {
      ans = m;
      lo = m + 1;
    } else hi = m - 1;
  }
  return ans;
};
const KICK_T = AUDIO.kicks.map((k) => k.t);
const SNARE_T = AUDIO.snares.map((k) => k.t);

/** Impulso do kick: 1 no ataque, decai em `decayFrames` (padrão 6). Multiplica pela força. */
export const kickPulse = (t: number, decayFrames = 6) => {
  const i = lastIndexLE(KICK_T, t);
  if (i < 0) return 0;
  const k = AUDIO.kicks[i];
  const x = (t - k.t) * FPS;
  if (x > decayFrames) return 0;
  return k.strength * Math.pow(1 - x / decayFrames, 2);
};
export const lastKick = (t: number) => {
  const i = lastIndexLE(KICK_T, t);
  return i < 0 ? null : { ...AUDIO.kicks[i], i };
};
export const snarePulse = (t: number, decayFrames = 8) => {
  const i = lastIndexLE(SNARE_T, t);
  if (i < 0) return { v: 0, i: -1 };
  const s = AUDIO.snares[i];
  const x = (t - s.t) * FPS;
  if (x > decayFrames) return { v: 0, i };
  return { v: s.strength * Math.pow(1 - x / decayFrames, 2), i };
};
/** Flash de downbeat: 1 → 0 em `decayFrames` (padrão 10). */
export const downbeatFlash = (t: number, decayFrames = 10) => {
  const i = lastIndexLE(AUDIO.downbeats, t);
  if (i < 0) return 0;
  const x = (t - AUDIO.downbeats[i]) * FPS;
  return x > decayFrames ? 0 : Math.pow(1 - x / decayFrames, 2);
};
export const downbeatIndex = (t: number) => lastIndexLE(AUDIO.downbeats, t);
export const beatIndex = (t: number) => lastIndexLE(AUDIO.beats, t);
export const beatAtOrBefore = (t: number) => AUDIO.beats[Math.max(0, lastIndexLE(AUDIO.beats, t + 1e-4))];

export const energyAt = (f: number) => AUDIO.energy[Math.max(0, Math.min(AUDIO.energy.length - 1, Math.round(f)))] ?? 0;
/** Energia suavizada numa janela de ±n frames (determinístico) */
export const energySmooth = (f: number, n = 12) => {
  let s = 0;
  for (let i = -n; i <= n; i++) s += energyAt(f + i);
  return s / (2 * n + 1);
};

/** Shake de câmera do kick: 2–4 px × força, direção pseudoaleatória por kick */
export const kickShake = (t: number, maxPx = 4) => {
  const k = lastKick(t);
  if (!k) return { x: 0, y: 0 };
  const p = kickPulse(t);
  const a = random(`kick-${k.i}`) * Math.PI * 2;
  const decay = p / Math.max(k.strength, 1e-3);
  const amp = (2 + (maxPx - 2) * k.strength) * decay;
  return { x: Math.cos(a) * amp, y: Math.sin(a) * amp };
};

// ---------------- helpers de animação ----------------
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const ramp = (t: number, a: number, b: number, ease = Easing.inOut(Easing.cubic)) =>
  interpolate(t, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
export const sec = (frames: number) => frames / FPS;
/** Antecipação: a palavra entra ~2,5 frames antes do timestamp */
export const ANTICIPATION = 2.5 / FPS;

/** Momento de saída de uma linha: termina 1 frame antes da próxima entrar, sem sair antes de ser lida */
export const exitFor = (id: string, nextId: string | null, opts: { frames?: number; minHold?: number; fallback?: number } = {}) => {
  const l = line(id);
  const frames = opts.frames ?? 9;
  const minHold = opts.minHold ?? 0.12;
  if (!nextId) return opts.fallback ?? l.end + 0.6;
  const n = line(nextId);
  const ideal = n.words[0].start - ANTICIPATION - frames / FPS;
  return Math.max(ideal, l.end + minHold);
};

/** Palavra sintética (para textos fora da letra cantada, ex.: título) */
export const fakeWord = (w: string, start: number, end = start + 0.5, emphasis = false): Word => ({ w, start, end, emphasis });

/** Grade do refrão final instrumental: um slot a cada 2 beats a partir do 1º downbeat do outro */
export const OUTRO_WORDS = ["ME CHAMA", "QUE EU VOU", "CIDADE", "NEGÓCIO", "CAMPO", "PRESENCIAL", "DIGITAL", "PESSOA", "EMPRESA", "AGRO"];
export const OUTRO_SLOTS = (() => {
  const d0 = AUDIO.downbeats.find((d) => d >= MARKERS.outro.start - 0.1) ?? MARKERS.outro.start;
  const i0 = AUDIO.beats.findIndex((b) => Math.abs(b - d0) < 1e-3);
  return OUTRO_WORDS.map((w, k) => ({ w, t: AUDIO.beats[i0 + k * 2] ?? d0 + k * 2 * AUDIO.beatPeriod }));
})();
export const OUTRO_LOCK = AUDIO.beats[AUDIO.beats.findIndex((b) => Math.abs(b - OUTRO_SLOTS[OUTRO_SLOTS.length - 1].t) < 1e-3) + 2] ?? 80;
