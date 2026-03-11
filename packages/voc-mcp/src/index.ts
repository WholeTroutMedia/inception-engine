// ─────────────────────────────────────────────────────────────────────────────
// @creative-liberation-engine/voc-mcp
// MCP server bridging Visions of Chaos + ComfyUI into the Creative Liberation Engine.
//
// 10 tools exposed:
//   voc_boot_comfyui    — start ComfyUI headlessly
//   voc_list_models     — list available checkpoints, LoRAs, VAEs
//   voc_generate_image  — text-to-image via Flux/SDXL/HiDream
//   voc_image_to_image  — img2img with optional ControlNet
//   voc_animate_face    — LivePortrait portrait animation
//   voc_generate_audio  — MusicGen / ACE-Step audio generation
//   voc_generate_3d     — Hunyuan3D-2 / DUSt3R 3D mesh generation
//   voc_upscale_image   — ESRGAN / SUPIR upscaling
//   voc_remove_background — RMBG / BiRefNet background removal
//   voc_vectorize       — raster → SVG via bundled vtracer
// ─────────────────────────────────────────────────────────────────────────────

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "fs/promises";
import path from "path";
import os from "os";

import {
  bootComfyUI,
  isComfyUIRunning,
  queuePrompt,
  waitForCompletion,
  getOutputFiles,
  getModelList,
  uploadImage,
  getSystemStats,
} from "./comfyui/client.js";
import { buildTextToImageWorkflow } from "./workflows/text_to_image.js";
import { buildImageToImageWorkflow } from "./workflows/image_to_image.js";
import { buildUpscaleWorkflow } from "./workflows/upscale.js";
import { buildRemoveBackgroundWorkflow } from "./workflows/remove_background.js";
import { buildFaceAnimationWorkflow } from "./workflows/face_animation.js";
import { vectorizeImage } from "./voc/process.js";
import { OUTPUT_DIR, COMFYUI_URL } from "./config.js";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function requireComfyUI(tool: string): Promise<void> {
  return isComfyUIRunning().then((running) => {
    if (!running) {
      throw new McpError(
        ErrorCode.InternalError,
        `ComfyUI is not running. Call voc_boot_comfyui first, or set COMFYUI_URL to an existing instance. (tool: ${tool})`
      );
    }
  });
}

async function runWorkflow(
  workflow: Record<string, unknown>
): Promise<string[]> {
  const queued = await queuePrompt(workflow);
  await waitForCompletion(queued.prompt_id);
  const files = await getOutputFiles(queued.prompt_id);
  return files.map((f) => f.fullPath);
}

