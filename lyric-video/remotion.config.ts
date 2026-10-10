/**
 * Note: When using the Node.JS APIs, the config file
 * doesn't apply. Instead, pass options directly to the APIs.
 *
 * All configuration options: https://remotion.dev/docs/config
 */

import { Config } from "@remotion/cli/config";
import { existsSync } from "node:fs";

Config.setRspack(true);
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(95);
Config.setOverwriteOutput(true);

// Neste ambiente o download do Chrome é bloqueado: usa o headless shell local se existir
const LOCAL_SHELL = "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";
if (existsSync(LOCAL_SHELL)) {
  Config.setBrowserExecutable(LOCAL_SHELL);
}
