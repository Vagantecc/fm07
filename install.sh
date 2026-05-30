#!/bin/bash
# Script auxiliar para preparar os arquivos do FM2007 para uso com Winlator
# Execute este script no PC antes de transferir para o celular

set -e

ZIPFILE="${1:-Football_Manager_2007_Europe.zip}"
OUTDIR="FM2007_Android"

echo "=== Football Manager 2007 - Preparação para Android ==="
echo ""

if [ ! -f "$ZIPFILE" ]; then
  echo "[ERRO] Arquivo não encontrado: $ZIPFILE"
  echo "Uso: $0 <caminho_para_FM2007.zip>"
  exit 1
fi

echo "[1/3] Extraindo $ZIPFILE..."
mkdir -p "$OUTDIR"
unzip -q "$ZIPFILE" -d "$OUTDIR"
echo "      Concluído."

echo "[2/3] Copiando configuração do container Winlator..."
cp fm2007-winlator-container.json "$OUTDIR/"
echo "      Concluído."

echo "[3/3] Verificando estrutura de arquivos..."
if find "$OUTDIR" -name "fm.exe" | grep -q .; then
  echo "      fm.exe encontrado. Tudo certo!"
else
  echo "      [AVISO] fm.exe não encontrado. Verifique a estrutura do ZIP."
  echo "      Conteúdo extraído:"
  ls "$OUTDIR"
fi

echo ""
echo "=== Pronto! ==="
echo "Pasta criada: $OUTDIR/"
echo ""
echo "Próximos passos:"
echo "  1. Transfira a pasta '$OUTDIR' para o celular (pasta Downloads ou SDCard)"
echo "  2. Siga o guia em GUIA_INSTALACAO.md"
