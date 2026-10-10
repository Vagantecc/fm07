// Renderiza stills dos momentos-chave com um único bundle.
// Uso: node scripts/stills.mjs [debug] [t1 t2 ...]   (tempos em segundos)
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const debug = args[0] === "debug";
const times = (debug ? args.slice(1) : args).map(Number);
const KEY = [
  ["01_2s", 2.0],
  ["02_cartao", 12.6],
  ["03_investimento", 17.6],
  ["04_seguro", 21.9],
  ["05_consorcio", 26.9],
  ["06_app", 29.6],
  ["07_viajar", 33.4],
  ["08_contar", 35.1],
  ["09_cidade", 37.3],
  ["10_negocio", 39.6],
  ["11_campo", 41.8],
  ["12_stop", 42.8],
  ["13_tambem", 43.75],
  ["14_mechama", 45.9],
  ["15_digital", 48.0],
  ["16_fica_riscado", 50.33],
  ["17_agro", 52.9],
  ["18_conta_comigo", 56.0],
  ["19_pratudo", 58.3],
  ["20_ponte_125", 64.6],
  ["21_ponte_dinheiro", 66.2],
  ["22_ponte_contar", 69.3],
  ["23_outro", 73.0],
  ["24_outro_lock", 82.0],
  ["25_ultimo", 84.6],
];
const list = times.length ? times.map((t) => [`t_${t.toFixed(2)}`, t]) : KEY;
const PW = "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";
const out = path.resolve("out/stills");
mkdirSync(out, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const inputProps = { debug };
const comp = await selectComposition({ serveUrl, id: "LyricVideo", inputProps, browserExecutable: existsSync(PW) ? PW : null });
for (const [name, t] of list) {
  const frame = Math.min(comp.durationInFrames - 1, Math.round(t * 60));
  await renderStill({ composition: comp, serveUrl, frame, inputProps, output: `${out}/${name}${debug ? "_debug" : ""}.png`, browserExecutable: existsSync(PW) ? PW : null });
  console.log("ok", name, frame);
}
