/**
 * packages/genmedia/src/index.ts
 * GenMedia Studio — Native v5 Provider Abstraction Layer
 * Pillar 2: GenMedia Studio v5
 *
 * Ports the v4 GenMedia Studio into the v5 monorepo.
 * Provides a unified MediaProvider interface across:
 *   - Google Vertex AI (Veo 2, Imagen 3, Lyria, Chirp)
 *   - FAL.ai (Wan 2.1, Kling, Flux Pro)
 *   - Stability AI (SDXL, SD3)
 *
 * The Infinite Canvas execution engine lives in engine/
 * The GenMedia studio app lives in apps/studio/
 */

import { z } from 'genkit';
import { ai } from '@inception/genkit';
import https from 'https';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { comfyUIProvider } from './comfyui-provider.js';

// ─────────────────────────────────────────────────────────────────────────────
// MEDIA PROVIDER INTERFACE
// ─────────────────────────────────────────────────────────────────────────────

export const MediaProviderEnum = z.enum([
    'veo2',
    'imagen3',
    'wan21',
    'kling',
    'flux-pro',
    'flux-schnell',
    'sdxl',
    'lyria',
    'comfyui-local',   // Local RTX 4090 — sovereignty layer
]);
export type MediaProvider = z.infer<typeof MediaProviderEnum>;

export const MediaTypeEnum = z.enum(['image', 'video', 'audio', '3d']);
export type MediaType = z.infer<typeof MediaTypeEnum>;

export const GenerationRequestSchema = z.object({
    prompt: z.string(),
    negativePrompt: z.string().optional(),
    provider: MediaProviderEnum.optional().describe('Override auto-routing'),
    mediaType: MediaTypeEnum,
    format: z.enum(['vertical', 'landscape', 'square']).default('landscape'),
    quality: z.enum(['draft', 'standard', 'ultra']).default('standard'),
    durationSeconds: z.number().optional().describe('For video generation'),
    outputDir: z.string().default(`d:\\Google Creative Liberation Engine\\tmp_genai\\genmedia`),
    sessionId: z.string().optional(),
});

export const GenerationResultSchema = z.object({
    provider: MediaProviderEnum,
    mediaType: MediaTypeEnum,
    localPath: z.string(),
    prompt: z.string(),
    durationMs: z.number(),
    metadata: z.record(z.any()).default({}),
});

export type GenerationRequest = z.infer<typeof GenerationRequestSchema>;
export type GenerationResult = z.infer<typeof GenerationResultSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// PROVIDER ROUTING — intelligent auto-selection
// ─────────────────────────────────────────────────────────────────────────────

function selectProvider(req: GenerationRequest): MediaProvider {
    if (req.provider) return req.provider;

    // Offline/sovereign mode — force local 4090
    if (process.env.OFFLINE_MODE === 'true') return 'comfyui-local';

    if (req.mediaType === 'video') {
        return process.env.GOOGLE_CLOUD_PROJECT ? 'veo2' : 'wan21';
    }
    if (req.mediaType === 'audio') {
        return 'lyria';
    }
    // Image: Vertex Imagen3 → FAL Flux Pro → Local ComfyUI
    if (process.env.GOOGLE_CLOUD_PROJECT) return 'imagen3';
    if (process.env.FAL_API_KEY) return 'flux-pro';
    return 'comfyui-local'; // sovereign fallback — 4090 always available
}

function getDimensions(format: string, mediaType: MediaType): { width: number; height: number } {
    if (mediaType === 'video') {
        return format === 'vertical' ? { width: 720, height: 1280 }
            : format === 'square' ? { width: 720, height: 720 }
                : { width: 1280, height: 720 };
    }
    return format === 'vertical' ? { width: 1080, height: 1920 }
        : format === 'square' ? { width: 1080, height: 1080 }
            : { width: 1920, height: 1080 };
}

// ─────────────────────────────────────────────────────────────────────────────
// FAL.ai EXECUTOR
// ─────────────────────────────────────────────────────────────────────────────

async function generateViaFal(req: GenerationRequest, provider: MediaProvider, dims: { width: number; height: number }): Promise<string> {
    const FAL_KEY = process.env.FAL_API_KEY;
    if (!FAL_KEY) throw new Error('FAL_API_KEY not set');

    const endpointMap: Record<string, string> = {
        'wan21': 'fal-ai/wan/t2v/1.3b',
        'kling': 'fal-ai/kling-video/v1.6/standard/text-to-video',
        'flux-pro': 'fal-ai/flux-pro/v1.1',
        'flux-schnell': 'fal-ai/flux/schnell',
    };

    const endpoint = endpointMap[provider];
    if (!endpoint) throw new Error(`No FAL endpoint for provider: ${provider}`);

    const body = JSON.stringify({
        prompt: req.prompt,
        negative_prompt: req.negativePrompt,
        image_size: { width: dims.width, height: dims.height },
        ...(req.durationSeconds ? { duration: req.durationSeconds } : {}),
        num_inference_steps: req.quality === 'ultra' ? 40 : req.quality === 'standard' ? 28 : 12,
    });

    // Submit job
    const submitRes: any = await new Promise((resolve, reject) => {
        const postReq = https.request({
            hostname: 'queue.fal.run',
            path: `/${endpoint}`,
            method: 'POST',
            headers: { 'Authorization': `Key ${FAL_KEY}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
        }, (res) => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => resolve(JSON.parse(d)));
        });
        postReq.on('error', reject);
        postReq.write(body);
        postReq.end();
    });

    // Poll for completion
    const requestId = submitRes.request_id;
    let attempts = 0;
    while (attempts < 60) {
        await new Promise(r => setTimeout(r, 3000));
        const statusRes: any = await new Promise((resolve, reject) => {
            https.get(`https://queue.fal.run/${endpoint}/requests/${requestId}/status`, {
                headers: { 'Authorization': `Key ${FAL_KEY}` }
            }, (res) => {
                let d = '';
                res.on('data', c => d += c);
                res.on('end', () => resolve(JSON.parse(d)));
            }).on('error', reject);
        });

        if (statusRes.status === 'COMPLETED') {
            const outputUrl = statusRes.response?.images?.[0]?.url || statusRes.response?.video?.url;
            if (!outputUrl) throw new Error('No output URL in FAL response');

            // Download the file
            fs.mkdirSync(req.outputDir, { recursive: true });
            const ext = req.mediaType === 'video' ? 'mp4' : 'png';
            const localPath = path.join(req.outputDir, `${req.sessionId || Date.now()}_${provider}.${ext}`);
            await downloadFile(outputUrl, localPath);
            return localPath;
        }
        if (statusRes.status === 'FAILED') throw new Error(`FAL job failed: ${JSON.stringify(statusRes)}`);
        attempts++;
    }
    throw new Error('FAL job timed out after 3 minutes');
}

