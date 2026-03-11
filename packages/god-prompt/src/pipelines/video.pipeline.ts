import axios from 'axios';
import { z } from 'zod';

// ─── GOD PROMPT — Unified Brand Video Pipeline ────────────────────────────────
// Routes video generation across:
//   - Google Veo 2 via Vertex AI (premium, 1080p, 8s clips)
//   - FAL.ai Kling 1.6 (standard, 5-10s, image-to-video)
//   - FAL.ai AnimateDiff (draft, fast motion-from-image)

const ENV_VID = globalThis as unknown as { process?: { env?: Record<string, string | undefined> } };
const getEnv = (k: string) => ENV_VID.process?.env?.[k];

const FAL_BASE = 'https://fal.run';
const VERTEX_BASE = 'https://us-central1-aiplatform.googleapis.com/v1';

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const TextToVideoSchema = z.object({
    prompt: z.string().describe('Video description. Be specific about motion, camera, mood.'),
    negative_prompt: z.string().default('blurry, low quality, watermark, text overlay, distorted, shaky camera, amateur'),
    duration_seconds: z.number().min(2).max(30).default(8),
    aspect_ratio: z.enum(['16:9', '9:16', '1:1', '4:3']).default('16:9'),
    quality_tier: z.enum(['draft', 'standard', 'premium']).default('standard'),
    seed: z.number().optional(),
    brand_name: z.string().optional(),
    style: z.enum(['cinematic', 'commercial', 'documentary', 'social', 'product']).optional(),
});

export const ImageToVideoSchema = z.object({
    image_url: z.string().url().describe('Reference image to animate'),
    prompt: z.string().describe('Motion and animation direction'),
    duration_seconds: z.number().min(3).max(10).default(5),
    quality_tier: z.enum(['draft', 'standard', 'premium']).default('standard'),
    motion_strength: z.number().min(0).max(1).default(0.7).describe('How much to animate (0=still, 1=max motion)'),
});

export const BrandVideoShortsSchema = z.object({
    brand_name: z.string(),
    concept: z.string().describe('Campaign concept or product message'),
    formats: z.array(z.enum(['reel_vertical', 'story_vertical', 'landscape_ad', 'square_social'])).default(['reel_vertical', 'landscape_ad']),
    quality_tier: z.enum(['draft', 'standard', 'premium']).default('standard'),
});

export const VideoUpscaleSchema = z.object({
    video_url: z.string().url().describe('URL of video to upscale'),
    target_resolution: z.enum(['720p', '1080p', '4k']).default('1080p'),
});

// ─── Style injection ───────────────────────────────────────────────────────────

const VIDEO_STYLES: Record<string, string> = {
    cinematic: 'cinematic camera work, shallow depth of field, film grain, dramatic lighting, anamorphic lens flare',
    commercial: 'upbeat commercial style, bright professional lighting, smooth camera movement, high energy',
    documentary: 'documentary style, natural lighting, handheld camera, authentic movement',
    social: 'vertical social media style, dynamic cuts, vibrant colors, punchy energy',
    product: 'studio quality, clean background, 360-degree product reveal, premium commercial grade',
};

const FORMAT_RATIOS: Record<string, string> = {
    reel_vertical: '9:16',
    story_vertical: '9:16',
    landscape_ad: '16:9',
    square_social: '1:1',
};

function buildVideoPrompt(prompt: string, brand?: string, style?: string): string {
    const parts = [prompt];
    if (style && VIDEO_STYLES[style]) parts.push(VIDEO_STYLES[style]);
    if (brand) parts.push(`premium brand aesthetic for ${brand}`);
    return parts.join(', ');
}

// ─── Provider: FAL.ai polling helper ─────────────────────────────────────────

interface FalQueueResult {
    request_id: string;
    status?: string;
    output?: { video?: { url: string; content_type: string }; seed?: number };
}

async function falSubmit(model: string, payload: Record<string, unknown>): Promise<string> {
    const key = getEnv('FAL_API_KEY');
    if (!key) throw new Error('FAL_API_KEY not configured');
    const res = await axios.post<FalQueueResult>(
        `${FAL_BASE}/${model}`,
        payload,
        { headers: { Authorization: `Key ${key}`, 'Content-Type': 'application/json' } }
    );
    // Synchronous response with video URL
    if (res.data.output?.video?.url) return res.data.output.video.url;
    // Queue mode — poll
    const requestId = res.data.request_id;
    if (!requestId) throw new Error('FAL returned neither video URL nor request_id');
    return pollFalQueue(model, requestId, key);
}

