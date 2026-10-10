import React from "react";
import { interpolate, spring, Easing } from "remotion";
import { Trail } from "@remotion/motion-blur";
import { C, FPS, W, H } from "../theme";
import { F } from "../fonts";
import { AUDIO, MARKERS, SCENES, line, ramp, useT, exitFor, type Line, type Word } from "../lib/time";
import { Center, ExitWrap, KWord, type WordLook } from "../components/Kinetic";
import { Icon, type IconName } from "../components/Icons";
import { Confetti, Shockwave } from "../components/FX";

// Cada troca de painel cai exatamente num downbeat
const nearestDownbeat = (t: number) => AUDIO.downbeats.reduce((a, b) => (Math.abs(b - t) < Math.abs(a - t) ? b : a));

type Panel = { id: string; at: number; bg: string; icon: IconName; iconColor: string };
const PANELS: Panel[] = [
  { id: "g-1", at: nearestDownbeat(line("g-1").words[1].start), bg: `linear-gradient(160deg, ${C.denim} 0%, #2E5F8A 60%, ${C.sky} 100%)`, icon: "city", iconColor: C.cream },
  { id: "g-2", at: nearestDownbeat(line("g-2").words[2].start), bg: `linear-gradient(160deg, ${C.ember} 0%, ${C.sunset} 65%, #FF9A4D 100%)`, icon: "store", iconColor: C.cream },
  { id: "g-3", at: nearestDownbeat(line("g-3").words[2].start), bg: `linear-gradient(170deg, ${C.gold} 0%, #D9A02A 50%, ${C.field} 100%)`, icon: "field", iconColor: C.night },
];
export const GATILHO_PANELS = PANELS;

const TAMBEM = line("g-5");
const STOP = line("g-4");

/** Wipe diagonal: polígono que varre da direita pra esquerda em 14 frames */
const wipeClip = (p: number) => {
  const x = (1 - p) * (W + 600);
  return `polygon(${x}px 0px, ${W + 600}px 0px, ${W + 600}px ${H}px, ${x - 600}px ${H}px)`;
};

