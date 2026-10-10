import React, { useMemo } from "react";
import { staticFile, interpolate, interpolateColors, Easing } from "remotion";
import { useWindowedAudioData, visualizeAudio } from "@remotion/media-utils";
import { noise2D } from "@remotion/noise";
import { C, FPS, W, H, SAFE_X } from "../theme";
import { MARKERS, OUTRO_LOCK, SCENES, energySmooth, kickPulse, line, useT } from "../lib/time";

const N_SAMPLES = 128;
const N_BANDS = 40;
const SMOOTH_FRAMES = 8;
const ATTACK = 0.6;
const RELEASE = 0.15;

/** Bordas logarítmicas: graves, médios e agudos ocupam larguras visuais parecidas */
const EDGES = (() => {
  const e: number[] = [];
  for (let i = 0; i <= N_BANDS; i++) {
    const v = Math.round(Math.pow(N_SAMPLES - 1, i / N_BANDS));
    e.push(Math.max(v, (e[i - 1] ?? 0) + 1));
  }
  return e.map((v) => Math.min(v, N_SAMPLES));
})();

const toBands = (spec: number[]) => {
  const out = new Array(N_BANDS).fill(0);
  for (let b = 0; b < N_BANDS; b++) {
    const a = EDGES[b] - 1;
    const z = Math.max(EDGES[b + 1] - 1, a + 1);
    let s = 0;
    for (let k = a; k < z && k < spec.length; k++) s += spec[k];
    const mean = s / Math.max(1, z - a);
    const tilt = 1 + (b / N_BANDS) * 3.2; // agudos são mais fracos: compensa
    out[b] = Math.min(1, Math.sqrt(mean * tilt) * 1.25);
  }
  return out;
};

type Mode = { morph: number; amp: number; thin: number; y: number };

