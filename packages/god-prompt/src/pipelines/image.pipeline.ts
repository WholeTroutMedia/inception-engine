import axios from 'axios';
import { z } from 'zod';

// ─── GOD PROMPT — Unified Brand Image Pipeline ────────────────────────────────
// Routes image generation across FAL.ai (Flux Pro), Google Imagen, and Vertex AI
// based on quality tier, budget, and availability. Always outputs brand-consistent
// results with configurable style injections.

const ENV_IMG = globalThis as unknown as { process?: { env?: Record<string, string | undefined> } };
const getEnv = (k: string) => ENV_IMG.process?.env?.[k];

// ─── Provider configs ──────────────────────────────────────────────────────────

const FAL_BASE = 'https://fal.run';
const IMAGEN_BASE = 'https://us-central1-aiplatform.googleapis.com/v1';

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const BrandImageSchema = z.object({
    prompt: z.string().describe('Image description. Brand style will be auto-injected based on brand_name.'),
    brand_name: z.string().optional().describe('Brand name — enables auto style injection from brand profile'),
    negative_prompt: z.string().default('watermark, text overlay, blurry, distorted, low quality, amateur, stock photo').describe('What to avoid'),
    aspect_ratio: z.enum(['1:1', '4:3', '16:9', '9:16', '3:4', '2:3', '3:2']).default('16:9'),
    quality_tier: z.enum(['draft', 'standard', 'premium']).default('standard').describe('draft=fast/cheap, standard=Flux Pro, premium=Imagen 3'),
    num_images: z.number().min(1).max(4).default(1),
    seed: z.number().optional(),
    style_preset: z.enum(['photorealistic', 'cinematic', 'illustration', 'brand_campaign', 'product_shot', 'editorial']).optional(),
});

export const BrandCampaignImageSchema = z.object({
    brand_name: z.string(),
    campaign_concept: z.string(),
    formats: z.array(z.enum(['hero_wide', 'social_square', 'story_vertical', 'banner', 'email_header'])).default(['hero_wide', 'social_square', 'story_vertical']),
    quality_tier: z.enum(['draft', 'standard', 'premium']).default('standard'),
});

export const ImageVariationsSchema = z.object({
    source_url: z.string().url().describe('Reference image to generate variations of'),
    prompt: z.string().describe('Variation direction'),
    num_variations: z.number().min(1).max(4).default(3),
    strength: z.number().min(0.1).max(1.0).default(0.7).describe('How different from source (0=identical, 1=completely different)'),
});

// ─── Style injection ───────────────────────────────────────────────────────────

const STYLE_PRESETS: Record<string, string> = {
    photorealistic: 'photorealistic, 8K, sharp focus, natural lighting, professional photography',
    cinematic: 'cinematic, film grain, anamorphic lens, dramatic lighting, depth of field',
    illustration: 'digital illustration, clean lines, vibrant colors, concept art style',
    brand_campaign: 'award-winning advertising campaign, premium brand photography, aspirational lifestyle',
    product_shot: 'studio product photography, clean background, perfect lighting, commercial grade',
    editorial: 'editorial photography, magazine quality, mood lighting, high contrast',
};

const FORMAT_RATIOS: Record<string, { ratio: string; label: string }> = {
    hero_wide: { ratio: '16:9', label: 'Hero (16:9)' },
    social_square: { ratio: '1:1', label: 'Social Square (1:1)' },
    story_vertical: { ratio: '9:16', label: 'Story (9:16)' },
    banner: { ratio: '4:1', label: 'Banner (4:1 approx → 16:9)' },
    email_header: { ratio: '3:1', label: 'Email Header (3:1 approx → 16:9)' },
};

function buildPrompt(input: z.infer<typeof BrandImageSchema>): string {
    const parts: string[] = [input.prompt];
    if (input.style_preset) parts.push(STYLE_PRESETS[input.style_preset]);
    if (input.brand_name) parts.push(`brand aesthetic for ${input.brand_name}, premium quality`);
    return parts.join('. ');
}

// ─── Provider: FAL.ai (Flux Pro) ──────────────────────────────────────────────

