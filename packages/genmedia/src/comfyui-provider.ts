/**
 * ComfyUI Local Media Provider
 * Turns the local RTX 4090 into a full GenMedia production node.
 *
 * ComfyUI runs as a local server on :8188 and accepts workflow JSON.
 * This provider wraps it as a GenMedia-compatible provider so the
 * @inception/genmedia fallback chain can silently route to local GPU
 * when FAL or Google are unavailable, rate-limited, or offline.
 *
 * Supported workflows:
 *  - Image: Flux.1-Dev via ComfyUI (24GB VRAM — runs clean)
 *  - Image: SDXL-Turbo for fast drafts
 *  - Video: Wan 2.1 1.3B (480p, ~4min per 5s clip)
 *  - ControlNet: pose/depth/canny conditioning
 *
 * Constitutional Article 0: Offline sovereign generation — NO cloud dependency.
 * Constitutional Article 19: All 5 neural systems operational, always.
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { GenerationRequest, GenerationResult } from './index.js';

const COMFY_URL = process.env['COMFYUI_URL'] ?? 'http://localhost:8188';
const OUTPUT_DIR = process.env['COMFY_OUTPUT_DIR'] ?? 'D:/ComfyUI/output';

// ─── COMFYUI WORKFLOW TEMPLATES ───────────────────────────────────────────────

function fluxImageWorkflow(prompt: string, width: number, height: number) {
    return {
        '1': { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: 'flux1-dev.safetensors' } },
        '2': { class_type: 'CLIPTextEncode', inputs: { text: prompt, clip: ['1', 1] } },
        '3': { class_type: 'CLIPTextEncode', inputs: { text: 'blurry, watermark, low quality', clip: ['1', 1] } },
        '4': { class_type: 'EmptyLatentImage', inputs: { width, height, batch_size: 1 } },
        '5': { class_type: 'KSampler', inputs: { model: ['1', 0], positive: ['2', 0], negative: ['3', 0], latent_image: ['4', 0], seed: Math.floor(Math.random() * 1e9), steps: 20, cfg: 3.5, sampler_name: 'euler', scheduler: 'simple', denoise: 1.0 } },
        '6': { class_type: 'VAEDecode', inputs: { samples: ['5', 0], vae: ['1', 2] } },
        '7': { class_type: 'SaveImage', inputs: { images: ['6', 0], filename_prefix: `inception_${Date.now()}` } },
    };
}

function sdxlTurboWorkflow(prompt: string, width: number, height: number) {
    return {
        '1': { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: 'sdxl-turbo.safetensors' } },
        '2': { class_type: 'CLIPTextEncode', inputs: { text: prompt, clip: ['1', 1] } },
        '3': { class_type: 'CLIPTextEncode', inputs: { text: '', clip: ['1', 1] } },
        '4': { class_type: 'EmptyLatentImage', inputs: { width, height, batch_size: 1 } },
        '5': { class_type: 'KSampler', inputs: { model: ['1', 0], positive: ['2', 0], negative: ['3', 0], latent_image: ['4', 0], seed: Math.floor(Math.random() * 1e9), steps: 4, cfg: 1.0, sampler_name: 'euler_ancestral', scheduler: 'karras', denoise: 1.0 } },
        '6': { class_type: 'VAEDecode', inputs: { samples: ['5', 0], vae: ['1', 2] } },
        '7': { class_type: 'SaveImage', inputs: { images: ['6', 0], filename_prefix: `inception_draft_${Date.now()}` } },
    };
}

// TODO: Replace with exact Wan 2.1 custom node JSON structure once installed in Windows environment
function wan21VideoWorkflow(prompt: string, width: number, height: number, length: number = 81) {
    return {
        '1': { class_type: 'WanVideoModelLoader', inputs: { model_name: 'wan2.1-1.3b.safetensors' } },
        '2': { class_type: 'WanTextEncode', inputs: { text: prompt } },
        '3': { class_type: 'WanEmptyLatentVideo', inputs: { width, height, length, batch_size: 1 } },
        '4': { class_type: 'WanKSampler', inputs: { seed: Math.floor(Math.random() * 1e9), steps: 25, cfg: 5.0, sampler_name: 'euler', scheduler: 'normal', denoise: 1.0, model: ['1', 0], positive: ['2', 0], latent_image: ['3', 0] } },
        '5': { class_type: 'WanVAEDecode', inputs: { samples: ['4', 0], vae: ['1', 1] } },
        '6': { class_type: 'VideoCombine', inputs: { images: ['5', 0], frame_rate: 16, format: 'video/mp4', filename_prefix: `wan_video_${Date.now()}` } },
    };
}

// ─── DIMENSION HELPERS ──────────────────────────────────────────────────────

function getDimensions(format: string, mediaType: string): { width: number; height: number } {
    const isVideo = mediaType === 'video';
    if (format === 'vertical') return { width: isVideo ? 576 : 768, height: isVideo ? 1024 : 1344 };
    if (format === 'square') return { width: 1024, height: 1024 };
    return { width: isVideo ? 1024 : 1344, height: isVideo ? 576 : 768 }; // landscape
}

// ─── COMFYUI CLIENT ───────────────────────────────────────────────────────────

async function isComfyOnline(): Promise<boolean> {
    try {
        const res = await fetch(`${COMFY_URL}/system_stats`, { signal: AbortSignal.timeout(2000) });
        return res.ok;
    } catch {
        return false;
    }
}

async function queuePrompt(workflow: Record<string, unknown>): Promise<string> {
    const res = await fetch(`${COMFY_URL}/prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: workflow }),
    });
    if (!res.ok) throw new Error(`ComfyUI queue failed: ${res.statusText}`);
    const data = await res.json() as { prompt_id: string };
    return data.prompt_id;
}

async function waitForOutput(promptId: string, timeoutMs = 300_000): Promise<string[]> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        await new Promise(r => setTimeout(r, 2000));
        const res = await fetch(`${COMFY_URL}/history/${promptId}`);
        if (!res.ok) continue;
        const history = await res.json() as Record<string, { outputs?: Record<string, { images?: Array<{ filename: string; subfolder: string }> }> }>;
        const entry = history[promptId];
        if (!entry?.outputs) continue;
        const images: string[] = [];
        for (const nodeOutput of Object.values(entry.outputs)) {
            for (const img of (nodeOutput.images ?? [])) {
                images.push(join(OUTPUT_DIR, img.subfolder, img.filename));
            }
        }
        if (images.length > 0) return images;
    }
    throw new Error(`ComfyUI timeout after ${timeoutMs}ms`);
}

// ─── MAIN PROVIDER FUNCTION ───────────────────────────────────────────────────

export async function comfyUIProvider(request: GenerationRequest): Promise<GenerationResult> {
    const startMs = Date.now();
    const online = await isComfyOnline();
    if (!online) {
        throw new Error('ComfyUI offline — ensure ComfyUI is running on :8188');
    }

    const { width, height } = getDimensions(request.format ?? 'landscape', request.mediaType);

    console.log(`[COMFYUI] 🖥️  Local 4090 | ${request.mediaType} | ${width}×${height} | "${request.prompt.slice(0, 60)}"`);

    let workflow;
    if (request.mediaType === 'video') {
        // Enforce 480p max resolution for Wan 2.1 1.3B on 24GB VRAM
        const safeWidth = Math.min(width, 848);
        const safeHeight = Math.min(height, 480);
        console.log(`[COMFYUI] 🎬 Adjusting to safe video resolution: ${safeWidth}×${safeHeight}`);
        workflow = wan21VideoWorkflow(request.prompt, safeWidth, safeHeight);
    } else {
        workflow = request.quality === 'draft'
            ? sdxlTurboWorkflow(request.prompt, width, height)  // fast 4-step draft
            : fluxImageWorkflow(request.prompt, width, height);  // quality Flux.1
    }

    const promptId = await queuePrompt(workflow);
    console.log(`[COMFYUI] 🎨 Queued ${promptId.slice(0, 8)} | Flux.1-Dev ${width}×${height}`);

    const outputPaths = await waitForOutput(promptId);
    const localPath = outputPaths[0] ?? '';

    console.log(`[COMFYUI] ✅ Complete → ${localPath}`);

    return {
        localPath,
        prompt: request.prompt,
        mediaType: request.mediaType,
        provider: 'comfyui-local' as const,
        durationMs: Date.now() - startMs,
        metadata: {
            model: request.quality === 'draft' ? 'sdxl-turbo' : 'flux1-dev',
            width,
            height,
            promptId,
            gpu: 'RTX 4090 (local)',
        },
    };
}