const PanelBg: React.FC<{ p: Panel; idx: number }> = ({ p, idx }) => {
  const { t } = useT();
  const prog = interpolate(t, [p.at - 7 / FPS, p.at + 7 / FPS], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  if (prog <= 0) return null;
  const draw = ramp(t, p.at, p.at + 0.9);
  const drift = (t - p.at) * 14;
  return (
    <div style={{ position: "absolute", inset: 0, clipPath: prog < 1 ? wipeClip(prog) : undefined }}>
      <div style={{ position: "absolute", inset: 0, background: p.bg }} />
      {/* textura em listras diagonais (madeira/couro estilizado) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.08,
          background: `repeating-linear-gradient(115deg, rgba(0,0,0,0.6) 0px, rgba(0,0,0,0.6) 2px, transparent 2px, transparent ${18 + idx * 6}px)`,
        }}
      />
      <div style={{ position: "absolute", right: 110 - drift * 0.4, bottom: 230, opacity: 0.95 }}>
        <Icon name={p.icon} progress={draw} size={540} color={p.iconColor} strokeWidth={5} />
      </div>
    </div>
  );
};

const SLOT: WordLook = { font: F.text, size: 118, color: C.cream, weight: 800 };
const CONNECT: WordLook = { font: F.text, size: 84, color: C.cream, weight: 700 };

/** Uma linha do gatilho: "Eu tô" sempre no mesmo lugar, conector e palavra-chave gigante */
const GLine: React.FC<{ l: Line; exitAt: number; keyLook: WordLook; dark?: boolean }> = ({ l, exitAt, keyLook, dark }) => {
  const { t } = useT();
  if (t < l.start - 0.4 || t > exitAt + 0.3) return null;
  const ws = l.words;
  const slot = ws.slice(0, 2);
  const conn = ws.slice(2, -1);
  const key = ws[ws.length - 1];
  const col = dark ? C.night : C.cream;
  return (
    <ExitWrap id={l.lineId} exitAt={exitAt} dir="left" frames={8}>
      <div style={{ position: "absolute", left: 150, top: 200, display: "flex" }}>
        {slot.map((w, i) => (
          <KWord key={i} word={w} enter="pop" look={{ ...SLOT, color: col }} />
        ))}
        {conn.map((w, i) => (
          <KWord key={i} word={w} enter="up" look={{ ...CONNECT, color: col }} />
        ))}
      </div>
      <div style={{ position: "absolute", left: 130, top: 330 }}>
        <KWord word={key} enter="stamp" look={keyLook} />
      </div>
    </ExitWrap>
  );
};

/** Placa de "STOP!" (octógono rose) */
const StopSign: React.FC = () => {
  const { t } = useT();
  const w = STOP.words[0];
  const s = spring({ frame: Math.max(0, (t - w.start + 2.5 / FPS) * FPS), fps: FPS, config: { damping: 8, stiffness: 260, mass: 0.5 } });
  if (t < w.start - 0.1 || t >= TAMBEM.start - 1 / FPS) return null;
  const pts = new Array(8)
    .fill(0)
    .map((_, i) => {
      const a = Math.PI / 8 + (i * Math.PI) / 4;
      return `${200 + Math.cos(a) * 190},${200 + Math.sin(a) * 190}`;
    })
    .join(" ");
  return (
    <Center>
      <div style={{ position: "relative", width: 400, height: 400, marginBottom: 160, transform: `scale(${(2.2 - 1.2 * s) * 1.35}) rotate(${(1 - s) * 12 - 4}deg)`, opacity: Math.min(1, s * 3) }}>
        <svg width={400} height={400} style={{ position: "absolute", inset: 0 }}>
          <polygon points={pts} fill={C.rose} stroke={C.cream} strokeWidth={14} strokeLinejoin="round" />
        </svg>
        <Center>
          <span style={{ fontFamily: F.display, fontSize: 150, color: C.cream, letterSpacing: 2 }}>STOP!</span>
        </Center>
      </div>
    </Center>
  );
};

/** "TAMBÉM TÔ!": explode no frame em que a música volta (0 → 1.15 → 1) */
const TambemWord: React.FC<{ w: Word; size: number; color: string; delay: number }> = ({ w, size, color, delay }) => {
  const { t } = useT();
  const fl = (t - MARKERS.stop.end - delay) * FPS;
  if (fl < 0) return <span style={{ fontFamily: F.display, fontSize: size, opacity: 0 }}>{w.w}</span>;
  const s = spring({ frame: fl, fps: FPS, config: { damping: 8, stiffness: 220, mass: 0.6 } });
  return (
    <span
      style={{
        display: "inline-block",
        fontFamily: F.display,
        fontSize: size,
        lineHeight: 0.92,
        color,
        textTransform: "uppercase",
        transform: `scale(${s})`,
        textShadow: `0 14px 0 ${C.ember}`,
      }}
    >
      {w.w}
    </span>
  );
};

const TAMBEM_EXIT = exitFor("g-5", "r-1", { frames: 8 });

/** Fundo do TAMBÉM TÔ (camada de fundo, abaixo da waveform) */
const TambemBg: React.FC = () => {
  const { t } = useT();
  const at = MARKERS.stop.end;
  if (t < at - 0.05 || t > TAMBEM_EXIT + 9 / FPS) return null;
  const burst = interpolate(t, [at, at + 0.22], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const out = interpolate(t, [TAMBEM_EXIT, TAMBEM_EXIT + 9 / FPS], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", inset: 0, opacity: out }}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 50%, ${C.gold} 0%, ${C.sunset} 45%, ${C.ember} 100%)` }} />
      <div style={{ position: "absolute", inset: 0, background: C.cream, opacity: burst * 0.7 }} />
    </div>
  );
};

const Tambem: React.FC = () => {
  const { t } = useT();
  const at = MARKERS.stop.end;
  const exitAt = TAMBEM_EXIT;
  if (t < at - 0.05 || t > exitAt + 0.3) return null;
  return (
    <>
      <Shockwave at={at} rings={3} />
      <Confetti at={at} seed="tambem" count={120} power={1.2} />
      <ExitWrap id="g-5" exitAt={exitAt} dir="up" frames={8}>
        <Trail layers={4} lagInFrames={0.6} trailOpacity={0.45}>
          <Center>
            <TambemWord w={TAMBEM.words[0]} size={320} color={C.cream} delay={0} />
            <div style={{ height: 24 }} />
            <TambemWord w={TAMBEM.words[1]} size={400} color={C.night} delay={2 / FPS} />
          </Center>
        </Trail>
      </ExitWrap>
    </>
  );
};

/** Camada de fundo do gatilho: painéis com wipe diagonal + fundo da explosão */
export const GatilhoBg: React.FC = () => {
  const { t } = useT();
  const [a, b] = SCENES.gatilho;
  if (t < a - 0.5 || t > b + 0.5) return null;
  return (
    <>
      {t < TAMBEM.start && PANELS.map((p, i) => <PanelBg key={p.id} p={p} idx={i} />)}
      <TambemBg />
    </>
  );
};

export const Gatilho: React.FC = () => {
  const { t } = useT();
  const [a, b] = SCENES.gatilho;
  if (t < a - 0.5 || t > b + 0.5) return null;
  const g1 = line("g-1");
  const g2 = line("g-2");
  const g3 = line("g-3");
  const keyBase: WordLook = { font: F.display, size: 330, color: C.cream, weight: 400, upper: true, shadow: `0 12px 0 rgba(14,20,32,0.35)` };
  const panelsVisible = t < TAMBEM.start;
  return (
    <>
      {panelsVisible && (
        <>
          <GLine l={g1} exitAt={exitFor("g-1", "g-2", { frames: 8 })} keyLook={keyBase} />
          <GLine l={g2} exitAt={exitFor("g-2", "g-3", { frames: 8 })} keyLook={keyBase} />
          <GLine l={g3} exitAt={TAMBEM.start - 1 / FPS} keyLook={{ ...keyBase, font: F.western, size: 250, color: C.night, shadow: `0 10px 0 rgba(255,243,224,0.6)` }} dark />
          <StopSign />
        </>
      )}
      <Tambem />
    </>
  );
};