async function generateWithFal(params: {
    prompt: string;
    negative_prompt: string;
    aspect_ratio: string;
    num_images: number;
    seed?: number;
    model?: string;
}): Promise<Array<{ url: string; width: number; height: number }>> {
    const key = getEnv('FAL_API_KEY');
    if (!key) throw new Error('FAL_API_KEY not configured');

    const model = params.model ?? 'fal-ai/flux-pro/v1.1';
    const response = await axios.post<{
        images: Array<{ url: string; width: number; height: number }>;
    }>(
        `${FAL_BASE}/${model}`,
        {
            prompt: params.prompt,
            negative_prompt: params.negative_prompt,
            aspect_ratio: params.aspect_ratio,
            num_images: params.num_images,
            seed: params.seed,
            enable_safety_checker: true,
        },
        { headers: { Authorization: `Key ${key}`, 'Content-Type': 'application/json' } }
    );

    return response.data.images;
}

// ─── Provider: Google Imagen 3 (Vertex AI) ────────────────────────────────────

async function generateWithImagen(params: {
    prompt: string;
    negative_prompt: string;
    aspect_ratio: string;
    num_images: number;
}): Promise<Array<{ url: string; width: number; height: number }>> {
    const projectId = getEnv('GCP_PROJECT_ID');
    const location = getEnv('VERTEX_LOCATION') ?? 'us-central1';
    const accessToken = getEnv('GOOGLE_ACCESS_TOKEN');
    if (!projectId || !accessToken) throw new Error('GCP_PROJECT_ID and GOOGLE_ACCESS_TOKEN required for Imagen 3');

    const endpoint = `${IMAGEN_BASE}/projects/${projectId}/locations/${location}/publishers/google/models/imagen-3.0-generate-001:predict`;

    const response = await axios.post<{
        predictions: Array<{ bytesBase64Encoded: string; mimeType: string }>;
    }>(
        endpoint,
        {
            instances: [{ prompt: params.prompt }],
            parameters: {
                negativePrompt: params.negative_prompt,
                sampleCount: params.num_images,
                aspectRatio: params.aspect_ratio,
                safetySetting: 'block_some',
                addWatermark: false,
            },
        },
        { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
    );

    return response.data.predictions.map((p, i) => ({
        url: `data:${p.mimeType};base64,${p.bytesBase64Encoded}`,
        width: i === 0 ? 1920 : 1080,
        height: i === 0 ? 1080 : 1920,
    }));
}

// ─── Unified Router ───────────────────────────────────────────────────────────

export async function generateBrandImage(input: z.infer<typeof BrandImageSchema>) {
    const v = BrandImageSchema.parse(input);
    const prompt = buildPrompt(v);
    const tier = v.quality_tier;

    console.log(`[GOD PROMPT/IMAGE] 🎨 [${tier}] Generating ${v.num_images}x image(s) for "${v.brand_name ?? 'brand'}"`);

    let images: Array<{ url: string; width: number; height: number }>;
    let provider: string;

    if (tier === 'premium') {
        // Try Imagen 3, fall back to Flux Pro
        try {
            images = await generateWithImagen({ prompt, negative_prompt: v.negative_prompt, aspect_ratio: v.aspect_ratio, num_images: v.num_images });
            provider = 'Imagen 3 (Vertex AI)';
        } catch {
            console.warn('[GOD PROMPT/IMAGE] Imagen 3 unavailable, falling back to Flux Pro');
            images = await generateWithFal({ prompt, negative_prompt: v.negative_prompt, aspect_ratio: v.aspect_ratio, num_images: v.num_images, seed: v.seed });
            provider = 'Flux Pro 1.1 (FAL.ai) [fallback]';
        }
    } else if (tier === 'standard') {
        images = await generateWithFal({ prompt, negative_prompt: v.negative_prompt, aspect_ratio: v.aspect_ratio, num_images: v.num_images, seed: v.seed });
        provider = 'Flux Pro 1.1 (FAL.ai)';
    } else {
        // draft — Flux Schnell (fastest/cheapest)
        images = await generateWithFal({ prompt, negative_prompt: v.negative_prompt, aspect_ratio: v.aspect_ratio, num_images: v.num_images, seed: v.seed, model: 'fal-ai/flux/schnell' });
        provider = 'Flux Schnell (FAL.ai)';
    }

    return {
        images,
        provider,
        prompt_used: prompt,
        brand: v.brand_name,
        aspect_ratio: v.aspect_ratio,
        quality_tier: tier,
        count: images.length,
    };
}

export async function generateBrandCampaign(input: z.infer<typeof BrandCampaignImageSchema>) {
    const v = BrandCampaignImageSchema.parse(input);
    console.log(`[GOD PROMPT/IMAGE] 🚀 Brand campaign for "${v.brand_name}" — ${v.formats.length} formats`);

    const results = await Promise.allSettled(
        v.formats.map(fmt => {
            const { ratio } = FORMAT_RATIOS[fmt];
            return generateBrandImage({
                prompt: v.campaign_concept,
                brand_name: v.brand_name,
                quality_tier: v.quality_tier,
                aspect_ratio: ratio as z.infer<typeof BrandImageSchema>['aspect_ratio'],
                style_preset: 'brand_campaign',
                num_images: 1,
                negative_prompt: 'watermark, text overlay, blurry, distorted, low quality, amateur, stock photo',
            }).then(r => ({ format: fmt, label: FORMAT_RATIOS[fmt].label, ...r }));
        })
    );

    const succeeded = results
        .filter((r): r is PromiseFulfilledResult<typeof results[0] extends PromiseFulfilledResult<infer T> ? T : never> => r.status === 'fulfilled')
        .map(r => r.value);

    const failed = results
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .map(r => r.reason as string);

    return {
        brand: v.brand_name,
        campaign_concept: v.campaign_concept,
        formats_generated: succeeded.length,
        formats_failed: failed.length,
        results: succeeded,
        errors: failed,
    };
}

export async function generateImageVariations(input: z.infer<typeof ImageVariationsSchema>) {
    const v = ImageVariationsSchema.parse(input);
    console.log(`[GOD PROMPT/IMAGE] 🔄 Generating ${v.num_variations} variations`);

    const key = getEnv('FAL_API_KEY');
    if (!key) throw new Error('FAL_API_KEY not configured');

    const response = await axios.post<{ images: Array<{ url: string; width: number; height: number }> }>(
        `${FAL_BASE}/fal-ai/flux-pro/v1.1/redux`,
        {
            prompt: v.prompt,
            image_url: v.source_url,
            num_images: v.num_variations,
            strength: v.strength,
        },
        { headers: { Authorization: `Key ${key}`, 'Content-Type': 'application/json' } }
    );

    return { variations: response.data.images, source_url: v.source_url, prompt: v.prompt };
}

// ─── MCP Tool Registration ────────────────────────────────────────────────────

export const IMAGE_PIPELINE_TOOLS = [
    {
        name: 'godprompt_generate_image',
        description: 'Generate brand-consistent images using Flux Pro (standard) or Imagen 3 (premium). Auto-injects brand style.',
        inputSchema: BrandImageSchema,
        handler: generateBrandImage,
        agentPermissions: ['GOD_PROMPT', 'NOVA', 'ORACLE', 'STUDIO'],
        estimatedCost: 'draft: $0.003 | standard: $0.05 | premium: $0.04',
    },
    {
        name: 'godprompt_brand_campaign_images',
        description: 'Generate a complete brand campaign image set across all specified formats (hero, social, story, banner) in parallel.',
        inputSchema: BrandCampaignImageSchema,
        handler: generateBrandCampaign,
        agentPermissions: ['GOD_PROMPT', 'NOVA'],
        estimatedCost: '$0.05 × number of formats',
    },
    {
        name: 'godprompt_image_variations',
        description: 'Generate variations of a reference image using Flux Redux. Useful for A/B testing brand visuals.',
        inputSchema: ImageVariationsSchema,
        handler: generateImageVariations,
        agentPermissions: ['GOD_PROMPT', 'NOVA', 'STUDIO'],
        estimatedCost: '$0.05/variation',
    },
];
