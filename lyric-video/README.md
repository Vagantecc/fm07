# Lyric video — "Conta comigo pra tudo (Remix)"

1920×1080 · 60 fps · 5098 frames (84,96 s). Remotion (React) + análise em Python.

## Rodar

```bash
npm i
cp /caminho/do/audio.mp3 assets/audio.mp3            # o MP3 não vai pro git
cp assets/audio.mp3 public/audio.mp3
ffmpeg -i assets/audio.mp3 -ac 2 -ar 48000 public/audio.wav   # usado pela waveform
npm run dev                                          # Remotion Studio
```

Para revisar o sync, ligue a prop `debug` no Studio (ou `--props='{"debug":true}'`). Ela mostra
a grade de beats (downbeats em dourado), os kicks, a palavra atual, a seção e o timestamp.

### Render

```bash
npx remotion render LyricVideo out/lyric-video-1080p60.mp4 \
  --codec=h264 --crf=14 --pixel-format=yuv420p \
  --audio-codec=aac --audio-bitrate=320k --concurrency=50%
node scripts/stills.mjs            # stills dos momentos-chave em out/stills
node scripts/stills.mjs 42.8 50.2  # stills em tempos específicos (s)
```

## Dados (`src/data/`)

| arquivo | gerado por | o quê |
|---|---|---|
| `audio.json` | `scripts/analyze.py` | bpm, beats, downbeats, kicks, snares, energia por frame, seções, silêncios |
| `lyrics.json` | `scripts/align.py` | letra palavra por palavra (edite à mão) |
| `lyrics_raw.json` | `scripts/align.py` | os tempos antes do snap ao grid (referência) |
| `markers.json` | `scripts/align.py` | `stop` (congelamento) e `outro` (refrão final instrumental) |

## Ajustar timing à mão (`lyrics.json`)

- Cada palavra tem `start`/`end` em segundos. A animação entra sozinha 2,5 frames antes de `start`
  (antecipação), então coloque `start` no ataque da sílaba que você ouve.
- 1 frame = 0,0167 s. Para mexer meio frame, use 0,008.
- Ver o grid: `.venv/bin/python scripts/preview_timing.py r-3 r-4` imprime tempo, beat mais
  próximo e Δ ms.
- A saída de cada linha é calculada a partir do início da próxima (`exitFor` em `src/lib/time.ts`),
  então mexer num `start` já reposiciona a troca de linha.
- `emphasis: true` liga o tratamento de palavra de destaque (Anton, dourado, grande).
- O **stop** vem de `markers.json`: `stop.start` é o fim do "Stop!" e `stop.end` é o início do
  "Também". Se mexer nessas palavras, atualize o marker também.
- Não rode `align.py` de novo depois de editar à mão: ele sobrescreve o `lyrics.json`.

## Estrutura

```
scripts/   analyze.py · align.py · whisper_onnx.py · preview_timing.py · stills.mjs · fetch_fonts.sh
src/
  theme.ts            paleta e safe areas
  fonts.ts            Anton / Rye / Bricolage Grotesque (arquivos locais em public/fonts)
  lib/time.ts         dados, mapa de cenas, kick/downbeat/energia, congelamento do stop
  components/         Kinetic (palavra/linha), Waveform, Background (+grão/vinheta), FX, Icons, Debug
  sections/           Intro, Verso, Pre, Gatilho (stop + TAMBÉM TÔ), Refrao, Ponte, Outro
  LyricVideo.tsx      câmera + camadas
```

## Notas de ambiente

- Hugging Face e o CDN da OpenAI estão bloqueados aqui. O alinhamento usa o Whisper `small` em ONNX
  (pacote npm `sts-whisper-small`, baixado para `models/`) com o mesmo algoritmo de DTW do stable-ts.
- O Chromium do render não acessa a rede, por isso as fontes do Google ficam em `public/fonts`
  (`scripts/fetch_fonts.sh`), e o `remotion.config.ts` aponta para o headless shell local quando
  ele existe.
