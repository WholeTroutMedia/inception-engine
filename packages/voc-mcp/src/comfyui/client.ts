// ─────────────────────────────────────────────────────────────────────────────
// ComfyUI Client
// Full REST + WebSocket client for ComfyUI's internal API.
// Handles booting, health checks, workflow submission, and output retrieval.
// ─────────────────────────────────────────────────────────────────────────────

import { spawn, type ChildProcess } from "child_process";
import { createWriteStream, mkdirSync } from "fs";
import fs from "fs/promises";
import path from "path";
import WebSocket from "ws";
import {
  COMFYUI_DIR,
  COMFYUI_VENV_PYTHON,
  COMFYUI_URL,
  COMFYUI_WS_URL,
  COMFYUI_BOOT_TIMEOUT_MS,
  COMFYUI_GENERATION_TIMEOUT_MS,
  COMFYUI_HOST,
  COMFYUI_PORT,
  MCP_CLIENT_ID,
  OUTPUT_DIR,
} from "../config.js";

// ── Types ────────────────────────────────────────────────────────────────────

export interface ComfyUISystemStats {
  system: { os: string; ram_total: number; ram_free: number };
  devices: Array<{ name: string; type: string; vram_total: number; vram_free: number }>;
}

export interface ComfyUIQueueResult {
  prompt_id: string;
  number: number;
  node_errors: Record<string, unknown>;
}

export interface ComfyUIOutputFile {
  filename: string;
  subfolder: string;
  type: string;
  fullPath: string;
}

export interface ComfyUIHistoryEntry {
  prompt: unknown;
  outputs: Record<string, { images?: Array<{ filename: string; subfolder: string; type: string }> }>;
  status: { status_str: string; completed: boolean };
}

export interface ModelList {
  checkpoints: string[];
  loras: string[];
  vaes: string[];
  controlnets: string[];
  upscaleModels: string[];
  embeddings: string[];
}

// ── Process management ────────────────────────────────────────────────────────

let comfyProcess: ChildProcess | null = null;

function ensureOutputDir(): void {
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

export async function isComfyUIRunning(): Promise<boolean> {
  try {
    const res = await fetch(`${COMFYUI_URL}/system_stats`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function bootComfyUI(useCpu = false): Promise<{ status: string; port: number; url: string }> {
  if (await isComfyUIRunning()) {
    return { status: "already_running", port: COMFYUI_PORT, url: COMFYUI_URL };
  }

  ensureOutputDir();

  const args = [
    "main.py",
    "--listen",
    COMFYUI_HOST,
    "--port",
    String(COMFYUI_PORT),
    "--output-directory",
    OUTPUT_DIR,
  ];

  if (useCpu) args.push("--cpu");

  comfyProcess = spawn(COMFYUI_VENV_PYTHON, args, {
    cwd: COMFYUI_DIR,
    detached: false,
    stdio: ["ignore", "pipe", "pipe"],
  });

  // Pipe logs to file for debugging
  const logPath = path.join(OUTPUT_DIR, "comfyui.log");
  mkdirSync(path.dirname(logPath), { recursive: true });
  const logStream = createWriteStream(logPath, { flags: "a" });
  comfyProcess.stdout?.pipe(logStream);
  comfyProcess.stderr?.pipe(logStream);

  comfyProcess.on("exit", (code) => {
    console.error(`[VOC-MCP] ComfyUI exited with code ${code}`);
    comfyProcess = null;
  });

  // Wait for ComfyUI to become reachable
  const deadline = Date.now() + COMFYUI_BOOT_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await sleep(2000);
    if (await isComfyUIRunning()) {
      return { status: "booted", port: COMFYUI_PORT, url: COMFYUI_URL };
    }
  }

  throw new Error(
    `ComfyUI did not become reachable within ${COMFYUI_BOOT_TIMEOUT_MS}ms. Check ${logPath} for errors.`
  );
}

export function stopComfyUI(): void {
  if (comfyProcess) {
    comfyProcess.kill("SIGTERM");
    comfyProcess = null;
  }
}

// ── REST helpers ──────────────────────────────────────────────────────────────

async function apiGet<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${COMFYUI_URL}${endpoint}`, {
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    throw new Error(`ComfyUI API error ${res.status} on GET ${endpoint}`);
  }
  return res.json() as Promise<T>;
}

async function apiPost<T>(endpoint: string, body: unknown): Promise<T> {
  const res = await fetch(`${COMFYUI_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ComfyUI API error ${res.status} on POST ${endpoint}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ── Queue & execute ───────────────────────────────────────────────────────────

export async function queuePrompt(workflow: Record<string, unknown>): Promise<ComfyUIQueueResult> {
  return apiPost<ComfyUIQueueResult>("/prompt", {
    prompt: workflow,
    client_id: MCP_CLIENT_ID,
  });
}

/**
 * Wait for a prompt to complete via WebSocket, with timeout.
 * Resolves when ComfyUI fires execution_complete for our prompt_id.
 */
export function waitForCompletion(prompt_id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error(`Generation timed out after ${COMFYUI_GENERATION_TIMEOUT_MS}ms`));
    }, COMFYUI_GENERATION_TIMEOUT_MS);

    const ws = new WebSocket(`${COMFYUI_WS_URL}/ws?clientId=${MCP_CLIENT_ID}`);

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as {
          type: string;
          data?: { prompt_id?: string };
        };
        if (
          msg.type === "execution_complete" &&
          msg.data?.prompt_id === prompt_id
        ) {
          clearTimeout(timer);
          ws.close();
          resolve();
        }
        if (
          msg.type === "execution_error" &&
          msg.data?.prompt_id === prompt_id
        ) {
          clearTimeout(timer);
          ws.close();
          reject(new Error(`ComfyUI execution error for prompt ${prompt_id}`));
        }
      } catch {
        // non-JSON binary preview frames — ignore
      }
    });

    ws.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

