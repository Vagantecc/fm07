import React from "react";
import { interpolate, spring } from "remotion";
import { C, FPS } from "../theme";
import { F } from "../fonts";
import { AUDIO, OUTRO_LOCK, OUTRO_SLOTS, SCENES, fakeWord, kickPulse, useT, line } from "../lib/time";
import { Center, ExitWrap, KWord, type Enter } from "../components/Kinetic";
import { Confetti, Embers } from "../components/FX";
import { LOCK_Y } from "./Refrao";

const ENTERS: Enter[] = ["stamp", "drop", "left", "pop"];

/** Refrão final instrumental: palavras do refrão a cada 2 beats, paleta invertida (texto escuro no gold) */
const Slot: React.FC<{ i: number }> = ({ i }) => {
  const { t } = useT();
  const s = OUTRO_SLOTS[i];
  const next = OUTRO_SLOTS[i + 1]?.t ?? OUTRO_LOCK;
  const exitAt = next - (2.5 + 8) / FPS;
  if (t < s.t - 0.2 || t > exitAt + 0.25) return null;
  const parts = s.w.split(" ");
  const step = AUDIO.beatPeriod / 2;
  const size = s.w.length > 8 ? 230 : 300;
  return (
    <ExitWrap id={`o-${i}`} exitAt={exitAt} dir={i % 2 ? "right" : "left"} frames={8}>
      <Center style={{ flexDirection: "row", paddingBottom: 150 }}>
        {parts.map((p, k) => (
          <KWord
            key={k}
            word={fakeWord(p, s.t + k * step, s.t + 1, true)}
            enter={ENTERS[(i + k) % ENTERS.length]}
            look={{ font: F.display, size, color: k % 2 ? C.ember : C.night, weight: 400, upper: true, shadow: `0 10px 0 rgba(255,243,224,0.55)` }}
          />
        ))}
      </Center>
    </ExitWrap>
  );
};

/** Lockup final + hold de 1,5 s antes do fim */
const FinalLock: React.FC = () => {
  const { t } = useT();
  const r5 = line("r-5");
  const at = OUTRO_LOCK;
  if (t < at - 0.2) return null;
  const words = r5.words.map((w, i) => ({ ...w, start: at + i * AUDIO.beatPeriod, end: at + i * AUDIO.beatPeriod + 0.5 }));
  const [conta, comigo, pra, tudo] = words;
  const pulse = 1 + 0.05 * kickPulse(t) * interpolate(t, [83.2, 84.2], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const settle = spring({ frame: Math.max(0, (t - 83.4) * FPS), fps: FPS, config: { damping: 20, stiffness: 60 } });
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: LOCK_Y - 255, display: "flex", flexDirection: "column", alignItems: "center", transform: `scale(${1 + 0.04 * settle})` }}>
      <div style={{ display: "flex" }}>
        <KWord word={conta} enter="drop" look={{ font: F.display, size: 112, color: C.night, weight: 400, upper: true }} />
        <KWord word={comigo} enter="drop" look={{ font: F.display, size: 112, color: C.night, weight: 400, upper: true }} />
      </div>
      <KWord word={pra} enter="pop" look={{ font: F.text, size: 64, color: C.night, weight: 800 }} />
      <div style={{ transform: `scale(${pulse})`, marginTop: -4 }}>
        <KWord word={tudo} enter="stamp" look={{ font: F.display, size: 300, color: C.ember, weight: 400, upper: true, shadow: `0 12px 0 ${C.cream}` }} />
      </div>
    </div>
  );
};

export const Outro: React.FC = () => {
  const { t } = useT();
  const [a] = SCENES.outro;
  if (t < a - 0.5) return null;
  const downs = AUDIO.downbeats.filter((d) => d >= a && d < 83.5);
  return (
    <>
      <Embers opacity={interpolate(t, [a, a + 1, 83.5, 84.9], [0, 0.8, 0.8, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} seed="outro-emb" count={70} color={C.cream} speed={1.6} />
      {downs.map((d, i) => (
        <Confetti key={i} at={d} seed={`out-${i}`} count={36} power={0.7} duration={1.8} y={i % 2 ? 300 : 760} x={i % 2 ? 1500 : 420} colors={[C.night, C.ember, C.cream, C.sunset, C.denim]} />
      ))}
      {OUTRO_SLOTS.map((_, i) => (
        <Slot key={i} i={i} />
      ))}
      <FinalLock />
    </>
  );
};
