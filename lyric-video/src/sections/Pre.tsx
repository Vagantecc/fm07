import React from "react";
import { interpolate, spring, Easing } from "remotion";
import { Trail } from "@remotion/motion-blur";
import { evolvePath, getPointAtLength, getLength, getTangentAtLength } from "@remotion/paths";
import { C, FPS, W, H } from "../theme";
import { F } from "../fonts";
import { AUDIO, SCENES, exitFor, line, ramp, useT, type Word } from "../lib/time";
import { Center, ExitWrap, KLine, KWord } from "../components/Kinetic";
import { Icon, ICONS } from "../components/Icons";

const LOOK = { font: F.text, size: 96, color: C.cream, weight: 800 };

/** "O app é completo": celular com apps acendendo no beat */
const AppLine: React.FC = () => {
  const { t } = useT();
  const l = line("p-1");
  const exitAt = exitFor("p-1", "p-2");
  if (t < l.start - 0.6 || t > exitAt + 0.3) return null;
  const draw = ramp(t, l.start - 0.4, l.start + 0.3);
  const beatsIn = AUDIO.beats.filter((b) => b >= l.start - 0.3 && b <= t).length;
  const tiles = [];
  for (let i = 0; i < 9; i++) {
    const on = i < beatsIn * 2 + (t > l.words[3].start ? 9 : 0);
    const r = Math.floor(i / 3);
    const c = i % 3;
    const s = on ? 1 : 0;
    tiles.push(
      <rect key={i} x={66 + c * 24} y={52 + r * 26} width={18} height={18} rx={5} fill={[C.gold, C.sunset, C.cream][(r + c) % 3]} opacity={s} transform={`translate(${75 + c * 24} ${61 + r * 26}) scale(${s}) translate(${-(75 + c * 24)} ${-(61 + r * 26)})`} />,
    );
  }
  const words = l.words;
  return (
    <ExitWrap id="p-1" exitAt={exitAt} dir="left">
      <Center style={{ flexDirection: "row", gap: 40 }}>
        <div style={{ position: "relative", width: 380, height: 380 }}>
          <svg viewBox="0 0 200 200" width={380} height={380} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
            {tiles}
          </svg>
          <Icon name="phone" progress={draw} size={380} strokeWidth={6} style={{ position: "absolute", inset: 0 }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <div style={{ display: "flex" }}>
            {words.slice(0, 3).map((w, i) => (
              <KWord key={i} word={w} enter="up" look={LOOK} />
            ))}
          </div>
          <KWord word={words[3]} enter="stamp" look={{ font: F.display, size: 230, color: C.gold, weight: 400, upper: true, shadow: `0 10px 0 ${C.ember}` }} />
        </div>
      </Center>
    </ExitWrap>
  );
};

// rota do avião (de baixo-esquerda até cima-direita)
const ROUTE = `M 140 860 C 520 980, 760 540, 1100 640 S 1640 380, 1820 180`;
const ROUTE_LEN = getLength(ROUTE);

/** "Te acompanha de perto e pra viajar": palavras correm da direita pra esquerda; "viajar" chega voando com o avião */
const TravelLine: React.FC = () => {
  const { t } = useT();
  const l = line("p-2");
  const exitAt = exitFor("p-2", "p-3", { frames: 8 });
  if (t < l.start - 0.6 || t > exitAt + 0.3) return null;
  const vi = l.words[l.words.length - 1];
  const p = interpolate(t, [l.start - 0.2, vi.start + 0.15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) });
  const route = evolvePath(p, ROUTE);
  const pt = getPointAtLength(ROUTE, p * ROUTE_LEN) ?? { x: 0, y: 0 };
  const tg = getTangentAtLength(ROUTE, Math.min(ROUTE_LEN - 1, p * ROUTE_LEN)) ?? { x: 1, y: 0 };
  const ang = (Math.atan2(tg.y, tg.x) * 180) / Math.PI;
  const head = l.words.slice(0, -1);
  return (
    <ExitWrap id="p-2" exitAt={exitAt} dir="left">
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <mask id="routeMask">
          <path d={ROUTE} fill="none" stroke="#fff" strokeWidth={24} strokeDasharray={route.strokeDasharray} strokeDashoffset={route.strokeDashoffset} />
        </mask>
        <path d={ROUTE} fill="none" stroke={C.cream} strokeWidth={6} strokeDasharray="2 22" strokeLinecap="round" opacity={0.8} mask="url(#routeMask)" />
        <g transform={`translate(${pt.x} ${pt.y}) rotate(${ang + 18}) translate(-60 -60)`}>
          <svg viewBox="0 0 200 200" width={120} height={120} overflow="visible">
            {ICONS.plane.map((d, i) => (
              <path key={i} d={d} fill={i === 0 ? C.cream : "none"} stroke={C.cream} strokeWidth={8} strokeLinejoin="round" strokeLinecap="round" />
            ))}
          </svg>
        </g>
      </svg>
      <Center style={{ paddingBottom: 380 }}>
        <KLine line={{ ...l, words: head }} look={LOOK} enter="left" breakBefore={[2]} />
        <div style={{ height: 10 }} />
        <Trail layers={4} lagInFrames={0.5} trailOpacity={0.5}>
          <Center style={{ paddingTop: 120 }}>
            <ViajarWord w={vi} />
          </Center>
        </Trail>
      </Center>
    </ExitWrap>
  );
};

const LATE = 0.16; // "viajar" chega atrasado, empurrado pelo avião
const ViajarWord: React.FC<{ w: Word }> = ({ w }) => {
  const { t } = useT(); // dentro do <Trail>: cada camada vê o seu próprio frame
  const s = spring({ frame: Math.max(0, (t - w.start - LATE) * FPS), fps: FPS, config: { damping: 9, stiffness: 160, mass: 0.7 } });
  return (
  <span
    style={{
      fontFamily: F.display,
      fontSize: 210,
      color: C.gold,
      textTransform: "uppercase",
      display: "inline-block",
      transform: `translateX(${(1 - s) * 900}px) rotate(${(1 - s) * 14}deg)`,
      opacity: s > 0.001 ? 1 : 0,
      textShadow: `0 10px 0 ${C.ember}`,
    }}
  >
    {w.w}
  </span>
  );
};

/** "Você tem com quem contar": stack vertical */
const CountLine: React.FC = () => {
  const { t } = useT();
  const l = line("p-3");
  const exitAt = exitFor("p-3", "g-1");
  if (t < l.start - 0.6 || t > exitAt + 0.3) return null;
  return (
    <ExitWrap id="p-3" exitAt={exitAt} dir="up">
      <Center>
        <KLine line={l} look={{ ...LOOK, size: 110 }} emphLook={{ font: F.display, size: 270, color: C.gold, weight: 400, upper: true, shadow: `0 10px 0 ${C.ember}` }} breakBefore={[2, 4]} enter="up" />
      </Center>
    </ExitWrap>
  );
};

export const Pre: React.FC = () => {
  const { t } = useT();
  const [a, b] = SCENES.pre;
  if (t < a - 0.5 || t > b + 0.5) return null;
  return (
    <>
      <AppLine />
      <TravelLine />
      <CountLine />
    </>
  );
};
