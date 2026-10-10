import React from "react";
import { AbsoluteFill, Html5Audio, staticFile, interpolate, spring, Easing } from "remotion";
import { C, FPS } from "./theme";
import "./fonts";
import { AUDIO, MARKERS, SCENES, downbeatIndex, kickShake, sceneAt, useT } from "./lib/time";
import { Background, GrainVignette } from "./components/Background";
import { Waveform } from "./components/Waveform";
import { Debug } from "./components/Debug";
import { Intro } from "./sections/Intro";
import { Verso } from "./sections/Verso";
import { Pre } from "./sections/Pre";
import { Gatilho, GatilhoBg } from "./sections/Gatilho";
import { Refrao } from "./sections/Refrao";
import { Ponte } from "./sections/Ponte";
import { Outro } from "./sections/Outro";

export type LyricVideoProps = { debug: boolean };

/** Câmera: drift lento por seção, shake no kick, impactos, rotação no refrão final e congelamento no stop */
const Camera: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t, realT } = useT();
  const sc = sceneAt(t);
  const [a, b] = SCENES[sc];
  const drift = 1 + 0.03 * interpolate(t, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const sh = kickShake(t, 4);
  // impacto forte (12 px) no TAMBÉM TÔ, médio (6 px) na placa de STOP
  const impact = (at: number, px: number, frames: number) => {
    const x = (realT - at) * FPS;
    if (x < 0 || x > frames) return { x: 0, y: 0 };
    const d = Math.pow(1 - x / frames, 2) * px;
    return { x: Math.sin(x * 2.7) * d, y: Math.cos(x * 3.3) * d };
  };
  const i1 = impact(MARKERS.stop.end, 12, 22);
  const i2 = impact(MARKERS.stop.start - 0.25, 6, 12);
  // stop: zoom-in mínimo + dessaturação (tempo real, pois o resto está congelado)
  const inStop = realT >= MARKERS.stop.start && realT < MARKERS.stop.end;
  const stopZoom = inStop ? interpolate(realT, [MARKERS.stop.start, MARKERS.stop.end], [1, 1.035]) : 1;
  const desat = inStop ? interpolate(realT, [MARKERS.stop.start, MARKERS.stop.start + 6 / FPS], [1, 0.12], { extrapolateRight: "clamp" }) : 1;
  // refrão final: rotação ±1,5° alternando a cada downbeat
  let rot = 0;
  if (sc === "outro") {
    const di = downbeatIndex(t);
    const d0 = AUDIO.downbeats[di];
    const s = spring({ frame: Math.max(0, (t - d0) * FPS), fps: FPS, config: { damping: 14, stiffness: 120 } });
    const prev = (di - 1) % 2 === 0 ? 1.5 : -1.5;
    const cur = di % 2 === 0 ? 1.5 : -1.5;
    const calm = interpolate(t, [82.6, 84], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
    rot = (prev + (cur - prev) * s) * calm;
  }
  // rotação sem mostrar as bordas: escala de compensação
  const rotComp = 1 + Math.abs(rot) * 0.032;
  return (
    <AbsoluteFill
      style={{
        transform: `translate(${sh.x + i1.x + i2.x}px, ${sh.y + i1.y + i2.y}px) scale(${drift * stopZoom * rotComp}) rotate(${rot}deg)`,
        filter: desat < 1 ? `saturate(${desat})` : undefined,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

export const LyricVideo: React.FC<LyricVideoProps> = ({ debug }) => {
  const { realT } = useT();
  const fadeOut = interpolate(realT, [84.15, 84.92], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.quad) });
  const fadeIn = interpolate(realT, [0, 0.4], [1, 0], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: C.night, overflow: "hidden" }}>
      <Html5Audio src={staticFile("audio.mp3")} />
      <Camera>
        <Background />
        <GatilhoBg />
        <Waveform />
        <Intro />
        <Verso />
        <Pre />
        <Gatilho />
        <Refrao />
        <Ponte />
        <Outro />
      </Camera>
      <GrainVignette />
      <AbsoluteFill style={{ backgroundColor: C.night, opacity: Math.max(fadeOut, fadeIn), pointerEvents: "none" }} />
      {debug && <Debug />}
    </AbsoluteFill>
  );
};
