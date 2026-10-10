import React from "react";
import { spring } from "remotion";
import { C, FPS } from "../theme";
import { F } from "../fonts";
import { AUDIO, SCENES, fakeWord, ramp, useT } from "../lib/time";
import { Center, ExitWrap, KWord } from "../components/Kinetic";
import { Icon } from "../components/Icons";

// Título montado nos downbeats do intro instrumental
const D = AUDIO.downbeats;
const W1 = fakeWord("CONTA", D[0], D[0] + 1, true);
const W2 = fakeWord("COMIGO", D[1], D[1] + 1, true);
const W3 = fakeWord("PRA", D[2], D[2] + 1);
const W4 = fakeWord("TUDO", D[3], D[3] + 1, true);
const W5 = fakeWord("REMIX", D[4], D[4] + 1);

export const Intro: React.FC = () => {
  const { t } = useT();
  const [a, b] = SCENES.intro;
  if (t < a || t > b + 0.3) return null;
  const exitAt = b - 10 / FPS;
  const hat = ramp(t, D[3] - 0.2, D[3] + 0.8);
  const hatDrop = spring({ frame: Math.max(0, (t - D[3]) * FPS), fps: FPS, config: { damping: 9, stiffness: 160, mass: 0.7 } });
  return (
    <ExitWrap id="intro" exitAt={exitAt} dir="up">
      <Center style={{ gap: 0 }}>
        <div style={{ height: 150, transform: `translateY(${(1 - hatDrop) * -60}px) rotate(${(1 - hatDrop) * -10}deg)` }}>
          <Icon name="hat" progress={hat} size={190} color={C.gold} strokeWidth={6} />
        </div>
        <div style={{ display: "flex" }}>
          <KWord word={W1} enter="drop" look={{ font: F.display, size: 168, color: C.cream, weight: 400 }} />
          <KWord word={W2} enter="drop" look={{ font: F.display, size: 168, color: C.cream, weight: 400 }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", marginTop: -10 }}>
          <KWord word={W3} enter="pop" look={{ font: F.text, size: 92, color: C.cream }} />
          <KWord word={W4} enter="stamp" look={{ font: F.display, size: 300, color: C.gold, weight: 400, shadow: `0 10px 0 ${C.ember}` }} />
        </div>
        <div style={{ marginTop: 6 }}>
          <KWord word={W5} enter="pop" look={{ font: F.western, size: 64, color: C.cream, tracking: 14, weight: 400 }} />
        </div>
      </Center>
    </ExitWrap>
  );
};