function ok(data: unknown): { content: [{ type: "text"; text: string }] } {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

function ensureOutputDir(): Promise<void> {
  return fs.mkdir(OUTPUT_DIR, { recursive: true }).then(() => undefined);
}

// ─────────────────────────────────────────────────────────────────────────────
// MCP Server
// ─────────────────────────────────────────────────────────────────────────────

const server = new Server(
  { name: "@creative-liberation-engine/voc-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// ─────────────────────────────────────────────────────────────────────────────
// Tool Definitions
// ─────────────────────────────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "voc_boot_comfyui",
      description:
        "Start ComfyUI headlessly from the Visions of Chaos Python venv. " +
        "Returns status (already_running | booted) and the local URL. " +
        "Must be called before any generation tool if ComfyUI is not already running.",
      inputSchema: {
        type: "object",
        properties: {
          cpu_only: {
            type: "boolean",
            description:
              "Force CPU-only mode (slower but works without a CUDA GPU). Default: false.",
          },
        },
      },
    },
    {
      name: "voc_list_models",
      description:
        "List all model checkpoints, LoRAs, VAEs, ControlNets, and upscale models " +
        "available in the ComfyUI model library. Use checkpoint names from this list " +
        "as the 'checkpoint' argument to voc_generate_image.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "voc_generate_image",
      description:
        "Generate an image from a text prompt using any checkpoint in ComfyUI " +
        "(Flux, SDXL, HiDream, SD 1.5, etc.). Returns the output file path(s).",
      inputSchema: {
        type: "object",
        required: ["prompt"],
        properties: {
          prompt: {
            type: "string",
            description: "Positive text prompt describing the desired image.",
          },
          negative_prompt: {
            type: "string",
            description: "Negative prompt (what to avoid). Optional.",
          },
          checkpoint: {
            type: "string",
            description:
              "Checkpoint filename from voc_list_models. Defaults to first available.",
          },
          width: { type: "number", description: "Output width in pixels. Default: 1024." },
          height: { type: "number", description: "Output height in pixels. Default: 1024." },
          steps: { type: "number", description: "Sampler steps. Default: 20." },
          cfg: { type: "number", description: "CFG scale. Default: 7.0." },
          seed: { type: "number", description: "Random seed. Omit for random." },
        },
      },
    },
    {
      name: "voc_image_to_image",
      description:
        "Transform an existing image using a text prompt. Optionally apply ControlNet " +
        "for structural guidance. Returns the output file path(s).",
      inputSchema: {
        type: "object",
        required: ["input_image_path", "prompt"],
        properties: {
          input_image_path: {
            type: "string",
            description: "Absolute path to the source image.",
          },
          prompt: { type: "string", description: "Positive prompt." },
          negative_prompt: { type: "string" },
          checkpoint: { type: "string" },
          denoise: {
            type: "number",
            description:
              "Denoising strength (0.0 = identical to input, 1.0 = fully reimagined). Default: 0.7.",
          },
          steps: { type: "number" },
          cfg: { type: "number" },
          seed: { type: "number" },
          controlnet_model: {
            type: "string",
            description:
              "Optional ControlNet model name from voc_list_models (e.g. 'control_v11p_sd15_canny.pth').",
          },
          controlnet_strength: {
            type: "number",
            description: "ControlNet conditioning strength (0.0–2.0). Default: 0.8.",
          },
        },
      },
    },
    {
      name: "voc_animate_face",
      description:
        "Animate a portrait photo using LivePortrait. Optionally provide a driving video " +
        "to mimic its motion. Returns animated frame image paths (use ffmpeg to combine).",
      inputSchema: {
        type: "object",
        required: ["source_image_path"],
        properties: {
          source_image_path: {
            type: "string",
            description: "Absolute path to the source portrait image.",
          },
          driving_video_path: {
            type: "string",
            description:
              "Optional absolute path to a driving video for motion reference.",
          },
          retargeting_eye: {
            type: "number",
            description: "Eye retargeting intensity (0.0–1.0). Default: 0.",
          },
          retargeting_lip: {
            type: "number",
            description: "Lip retargeting intensity (0.0–1.0). Default: 0.",
          },
        },
      },
    },
    {
      name: "voc_generate_audio",
      description:
        "Generate music or audio from a text description using MusicGen or ACE-Step " +
        "(via ComfyUI-AudioCraft or compatible node). Returns the output audio file path.",
      inputSchema: {
        type: "object",
        required: ["prompt"],
        properties: {
          prompt: {
            type: "string",
            description:
              "Description of the music or audio to generate. E.g. 'upbeat electronic music with synth pads, 120 BPM'.",
          },
          duration: {
            type: "number",
            description: "Duration in seconds. Default: 10. Max: 30.",
          },
          model: {
            type: "string",
            description:
              "Audio model to use: 'musicgen-medium', 'musicgen-large', or 'musicgen-melody'. Default: 'musicgen-medium'.",
          },
        },
      },
    },
    {
      name: "voc_generate_3d",
      description:
        "Generate a 3D model/mesh from a text prompt or input image using Hunyuan3D-2 " +
        "or DUSt3R (via ComfyUI). Returns the output mesh/image file path(s).",
      inputSchema: {
        type: "object",
        required: ["prompt"],
        properties: {
          prompt: {
            type: "string",
            description: "Text description of the 3D model to generate.",
          },
          input_image_path: {
            type: "string",
            description:
              "Optional input image to reconstruct as 3D (image-to-3D mode).",
          },
          model: {
            type: "string",
            description:
              "3D model to use: 'hunyuan3d-2' or 'dust3r'. Default: 'hunyuan3d-2'.",
          },
        },
      },
    },
    {
      name: "voc_upscale_image",
      description:
        "Upscale an image 2x or 4x using ESRGAN, SUPIR, or another upscaling model " +
        "available in ComfyUI. Returns the upscaled output file path.",
      inputSchema: {
        type: "object",
        required: ["input_image_path"],
        properties: {
          input_image_path: {
            type: "string",
            description: "Absolute path to the image to upscale.",
          },
          upscale_model: {
            type: "string",
            description:
              "Upscale model filename from voc_list_models. Default: 'RealESRGAN_x4plus.pth'.",
          },
        },
      },
    },
    {
      name: "voc_remove_background",
      description:
        "Remove or isolate the background of an image using RMBG/BiRefNet segmentation " +
        "via ComfyUI. Returns the output image path with transparent background (PNG).",
      inputSchema: {
        type: "object",
        required: ["input_image_path"],
        properties: {
          input_image_path: {
            type: "string",
            description: "Absolute path to the source image.",
          },
        },
      },
    },
    {
      name: "voc_vectorize",
      description:
        "Convert a raster image (PNG/JPG) to a clean SVG using vtracer " +
        "(bundled with Visions of Chaos). Ideal for fractal renders, logos, and design assets.",
      inputSchema: {
        type: "object",
        required: ["input_image_path"],
        properties: {
          input_image_path: {
            type: "string",
            description: "Absolute path to the source raster image.",
          },
          output_path: {
            type: "string",
            description:
              "Optional absolute path for the output SVG. Defaults to same directory as input.",
          },
          color_mode: {
            type: "string",
            enum: ["color", "binary"],
            description: "Vectorization color mode. Default: 'color'.",
          },
          filter_speckle: {
            type: "number",
            description: "Speckle filter size (pixels). Higher = smoother. Default: 4.",
          },
        },
      },
    },
  ],
}));

