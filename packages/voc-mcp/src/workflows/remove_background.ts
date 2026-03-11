// ─────────────────────────────────────────────────────────────────────────────
// Workflow: Background Removal via RMBG / BiRefNet
// ─────────────────────────────────────────────────────────────────────────────

export interface RemoveBackgroundParams {
  uploadedImageName: string;
}

export function buildRemoveBackgroundWorkflow(p: RemoveBackgroundParams): Record<string, unknown> {
  // Uses the ComfyUI-BRIA-RMBG custom node (RMBG-1.4 model)
  // Falls back gracefully if node not installed — ComfyUI will report the error
  return {
    "1": {
      class_type: "LoadImage",
      inputs: { image: p.uploadedImageName, upload: "image" },
    },
    "2": {
      class_type: "BRIA_RMBG_ModelLoader",
      inputs: {},
    },
    "3": {
      class_type: "BRIA_RMBG_Zho",
      inputs: {
        image: ["1", 0],
        rmbg_model: ["2", 0],
      },
    },
    "4": {
      class_type: "SaveImage",
      inputs: { images: ["3", 0], filename_prefix: "voc_nobg" },
    },
  };
}
