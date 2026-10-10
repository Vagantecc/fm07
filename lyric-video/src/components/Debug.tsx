import React from "react";
import { C, FPS, W } from "../theme";
import { AUDIO, LYRICS, MARKERS, sceneAt, useT } from "../lib/time";

/** Overlay de revisão de sync: grade de beats, seção, timestamp e palavra atual */
export const Debug: React.FC = () => {
  const { realT, realF } = useT();
  const span = 2; // s visíveis de cada lado
  const x = (tt: number) => W / 2 + ((tt - realT) / span) * (W / 2);
  const near = (tt: number) => Math.abs(tt - realT) <= span;
  const words = LYRICS.flatMap((l) => l.words.map((w) => ({ ...w, lineId: l.lineId })));
  const cur = words.filter((w) => realT >= w.start && realT < w.end);
  const stop = realT >= MARKERS.stop.start && realT < MARKERS.stop.end;
  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: "monospace", color: "#fff", pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: 20, top: 16, background: "rgba(0,0,0,0.65)", padding: "10px 14px", fontSize: 26, lineHeight: 1.35 }}>
        <div>
          t={realT.toFixed(3)}s  f={realF}  [{sceneAt(realT)}] {stop ? "■ STOP" : ""}
        </div>
        <div style={{ color: C.gold }}>{cur.map((w) => `${w.lineId}: ${w.w}`).join("  ") || "—"}</div>
      </div>
      <svg width={W} height={140} style={{ position: "absolute", left: 0, bottom: 0, background: "rgba(0,0,0,0.55)" }}>
        {AUDIO.beats.filter(near).map((b, i) => {
          const down = AUDIO.downbeats.some((d) => Math.abs(d - b) < 1e-3);
          return <line key={`b${i}`} x1={x(b)} x2={x(b)} y1={down ? 10 : 40} y2={70} stroke={down ? C.gold : "#aaa"} strokeWidth={down ? 4 : 2} />;
        })}
        {AUDIO.kicks.filter((k) => near(k.t)).map((k, i) => (
          <circle key={`k${i}`} cx={x(k.t)} cy={82} r={3 + 7 * k.strength} fill={C.sunset} />
        ))}
        {words.filter((w) => near(w.start) || near(w.end)).map((w, i) => (
          <g key={`w${i}`}>
            <rect x={x(w.start)} y={98} width={Math.max(2, x(w.end) - x(w.start))} height={34} fill={w.emphasis ? C.rose : C.denim} opacity={0.85} />
            <text x={x(w.start) + 4} y={122} fontSize={20} fill="#fff">
              {w.w}
            </text>
          </g>
        ))}
        <line x1={W / 2} x2={W / 2} y1={0} y2={140} stroke="#fff" strokeWidth={2} />
      </svg>
      <div style={{ position: "absolute", right: 20, top: 16, background: "rgba(0,0,0,0.65)", padding: "8px 12px", fontSize: 22 }}>
        {AUDIO.bpm} BPM · {FPS} fps
      </div>
    </div>
  );
};