async function downloadFile(url: string, dest: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (res) => {
            res.pipe(file);
            file.on('finish', () => { file.close(); resolve(); });
        }).on('error', (e) => { fs.unlink(dest, () => { }); reject(e); });
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN GENKIT FLOW
// ─────────────────────────────────────────────────────────────────────────────

export const GenMediaFlow = ai.defineFlow(
    {
        name: 'GenMedia',
        inputSchema: GenerationRequestSchema,
        outputSchema: GenerationResultSchema,
    },
    async (input: GenerationRequest): Promise<GenerationResult> => {
        const startMs = Date.now();
        const sessionId = input.sessionId ?? `genmedia_${Date.now()}`;
        const provider = selectProvider(input);
        const dims = getDimensions(input.format, input.mediaType);

        console.log(`[GENMEDIA] 🎨 ${input.mediaType.toUpperCase()} via ${provider} | ${dims.width}×${dims.height}`);
        console.log(`[GENMEDIA] Prompt: "${input.prompt.slice(0, 80)}..."`);

        let localPath: string;

        // ── Provider chain: Vertex → FAL → Local 4090 ──────────────────────
        const tryWithFallbacks = async (): Promise<string> => {
            // Tier 1: Vertex AI (Imagen3 / Veo2)
            if (provider === 'imagen3') {
                try {
                    const { media } = await ai.generate({
                        model: 'googleai/imagen-3.0-generate-002',
                        prompt: input.prompt,
                        output: { format: 'media' },
                        config: { temperature: 1.0 },
                    });
                    fs.mkdirSync(input.outputDir, { recursive: true });
                    const p = path.join(input.outputDir, `${sessionId}_imagen3.png`);
                    if (media?.url) { await downloadFile(media.url, p); return p; }
                } catch (err) {
                    console.warn(`[GENMEDIA] ⚠️ Imagen3 failed: ${String(err).slice(0, 80)} — trying FAL`);
                }
                // Fallthrough to FAL
                const falPath = await generateViaFal({ ...input, sessionId }, 'flux-pro', dims).catch(() => null);
                if (falPath) return falPath;
                // Fallthrough to local
                console.warn('[GENMEDIA] ⚠️ FAL failed — routing to local RTX 4090');
                const result = await comfyUIProvider({ ...input, sessionId });
                return result.localPath;
            }

            // Tier 2: FAL.ai
            if (['wan21', 'kling', 'flux-pro', 'flux-schnell'].includes(provider)) {
                try {
                    return await generateViaFal({ ...input, sessionId }, provider, dims);
                } catch (err) {
                    console.warn(`[GENMEDIA] ⚠️ FAL (${provider}) failed: ${String(err).slice(0, 80)} — routing to local 4090`);
                    const result = await comfyUIProvider({ ...input, sessionId });
                    return result.localPath;
                }
            }

            // Tier 3: Local ComfyUI — RTX 4090 sovereignty layer
            if (provider === 'comfyui-local') {
                const result = await comfyUIProvider({ ...input, sessionId });
                return result.localPath;
            }

            throw new Error(`Unknown provider: ${provider}`);
        };

        localPath = await tryWithFallbacks();

        console.log(`[GENMEDIA] ✅ Generated: ${localPath} (${Date.now() - startMs}ms)`);

        return {
            provider,
            mediaType: input.mediaType,
            localPath,
            prompt: input.prompt,
            durationMs: Date.now() - startMs,
            metadata: { format: input.format, quality: input.quality, dims },
        };
    }
);

// Batch generation flow
export const GenMediaBatchFlow = ai.defineFlow(
    {
        name: 'GenMediaBatch',
        inputSchema: z.object({ requests: z.array(GenerationRequestSchema) }),
        outputSchema: z.array(GenerationResultSchema),
    },
    async ({ requests }: { requests: GenerationRequest[] }) => {
        console.log(`[GENMEDIA] Batch: ${requests.length} assets in parallel`);
        const results = await Promise.allSettled(requests.map((r: GenerationRequest) => GenMediaFlow(r)));
        return results
            .filter((r): r is PromiseFulfilledResult<GenerationResult> => r.status === 'fulfilled')
            .map((r: PromiseFulfilledResult<GenerationResult>) => r.value);
    }
);