async function pollFalQueue(model: string, requestId: string, key: string, maxMs = 300_000): Promise<string> {
    const started = Date.now();
    while (Date.now() - started < maxMs) {
        await new Promise(r => setTimeout(r, 6000));
        const res = await axios.get<FalQueueResult>(
            `${FAL_BASE}/${model}/requests/${requestId}/status`,
            { headers: { Authorization: `Key ${key}` } }
        );
        console.log(`[GOD PROMPT/VIDEO] FAL ${model} status: ${res.data.status}`);
        if (res.data.output?.video?.url) return res.data.output.video.url;
        if (res.data.status === 'FAILED') throw new Error(`FAL video generation failed: ${JSON.stringify(res.data)}`);
    }
    throw new Error(`FAL video timed out after ${maxMs / 1000}s`);
}

// ─── Provider: Google Veo 2 (Vertex AI) ──────────────────────────────────────

async function generateWithVeo2(params: {
    prompt: string;
    negative_prompt: string;
    duration_seconds: number;
    aspect_ratio: string;
}): Promise<string> {
    const projectId = getEnv('GCP_PROJECT_ID');
    const location = getEnv('VERTEX_LOCATION') ?? 'us-central1';
    const accessToken = getEnv('GOOGLE_ACCESS_TOKEN');
    if (!projectId || !accessToken) throw new Error('GCP_PROJECT_ID and GOOGLE_ACCESS_TOKEN required for Veo 2');

    const endpoint = `${VERTEX_BASE}/projects/${projectId}/locations/${location}/publishers/google/models/veo-2.0-generate-001:predictLongRunning`;

    const res = await axios.post<{ name: string }>(
        endpoint,
        {
            instances: [{
                prompt: params.prompt,
                negativePrompt: params.negative_prompt,
                durationSeconds: params.duration_seconds,
                aspectRatio: params.aspect_ratio,
                sampleCount: 1,
            }],
            parameters: { storageUri: `gs://${getEnv('GCP_BUCKET_NAME') ?? projectId + '-video-output'}` },
        },
        { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
    );

    const operationName = res.data.name;
    console.log(`[GOD PROMPT/VIDEO] Veo 2 operation: ${operationName}`);
    return pollVertexOperation(operationName, accessToken);
}

async function pollVertexOperation(operationName: string, accessToken: string, maxMs = 600_000): Promise<string> {
    const baseUrl = 'https://us-central1-aiplatform.googleapis.com/v1';
    const started = Date.now();
    while (Date.now() - started < maxMs) {
        await new Promise(r => setTimeout(r, 12000));
        const res = await axios.get<{
            done?: boolean;
            response?: { predictions?: Array<{ gcsUri?: string; mimeType?: string }> };
            error?: { message: string };
        }>(
            `${baseUrl}/${operationName}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (res.data.error) throw new Error(`Veo 2 error: ${res.data.error.message}`);
        if (res.data.done && res.data.response?.predictions?.[0]?.gcsUri) {
            return res.data.response.predictions[0].gcsUri;
        }
        console.log(`[GOD PROMPT/VIDEO] Veo 2 polling...`);
    }
    throw new Error('Veo 2 timed out');
}

// ─── Unified handlers ─────────────────────────────────────────────────────────

export async function generateVideo(input: z.infer<typeof TextToVideoSchema>) {
    const v = TextToVideoSchema.parse(input);
    const prompt = buildVideoPrompt(v.prompt, v.brand_name, v.style);
    console.log(`[GOD PROMPT/VIDEO] 🎬 [${v.quality_tier}] Text-to-Video: "${prompt.slice(0, 60)}..."`);

    let video_url: string;
    let provider: string;

    if (v.quality_tier === 'premium') {
        try {
            video_url = await generateWithVeo2({ prompt, negative_prompt: v.negative_prompt, duration_seconds: v.duration_seconds, aspect_ratio: v.aspect_ratio });
            provider = 'Veo 2 (Vertex AI)';
        } catch {
            console.warn('[GOD PROMPT/VIDEO] Veo 2 unavailable — falling back to Kling 1.6');
            video_url = await falSubmit('fal-ai/kling-video/v1.6/pro/text-to-video', {
                prompt, negative_prompt: v.negative_prompt, duration: `${v.duration_seconds}s`, aspect_ratio: v.aspect_ratio,
            });
            provider = 'Kling 1.6 Pro (FAL.ai) [fallback]';
        }
    } else if (v.quality_tier === 'standard') {
        video_url = await falSubmit('fal-ai/kling-video/v1.6/pro/text-to-video', {
            prompt, negative_prompt: v.negative_prompt, duration: `${v.duration_seconds}s`, aspect_ratio: v.aspect_ratio, seed: v.seed,
        });
        provider = 'Kling 1.6 Pro (FAL.ai)';
    } else {
        video_url = await falSubmit('fal-ai/animatediff-v2v', {
            prompt, negative_prompt: v.negative_prompt, num_frames: Math.min(v.duration_seconds * 8, 64), seed: v.seed,
        });
        provider = 'AnimateDiff V2V (FAL.ai)';
    }

    return { video_url, provider, prompt_used: prompt, duration: v.duration_seconds, aspect_ratio: v.aspect_ratio, quality_tier: v.quality_tier };
}

export async function animateImage(input: z.infer<typeof ImageToVideoSchema>) {
    const v = ImageToVideoSchema.parse(input);
    console.log(`[GOD PROMPT/VIDEO] 🖼→🎬 Image-to-Video: "${v.prompt.slice(0, 50)}..."`);

    let video_url: string;
    let provider: string;

    if (v.quality_tier === 'premium' || v.quality_tier === 'standard') {
        video_url = await falSubmit('fal-ai/kling-video/v1.6/pro/image-to-video', {
            prompt: v.prompt, image_url: v.image_url, duration: `${v.duration_seconds}s`, motion_strength: v.motion_strength,
        });
        provider = v.quality_tier === 'premium' ? 'Kling 1.6 Pro (FAL.ai)' : 'Kling 1.6 (FAL.ai)';
    } else {
        video_url = await falSubmit('fal-ai/stable-video', {
            image_url: v.image_url, motion_bucket_id: Math.round(v.motion_strength * 255),
        });
        provider = 'Stable Video Diffusion (FAL.ai)';
    }

    return { video_url, provider, source_image: v.image_url, duration: v.duration_seconds };
}

export async function generateBrandVideoShorts(input: z.infer<typeof BrandVideoShortsSchema>) {
    const v = BrandVideoShortsSchema.parse(input);
    console.log(`[GOD PROMPT/VIDEO] 🚀 Brand video shorts for "${v.brand_name}" — ${v.formats.length} formats`);

    type VideoShortResult = Awaited<ReturnType<typeof generateVideo>> & { format: string };

    const results = await Promise.allSettled(
        v.formats.map(fmt =>
            generateVideo({
                prompt: v.concept,
                brand_name: v.brand_name,
                style: 'commercial',
                aspect_ratio: FORMAT_RATIOS[fmt] as z.infer<typeof TextToVideoSchema>['aspect_ratio'],
                quality_tier: v.quality_tier,
                duration_seconds: fmt.includes('vertical') ? 15 : 30,
                negative_prompt: 'blurry, low quality, watermark, text overlay, distorted, shaky camera, amateur',
            }).then(r => ({ ...r, format: fmt } as VideoShortResult))
        )
    );

    const succeeded = results
        .filter((r): r is PromiseFulfilledResult<VideoShortResult> => r.status === 'fulfilled')
        .map(r => r.value);


    return {
        brand: v.brand_name,
        concept: v.concept,
        generated: succeeded.length,
        failed: results.filter(r => r.status === 'rejected').length,
        videos: succeeded,
    };
}

// ─── MCP Tool Registration ────────────────────────────────────────────────────

export const VIDEO_PIPELINE_TOOLS = [
    {
        name: 'godprompt_text_to_video',
        description: 'Generate a video from a text prompt. Uses Veo 2 (premium), Kling 1.6 Pro (standard), or AnimateDiff (draft).',
        inputSchema: TextToVideoSchema,
        handler: generateVideo,
        agentPermissions: ['GOD_PROMPT', 'NOVA', 'ORACLE'],
        estimatedCost: 'draft: $0.01 | standard: $0.15 | premium: $0.50+',
    },
    {
        name: 'godprompt_image_to_video',
        description: 'Animate a reference image into a short video clip using Kling or Stable Video Diffusion.',
        inputSchema: ImageToVideoSchema,
        handler: animateImage,
        agentPermissions: ['GOD_PROMPT', 'NOVA'],
        estimatedCost: '$0.05–0.25/clip',
    },
    {
        name: 'godprompt_brand_video_shorts',
        description: 'Generate a complete set of brand video shorts across formats (reels, stories, ads) in parallel.',
        inputSchema: BrandVideoShortsSchema,
        handler: generateBrandVideoShorts,
        agentPermissions: ['GOD_PROMPT', 'NOVA'],
        estimatedCost: '$0.15 × number of formats',
    },
];
