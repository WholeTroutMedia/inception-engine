/**
 * @inception/live-animate — ComfyUI Style Transfer Client (Option B)
 *
 * Connects to the local ComfyUI server (D:\ComfyUI) and submits img2img
 * workflows using the FLUX1-Schnell Q8 GGUF model.
 *
 * Architecture:
 *   Webcam frame (base64 JPEG) → ComfyUI /api/prompt → poll /api/history →
 *   output image URL → optional Vertex AI 2x upscale → display in studio
 *
 * FLUX1-Schnell characteristics:
 *   - Distilled for rapid inference (4 steps sufficient)
 *   - Q8 GGUF format → ~7-10s per 512x512 on 3080 at 4 steps
 *   - Strong at style transfer with denoise 0.55-0.7
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StyleTransferOptions {
  /** Base64 encoded JPEG frame from webcam */
  imageBase64: string;
  /** Style description passed to FLUX as positive prompt */
  stylePrompt: string;
  /** Denoise strength 0-1 (0.6 = balanced style vs structure, default) */
  denoise?: number;
  /** Number of inference steps (default: 4 — Schnell optimal) */
  steps?: number;
  /** Output width (default: 512) */
  width?: number;
  /** Output height (default: 512) */
  height?: number;
}

export interface StyleTransferResult {
  /** URL to fetch the output image from ComfyUI */
  imageUrl: string;
  /** Raw filename from ComfyUI output */
  filename: string;
  /** Processing time in ms */
  processingMs: number;
  /** Whether upscaling was applied */
  upscaled: boolean;
}

// ─── ComfyUI workflow builder ─────────────────────────────────────────────────

function buildFluxImg2ImgWorkflow(opts: Required<StyleTransferOptions>): object {
  return {
    // Node 1: Load image from base64
    "1": {
      class_type: "ETN_LoadImageBase64",
      inputs: { image: opts.imageBase64 },
    },
    // Node 2: Positive prompt (style)
    "2": {
      class_type: "CLIPTextEncode",
      inputs: {
        text: opts.stylePrompt,
        clip: ["6", 1],
      },
    },
    // Node 3: Negative prompt
    "3": {
      class_type: "CLIPTextEncode",
      inputs: {
        text: "blurry, distorted, disfigured, low quality, artifacts",
        clip: ["6", 1],
      },
    },
    // Node 4: VAE encode input image
    "4": {
      class_type: "VAEEncode",
      inputs: {
        pixels: ["1", 0],
        vae: ["5", 2],
      },
    },
    // Node 5: Load FLUX checkpoint (GGUF)
    "5": {
      class_type: "UnetLoaderGGUF",
      inputs: { unet_name: "flux1-schnell-Q8_0.gguf" },
    },
    // Node 6: CLIP loader (t5xxl for FLUX)
    "6": {
      class_type: "DualCLIPLoaderGGUF",
      inputs: {
        clip_name1: "t5xxl_fp8_e4m3fn.safetensors",
        clip_name2: "clip_l.safetensors",
        type: "flux",
      },
    },
    // Node 7: KSampler — 4 steps, Schnell-optimized
    "7": {
      class_type: "KSampler",
      inputs: {
        model: ["5", 0],
        positive: ["2", 0],
        negative: ["3", 0],
        latent_image: ["4", 0],
        seed: Math.floor(Math.random() * 999999999),
        steps: opts.steps,
        cfg: 1.0,       // FLUX uses cfg=1
        sampler_name: "euler",
        scheduler: "simple",
        denoise: opts.denoise,
      },
    },
    // Node 8: VAE decode
    "8": {
      class_type: "VAEDecode",
      inputs: {
        samples: ["7", 0],
        vae: ["5", 2],
      },
    },
    // Node 9: Save image
    "9": {
      class_type: "SaveImage",
      inputs: {
        images: ["8", 0],
        filename_prefix: "inception-live-animate",
      },
    },
  };
}

// ─── ComfyUIStyleClient ───────────────────────────────────────────────────────

export class ComfyUIStyleClient {
  private readonly baseUrl: string;
  private readonly clientId: string;

  constructor(baseUrl = 'http://localhost:8188') {
    this.baseUrl = baseUrl;
    this.clientId = `inception-${Date.now()}`;
  }

  /** Check if ComfyUI is reachable */
  async isRunning(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/system_stats`, { signal: AbortSignal.timeout(2000) });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Submit a style transfer job to ComfyUI.
   * Returns when the image is ready.
   * Throws if ComfyUI is not running.
   */
  async transfer(opts: StyleTransferOptions): Promise<StyleTransferResult> {
    const startMs = Date.now();
    const fullOpts: Required<StyleTransferOptions> = {
      imageBase64: opts.imageBase64,
      stylePrompt: opts.stylePrompt,
      denoise: opts.denoise ?? 0.6,
      steps: opts.steps ?? 4,
      width: opts.width ?? 512,
      height: opts.height ?? 512,
    };

    // Queue the workflow
    const workflow = buildFluxImg2ImgWorkflow(fullOpts);
    const queueRes = await fetch(`${this.baseUrl}/api/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: workflow, client_id: this.clientId }),
    });
    if (!queueRes.ok) {
      const err = await queueRes.text();
      throw new Error(`[comfyui] Queue failed: ${err}`);
    }
    const { prompt_id } = await queueRes.json() as { prompt_id: string };

    // Poll history until done
    const filename = await this.pollUntilDone(prompt_id);
    const imageUrl = `${this.baseUrl}/view?filename=${encodeURIComponent(filename)}&type=output`;

    return {
      imageUrl,
      filename,
      processingMs: Date.now() - startMs,
      upscaled: false,
    };
  }

  private async pollUntilDone(promptId: string, timeoutMs = 60000): Promise<string> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 500));
      const res = await fetch(`${this.baseUrl}/history/${promptId}`);
      if (!res.ok) continue;
      const history = await res.json() as Record<string, unknown>;
      const entry = history[promptId] as { outputs?: Record<string, { images?: { filename: string }[] }> } | undefined;
      if (!entry?.outputs) continue;
      // Find the SaveImage node output
      for (const nodeOut of Object.values(entry.outputs)) {
        if (nodeOut.images?.[0]?.filename) {
          return nodeOut.images[0].filename;
        }
      }
    }
    throw new Error(`[comfyui] Timeout waiting for prompt ${promptId}`);
  }

  /**
   * Capture a frame from a video element and return base64 JPEG.
   */
  static captureFrame(video: HTMLVideoElement, quality = 0.8): string {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 512;
    canvas.height = video.videoHeight || 512;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    return dataUrl.split(',')[1]; // strip the data:image/jpeg;base64, prefix
  }
}
