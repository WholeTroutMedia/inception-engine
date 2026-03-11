// ─────────────────────────────────────────────────────────────────────────────
// VOC-MCP CONFIG
// All paths sourced from env vars with sensible D:\VOC defaults.
// Override via environment variables in your shell or .env file.
// ─────────────────────────────────────────────────────────────────────────────

import path from "path";
import os from "os";

// ComfyUI
export const COMFYUI_DIR =
  process.env.COMFYUI_DIR ??
  "D:\\VOC\\April22\\Visions of Chaos\\Text To Image\\ComfyUI\\ComfyUI";

export const COMFYUI_VENV_PYTHON =
  process.env.COMFYUI_VENV_PYTHON ??
  path.join(COMFYUI_DIR, ".venv", "Scripts", "python.exe");

export const COMFYUI_HOST = process.env.COMFYUI_HOST ?? "127.0.0.1";
export const COMFYUI_PORT = parseInt(process.env.COMFYUI_PORT ?? "8188");
export const COMFYUI_URL = `http://${COMFYUI_HOST}:${COMFYUI_PORT}`;
export const COMFYUI_WS_URL = `ws://${COMFYUI_HOST}:${COMFYUI_PORT}`;

// VOC Chaos.exe
export const VOC_EXE =
  process.env.VOC_EXE ?? "D:\\VOC\\Sept 2\\Visions of Chaos\\Chaos.exe";

export const VOC_PROJECTS_DIR =
  process.env.VOC_PROJECTS_DIR ?? "D:\\VOC\\Projects";

// Bundled binaries inside VOC
export const VOC_BIN_DIR =
  process.env.VOC_BIN_DIR ?? "D:\\VOC\\Sept 2\\Visions of Chaos";

export const VTRACER_EXE = path.join(VOC_BIN_DIR, "vtracer-win-64.exe");
export const FFMPEG_EXE = path.join(VOC_BIN_DIR, "ffmpeg.exe");
export const FFPROBE_EXE = path.join(VOC_BIN_DIR, "ffprobe.exe");

// Output dir (where generated assets land)
export const OUTPUT_DIR =
  process.env.VOC_OUTPUT_DIR ??
  path.join(os.homedir(), "Desktop", "inception-voc-output");

// Timeouts
export const COMFYUI_BOOT_TIMEOUT_MS = parseInt(
  process.env.COMFYUI_BOOT_TIMEOUT_MS ?? "30000"
);
export const COMFYUI_GENERATION_TIMEOUT_MS = parseInt(
  process.env.COMFYUI_GENERATION_TIMEOUT_MS ?? "300000" // 5 minutes
);

// MCP client ID for WebSocket sessions
export const MCP_CLIENT_ID = "inception-voc-mcp";
