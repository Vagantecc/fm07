# Football Manager 2007 no Android — Guia Completo

## Requisitos do Celular

| Item | Mínimo | Recomendado |
|------|--------|-------------|
| Android | 8.0 (Oreo) | 10+ |
| Arquitetura | ARM64 | ARM64 |
| RAM | 3 GB livre | 4 GB+ livre |
| Armazenamento | 2 GB livre | 3 GB livre |
| CPU | Snapdragon 660 / equivalente | Snapdragon 720G+ |

> **Nota:** O FM2007 é um jogo leve (interface 2D, sem 3D pesado). Celulares intermediários rodam bem.

---

## Passo 1 — Instalar o Winlator

1. Acesse o GitHub do Winlator e baixe o APK mais recente:
   `https://github.com/brunodev85/winlator/releases/latest`

2. No celular, vá em **Configurações → Segurança → Fontes desconhecidas** e permita a instalação.

3. Instale o APK baixado.

4. Abra o Winlator. Na primeira vez ele irá baixar e instalar os componentes necessários (Wine, Box86, Mesa). Isso pode levar **5–10 minutos** dependendo da sua internet.

---

## Passo 2 — Transferir os Arquivos do Jogo

### Opção A: Via cabo USB (recomendado)
1. Conecte o celular ao PC via USB.
2. Copie a pasta `FM2007_Android` (gerada pelo `install.sh`) para a pasta `Downloads` do celular.

### Opção B: Diretamente no celular
1. Copie o arquivo `Football_Manager_2007_Europe.zip` para o celular.
2. Use um gerenciador de arquivos (ex: ZArchiver) para extrair o ZIP em uma pasta de sua escolha.
3. Copie também o arquivo `fm2007-winlator-container.json` para a mesma pasta.

---

## Passo 3 — Criar o Container no Winlator

1. Abra o **Winlator**.
2. Toque no ícone **"+"** para criar um novo container.
3. Na tela de criação, configure:
   - **Nome:** `Football Manager 2007`
   - **Tamanho de tela:** `1280x720`
   - **Driver gráfico:** `VirGL` (padrão) — se o seu celular tiver GPU Adreno 600+, use `Turnip + Zink` para melhor desempenho
   - **Driver de áudio:** `PulseAudio`
4. Toque em **"Avançado"** e configure:
   - **Box86 Preset:** `Performance`
   - **Box64 Preset:** `Performance`
   - **Variáveis de ambiente:** cole o texto abaixo:
     ```
     DXVK_ASYNC=1 DXVK_LOG_LEVEL=none MESA_EXTENSION_MAX_YEAR=2016 WINEESYNC=1
     ```
5. Toque em **Salvar / Criar**.

### Importar configuração pronta (alternativa ao passo 3)
Se o Winlator da sua versão suportar importação de containers:
1. Copie `fm2007-winlator-container.json` para o celular.
2. No Winlator, toque nos três pontos (⋮) → **Importar container**.
3. Selecione o arquivo `fm2007-winlator-container.json`.

---

## Passo 4 — Instalar o Football Manager 2007

1. No Winlator, toque no container **Football Manager 2007** para iniciá-lo.
2. Aguarde o Wine inicializar (demora 1–2 minutos na primeira vez).
3. O **Desktop Wine** aparecerá na tela.
4. Navegue até a pasta onde estão os arquivos do jogo usando o explorador de arquivos do Wine.
5. Execute o instalador do FM2007 (`setup.exe` ou o executável de instalação presente no ZIP).
6. Siga o assistente de instalação normalmente. O jogo será instalado em:
   `C:\Program Files\Sports Interactive\Football Manager 2007\`
7. Após instalar, feche o instalador.

---

## Passo 5 — Criar Atalho e Jogar

1. No Winlator, pressione e segure o container → **Editar**.
2. Na seção **Atalhos**, toque em **"+"** e adicione:
   - **Nome:** `Football Manager 2007`
   - **Executável:** `C:\Program Files\Sports Interactive\Football Manager 2007\fm.exe`
3. Salve e toque no atalho para iniciar o jogo.

---

## Configurações de Gráficos Recomendadas (dentro do jogo)

Quando o jogo iniciar, vá em **Preferences → Display** e configure:
- **Resolução:** 1280x720 ou 1024x600
- **Full Screen:** Ativado
- **3D Match Engine:** Desativado ou qualidade baixa (economiza RAM e CPU)

---

## Solução de Problemas

### O jogo trava ou fecha sozinho
- Reduza o **Box86 Preset** para `Compatibility`.
- Adicione a variável de ambiente: `BOX86_DYNAREC_STRONGMEM=1`

### Tela preta ao iniciar
- Troque o **driver gráfico** de `VirGL` para `Turnip + Zink` (ou vice-versa).
- Adicione: `MESA_GL_VERSION_OVERRIDE=4.5`

### Áudio não funciona
- Verifique se o **PulseAudio** está ativo no container.
- Adicione: `PULSE_SERVER=unix:/var/run/pulse/native`

### Performance ruim / lentidão
- Vá em **Configurações do Container → CPU** e ajuste a lista de núcleos para os núcleos de alta performance do seu chip (normalmente os últimos: `4-7` em chips octacore).
- Desative efeitos visuais dentro do FM2007.

### Erro "Disc not found" ou pedido de CD
- O FM2007 de algumas versões usa proteção de CD (SecuROM). Para resolver:
  1. Crie um arquivo vazio chamado `fm.exe.ini` na pasta do jogo com o conteúdo:
     ```
     [Settings]
     NoCD=1
     ```
  2. Ou use um executável NoCD compatível com sua versão do jogo.

---

## Drivers Gráficos — Qual Usar?

| GPU do Celular | Driver Recomendado |
|-----------------|-------------------|
| Qualcomm Adreno 400/500 | VirGL |
| Qualcomm Adreno 600/700 | Turnip + Zink |
| Mali (Samsung/MediaTek) | VirGL |
| PowerVR | VirGL |

---

## Componentes Wine Necessários (winetricks)

Dentro do container, pode ser necessário instalar componentes adicionais. No terminal Wine:

```bash
winetricks vcrun2005 vcrun2008 d3dx9
```

Ou pelo menu do Winlator: **Container → Instalar componentes**.

---

## Estrutura de Arquivos Esperada

```
Football_Manager_2007_Europe.zip
├── setup.exe (ou autorun.exe)
├── fm.exe (após instalação)
└── data/
    └── ...
```

---

## Versão do Guia
- Winlator testado: 7.x / 8.x
- Última atualização: Maio 2026
