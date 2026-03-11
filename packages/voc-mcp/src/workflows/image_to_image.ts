// ─────────────────────────────────────────────────────────────────────────────
// Workflow: Image-to-Image (img2img with optional ControlNet)
// ─────────────────────────────────────────────────────────────────────────────

export interface ImageToImageParams {
  checkpoint: string;
  uploadedImageName: string;       // ComfyUI server-side filename from uploadImage()
  positivePrompt: string;
  negativePrompt?: string;
  denoise?: number;                 // 0.0–1.0, lower = closer to source
  steps?: number;
  cfg?: number;
  seed?: number;
  controlnetModel?: string;         // optional ControlNet model name
  controlnetStrength?: number;
}

export function buildImageToImageWorkflow(p: ImageToImageParams): Record<string, unknown> {
  const seed = p.seed ?? Math.floor(Math.random() * 1_000_000_000);
  const useControlNet = Boolean(p.controlnetModel);

  const base: Record<string, unknown> = {
    "1": {
      class_type: "CheckpointLoaderSimple",
      inputs: { ckpt_name: p.checkpoint },
    },
    "2": {
      class_type: "CLIPTextEncode",
      inputs: { text: p.positivePrompt, clip: ["1", 1] },
    },
    "3": {
      class_type: "CLIPTextEncode",
      inputs: {
        text: p.negativePrompt ?? "low quality, blurry, watermark",
        clip: ["1", 1],
      },
    },
    "4": {
      class_type: "LoadImage",
      inputs: { image: p.uploadedImageName, upload: "image" },
    },
    "5": {
      class_type: "VAEEncode",
      inputs: { pixels: ["4", 0], vae: ["1", 2] },
    },
  };

  if (useControlNet) {
    base["6"] = {
      class_type: "ControlNetLoader",
      inputs: { control_net_name: p.controlnetModel },
    };
    base["7"] = {
      class_type: "ControlNetApplyAdvanced",
      inputs: {
        positive: ["2", 0],
        negative: ["3", 0],
        control_net: ["6", 0],
        image: ["4", 0],
        strength: p.controlnetStrength ?? 0.8,
        start_percent: 0,
        end_percent: 1,
      },
    };
  }

  const conditioningPositive = useControlNet ? ["7", 0] : ["2", 0];
  const conditioningNegative = useControlNet ? ["7", 1] : ["3", 0];

  base["8"] = {
    class_type: "KSampler",
    inputs: {
      seed,
      steps: p.steps ?? 20,
      cfg: p.cfg ?? 7.0,
      sampler_name: "euler",
      scheduler: "normal",
      denoise: p.denoise ?? 0.7,
      model: ["1", 0],
      positive: conditioningPositive,
      negative: conditioningNegative,
      latent_image: ["5", 0],
    },
  };

  base["9"] = {
    class_type: "VAEDecode",
    inputs: { samples: ["8", 0], vae: ["1", 2] },
  };

  base["10"] = {
    class_type: "SaveImage",
    inputs: { images: ["9", 0], filename_prefix: "voc_i2i" },
  };

  return base;
}
