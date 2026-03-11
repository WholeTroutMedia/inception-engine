import axios from 'axios';
import { z } from 'zod';

// ─── THE PLUG — FAL.ai MCP Adapter ───────────────────────────────────────────
// Exposes FAL.ai's media generation APIs as Creative Liberation Engine MCP tools.
// Agents: NOVA (images), VECTOR (video), RELAY (media routing)

const FAL_BASE = 'https://fal.run';

const FalImageInputSchema = z.object({
    prompt: z.string().describe('Image generation prompt'),
    model: z.enum(['fal-ai/flux/schnell', 'fal-ai/flux/dev', 'fal-ai/stable-diffusion-v3-medium', 'fal-ai/aura-flow'])
        .default('fal-ai/flux/dev')
        .describe('FAL model to use'),
    width: z.number().min(256).max(2048).default(1024),
    height: z.number().min(256).max(2048).default(1024),
    num_images: z.number().min(1).max(4).default(1),
    seed: z.number().optional(),
    guidance_scale: z.number().default(7.5),
    style_preset: z.string().optional(),
});

const FalVideoInputSchema = z.object({
    prompt: z.string().describe('Video generation prompt'),
    model: z.enum(['fal-ai/kling-video/v1.5/pro/image-to-video', 'fal-ai/minimax-video', 'fal-ai/hunyuan-video'])
        .default('fal-ai/hunyuan-video'),
    image_url: z.string().url().optional().describe('Starting image for image-to-video'),
    duration: z.number().min(2).max(10).default(5).describe('Video duration in seconds'),
    aspect_ratio: z.enum(['16:9', '9:16', '1:1']).default('16:9'),
});

const FalUpscaleInputSchema = z.object({
    image_url: z.string().url().describe('URL of image to upscale'),
    scale: z.number().min(2).max(8).default(4).describe('Upscale factor'),
    face_enhance: z.boolean().default(false),
});

const FalRemoveBackgroundSchema = z.object({
    image_url: z.string().url().describe('URL of image for background removal'),
    return_mask: z.boolean().default(false),
});

async function falRequest<T>(model: string, input: Record<string, unknown>): Promise<T> {
    const apiKey = process.env.FAL_API_KEY;
    if (!apiKey) throw new Error('FAL_API_KEY not configured');

    const response = await axios.post<T>(
        `${FAL_BASE}/${model}`,
        { input },
        {
            headers: {
                'Authorization': `Key ${apiKey}`,
                'Content-Type': 'application/json',
            },
            timeout: 120_000,
        }
    );
    return response.data;
}

interface FalImageResult {
    images: Array<{ url: string; width: number; height: number; content_type: string }>;
    seed: number;
    prompt: string;
}

interface FalVideoResult {
    video: { url: string; content_type: string };
}

// ─── MCP Tool Handlers ────────────────────────────────────────────────────────

export async function generateImage(input: z.infer<typeof FalImageInputSchema>) {
    const validated = FalImageInputSchema.parse(input);
    const { model, ...params } = validated;

    console.log(`[PLUG/FAL] 🎨 Generating image with ${model}: "${params.prompt.slice(0, 60)}..."`);
    const result = await falRequest<FalImageResult>(model, params);

    return {
        images: result.images,
        seed: result.seed,
        model,
        cost_estimate: `$${(0.003 * params.num_images).toFixed(4)}`,
    };
}

export async function generateVideo(input: z.infer<typeof FalVideoInputSchema>) {
    const validated = FalVideoInputSchema.parse(input);
    const { model, ...params } = validated;

    console.log(`[PLUG/FAL] 🎬 Generating video with ${model}: "${params.prompt.slice(0, 60)}..."`);
    const result = await falRequest<FalVideoResult>(model, params);

    return {
        video_url: result.video.url,
        model,
        duration: params.duration,
        cost_estimate: `$${(0.10 * params.duration).toFixed(4)}`,
    };
}

export async function upscaleImage(input: z.infer<typeof FalUpscaleInputSchema>) {
    const validated = FalUpscaleInputSchema.parse(input);
    console.log(`[PLUG/FAL] 🔍 Upscaling image ${validated.scale}x`);

    const result = await falRequest<FalImageResult>('fal-ai/creative-upscaler', {
        image_url: validated.image_url,
        scale: validated.scale,
        face_enhance: validated.face_enhance,
    });

    return { output_url: result.images[0]?.url, scale: validated.scale };
}

export async function removeBackground(input: z.infer<typeof FalRemoveBackgroundSchema>) {
    const validated = FalRemoveBackgroundSchema.parse(input);
    console.log(`[PLUG/FAL] ✂️ Removing background`);

    const result = await falRequest<FalImageResult>('fal-ai/imageutils/rembg', {
        image_url: validated.image_url,
        return_mask: validated.return_mask,
    });

    return { output_url: result.images[0]?.url };
}

// ─── MCP Server Registration ──────────────────────────────────────────────────

export const FAL_MCP_TOOLS = [
    {
        name: 'fal_generate_image',
        description: 'Generate images using FAL.ai (Flux, Stable Diffusion, Aura Flow). Returns image URLs.',
        inputSchema: FalImageInputSchema,
        handler: generateImage,
        agentPermissions: ['NOVA', 'ORACLE', 'GOD_PROMPT'],
        estimatedCost: '$0.003–0.03/image',
    },
    {
        name: 'fal_generate_video',
        description: 'Generate short videos using FAL.ai (HunyuanVideo, MiniMax, Kling). Returns video URL.',
        inputSchema: FalVideoInputSchema,
        handler: generateVideo,
        agentPermissions: ['NOVA', 'VECTOR', 'GOD_PROMPT'],
        estimatedCost: '$0.10–0.50/video',
    },
    {
        name: 'fal_upscale_image',
        description: 'Upscale an image 2–8x using FAL.ai creative upscaler with optional face enhancement.',
        inputSchema: FalUpscaleInputSchema,
        handler: upscaleImage,
        agentPermissions: ['NOVA', 'ORACLE'],
        estimatedCost: '$0.005/image',
    },
    {
        name: 'fal_remove_background',
        description: 'Remove the background from an image using FAL.ai REMBG.',
        inputSchema: FalRemoveBackgroundSchema,
        handler: removeBackground,
        agentPermissions: ['NOVA', 'ORACLE', 'STUDIO'],
        estimatedCost: '$0.001/image',
    },
];
