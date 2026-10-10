import { continueRender, delayRender, staticFile } from "remotion";

/**
 * Anton, Rye e Bricolage Grotesque (Google Fonts, OFL).
 * As URLs vêm do @remotion/google-fonts (scripts/fetch_fonts.sh), mas os arquivos ficam em public/fonts:
 * o Chromium do render não tem acesso à rede neste ambiente. O render espera as fontes via delayRender.
 */
const LATIN = "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD";
const LATIN_EXT = "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF";

const FAMILIES = [
  { family: "Anton", file: "Anton", weight: "400" },
  { family: "Rye", file: "Rye", weight: "400" },
  { family: "Bricolage Grotesque", file: "BricolageGrotesque", weight: "200 800" },
];

if (typeof document !== "undefined") {
  for (const f of FAMILIES) {
    for (const [sub, range] of [
      ["latin", LATIN],
      ["latin-ext", LATIN_EXT],
    ] as const) {
      const handle = delayRender(`fonte ${f.family} ${sub}`);
      const face = new FontFace(f.family, `url(${staticFile(`fonts/${f.file}-${sub}.woff2`)}) format("woff2")`, {
        weight: f.weight,
        unicodeRange: range,
        display: "block",
      });
      face
        .load()
        .then(() => {
          document.fonts.add(face);
          continueRender(handle);
        })
        .catch((err) => {
          console.error(err);
          continueRender(handle);
        });
    }
  }
}

export const F = {
  display: "Anton, Impact, sans-serif",
  western: "Rye, serif",
  text: "'Bricolage Grotesque', sans-serif",
};
