import React from "react";
import { interpolate, spring, Easing } from "remotion";
import { Trail } from "@remotion/motion-blur";
import { evolvePath } from "@remotion/paths";
import { C, FPS } from "../theme";
import { F } from "../fonts";
import { SCENES, exitFor, line, kickPulse, useT, ramp } from "../lib/time";
import { Center, ExitWrap, KWord, wordSpring, type WordLook } from "../components/Kinetic";
import { Icon, type IconName } from "../components/Icons";

const TXT: WordLook = { font: F.text, size: 104, color: C.cream, weight: 800 };
const BIG: WordLook = { font: F.display, size: 280, color: C.cream, weight: 400, upper: true, shadow: `0 12px 0 ${C.ember}` };
export const LOCK_Y = 520; // centro do lockup (= centro da waveform radial)

const visible = (t: number, a: number, b: number) => t >= a - 0.4 && t <= b + 0.3;

/** Me chama que eu vou */
const MeChama: React.FC = () => {
  const { t } = useT();
  const l = line("r-1");
  const exitAt = exitFor("r-1", "r-2", { frames: 8 });
  if (!visible(t, l.start, exitAt)) return null;
  const [me, chama, ...rest] = l.words;
  return (
    <ExitWrap id="r-1" exitAt={exitAt} dir="up" frames={8}>
      <Center style={{ paddingBottom: 140 }}>
        <div style={{ display: "flex" }}>
          <KWord word={me} enter="drop" look={BIG} />
          <KWord word={chama} enter="drop" look={{ ...BIG, color: C.gold }} />
        </div>
        <div style={{ display: "flex", marginTop: -6 }}>
          {rest.map((w, i) => (
            <KWord key={i} word={w} enter="up" look={i === rest.length - 1 ? { ...TXT, font: F.display, size: 150, color: C.night, weight: 400, upper: true } : TXT} />
          ))}
        </div>
      </Center>
    </ExitWrap>
  );
};

/** PRESENCIAL e DIGITAL batem em sequência no kick */
const PresencialDigital: React.FC = () => {
  const { t } = useT();
  const l = line("r-2");
  const exitAt = exitFor("r-2", "r-3", { frames: 8 });
  if (!visible(t, l.start, exitAt)) return null;
  const [no, pres, e, dig] = l.words;
  const slam = (w: typeof pres) => {
    const k = Math.max(0, 1 - Math.abs(t - w.start) * 6) * kickPulse(t);
    return `scale(${1 + 0.08 * k})`;
  };
  return (
    <ExitWrap id="r-2" exitAt={exitAt} dir="left" frames={8}>
      <Center style={{ paddingBottom: 140 }}>
        <div style={{ display: "flex", alignItems: "baseline" }}>
          <KWord word={no} enter="up" look={TXT} />
          <KWord word={pres} enter="stamp" look={{ ...BIG, size: 220 }} extraTransform={slam(pres)} />
        </div>
        <div style={{ display: "flex", alignItems: "baseline", marginTop: 18 }}>
          <KWord word={e} enter="up" look={TXT} />
          <KWord word={dig} enter="stamp" look={{ ...BIG, size: 220, color: C.gold }} extraTransform={slam(dig)} />
        </div>
      </Center>
    </ExitWrap>
  );
};

// risco feito à mão (levemente torto)
const STRIKE = "M -20 18 C 120 4, 260 30, 420 10 S 700 22, 860 6";

