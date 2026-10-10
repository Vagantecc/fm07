import React from "react";
import { interpolate, spring } from "remotion";
import { C, FPS } from "../theme";
import { F } from "../fonts";
import { SCENES, exitFor, line, ramp, snarePulse, useT, type Word } from "../lib/time";
import { Center, ExitWrap, KLine, wordSpring } from "../components/Kinetic";
import { Icon, type IconName } from "../components/Icons";

const LOOK = { font: F.text, size: 104, color: C.cream, weight: 800 };
const EMPH = { font: F.display, size: 220, color: C.gold, weight: 400, upper: true, shadow: `0 8px 0 ${C.ember}` };

const ITEMS: { id: string; next: string; icon: IconName; brk: number[] }[] = [
  { id: "v1-1", next: "v1-2", icon: "card", brk: [3] },
  { id: "v1-2", next: "v1-3", icon: "chart", brk: [2] },
  { id: "v1-3", next: "v1-4", icon: "shield", brk: [2] },
  { id: "v1-4", next: "p-1", icon: "house", brk: [2] },
];

const VerseLine: React.FC<{ id: string; next: string; icon: IconName; brk: number[] }> = ({ id, next, icon, brk }) => {
  const { t } = useT();
  const l = line(id);
  const exitAt = exitFor(id, next);
  if (t < l.start - 0.6 || t > exitAt + 0.3) return null;
  const draw = ramp(t, l.start - 0.35, l.start + 0.6);
  const pop = spring({ frame: Math.max(0, (t - l.start + 0.35) * FPS), fps: FPS, config: { damping: 9, stiffness: 180, mass: 0.6 } });
  // cartão "vibra" na caixa (±3° a cada snare), como notificação
  const sn = snarePulse(t);
  const wiggle = icon === "card" ? (sn.i % 2 === 0 ? 1 : -1) * 3 * sn.v : 0;
  const transformFor = (w: Word) => {
    if (w.w === "cresce") {
      const g = interpolate(t, [w.start, w.end + 0.2], [1, 1.22], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      return `scale(${g})`;
    }
    if (w.w === "sonhar") return `translateY(${Math.sin(t * 5) * 8}px)`;
    if (w.w === "realizar") {
      const s = wordSpring(t, w.start, true);
      return `rotate(${(1 - s) * -4}deg)`;
    }
    return "";
  };
  const iconColor = icon === "chart" ? C.gold : C.cream;
  return (
    <ExitWrap id={id} exitAt={exitAt} dir="up">
      <Center style={{ justifyContent: "flex-start", paddingTop: 90 }}>
        <div style={{ transform: `scale(${0.6 + 0.4 * pop}) rotate(${wiggle}deg)`, opacity: Math.min(1, pop * 2), height: 330 }}>
          <Icon name={icon} progress={draw} size={320} color={iconColor} strokeWidth={6} />
        </div>
        <div style={{ height: 10 }} />
        <KLine line={l} look={LOOK} emphLook={EMPH} breakBefore={brk} transformFor={transformFor} lookFor={(w) => (w.w === "cresce" ? { ...LOOK, pad: 56 } : undefined)} />
      </Center>
    </ExitWrap>
  );
};

export const Verso: React.FC = () => {
  const { t } = useT();
  const [a, b] = SCENES.verso;
  if (t < a - 0.5 || t > b + 0.5) return null;
  return (
    <>
      {ITEMS.map((it) => (
        <VerseLine key={it.id} {...it} />
      ))}
    </>
  );
};
