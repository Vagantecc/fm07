import React from "react";
import { evolvePath } from "@remotion/paths";
import { C } from "../theme";
import { clamp01 } from "../lib/time";

const circ = (cx: number, cy: number, r: number) => `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0`;

/** Ícones em linha (viewBox 200×200), desenhados em código */
export const ICONS = {
  card: [
    "M34 52 H166 Q182 52 182 68 V132 Q182 148 166 148 H34 Q18 148 18 132 V68 Q18 52 34 52 Z",
    "M18 80 H182",
    "M40 100 H70 V124 H40 Z",
    "M96 126 H160",
  ],
  chart: ["M30 28 V172 H178", "M42 152 L80 116 L110 132 L166 62", "M138 60 L168 60 L168 90"],
  shield: ["M100 20 L166 44 V98 Q166 150 100 180 Q34 150 34 98 V44 Z", "M68 100 L92 124 L134 78"],
  house: ["M24 102 L100 36 L176 102", "M46 90 V172 H154 V90", "M86 172 V128 H114 V172", "M134 60 V34 H152 V76"],
  phone: ["M66 18 H134 Q152 18 152 36 V164 Q152 182 134 182 H66 Q48 182 48 164 V36 Q48 18 66 18 Z", "M88 32 H112", circ(100, 166, 6)],
  plane: ["M18 108 L182 54 L124 152 L102 114 Z", "M102 114 L182 54", "M102 114 L96 146 L124 152"],
  people: [circ(70, 72, 22), "M28 164 Q28 112 70 112 Q112 112 112 164", circ(134, 82, 18), "M106 120 Q118 110 134 110 Q172 110 172 158"],
  city: [
    "M10 182 V112 H48 V72 H84 V132 H104 V40 H146 V98 H176 V182",
    "M60 90 H72 M60 110 H72 M116 60 H134 M116 82 H134 M116 104 H134 M184 182 H6",
  ],
  store: [
    "M26 72 H174 L162 38 H38 Z",
    "M26 72 Q38 92 50 72 Q63 92 76 72 Q88 92 100 72 Q112 92 124 72 Q137 92 150 72 Q162 92 174 72",
    "M36 84 V172 H164 V84",
    "M80 172 V118 H120 V172",
  ],
  field: [circ(144, 56, 22), "M8 146 Q60 104 108 138 Q150 112 192 132", "M30 186 L78 154 M72 190 L108 156 M116 190 L138 154 M162 190 L170 154"],
  person: [circ(100, 60, 26), "M48 176 Q48 110 100 110 Q152 110 152 176"],
  building: ["M54 182 V28 H146 V182", "M74 54 H90 M110 54 H126 M74 84 H90 M110 84 H126 M74 114 H90 M110 114 H126", "M90 182 V150 H110 V182"],
  wheat: [
    "M100 188 V38",
    "M100 62 Q80 52 78 30 Q98 38 100 62 Z M100 62 Q120 52 122 30 Q102 38 100 62 Z",
    "M100 98 Q78 88 74 64 Q96 72 100 98 Z M100 98 Q122 88 126 64 Q104 72 100 98 Z",
    "M100 134 Q78 124 74 100 Q96 108 100 134 Z M100 134 Q122 124 126 100 Q104 108 100 134 Z",
  ],
  coin: [circ(100, 100, 72), "M124 74 Q104 60 86 70 Q70 84 92 96 L110 106 Q132 118 116 132 Q98 144 78 130", "M100 50 V150"],
  hat: [
    "M18 130 Q100 168 182 130 Q164 124 150 128 Q146 70 122 62 Q100 76 78 62 Q54 70 50 128 Q36 124 18 130 Z",
    "M52 112 Q100 126 148 112",
  ],
} as const;
export type IconName = keyof typeof ICONS;

/** Desenha o ícone por evolvePath, com stagger entre traços. progress 0..1 */
export const Icon: React.FC<{
  name: IconName;
  progress: number;
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
  fill?: string;
}> = ({ name, progress, size = 240, color = C.cream, strokeWidth = 7, style, fill }) => {
  const paths = ICONS[name];
  const n = paths.length;
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} style={{ overflow: "visible", ...style }}>
      {paths.map((d, i) => {
        const p = clamp01(progress * (1 + 0.5 * (n - 1)) - i * 0.5);
        if (p <= 0) return null;
        const ev = evolvePath(p, d);
        return (
          <path
            key={i}
            d={d}
            fill={i === 0 && fill && p >= 1 ? fill : "none"}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={ev.strokeDasharray}
            strokeDashoffset={ev.strokeDashoffset}
          />
        );
      })}
    </svg>
  );
};
