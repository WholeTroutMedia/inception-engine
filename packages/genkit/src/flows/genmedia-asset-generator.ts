/**
 * GenMedia Asset Generator — Tier 1: Generative Layer
 *
 * Generates AI creative assets (video B-roll, image stills) from a style/mood
 * prompt. Acts as Branch 2 of the OmniMediaOrchestrator.
 *
 * Provider routing (priority order):
 *   Video: Veo (Google) → Wan (FAL.ai) → skip
 *   Image: Imagen 3 (Vertex AI) → Flux Pro (FAL.ai) → skip
 *
 * All outputs are saved to d:\Google Creative Liberation Engine\tmp_genai\{sessionId}\
 */

import { z } from 'genkit';
import { ai } from '../index.js';
import { FalAi } from '../plugins/fal-ai.js';
import { extractFoleyBrief, type FoleyBrief } from './foley-brief.js';
import path from 'path';
import fs from 'fs';

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

export const GenMediaInputSchema = z.object({
    style: z.string().describe("Visual style directive: 'cyberpunk', 'documentary', 'golden-hour', 'neon-noir', etc."),
    mood: z.string().describe("Emotional/pacing tone: 'aggressive', 'cinematic', 'euphoric', 'chaotic-fast'"),
    format: z.enum(['vertical', 'landscape', 'square']).describe('Aspect ratio format'),
    targetDurationSeconds: z.number().describe('Target video duration (drives how many B-roll clips to generate)'),
    sessionId: z.string().describe('Unique session ID for file output organization'),
    numBrollClips: z.number().default(3).describe('Number of AI video B-roll clips to generate'),
    numStills: z.number().default(2).describe('Number of AI title background stills to generate'),
});

export const GenMediaOutputSchema = z.object({
    brollPaths:  z.array(z.string()).describe('Local file paths to generated video B-roll clips'),
    stillPaths:  z.array(z.string()).describe('Local file paths to generated image stills'),
    providerUsed: z.object({
        video: z.string(),
        image: z.string(),
    }),
    warnings: z.array(z.string()),
    // ── Helix G: Foley Intelligence ─────────────────────────────────────────
    foleyBriefs: z.array(z.object({
        title:          z.string(),
        mood:           z.string(),
        genre:          z.string(),
        bpm:            z.number().optional(),
        durationSec:    z.number(),
        instruments:    z.array(z.string()),
        includeAmbient: z.boolean(),
    })).describe('Audio intent briefs extracted in parallel with visual generation — one per B-roll clip'),
});

export type GenMediaInput = z.infer<typeof GenMediaInputSchema>;
export type GenMediaOutput = z.infer<typeof GenMediaOutputSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// PROMPT BUILDERS
// ─────────────────────────────────────────────────────────────────────────────

function buildVideoPrompt(style: string, mood: string, format: string, index: number): string {
    const formatNote = format === 'vertical' ? '9:16 vertical, portrait orientation' : '16:9 cinematic widescreen';
    const motionStyles = [
        'slow push in, shallow depth of field',
        'dynamic whip pan with motion blur',
        'handheld cinéma vérité push',
        'smooth dolly through the scene',
        'aerial bird\'s eye dive',
    ];
    const motion = motionStyles[index % motionStyles.length];

    return `${style} aesthetic ${mood} atmosphere. ${motion}. ${formatNote}. `
        + `Professional cinematography, dramatic lighting, no text, no UI overlays. `
        + `Suitable as seamless video B-roll overlay for a music video or event promo. `
        + `Loop-friendly. High contrast. Cinematic grade.`;
}