/** Linear (0) ↔ radial (1) e "linha fina" por seção, com morph de 20 frames */
const modeAt = (t: number): Mode => {
  const m20 = 20 / FPS;
  const r5 = line("r-5").start - 0.4;
  const rEnd = SCENES.refrao[1];
  const pEnd = SCENES.ponte[1];
  const finalLock = OUTRO_LOCK - 0.33;
  const radial =
    interpolate(t, [r5, r5 + m20, rEnd - m20, rEnd], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) }) +
    interpolate(t, [finalLock, finalLock + m20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const thin = interpolate(t, [rEnd - m20, rEnd, pEnd - m20, pEnd], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return { morph: Math.min(1, radial), amp: 1, thin, y: 905 };
};

export const Waveform: React.FC<{ center?: { x: number; y: number } }> = ({ center = { x: W / 2, y: 520 } }) => {
  const { realF, realT } = useT();
  const { audioData, dataOffsetInSeconds } = useWindowedAudioData({
    src: staticFile("audio.wav"),
    frame: realF,
    fps: FPS,
    windowInSeconds: 6,
  });

  const bands = useMemo(() => {
    if (!audioData) return new Array(N_BANDS).fill(0);
    const raw = (f: number) => {
      try {
        return toBands(
          visualizeAudio({ fps: FPS, frame: Math.max(0, f), audioData, numberOfSamples: N_SAMPLES, optimizeFor: "speed", dataOffsetInSeconds, smoothing: false }),
        );
      } catch {
        return new Array(N_BANDS).fill(0);
      }
    };
    // Suavização determinística: reexecuta o filtro attack/release a partir de N frames atrás (sem estado entre renders)
    let v = raw(realF - SMOOTH_FRAMES);
    for (let k = SMOOTH_FRAMES - 1; k >= 0; k--) {
      const r = raw(realF - k);
      v = v.map((x, i) => (r[i] > x ? x + (r[i] - x) * ATTACK : x + (r[i] - x) * RELEASE));
    }
    return v;
  }, [audioData, dataOffsetInSeconds, realF]);

  const mode = modeAt(realT);
  const kick = kickPulse(realT);
  const energy = energySmooth(realF, 10);

  // Stop: colapsa em 4 frames, linha reta trêmula; na volta explode acima do topo
  const { start: sA, end: sB } = MARKERS.stop;
  const collapse = interpolate(realT, [sA, sA + 4 / FPS], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const stopped = realT >= sA && realT < sB;
  const burst = interpolate(realT, [sB, sB + 30 / FPS], [2.4, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const back = realT >= sB ? 1 : collapse;
  // fim do vídeo: desacelera até virar linha
  const endFade = interpolate(realT, [83.3, 84.7], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });

  const boost = realT >= SCENES.refrao[0] - 0.2 && realT < SCENES.refrao[1] ? 1.45 : realT >= SCENES.outro[0] ? 1.35 : 1;
  const ampGlobal = boost * (0.3 + 0.95 * energy) * (1 + 0.15 * kick) * back * (realT >= sB ? burst : 1) * endFade * (1 - 0.8 * mode.thin);
  const tremble = stopped ? 1 : 0;

  // barras espelhadas: agudos nas bordas, graves no centro
  const vals = [...[...bands].reverse(), ...bands];
  const N = vals.length;
  const R = 380;
  const strokeW = interpolate(mode.thin, [0, 1], [11, 3]) * (1 - 0.25 * mode.morph);
  const lineY = mode.y;

  const palDark = realT >= SCENES.outro[0];
  const inChorus = realT >= SCENES.refrao[0] - 0.2 && realT < SCENES.refrao[1];
  const cLo = palDark ? C.night : inChorus ? C.cream : C.gold;
  const cHi = palDark ? C.ember : inChorus ? C.cream : C.sunset;

  const pts: { x: number; y: number }[] = [];
  const bars: React.ReactNode[] = [];
  for (let j = 0; j < N; j++) {
    const u = j / (N - 1);
    // posição linear
    const lx = SAFE_X + 30 + u * (W - 2 * (SAFE_X + 30));
    const ly = lineY;
    // posição radial
    const th = -Math.PI / 2 + ((j + 0.5) / N) * Math.PI * 2;
    const rx = center.x + Math.cos(th) * R;
    const ry = center.y + Math.sin(th) * R;
    const m = mode.morph;
    let bx = lx + (rx - lx) * m;
    let by = ly + (ry - ly) * m;
    let dx = 0 + (Math.cos(th) - 0) * m;
    let dy = -1 + (Math.sin(th) + 1) * m;
    const dl = Math.hypot(dx, dy) || 1;
    dx /= dl;
    dy /= dl;
    if (tremble) {
      by += noise2D("tr", j * 0.15, realF * 0.4) * 3;
      bx += noise2D("trx", j * 0.15, realF * 0.4) * 1.5;
    }
    pts.push({ x: bx, y: by });
    const maxLen = interpolate(m, [0, 1], [170, 130]);
    const len = Math.max(0.5, vals[j] * maxLen * ampGlobal);
    const inner = interpolate(m, [0, 1], [1, 0.3]);
    const col = interpolateColors(Math.min(1, vals[j] * ampGlobal), [0, 1], [cLo, cHi]);
    bars.push(
      <g key={j}>
        <line x1={bx} y1={by} x2={bx + dx * len} y2={by + dy * len} stroke={col} strokeWidth={strokeW} strokeLinecap="round" />
        <line
          x1={bx}
          y1={by}
          x2={bx - dx * len * inner}
          y2={by - dy * len * inner}
          stroke={col}
          strokeWidth={strokeW}
          strokeLinecap="round"
          opacity={interpolate(m, [0, 1], [0.32, 0.8])}
        />
      </g>,
    );
  }
  const path = pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ") + (mode.morph > 0.98 ? " Z" : "");
  const lineFlash = 0.35 + 0.65 * kick;
  const visible = ampGlobal > 0.001 || stopped || realT < sA + 0.2 || endFade > 0;
  if (!visible) return null;
  const glow = palDark
    ? "drop-shadow(0 0 4px rgba(14,20,32,0.35))"
    : inChorus
    ? "drop-shadow(0 0 6px rgba(255,243,224,0.9)) drop-shadow(0 0 22px rgba(194,54,27,0.55))"
    : "drop-shadow(0 0 6px rgba(255,182,39,0.85)) drop-shadow(0 0 24px rgba(255,107,44,0.55))";
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      <g style={{ filter: glow }}>
        {bars}
        <path
          d={path}
          fill="none"
          stroke={palDark ? C.night : C.cream}
          strokeWidth={stopped ? 4 : 2 + mode.thin}
          opacity={(stopped ? 0.95 : lineFlash) * Math.max(endFade, 0.6) * (realT > 84.85 ? 0 : 1)}
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
};