export async function getOutputFiles(prompt_id: string): Promise<ComfyUIOutputFile[]> {
  const history = await apiGet<Record<string, ComfyUIHistoryEntry>>(`/history/${prompt_id}`);
  const entry = history[prompt_id];
  if (!entry) throw new Error(`No history entry for prompt ${prompt_id}`);

  const files: ComfyUIOutputFile[] = [];
  for (const nodeOutput of Object.values(entry.outputs)) {
    for (const img of nodeOutput.images ?? []) {
      files.push({
        ...img,
        fullPath: path.join(OUTPUT_DIR, img.subfolder ? img.subfolder : "", img.filename),
      });
    }
  }
  return files;
}

// ── Model listing ─────────────────────────────────────────────────────────────

export async function getModelList(): Promise<ModelList> {
  const info = await apiGet<Record<string, unknown>>("/object_info");

  // ComfyUI encodes available model lists inside node definitions
  const ckptLoader = info["CheckpointLoaderSimple"] as
    | { input: { required: { ckpt_name: [string[]] } } }
    | undefined;
  const loraLoader = info["LoraLoader"] as
    | { input: { required: { lora_name: [string[]] } } }
    | undefined;
  const vaeLoader = info["VAELoader"] as
    | { input: { required: { vae_name: [string[]] } } }
    | undefined;
  const controlnetLoader = info["ControlNetLoader"] as
    | { input: { required: { control_net_name: [string[]] } } }
    | undefined;
  const upscaleLoader = info["UpscaleModelLoader"] as
    | { input: { required: { model_name: [string[]] } } }
    | undefined;
  const embeddingLoader = info["CLIPTextEncode"] as
    | { input: { required: { text: [string, { default: string }] } } }
    | undefined;

  return {
    checkpoints: ckptLoader?.input?.required?.ckpt_name?.[0] ?? [],
    loras: loraLoader?.input?.required?.lora_name?.[0] ?? [],
    vaes: vaeLoader?.input?.required?.vae_name?.[0] ?? [],
    controlnets: controlnetLoader?.input?.required?.control_net_name?.[0] ?? [],
    upscaleModels: upscaleLoader?.input?.required?.model_name?.[0] ?? [],
    embeddings: [],
  };
}

// ── Image upload (for img2img, face animation, etc.) ─────────────────────────

export async function uploadImage(filePath: string): Promise<string> {
  const fileData = await fs.readFile(filePath);
  const filename = path.basename(filePath);
  const form = new FormData();
  form.append("image", new Blob([fileData]), filename);
  form.append("type", "input");
  form.append("overwrite", "true");

  const res = await fetch(`${COMFYUI_URL}/upload/image`, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    throw new Error(`Upload failed: ${res.statusText}`);
  }
  const { name } = (await res.json()) as { name: string };
  return name; // server-side filename, use in workflow nodes
}

export async function getSystemStats(): Promise<ComfyUISystemStats> {
  return apiGet<ComfyUISystemStats>("/system_stats");
}

// ── Utils ─────────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
