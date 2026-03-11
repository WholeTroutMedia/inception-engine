// ─────────────────────────────────────────────────────────────────────────────
// Workflow: Upscaling via ESRGAN/SUPIR
// ─────────────────────────────────────────────────────────────────────────────

export interface UpscaleParams {
  uploadedImageName: string;
  upscaleModel?: string;   // e.g. "RealESRGAN_x4plus.pth"
  scale?: number;          // 2 or 4 (used for display; actual scale set by model)
}

export function buildUpscaleWorkflow(p: UpscaleParams): Record<string, unknown> {
  return {
    "1": {
      class_type: "LoadImage",
      inputs: { image: p.uploadedImageName, upload: "image" },
    },
    "2": {
      class_type: "UpscaleModelLoader",
      inputs: { model_name: p.upscaleModel ?? "RealESRGAN_x4plus.pth" },
    },
    "3": {
      class_type: "ImageUpscaleWithModel",
      inputs: { upscale_model: ["2", 0], image: ["1", 0] },
    },
    "4": {
      class_type: "SaveImage",
      inputs: { images: ["3", 0], filename_prefix: "voc_upscale" },
    },
  };
}