/** Não tem "fica pra depois" — riscado e chutado pra fora */
const FicaPraDepois: React.FC = () => {
  const { t } = useT();
  const l = line("r-3");
  const nx = line("r-4");
  if (!visible(t, l.start, nx.start)) return null;
  const [nao, tem, ...quote] = l.words;
  const dep = quote[quote.length - 1];
  const strikeA = dep.start + 0.12;
  const strikeB = strikeA + 10 / FPS;
  const kickAt = Math.min(strikeB + 3 / FPS, nx.start - 14 / FPS);
  const strike = interpolate(t, [strikeA, strikeB], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.quad) });
  const ev = evolvePath(strike, STRIKE);
  const headExit = Math.max(kickAt, l.end + 0.1);
  return (
    <>
      <ExitWrap id="r-3a" exitAt={headExit} dir="up" frames={8}>
        <Center style={{ paddingBottom: 420 }}>
          <div style={{ display: "flex" }}>
            <KWord word={nao} enter="up" look={{ ...TXT, size: 120 }} />
            <KWord word={tem} enter="up" look={{ ...TXT, size: 120 }} />
          </div>
        </Center>
      </ExitWrap>
      <Trail layers={5} lagInFrames={0.6} trailOpacity={0.55}>
        <Kicked kickAt={kickAt}>
          <Center style={{ paddingTop: 80, paddingBottom: 140 }}>
            <div style={{ position: "relative", display: "flex", padding: "10px 30px" }}>
              {quote.map((w, i) => (
                <KWord key={i} word={w} enter="pop" look={{ font: F.text, size: 150, color: C.cream, weight: 800 }} />
              ))}
              <svg width={840} height={40} viewBox="0 0 840 40" style={{ position: "absolute", left: "50%", top: "52%", transform: "translate(-50%, -50%)", overflow: "visible" }}>
                <path d={STRIKE} fill="none" stroke={C.rose} strokeWidth={22} strokeLinecap="round" strokeDasharray={ev.strokeDasharray} strokeDashoffset={ev.strokeDashoffset} opacity={strike > 0 ? 1 : 0} />
              </svg>
            </div>
          </Center>
        </Kicked>
      </Trail>
    </>
  );
};

/** Chute pra fora da tela: arco pra cima/direita girando (lê o próprio frame → funciona no <Trail>) */
const Kicked: React.FC<{ kickAt: number; children: React.ReactNode }> = ({ kickAt, children }) => {
  const { t } = useT();
  const k = interpolate(t, [kickAt, kickAt + 14 / FPS], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.quad) });
  if (k >= 1) return null;
  const anticip = interpolate(t, [kickAt - 4 / FPS, kickAt], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) * (k === 0 ? 1 : 0);
  return (
    <div style={{ position: "absolute", inset: 0, transform: `translate(${k * 1600 - anticip * 30}px, ${-k * 700 + anticip * 10}px) rotate(${k * 38}deg)` }}>{children}</div>
  );
};

/** Pessoa, empresa ou lá no agro: três ícones em cascata, um por palavra */
const PessoaEmpresaAgro: React.FC = () => {
  const { t } = useT();
  const l = line("r-4");
  const exitAt = exitFor("r-4", "r-5", { frames: 8 });
  if (!visible(t, l.start, exitAt)) return null;
  const ws = l.words;
  const cols: { icon: IconName; label: (typeof ws)[number]; pre?: (typeof ws)[number][] }[] = [
    { icon: "person", label: { ...ws[0], w: ws[0].w.replace(",", "") } },
    { icon: "building", label: ws[1] },
    { icon: "wheat", label: ws[5], pre: [ws[2], ws[3], ws[4]] },
  ];
  return (
    <ExitWrap id="r-4" exitAt={exitAt} dir="up" frames={8}>
      <Center style={{ flexDirection: "row", gap: 30, paddingBottom: 170 }}>
        {cols.map((c, i) => {
          const s = wordSpring(t, c.label.start, true);
          const draw = ramp(t, c.label.start - 0.05, c.label.start + 0.45);
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 460 }}>
              <div style={{ height: 70, display: "flex", alignItems: "flex-end" }}>
                {c.pre?.map((w, j) => (
                  <KWord key={j} word={w} enter="up" look={{ ...TXT, size: 56 }} />
                ))}
              </div>
              <div style={{ transform: `translateY(${(1 - s) * -120}px) scale(${0.5 + 0.5 * s})`, opacity: s > 0 ? 1 : 0 }}>
                <Icon name={c.icon} progress={draw} size={320} color={i === 2 ? C.gold : C.cream} strokeWidth={8} />
              </div>
              <KWord word={c.label} enter="pop" look={{ font: F.display, size: 128, color: i === 2 ? C.gold : C.cream, weight: 400, upper: true, shadow: `0 8px 0 ${C.ember}` }} />
            </div>
          );
        })}
      </Center>
    </ExitWrap>
  );
};