// ─────────────────────────────────────────────────────────────────────────────
// Tool Handlers
// ─────────────────────────────────────────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  await ensureOutputDir();

  // ── voc_boot_comfyui ────────────────────────────────────────────────────────
  if (name === "voc_boot_comfyui") {
    try {
      const result = await bootComfyUI(args?.cpu_only === true);
      const stats = await getSystemStats().catch(() => null);
      return ok({ ...result, system_stats: stats });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new McpError(ErrorCode.InternalError, `Boot failed: ${message}`);
    }
  }

  // ── voc_list_models ─────────────────────────────────────────────────────────
  if (name === "voc_list_models") {
    await requireComfyUI("voc_list_models");
    try {
      const models = await getModelList();
      return ok(models);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new McpError(ErrorCode.InternalError, `Failed to list models: ${message}`);
    }
  }

  // ── voc_generate_image ──────────────────────────────────────────────────────
  if (name === "voc_generate_image") {
    await requireComfyUI("voc_generate_image");

    // Auto-select first checkpoint if none specified
    let checkpoint = String(args?.checkpoint ?? "");
    if (!checkpoint) {
      const models = await getModelList();
      checkpoint = models.checkpoints[0] ?? "";
      if (!checkpoint) {
        throw new McpError(
          ErrorCode.InternalError,
          "No checkpoints found in ComfyUI. Download a model first."
        );
      }
    }

    const workflow = buildTextToImageWorkflow({
      checkpoint,
      positivePrompt: String(args?.prompt ?? ""),
      negativePrompt: args?.negative_prompt ? String(args.negative_prompt) : undefined,
      width: args?.width ? Number(args.width) : undefined,
      height: args?.height ? Number(args.height) : undefined,
      steps: args?.steps ? Number(args.steps) : undefined,
      cfg: args?.cfg ? Number(args.cfg) : undefined,
      seed: args?.seed ? Number(args.seed) : undefined,
    });

    try {
      const files = await runWorkflow(workflow);
      return ok({ status: "success", checkpoint, output_files: files });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new McpError(ErrorCode.InternalError, `Generation failed: ${message}`);
    }
  }

  // ── voc_image_to_image ──────────────────────────────────────────────────────
  if (name === "voc_image_to_image") {
    await requireComfyUI("voc_image_to_image");

    const inputPath = String(args?.input_image_path ?? "");
    const uploadedName = await uploadImage(inputPath).catch((e) => {
      throw new McpError(ErrorCode.InternalError, `Image upload failed: ${e.message}`);
    });

    let checkpoint = String(args?.checkpoint ?? "");
    if (!checkpoint) {
      const models = await getModelList();
      checkpoint = models.checkpoints[0] ?? "v1-5-pruned.ckpt";
    }

    const workflow = buildImageToImageWorkflow({
      checkpoint,
      uploadedImageName: uploadedName,
      positivePrompt: String(args?.prompt ?? ""),
      negativePrompt: args?.negative_prompt ? String(args.negative_prompt) : undefined,
      denoise: args?.denoise ? Number(args.denoise) : undefined,
      steps: args?.steps ? Number(args.steps) : undefined,
      cfg: args?.cfg ? Number(args.cfg) : undefined,
      seed: args?.seed ? Number(args.seed) : undefined,
      controlnetModel: args?.controlnet_model ? String(args.controlnet_model) : undefined,
      controlnetStrength: args?.controlnet_strength ? Number(args.controlnet_strength) : undefined,
    });

    try {
      const files = await runWorkflow(workflow);
      return ok({ status: "success", output_files: files });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new McpError(ErrorCode.InternalError, `img2img failed: ${message}`);
    }
  }

  // ── voc_animate_face ────────────────────────────────────────────────────────
  if (name === "voc_animate_face") {
    await requireComfyUI("voc_animate_face");

    const sourcePath = String(args?.source_image_path ?? "");
    const sourceUploaded = await uploadImage(sourcePath).catch((e) => {
      throw new McpError(ErrorCode.InternalError, `Source upload failed: ${e.message}`);
    });

    let drivingUploaded: string | undefined;
    if (args?.driving_video_path) {
      drivingUploaded = await uploadImage(String(args.driving_video_path)).catch(
        (e) => { throw new McpError(ErrorCode.InternalError, `Driving video upload failed: ${e.message}`); }
      );
    }

    const workflow = buildFaceAnimationWorkflow({
      sourceImageName: sourceUploaded,
      drivingVideoName: drivingUploaded,
      retargetingEye: args?.retargeting_eye ? Number(args.retargeting_eye) : undefined,
      retargetingLip: args?.retargeting_lip ? Number(args.retargeting_lip) : undefined,
    });

    try {
      const files = await runWorkflow(workflow);
      return ok({ status: "success", output_files: files });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new McpError(ErrorCode.InternalError, `Face animation failed: ${message}`);
    }
  }

  // ── voc_generate_audio ──────────────────────────────────────────────────────
  if (name === "voc_generate_audio") {
    await requireComfyUI("voc_generate_audio");

    const duration = Math.min(Number(args?.duration ?? 10), 30);
    const model = String(args?.model ?? "musicgen-medium");
    const prompt = String(args?.prompt ?? "");

    // AudioCraft / MusicGen ComfyUI workflow
    const workflow = {
      "1": {
        class_type: "MusicgenLoader",
        inputs: { model: model },
      },
      "2": {
        class_type: "MusicgenGenerate",
        inputs: {
          model: ["1", 0],
          text: prompt,
          duration_seconds: duration,
          guidance_scale: 3.0,
        },
      },
      "3": {
        class_type: "SaveAudio",
        inputs: {
          audio: ["2", 0],
          filename_prefix: "voc_audio",
        },
      },
    };

    try {
      const queued = await queuePrompt(workflow);
      await waitForCompletion(queued.prompt_id);
      // Audio files land in output dir
      const outFiles = await fs.readdir(OUTPUT_DIR);
      const audioFiles = outFiles
        .filter((f) => f.startsWith("voc_audio") && (f.endsWith(".wav") || f.endsWith(".mp3") || f.endsWith(".flac")))
        .map((f) => path.join(OUTPUT_DIR, f));
      return ok({ status: "success", model, duration, output_files: audioFiles });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new McpError(ErrorCode.InternalError, `Audio generation failed: ${message}. Ensure ComfyUI-AudioCraft node is installed.`);
    }
  }

  // ── voc_generate_3d ─────────────────────────────────────────────────────────
  if (name === "voc_generate_3d") {
    await requireComfyUI("voc_generate_3d");

    const modelChoice = String(args?.model ?? "hunyuan3d-2");
    const prompt = String(args?.prompt ?? "");

    let workflow: Record<string, unknown>;

    if (args?.input_image_path) {
      const imgName = await uploadImage(String(args.input_image_path)).catch((e) => {
        throw new McpError(ErrorCode.InternalError, `Image upload failed: ${e.message}`);
      });
      // Image-to-3D via Hunyuan3D-2
      workflow = {
        "1": { class_type: "LoadImage", inputs: { image: imgName, upload: "image" } },
        "2": {
          class_type: "Hunyuan3DModelLoader",
          inputs: { model: "hunyuan3d-2" },
        },
        "3": {
          class_type: "Hunyuan3DRun",
          inputs: {
            model: ["2", 0],
            image: ["1", 0],
            steps: 30,
            guidance_scale: 5.5,
          },
        },
        "4": {
          class_type: "Save3DObj",
          inputs: { mesh: ["3", 0], filename_prefix: "voc_3d" },
        },
      };
    } else {
      // Text-to-3D — generate from prompt
      workflow = {
        "1": {
          class_type: "Hunyuan3DModelLoader",
          inputs: { model: modelChoice },
        },
        "2": {
          class_type: "Hunyuan3DTextTo3D",
          inputs: {
            model: ["1", 0],
            prompt,
            steps: 30,
            guidance_scale: 5.5,
            seed: Math.floor(Math.random() * 1_000_000_000),
          },
        },
        "3": {
          class_type: "Save3DObj",
          inputs: { mesh: ["2", 0], filename_prefix: "voc_3d" },
        },
      };
    }

    try {
      const queued = await queuePrompt(workflow);
      await waitForCompletion(queued.prompt_id);
      const outFiles = await fs.readdir(OUTPUT_DIR);
      const meshFiles = outFiles
        .filter((f) => f.startsWith("voc_3d") && (f.endsWith(".obj") || f.endsWith(".glb") || f.endsWith(".ply") || f.endsWith(".stl")))
        .map((f) => path.join(OUTPUT_DIR, f));
      const imageFiles = await getOutputFiles(queued.prompt_id);
      return ok({
        status: "success",
        model: modelChoice,
        mesh_files: meshFiles,
        preview_images: imageFiles.map((f) => f.fullPath),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new McpError(ErrorCode.InternalError, `3D generation failed: ${message}. Ensure Hunyuan3D-2 ComfyUI node is installed.`);
    }
  }

  // ── voc_upscale_image ───────────────────────────────────────────────────────
  if (name === "voc_upscale_image") {
    await requireComfyUI("voc_upscale_image");

    const inputPath = String(args?.input_image_path ?? "");
    const uploadedName = await uploadImage(inputPath).catch((e) => {
      throw new McpError(ErrorCode.InternalError, `Upload failed: ${e.message}`);
    });

    const workflow = buildUpscaleWorkflow({
      uploadedImageName: uploadedName,
      upscaleModel: args?.upscale_model ? String(args.upscale_model) : undefined,
    });

    try {
      const files = await runWorkflow(workflow);
      return ok({ status: "success", output_files: files });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new McpError(ErrorCode.InternalError, `Upscaling failed: ${message}`);
    }
  }

  // ── voc_remove_background ───────────────────────────────────────────────────
  if (name === "voc_remove_background") {
    await requireComfyUI("voc_remove_background");

    const inputPath = String(args?.input_image_path ?? "");
    const uploadedName = await uploadImage(inputPath).catch((e) => {
      throw new McpError(ErrorCode.InternalError, `Upload failed: ${e.message}`);
    });

    const workflow = buildRemoveBackgroundWorkflow({ uploadedImageName: uploadedName });

    try {
      const files = await runWorkflow(workflow);
      return ok({ status: "success", output_files: files });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new McpError(ErrorCode.InternalError, `Background removal failed: ${message}. Ensure BRIA-RMBG ComfyUI node is installed.`);
    }
  }

  // ── voc_vectorize ────────────────────────────────────────────────────────────
  if (name === "voc_vectorize") {
    const inputPath = String(args?.input_image_path ?? "");

    // Validate input
    try {
      await fs.access(inputPath);
    } catch {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Input file not found: ${inputPath}`
      );
    }

    const ext = path.extname(inputPath);
    const outputPath =
      args?.output_path
        ? String(args.output_path)
        : inputPath.replace(new RegExp(`\\${ext}$`), ".svg");

    try {
      const svgPath = await vectorizeImage(
        inputPath,
        outputPath.endsWith(".svg") ? outputPath : outputPath + ".svg",
        {
          colorMode: (args?.color_mode as "color" | "binary") ?? "color",
          filterSpeckle: args?.filter_speckle ? Number(args.filter_speckle) : undefined,
        }
      );

      return ok({ status: "success", input: inputPath, svg_path: svgPath });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new McpError(ErrorCode.InternalError, `Vectorization failed: ${message}`);
    }
  }

  throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
});

// ─────────────────────────────────────────────────────────────────────────────
// Start
// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(
    `[VOC-MCP] v1.0.0 running — ComfyUI target: ${COMFYUI_URL} — Output: ${OUTPUT_DIR}`
  );
}

main().catch((err) => {
  console.error("[VOC-MCP] Fatal:", err);
  process.exit(1);
});
