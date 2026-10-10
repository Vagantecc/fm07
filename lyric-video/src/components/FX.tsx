import React from "react";
import { random, interpolate, Easing } from "remotion";
import { noise2D } from "@remotion/noise";
import { C, W, H } from "../theme";
import { useT } from "../lib/time";

/** Céu estrelado: posições fixas por seed, cintilação por noise, deriva lenta */
export const Stars: React.FC<{ opacity: number; count: number; seed: string; maxY?: number }> = ({ opacity, count, seed, maxY = 0.85 }) => {
  const { f } = useT();
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity }}>
      {new Array(count).fill(0).map((_, i) => {
        const x = (random(`${seed}-x-${i}`) * W + f * (0.05 + random(`${seed}-v-${i}`) * 0.12)) % W;
        const y = random(`${seed}-y-${i}`) * H * maxY;
        const r = 0.8 + random(`${seed}-r-${i}`) * 2.2;
        const tw = 0.45 + 0.55 * (0.5 + 0.5 * noise2D(seed, i * 3.1, f * 0.03));
        return <circle key={i} cx={x} cy={y} r={r} fill={C.cream} opacity={tw} />;
      })}
    </svg>
  );
};

/** Onda de choque radial a partir de `at` (s) */
export const Shockwave: React.FC<{ at: number; x?: number; y?: number; color?: string; rings?: number; maxR?: number }> = ({ at, x = W / 2, y = H / 2, color = C.cream, rings = 3, maxR = 1300 }) => {
  const { t } = useT();
  const dt = t - at;
  if (dt < 0 || dt > 1.2) return null;
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {new Array(rings).fill(0).map((_, i) => {
        const p = interpolate(dt - i * 0.07, [0, 0.8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
        if (p <= 0) return null;
        return <circle key={i} cx={x} cy={y} r={40 + p * maxR} fill="none" stroke={i === 1 ? C.gold : color} strokeWidth={(1 - p) * 38 + 2} opacity={(1 - p) * 0.9} />;
      })}
    </svg>
  );
};

const star = (r: number) => {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    pts.push(`${(Math.cos(a) * rr).toFixed(1)},${(Math.sin(a) * rr).toFixed(1)}`);
  }
  return `M${pts.join(" L")} Z`;
};
const diamond = (r: number) => `M0 ${-r} L${r * 0.6} 0 L0 ${r} L${-r * 0.6} 0 Z`;
const CONF_COLORS = [C.gold, C.sunset, C.cream, C.rose, C.denim, "#FFD36E"];

/** Confete geométrico (losangos e estrelas), física analítica (determinística) */
export const Confetti: React.FC<{ at: number; count?: number; seed: string; x?: number; y?: number; power?: number; duration?: number; colors?: string[] }> = ({ at, count = 90, seed, x = W / 2, y = H / 2, power = 1, duration = 2.6, colors = CONF_COLORS }) => {
  const { t } = useT();
  const dt = t - at;
  if (dt < 0 || dt > duration) return null;
  const g = 1500;
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible" }}>
      {new Array(count).fill(0).map((_, i) => {
        const a = random(`${seed}-a-${i}`) * Math.PI * 2;
        const sp = (500 + random(`${seed}-s-${i}`) * 1500) * power;
        const drag = Math.exp(-dt * 1.6);
        const vx = Math.cos(a) * sp;
        const vy = Math.sin(a) * sp - 350;
        const px = x + (vx * (1 - drag)) / 1.6;
        const py = y + (vy * (1 - drag)) / 1.6 + 0.5 * g * dt * dt * 0.55;
        const rot = random(`${seed}-r-${i}`) * 360 + dt * (200 + random(`${seed}-w-${i}`) * 600);
        const size = 10 + random(`${seed}-z-${i}`) * 18;
        const op = interpolate(dt, [0, duration * 0.7, duration], [1, 1, 0]);
        const isStar = random(`${seed}-k-${i}`) > 0.55;
        return (
          <path
            key={i}
            d={isStar ? star(size) : diamond(size)}
            transform={`translate(${px.toFixed(1)} ${py.toFixed(1)}) rotate(${rot.toFixed(1)}) scale(1 ${Math.cos(dt * 8 + i).toFixed(2)})`}
            fill={colors[i % colors.length]}
            opacity={op}
          />
        );
      })}
    </svg>
  );
};

/** Partículas lentas subindo (luz quente / poeira dourada) */
export const Embers: React.FC<{ opacity: number; count?: number; seed: string; color?: string; speed?: number }> = ({ opacity, count = 50, seed, color = C.gold, speed = 1 }) => {
  const { f } = useT();
  if (opacity <= 0) return null;
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity, pointerEvents: "none" }}>
      {new Array(count).fill(0).map((_, i) => {
        const v = (0.6 + random(`${seed}-v-${i}`) * 1.6) * speed;
        const y = H + 40 - ((random(`${seed}-y-${i}`) * (H + 80) + f * v) % (H + 80));
        const x = random(`${seed}-x-${i}`) * W + noise2D(seed, i, f * 0.01) * 40;
        const r = 2 + random(`${seed}-r-${i}`) * 5;
        return <circle key={i} cx={x} cy={y} r={r} fill={color} opacity={0.35 + 0.5 * random(`${seed}-o-${i}`)} />;
      })}
    </svg>
  );
};

