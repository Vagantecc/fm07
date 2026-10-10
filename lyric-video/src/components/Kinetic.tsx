import React from "react";
import { spring, interpolate, Easing } from "remotion";
import { FPS, C, MAX_LINE_W } from "../theme";
import { F } from "../fonts";
import { ANTICIPATION, kickPulse, useT, type Line, type Word } from "../lib/time";

export type Enter = "pop" | "up" | "left" | "drop" | "blur" | "stamp";
export type ExitDir = "up" | "down" | "left" | "right" | "none";

export const SNAPPY = { damping: 12, stiffness: 200, mass: 0.6 };
export const BOUNCY = { damping: 8, stiffness: 200, mass: 0.6 };

/** Progresso de entrada de uma palavra (spring), já com antecipação de 2,5 frames */
export const wordSpring = (t: number, start: number, emphasis = false, delay = 0) => {
  const fl = (t - (start - ANTICIPATION) - delay) * FPS;
  if (fl < 0) return 0;
  return spring({ frame: fl, fps: FPS, config: emphasis ? BOUNCY : SNAPPY });
};

/** Saída: 0 → 1 em `frames` (8–10) com aceleração */
export const exitProgress = (t: number, exitAt: number, frames = 9) =>
  interpolate((t - exitAt) * FPS, [0, frames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.cubic),
  });

/** Filtro SVG de blur direcional (stdDeviation x y) */
export const DirBlur: React.FC<{ id: string; x: number; y: number }> = ({ id, x, y }) => (
  <svg width={0} height={0} style={{ position: "absolute" }}>
    <filter id={id} x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation={`${Math.max(0, x)} ${Math.max(0, y)}`} />
    </filter>
  </svg>
);

const dirVec = (d: ExitDir) =>
  d === "up" ? [0, -1] : d === "down" ? [0, 1] : d === "left" ? [-1, 0] : d === "right" ? [1, 0] : [0, 0];

/** Container de saída: translada rápido, some e borra na direção do movimento */
export const ExitWrap: React.FC<{
  id: string;
  exitAt: number;
  dir?: ExitDir;
  frames?: number;
  distance?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ id, exitAt, dir = "up", frames = 9, distance = 220, style, children }) => {
  const { t } = useT();
  const e = exitProgress(t, exitAt, frames);
  if (e >= 1) return null;
  const [dx, dy] = dirVec(dir);
  const blur = e * 12;
  const fid = `xb-${id}`;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        transform: `translate(${dx * e * distance}px, ${dy * e * distance}px)`,
        opacity: 1 - e * 0.9,
        filter: e > 0.01 ? `url(#${fid})` : undefined,
        ...style,
      }}
    >
      {e > 0.01 && <DirBlur id={fid} x={Math.abs(dx) * blur + 0.5} y={Math.abs(dy) * blur + 0.5} />}
      {children}
    </div>
  );
};

export type WordLook = {
  font?: string;
  size?: number;
  color?: string;
  weight?: number;
  upper?: boolean;
  tracking?: number;
  shadow?: string;
  block?: boolean; // força quebra de linha antes
  pad?: number; // margem horizontal extra (px) para palavras que crescem
};

/** Uma palavra animada */
export const KWord: React.FC<{
  word: Word;
  enter?: Enter;
  look: WordLook;
  delay?: number;
  extraTransform?: string;
}> = ({ word, enter = "pop", look, delay = 0, extraTransform = "" }) => {
  const { t } = useT();
  const s = wordSpring(t, word.start, word.emphasis, delay);
  const vis = s > 0;
  let tr = "";
  let blur = 0;
  let op = Math.min(1, s * 2.2);
  switch (enter) {
    case "pop":
      tr = `translateY(${(1 - s) * 36}px) scale(${0.55 + 0.45 * s})`;
      break;
    case "up":
      tr = `translateY(${(1 - s) * 90}px)`;
      blur = (1 - Math.min(1, s)) * 10;
      break;
    case "left":
      tr = `translateX(${(1 - s) * 260}px)`;
      blur = (1 - Math.min(1, s)) * 14;
      break;
    case "drop":
      tr = `translateY(${-(1 - s) * 140}px) rotate(${(1 - s) * -8}deg)`;
      break;
    case "blur":
      op = Math.min(1, s * 1.4);
      blur = (1 - Math.min(1, s)) * 18;
      tr = `scale(${0.94 + 0.06 * s})`;
      break;
    case "stamp":
      tr = `scale(${2.2 - 1.2 * s}) rotate(${(1 - s) * -6}deg)`;
      op = Math.min(1, s * 3);
      break;
  }
  const size = look.size ?? 84;
  return (
    <span
      style={{
        display: "inline-block",
        fontFamily: look.font ?? F.text,
        fontWeight: look.weight ?? 800,
        fontSize: size,
        lineHeight: 1.02,
        color: look.color ?? C.cream,
        letterSpacing: look.tracking ?? 0,
        textTransform: look.upper ? "uppercase" : "none",
        textShadow: look.shadow,
        opacity: vis ? op : 0,
        transform: `${tr} ${extraTransform}`,
        filter: blur > 0.3 ? `blur(${blur}px)` : undefined,
        margin: `0 ${size * 0.14 + (look.pad ?? 0)}px`,
        whiteSpace: "nowrap",
        transformOrigin: "50% 70%",
      }}
    >
      {word.w}
    </span>
  );
};

/** Linha cinética palavra-a-palavra com quebra automática (≤ 70% da largura) */
export const KLine: React.FC<{
  line: Line;
  enter?: Enter;
  look?: WordLook;
  emphLook?: WordLook;
  lookFor?: (w: Word, i: number) => WordLook | undefined;
  enterFor?: (w: Word, i: number) => Enter | undefined;
  transformFor?: (w: Word, i: number) => string;
  breakBefore?: number[];
  maxWidth?: number;
  align?: "center" | "left" | "right";
  punch?: boolean;
  style?: React.CSSProperties;
}> = ({ line, enter = "pop", look = {}, emphLook, lookFor, enterFor, transformFor, breakBefore = [], maxWidth = MAX_LINE_W, align = "center", punch = true, style }) => {
  const { t } = useT();
  const sc = punch ? 1 + 0.04 * kickPulse(t) : 1;
  const emph: WordLook = emphLook ?? { font: F.display, size: (look.size ?? 84) * 1.6, color: C.gold, weight: 400, upper: true };
  return (
    <div
      style={{
        maxWidth,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: align === "center" ? "center" : align === "left" ? "flex-start" : "flex-end",
        alignItems: "baseline",
        rowGap: 6,
        transform: `scale(${sc})`,
        ...style,
      }}
    >
      {line.words.map((w, i) => {
        const lk = lookFor?.(w, i) ?? (w.emphasis ? { ...look, ...emph } : look);
        const brk = breakBefore.includes(i) || lk.block;
        return (
          <React.Fragment key={i}>
            {brk && <span style={{ flexBasis: "100%", height: 0 }} />}
            <KWord word={w} enter={enterFor?.(w, i) ?? enter} look={lk} extraTransform={transformFor?.(w, i)} />
          </React.Fragment>
        );
      })}
    </div>
  );
};

export const Center: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", ...style }}>
    {children}
  </div>
);
