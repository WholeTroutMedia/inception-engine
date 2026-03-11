// ─────────────────────────────────────────────────────────────────────────────
// VOC Process Manager
// Manages the Visions of Chaos Chaos.exe Windows process.
// VOC is a GUI app — we spawn it, let it render a pre-baked project, then
// poll the project's output folder for generated images/video.
// ─────────────────────────────────────────────────────────────────────────────

import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import { VOC_EXE, VOC_PROJECTS_DIR, VTRACER_EXE, FFMPEG_EXE } from "../config.js";

/**
 * Launch Visions of Chaos with a saved .voc project file.
 * VOC doesn't expose a real CLI, so this opens the application and relies
 * on the project having auto-render / auto-close settings baked in.
 * Returns the process handle.
 */
export function launchVOC(projectFile: string) {
  return spawn(VOC_EXE, [projectFile], {
    detached: true,
    stdio: "ignore",
  });
}

/**
 * Poll an output directory for new files matching a pattern, with timeout.
 * Returns all new file paths found after polling.
 */
export async function pollForOutput(
  outputDir: string,
  extensions: string[] = [".png", ".jpg", ".mp4", ".avi"],
  beforeFiles: Set<string> = new Set(),
  timeoutMs = 120_000
): Promise<string[]> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    await sleep(3000);
    try {
      const entries = await fs.readdir(outputDir);
      const newFiles = entries.filter((f) => {
        const ext = path.extname(f).toLowerCase();
        return extensions.includes(ext) && !beforeFiles.has(f);
      });
      if (newFiles.length > 0) {
        return newFiles.map((f) => path.join(outputDir, f));
      }
    } catch {
      // dir may not exist yet — keep polling
    }
  }

  throw new Error(
    `VOC render timed out after ${timeoutMs}ms. Check if the project file has auto-render enabled.`
  );
}

/**
 * Get the set of files currently in a directory (pre-render snapshot).
 */
export async function snapshotDir(dir: string): Promise<Set<string>> {
  try {
    const entries = await fs.readdir(dir);
    return new Set(entries);
  } catch {
    return new Set();
  }
}

// ── Bundled binary runners ────────────────────────────────────────────────────

/**
 * Run vtracer (bundled in VOC) to convert a raster image to SVG.
 */
export async function vectorizeImage(
  inputPath: string,
  outputPath: string,
  options?: {
    colorMode?: "color" | "binary";
    filterSpeckle?: number;
    colorPrecision?: number;
    layerDifference?: number;
    cornerThreshold?: number;
    lengthThreshold?: number;
    pathPrecision?: number;
    maxIterations?: number;
  }
): Promise<string> {
  const args = [
    "--input",
    inputPath,
    "--output",
    outputPath,
    "--colormode",
    options?.colorMode ?? "color",
    "--filter_speckle",
    String(options?.filterSpeckle ?? 4),
    "--color_precision",
    String(options?.colorPrecision ?? 6),
    "--layer_difference",
    String(options?.layerDifference ?? 16),
    "--corner_threshold",
    String(options?.cornerThreshold ?? 60),
    "--length_threshold",
    String(options?.lengthThreshold ?? 4),
    "--max_iterations",
    String(options?.maxIterations ?? 10),
  ];

  if (options?.pathPrecision !== undefined) {
    args.push("--path_precision", String(options.pathPrecision));
  }

  return new Promise((resolve, reject) => {
    const proc = spawn(VTRACER_EXE, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    proc.stderr?.on("data", (d: Buffer) => { stderr += d.toString(); });
    proc.on("close", (code) => {
      if (code === 0) resolve(outputPath);
      else reject(new Error(`vtracer exited ${code}: ${stderr}`));
    });
    proc.on("error", reject);
  });
}

/**
 * Use VOC's bundled FFmpeg to transcode / convert media.
 */
export async function ffmpegConvert(
  inputPath: string,
  outputPath: string,
  extraArgs: string[] = []
): Promise<string> {
  const args = ["-y", "-i", inputPath, ...extraArgs, outputPath];

  return new Promise((resolve, reject) => {
    const proc = spawn(FFMPEG_EXE, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    proc.stderr?.on("data", (d: Buffer) => { stderr += d.toString(); });
    proc.on("close", (code) => {
      if (code === 0) resolve(outputPath);
      else reject(new Error(`FFmpeg exited ${code}: ${stderr.slice(-500)}`));
    });
    proc.on("error", reject);
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
