#!/usr/bin/env bash
# Baixa os .woff2 (Google Fonts, licença OFL) para public/fonts — o Chromium do render não acessa a rede.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p public/fonts
node -e "
for (const [n, w] of [['Anton','400'],['Rye','400'],['BricolageGrotesque','800']]) {
  const f = require('@remotion/google-fonts/'+n).getInfo().fonts.normal[w];
  for (const s of ['latin','latin-ext']) console.log(n+'-'+s+'.woff2 '+f[s]);
}" | while read -r name url; do
  curl -sSf -o "public/fonts/$name" "$url"
  echo "ok $name"
done
