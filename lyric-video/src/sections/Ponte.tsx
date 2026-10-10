import React from "react";
import { interpolate, random, Easing } from "remotion";
import { evolvePath } from "@remotion/paths";
import { C, FPS, W, H } from "../theme";
import { F } from "../fonts";
import { SCENES, exitFor, line, ramp, useT, type Word } from "../lib/time";
import { Center, ExitWrap, KWord, wordSpring, type WordLook } from "../components/Kinetic";
import { Icon } from "../components/Icons";
import { Embers } from "../components/FX";

const SMALL: WordLook = { font: F.text, size: 76, color: C.cream, weight: 700 };

/** "Sicredi 125 anos": contador rolando até 125 */
const Anos: React.FC = () => {
  const { t } = useT();
  const l = line("b-1");
  const exitAt = exitFor("b-1", "b-2", { frames: 10 });
  if (t < l.start - 0.5 || t > exitAt + 0.3) return null;
  const [marca, num, anos] = l.words;
  const n = Math.round(interpolate(t, [num.start - 0.05, num.end + 0.25], [0, 125], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }));
  const s = wordSpring(t, num.start, true);
  const glow = interpolate(t, [num.end, num.end + 0.6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <ExitWrap id="b-1" exitAt={exitAt} dir="up" frames={10} distance={120}>
      <Center>
        <KWord word={{ ...marca, w: marca.w.toUpperCase() }} enter="blur" look={{ ...SMALL, size: 64, tracking: 22, weight: 800 }} />
        <div
          style={{
            fontFamily: F.display,
            fontSize: 250,
            lineHeight: 1,
            color: C.gold,
            opacity: s > 0 ? Math.min(1, s * 1.5) : 0,
            filter: s < 1 ? `blur(${(1 - Math.min(1, s)) * 14}px)` : undefined,
            textShadow: `0 0 ${30 * glow}px rgba(255,182,39,${0.7 * glow})`,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {n}
        </div>
        <KWord word={anos} enter="blur" look={{ ...SMALL, size: 80 }} />
      </Center>
    </ExitWrap>
  );
};

/** "Não é só dinheiro": moeda desenhada que tropeça (glitch leve) em "dinheiro" */
const Dinheiro: React.FC = () => {
  const { t, f } = useT();
  const l = line("b-2");
  const exitAt = exitFor("b-2", "b-3", { frames: 10 });
  if (t < l.start - 0.5 || t > exitAt + 0.3) return null;
  const din = l.words[l.words.length - 1];
  const draw = ramp(t, l.start - 0.2, l.start + 0.9);
  const g = interpolate(t, [din.start, din.start + 2 / FPS, din.start + 12 / FPS], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const jx = g > 0 ? (random(`gx-${f}`) - 0.5) * 22 * g : 0;
  const jy = g > 0 ? (random(`gy-${f}`) - 0.5) * 10 * g : 0;
  const trip = interpolate(t, [din.start, din.start + 0.12, din.start + 0.5], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const words = (color: string) => (
    <div style={{ display: "flex" }}>
      {l.words.map((w: Word, i) => (
        <KWord key={i} word={w} enter="blur" look={{ ...SMALL, size: 96, color }} />
      ))}
    </div>
  );
  return (
    <ExitWrap id="b-2" exitAt={exitAt} dir="up" frames={10} distance={120}>
      <Center style={{ gap: 30 }}>
        <div style={{ transform: `translate(${jx}px, ${jy + trip * 14}px) rotate(${-14 * trip}deg)` }}>
          <Icon name="coin" progress={draw} size={230} color={C.cream} strokeWidth={6} />
        </div>
        <div style={{ position: "relative" }}>
          {g > 0.05 && (
            <>
              <div style={{ position: "absolute", inset: 0, transform: `translate(${-9 * g + jx}px, 0)`, opacity: 0.7, mixBlendMode: "screen" }}>{words(C.rose)}</div>
              <div style={{ position: "absolute", inset: 0, transform: `translate(${9 * g - jx}px, 0)`, opacity: 0.7, mixBlendMode: "screen" }}>{words(C.sky)}</div>
            </>
          )}
          <div style={{ transform: `translate(${jx * 0.4}px, 0)` }}>{words(C.cream)}</div>
        </div>
      </Center>
    </ExitWrap>
  );
};

// duas linhas que nascem nas bordas, convergem e se abraçam atrás do texto
const LEFT_ARM = `M -40 760 C 300 760, 520 640, 700 560 C 860 490, 1010 470, 1060 540 C 1100 600, 1010 660, 940 610`;
const RIGHT_ARM = `M 1960 360 C 1620 360, 1400 470, 1220 540 C 1060 600, 910 620, 860 550 C 820 490, 910 430, 980 480`;

/** "É ter com quem contar": palavras surgem espalhadas e se unem num lockup */
const ComQuemContar: React.FC = () => {
  const { t } = useT();
  const l = line("b-3");
  const exitAt = SCENES.ponte[1] - 10 / FPS;
  if (t < l.start - 0.5 || t > exitAt + 0.3) return null;
  const join = interpolate(t, [l.words[l.words.length - 1].start - 0.1, l.words[l.words.length - 1].start + 0.45], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const arms = interpolate(t, [l.start - 0.2, l.end - 0.1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) });
  const evL = evolvePath(arms, LEFT_ARM);
  const evR = evolvePath(arms, RIGHT_ARM);
  const spread = [
    { x: -520, y: -170 },
    { x: -240, y: 150 },
    { x: 60, y: -200 },
    { x: 330, y: 170 },
    { x: 540, y: -60 },
  ];
  return (
    <ExitWrap id="b-3" exitAt={exitAt} dir="up" frames={10} distance={140}>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <path d={LEFT_ARM} fill="none" stroke={C.gold} strokeWidth={9} strokeLinecap="round" strokeDasharray={evL.strokeDasharray} strokeDashoffset={evL.strokeDashoffset} opacity={0.6} />
        <path d={RIGHT_ARM} fill="none" stroke={C.sunset} strokeWidth={9} strokeLinecap="round" strokeDasharray={evR.strokeDasharray} strokeDashoffset={evR.strokeDashoffset} opacity={0.6} />
      </svg>
      <Center style={{ flexDirection: "row" }}>
        {l.words.map((w, i) => {
          const sp = spread[i] ?? { x: 0, y: 0 };
          const last = i === l.words.length - 1;
          return (
            <div key={i} style={{ transform: `translate(${sp.x * (1 - join)}px, ${sp.y * (1 - join)}px)` }}>
              <KWord word={w} enter="blur" look={last ? { font: F.display, size: 150, color: C.gold, weight: 400, upper: true } : { ...SMALL, size: 92 }} />
            </div>
          );
        })}
      </Center>
    </ExitWrap>
  );
};

export const Ponte: React.FC = () => {
  const { t } = useT();
  const [a, b] = SCENES.ponte;
  if (t < a - 0.5 || t > b + 0.5) return null;
  const b3 = line("b-3");
  // luz quente subindo para preparar o refrão final
  const warm = interpolate(t, [b3.start - 0.5, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.quad) });
  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% ${110 - warm * 40}%, rgba(255,140,50,${0.75 * warm}) 0%, rgba(255,107,44,${0.3 * warm}) 35%, rgba(0,0,0,0) 70%)` }} />
      <Embers opacity={0.25 + 0.6 * warm} seed="ponte-emb" count={40} speed={0.6} />
      <Anos />
      <Dinheiro />
      <ComQuemContar />
    </>
  );
};
