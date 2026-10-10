import React from "react";
import { interpolate, interpolateColors } from "remotion";
import { noise2D } from "@remotion/noise";
import { C, FPS, W, H } from "../theme";
import { SCENES, sceneAt, downbeatFlash, useT, type SceneName } from "../lib/time";
import { Stars } from "./FX";

type Sky = { top: string; mid: string; bot: string; sunY: number; sunR: number; sunA: number };
const SKY: Record<SceneName, Sky> = {
  intro: { top: "#16223F", mid: "#5A2F5E", bot: "#E0592E", sunY: 1010, sunR: 260, sunA: 0.75 },
  verso: { top: C.denim, mid: "#6B3A5E", bot: "#F2743A", sunY: 960, sunR: 300, sunA: 0.85 },
  pre: { top: "#241D47", mid: "#A33A3F", bot: "#FF8A3C", sunY: 1000, sunR: 330, sunA: 0.9 },
  gatilho: { top: "#1B1530", mid: "#4A2440", bot: "#B5402C", sunY: 1120, sunR: 300, sunA: 0.5 },
  refrao: { top: C.ember, mid: C.sunset, bot: C.gold, sunY: 880, sunR: 380, sunA: 1 },
  ponte: { top: C.night, mid: "#16233B", bot: "#2C2442", sunY: 1300, sunR: 300, sunA: 0 },
  outro: { top: "#FFC14D", mid: C.gold, bot: "#FF8A2C", sunY: 540, sunR: 520, sunA: 0.9 },
};

const mix = (a: Sky, b: Sky, k: number): Sky => ({
  top: interpolateColors(k, [0, 1], [a.top, b.top]),
  mid: interpolateColors(k, [0, 1], [a.mid, b.mid]),
  bot: interpolateColors(k, [0, 1], [a.bot, b.bot]),
  sunY: a.sunY + (b.sunY - a.sunY) * k,
  sunR: a.sunR + (b.sunR - a.sunR) * k,
  sunA: a.sunA + (b.sunA - a.sunA) * k,
});

const ORDER: SceneName[] = ["intro", "verso", "pre", "gatilho", "refrao", "ponte", "outro"];

export const skyAt = (t: number): Sky => {
  const s = sceneAt(t);
  const i = ORDER.indexOf(s);
  const start = SCENES[s][0];
  const trans = i === 0 ? 0 : interpolate(t, [start, start + 40 / FPS], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return i === 0 ? SKY[s] : mix(SKY[ORDER[i - 1]], SKY[s], trans);
};

export const Background: React.FC = () => {
  const { t, f } = useT();
  const sky = skyAt(t);
  const scene = sceneAt(t);
  const flash = scene === "refrao" || scene === "outro" ? downbeatFlash(t) : 0;
  const sunWobble = noise2D("sun", f * 0.004, 0) * 12;
  const starsOp = interpolate(t, [SCENES.ponte[0], SCENES.ponte[0] + 0.6, SCENES.ponte[1] - 0.3, SCENES.ponte[1] + 0.3], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const introStars = interpolate(t, [0, 6, 11], [0.55, 0.35, 0], { extrapolateRight: "clamp" });
  // raios girando no refrão final (explosão quente)
  const raysOp = interpolate(t, [SCENES.outro[0], SCENES.outro[0] + 0.5, 83.8, 84.9], [0, 0.22, 0.22, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", inset: 0, filter: `brightness(${1 + 0.08 * flash})`, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, ${sky.top} 0%, ${sky.mid} 55%, ${sky.bot} 100%)` }} />
      {/* sol */}
      <div
        style={{
          position: "absolute",
          left: W / 2 - sky.sunR + sunWobble,
          top: sky.sunY - sky.sunR,
          width: sky.sunR * 2,
          height: sky.sunR * 2,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(255,214,120,${sky.sunA}) 0%, rgba(255,160,60,${sky.sunA * 0.55}) 38%, rgba(255,107,44,0) 70%)`,
        }}
      />
      {raysOp > 0 && (
        <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: raysOp, mixBlendMode: "soft-light" }}>
          <g transform={`translate(${W / 2} ${H / 2}) rotate(${f * 0.15})`}>
            {new Array(18).fill(0).map((_, i) => (
              <path key={i} d="M0 0 L-90 -1400 L90 -1400 Z" fill="#FFFFFF" transform={`rotate(${i * 20})`} />
            ))}
          </g>
        </svg>
      )}
      {starsOp > 0 && <Stars opacity={starsOp} count={160} seed="ponte" />}
      {introStars > 0 && <Stars opacity={introStars} count={80} seed="intro" maxY={0.5} />}
    </div>
  );
};

/** Grão de filme animado (~5%) + vinheta leve */
export const GrainVignette: React.FC = () => {
  const { realF } = useT();
  const seed = realF % 24;
  return (
    <>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: 0.05, mixBlendMode: "overlay", pointerEvents: "none" }}>
        <filter id={`grain-${seed}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={seed} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width={W} height={H} filter={`url(#grain-${seed})`} />
      </svg>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.38) 100%)" }} />
    </>
  );
};