/** CONTA COMIGO PRA TUDO: lockup central, dentro da waveform radial */
export const Lockup: React.FC<{ l: ReturnType<typeof line>; exitAt: number; color?: string; accent?: string; shadow?: string; id: string }> = ({ l, exitAt, color = C.cream, accent = C.gold, shadow = C.ember, id }) => {
  const { t } = useT();
  if (!visible(t, l.start, exitAt)) return null;
  const [conta, comigo, pra, tudo] = l.words;
  const pulse = 1 + 0.05 * kickPulse(t);
  return (
    <ExitWrap id={id} exitAt={exitAt} dir="up" frames={8}>
      <div style={{ position: "absolute", left: 0, right: 0, top: LOCK_Y - 255, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ display: "flex" }}>
          <KWord word={conta} enter="drop" look={{ font: F.display, size: 112, color, weight: 400, upper: true }} />
          <KWord word={comigo} enter="drop" look={{ font: F.display, size: 112, color, weight: 400, upper: true }} />
        </div>
        <KWord word={pra} enter="pop" look={{ font: F.text, size: 64, color, weight: 800 }} />
        <div style={{ transform: `scale(${pulse})`, marginTop: -4 }}>
          <KWord word={tudo} enter="stamp" look={{ font: F.display, size: 300, color: accent, weight: 400, upper: true, shadow: `0 12px 0 ${shadow}` }} />
        </div>
      </div>
    </ExitWrap>
  );
};

/** "Pra tudoo": as letras de TUDO esticam durante a nota sustentada e soltam com bounce */
export const PraTudoStretch: React.FC<{ l: ReturnType<typeof line>; exitAt: number; id: string; color?: string; accent?: string; shadow?: string }> = ({ l, exitAt, id, color = C.cream, accent = C.gold, shadow = C.ember }) => {
  const { t } = useT();
  if (!visible(t, l.start, exitAt)) return null;
  const [pra, tudo] = l.words;
  const holdEnd = tudo.end;
  const stretch = interpolate(t, [tudo.start + 0.08, holdEnd], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.quad) });
  const rel = spring({ frame: Math.max(0, (t - holdEnd) * FPS), fps: FPS, config: { damping: 7, stiffness: 180, mass: 0.6 } });
  const amount = t < holdEnd ? stretch : 1 - rel;
  const sx = 1 + 0.55 * amount;
  const track = 36 * amount;
  const pulse = 1 + 0.05 * kickPulse(t);
  const s = wordSpring(t, tudo.start, true);
  return (
    <ExitWrap id={id} exitAt={exitAt} dir="up" frames={9}>
      <div style={{ position: "absolute", left: 0, right: 0, top: LOCK_Y - 200, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <KWord word={pra} enter="pop" look={{ font: F.text, size: 90, color, weight: 800 }} />
        <div
          style={{
            fontFamily: F.display,
            fontSize: 300,
            lineHeight: 1,
            color: accent,
            textTransform: "uppercase",
            letterSpacing: track,
            transform: `scale(${(0.4 + 0.6 * s) * pulse}) scaleX(${sx})`,
            opacity: s > 0 ? 1 : 0,
            textShadow: `0 12px 0 ${shadow}`,
            marginTop: -10,
          }}
        >
          {tudo.w}
        </div>
      </div>
    </ExitWrap>
  );
};

export const Refrao: React.FC = () => {
  const { t } = useT();
  const [a, b] = SCENES.refrao;
  if (t < a - 0.5 || t > b + 0.5) return null;
  const r5 = line("r-5");
  const r6 = line("r-6");
  return (
    <>
      <MeChama />
      <PresencialDigital />
      <FicaPraDepois />
      <PessoaEmpresaAgro />
      <Lockup id="r-5" l={r5} exitAt={exitFor("r-5", "r-6", { frames: 8 })} />
      <PraTudoStretch id="r-6" l={r6} exitAt={b - 10 / FPS} />
    </>
  );
};