function buildStillPrompt(style: string, mood: string, format: string, index: number): string {
    const formatNote = format === 'vertical'
        ? '1080x1920 portrait, vertical composition'
        : '1920x1080 landscape, widescreen composition';

    return `${style} ${mood} abstract background art. ${formatNote}. `
        + `Suitable as a video title card background. No faces, no text, no logos. `
        + `Dark with dramatic lighting. Highly detailed. Photorealistic or stylized abstract.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// VEO VIDEO GENERATION (Google Vertex AI)
// ─────────────────────────────────────────────────────────────────────────────

async function generateViaVeo(prompt: string, sessionId: string): Promise<string | null> {
    // Veo 2 API is available via Vertex AI — uses different auth than Genkit Gemini plugin.
    // When available, we generate via the REST endpoint and download the result.
    // For now: check for project config and attempt generation.
    const projectId = process.env.GOOGLE_CLOUD_PROJECT;
    const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';

    if (!projectId) {
        console.log('[GENMEDIA] Veo: GOOGLE_CLOUD_PROJECT not set, skipping');
        return null;
    }

    console.log('[GENMEDIA] Attempting Veo 2 generation...');

    try {
        // Veo 2 via Vertex AI media generation endpoint
        const { execSync } = await import('child_process');
        const outputDir = `d:\\Google Creative Liberation Engine\\tmp_genai\\${sessionId}`;
        fs.mkdirSync(outputDir, { recursive: true });

        // Use gcloud CLI as bridge since Veo SDK is still in preview
        const requestBody = JSON.stringify({
            instances: [{ prompt }],
            parameters: {
                storageUri: `gs://${process.env.GCS_BUCKET || 'omnimedia-staging'}/${sessionId}/`,
                duration: '4s',
                aspectRatio: '16:9',
                sampleCount: 1,
            }
        });

        const tmpRequest = path.join(outputDir, 'veo_request.json');
        fs.writeFileSync(tmpRequest, requestBody);

        console.log('[GENMEDIA] ⚠️  Veo 2 requires Vertex AI SDK / GCS bucket setup.');
        console.log('[GENMEDIA]    Falling through to Wan (FAL.ai)...');
        return null; // Fall through to FAL until Veo is fully provisioned

    } catch (e) {
        console.log(`[GENMEDIA] Veo generation failed: ${e}. Falling to Wan...`);
        return null;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// IMAGEN STILL GENERATION (Google Vertex AI)
// ─────────────────────────────────────────────────────────────────────────────

async function generateViaImagen(prompt: string, sessionId: string, index: number): Promise<string | null> {
    // Imagen 3 via Vertex AI
    const projectId = process.env.GOOGLE_CLOUD_PROJECT;
    if (!projectId) return null;

    try {
        // Attempt using @google-cloud/aiplatform if available
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore — @google-cloud/aiplatform is optional (Vertex AI path); falls back to FAL if missing
        let PredictionServiceClient: any;
        try {
            const aiplatform = await import('@google-cloud/aiplatform');
            PredictionServiceClient = aiplatform.PredictionServiceClient;
        } catch {
            PredictionServiceClient = null;
        }

        if (!PredictionServiceClient) {
            console.log('[GENMEDIA] @google-cloud/aiplatform not installed, skipping Imagen');
            return null;
        }

        console.log('[GENMEDIA] Attempting Imagen 3 generation...');
        // Full Imagen 3 implementation would go here via PredictionServiceClient
        // Falling through for now
        console.log('[GENMEDIA] ⚠️  Imagen 3 not fully provisioned, falling to Flux...');
        return null;
    } catch {
        return null;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN GENKIT FLOW
// ─────────────────────────────────────────────────────────────────────────────

export const GenMediaAssetGeneratorFlow = ai.defineFlow(
    {
        name: 'GenMediaAssetGenerator',
        inputSchema: GenMediaInputSchema,
        outputSchema: GenMediaOutputSchema,
    },
    async (input: GenMediaInput): Promise<GenMediaOutput> => {
        const { style, mood, format, sessionId, numBrollClips, numStills } = input;
        const warnings: string[] = [];
        const brollPaths: string[] = [];
        const stillPaths: string[] = [];
        const foleyBriefs: FoleyBrief[] = [];
        const providerUsed = { video: 'none', image: 'none' };

        const aspectRatio = format === 'vertical' ? '9:16'
            : format === 'square' ? '1:1' : '16:9';

        console.log(`[GENMEDIA] Branch 2 initialized — ${numBrollClips} B-roll clips, ${numStills} stills`);
        console.log(`[GENMEDIA] Style: ${style} | Mood: ${mood} | Format: ${format}`);
        console.log(`[GENMEDIA] 🎵 Foley Intelligence: extracting audio intent in parallel with each visual`);

        // ── Video B-roll Generation ─────────────────────────────────────────
        for (let i = 0; i < numBrollClips; i++) {
            const prompt = buildVideoPrompt(style, mood, format, i);

            // Run visual generation and foley brief extraction in parallel (Helix G)
            const [videoResult, foleyBrief] = await Promise.all([
                (async () => {
                    // Try Veo first
                    let vp = await generateViaVeo(prompt, sessionId);
                    if (!vp && FalAi.isAvailable()) {
                        try {
                            const result = await FalAi.generateVideo({
                                prompt,
                                model: 'wan-t2v',
                                aspectRatio: aspectRatio as '9:16' | '16:9' | '1:1',
                                durationSeconds: 4,
                            }, sessionId);
                            vp = result.localPath ?? null;
                            providerUsed.video = 'wan-t2v (FAL)';
                        } catch (e) {
                            warnings.push(`B-roll clip ${i + 1} generation failed: ${e}`);
                        }
                    } else if (!vp) {
                        warnings.push('FAL_API_KEY not set — video generation skipped');
                    } else {
                        providerUsed.video = 'veo-2 (Google)';
                    }
                    return vp;
                })(),
                extractFoleyBrief(style, mood, format, 4 /* 4s clip */, `Clip ${i + 1}: ${prompt.slice(0, 80)}`),
            ]);

            if (videoResult) brollPaths.push(videoResult);
            if (foleyBrief) foleyBriefs.push(foleyBrief);
        }

        // ── Still Image Generation ──────────────────────────────────────────
        for (let i = 0; i < numStills; i++) {
            const prompt = buildStillPrompt(style, mood, format, i);

            // Try Imagen first
            let imagePath = await generateViaImagen(prompt, sessionId, i);

            // Fallback: Flux via FAL.ai
            if (!imagePath) {
                if (FalAi.isAvailable()) {
                    try {
                        const [w, h] = format === 'vertical' ? [1080, 1920]
                            : format === 'square' ? [1024, 1024] : [1920, 1080];
                        const result = await FalAi.generateImage({
                            prompt,
                            model: 'flux-pro',
                            width: w,
                            height: h,
                            outputFormat: 'jpeg',
                        }, sessionId);
                        imagePath = result.localPath ?? null;
                        providerUsed.image = 'flux-pro (FAL)';
                    } catch (e) {
                        warnings.push(`Still ${i + 1} generation failed: ${e}`);
                        console.warn(`[GENMEDIA] Still ${i + 1} failed:`, e);
                    }
                } else {
                    warnings.push('FAL_API_KEY not set — image generation skipped');
                    break;
                }
            } else {
                providerUsed.image = 'imagen-3 (Google)';
            }

            if (imagePath) stillPaths.push(imagePath);
        }

        console.log(`[GENMEDIA] ✅ Branch 2 complete: ${brollPaths.length} B-roll, ${stillPaths.length} stills, ${foleyBriefs.length} foley briefs`);
        if (warnings.length) console.warn('[GENMEDIA] Warnings:', warnings);

        return { brollPaths, stillPaths, providerUsed, warnings, foleyBriefs };
    }
);
