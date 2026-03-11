// ─────────────────────────────────────────────────────────────────────────────
// Workflow: Text-to-Image
// Works with any SDXL/Flux/HiDream checkpoint available in ComfyUI.
// Uses KSampler + CLIPTextEncode + VAEDecode standard pipeline.
// ─────────────────────────────────────────────────────────────────────────────

export interface TextToImageParams {
  checkpoint: string;
  positivePrompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  steps?: number;
  cfg?: number;
  sampler?: string;
  scheduler?: string;
  seed?: number;
}

export function buildTextToImageWorkflow(p: TextToImageParams): Record<string, unknown> {
  const seed = p.seed ?? Math.floor(Math.random() * 1_000_000_000);

  return {
    "1": {
      class_type: "CheckpointLoaderSimple",
      inputs: { ckpt_name: p.checkpoint },
    },
    "2": {
      class_type: "CLIPTextEncode",
      inputs: {
        text: p.positivePrompt,
        clip: ["1", 1],
      },
    },
    "3": {
      class_type: "CLIPTextEncode",
      inputs: {
        text: p.negativePrompt ?? "low quality, blurry, watermark, text, distorted",
        clip: ["1", 1],
      },
    },
    "4": {
      class_type: "EmptyLatentImage",
      inputs: {
        width: p.width ?? 1024,
        height: p.height ?? 1024,
        batch_size: 1,
      },
    },
    "5": {
      class_type: "KSampler",
      inputs: {
        seed,
        steps: p.steps ?? 20,
        cfg: p.cfg ?? 7.0,
        sampler_name: p.sampler ?? "euler",
        scheduler: p.scheduler ?? "normal",
        denoise: 1.0,
        model: ["1", 0],
        positive: ["2", 0],
        negative: ["3", 0],
        latent_image: ["4", 0],
      },
    },
    "6": {
      class_type: "VAEDecode",
      inputs: { samples: ["5", 0], vae: ["1", 2] },
    },
    "7": {
      class_type: "SaveImage",
      inputs: { images: ["6", 0], filename_prefix: "voc_t2i" },
    },
  };
}
