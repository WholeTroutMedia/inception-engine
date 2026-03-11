import axios from 'axios';
import { z } from 'zod';

// ─── GOD PROMPT — 3D Pipeline (Meshy AI) ─────────────────────────────────────
// Text-to-3D and Image-to-3D generation for brand assets, product visualization,
// and Inception Canvas generative art installations.

const MESHY_BASE = 'https://api.meshy.ai/v2';

const ENV_3D = globalThis as unknown as { process?: { env?: Record<string, string | undefined> } };

function meshyHeaders() {
    const key = ENV_3D.process?.env?.['MESHY_API_KEY'];
    if (!key) throw new Error('MESHY_API_KEY not configured');
    return { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' };
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const TextTo3DInputSchema = z.object({
    prompt: z.string().describe('Object to generate in 3D (e.g. "a sleek modern sneaker")'),
    negative_prompt: z.string().default('low quality, noisy, blurry, distorted'),
    art_style: z.enum(['realistic', 'cartoon', 'low-poly', 'sculpture', 'pbr']).default('realistic'),
    topology: z.enum(['quad', 'triangle']).default('quad'),
    target_polycount: z.number().optional().describe('Target polygon count (leave blank for auto)'),
    enable_pbr: z.boolean().default(true).describe('Generate PBR textures (albedo, metallic, roughness, normal)'),
    ai_model: z.enum(['meshy-4', 'meshy-3-turbo']).default('meshy-4'),
});

export const ImageTo3DInputSchema = z.object({
    image_url: z.string().url().describe('URL of reference image to convert to 3D'),
    enable_pbr: z.boolean().default(true),
    topology: z.enum(['quad', 'triangle']).default('quad'),
    target_polycount: z.number().optional(),
});

export const TextToTextureInputSchema = z.object({
    model_url: z.string().url().describe('URL of existing 3D model (.glb or .fbx) to texture'),
    prompt: z.string().describe('Texture style description (e.g. "weathered copper with patina")'),
    art_style: z.enum(['realistic', 'cartoon', 'low-poly', 'sculpture', 'pbr']).default('realistic'),
    negative_prompt: z.string().default('low quality, noisy'),
    resolution: z.enum(['1024', '2048', '4096']).default('2048'),
});

// ─── Status Polling ───────────────────────────────────────────────────────────

interface MeshyTask {
    id: string;
    status: 'PENDING' | 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED' | 'EXPIRED';
    progress: number;
    model_urls?: { glb?: string; fbx?: string; usdz?: string; obj?: string };
    thumbnail_url?: string;
    texture_urls?: Array<{ base_color?: string; metallic?: string; roughness?: string; normal?: string }>;
    error_message?: string;
}

async function pollMeshyTask(taskId: string, endpoint: string, maxWaitMs = 300_000): Promise<MeshyTask> {
    const startTime = Date.now();
    while (Date.now() - startTime < maxWaitMs) {
        await new Promise(r => setTimeout(r, 8000));
        const response = await axios.get<MeshyTask>(`${MESHY_BASE}/${endpoint}/${taskId}`, {
            headers: meshyHeaders(),
        });
        const task = response.data;
        console.log(`[GOD PROMPT/3D] Task ${taskId}: ${task.status} (${task.progress}%)`);
        if (task.status === 'SUCCEEDED' || task.status === 'FAILED' || task.status === 'EXPIRED') {
            return task;
        }
    }
    throw new Error(`Meshy task ${taskId} timed out`);
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function textTo3D(input: z.infer<typeof TextTo3DInputSchema>) {
    const v = TextTo3DInputSchema.parse(input);
    console.log(`[GOD PROMPT/3D] 🧊 Text-to-3D: "${v.prompt.slice(0, 60)}..."`);

    const response = await axios.post<{ result: string }>(
        `${MESHY_BASE}/text-to-3d`,
        {
            mode: 'preview',
            prompt: v.prompt,
            negative_prompt: v.negative_prompt,
            art_style: v.art_style,
            ai_model: v.ai_model,
            topology: v.topology,
            target_polycount: v.target_polycount,
            enable_pbr: v.enable_pbr,
        },
        { headers: meshyHeaders() }
    );

    const taskId = response.data.result;
    console.log(`[GOD PROMPT/3D] Task started: ${taskId}`);

    const task = await pollMeshyTask(taskId, 'text-to-3d');
    if (task.status !== 'SUCCEEDED') throw new Error(`3D generation failed: ${task.error_message}`);

    return {
        task_id: taskId,
        model_urls: task.model_urls,
        thumbnail_url: task.thumbnail_url,
        texture_urls: task.texture_urls,
        prompt: v.prompt,
        art_style: v.art_style,
        pbr: v.enable_pbr,
    };
}

export async function imageTo3D(input: z.infer<typeof ImageTo3DInputSchema>) {
    const v = ImageTo3DInputSchema.parse(input);
    console.log(`[GOD PROMPT/3D] 📸 Image-to-3D from: ${v.image_url.slice(0, 60)}...`);

    const response = await axios.post<{ result: string }>(
        `${MESHY_BASE}/image-to-3d`,
        {
            image_url: v.image_url,
            enable_pbr: v.enable_pbr,
            topology: v.topology,
            target_polycount: v.target_polycount,
        },
        { headers: meshyHeaders() }
    );

    const taskId = response.data.result;
    const task = await pollMeshyTask(taskId, 'image-to-3d');
    if (task.status !== 'SUCCEEDED') throw new Error(`Image-to-3D failed: ${task.error_message}`);

    return {
        task_id: taskId,
        model_urls: task.model_urls,
        thumbnail_url: task.thumbnail_url,
        texture_urls: task.texture_urls,
    };
}

export async function textToTexture(input: z.infer<typeof TextToTextureInputSchema>) {
    const v = TextToTextureInputSchema.parse(input);
    console.log(`[GOD PROMPT/3D] 🎨 Texturing model with: "${v.prompt}"`);

    const response = await axios.post<{ result: string }>(
        `${MESHY_BASE}/text-to-texture`,
        {
            model_url: v.model_url,
            object_prompt: v.prompt,
            style_prompt: v.art_style,
            negative_prompt: v.negative_prompt,
            resolution: v.resolution,
            enable_original_uv: true,
            enable_pbr: true,
        },
        { headers: meshyHeaders() }
    );

    const taskId = response.data.result;
    const task = await pollMeshyTask(taskId, 'text-to-texture');
    if (task.status !== 'SUCCEEDED') throw new Error(`Texturing failed: ${task.error_message}`);

    return {
        task_id: taskId,
        model_urls: task.model_urls,
        texture_urls: task.texture_urls,
        prompt: v.prompt,
        resolution: v.resolution,
    };
}

// ─── Brand 3D Asset Package ───────────────────────────────────────────────────

export async function generateBrand3DAssets(params: {
    brand_name: string;
    product_description: string;
    art_style?: z.infer<typeof TextTo3DInputSchema>['art_style'];
}) {
    console.log(`[GOD PROMPT/3D] 🚀 Brand 3D package for ${params.brand_name}`);

    const result = await textTo3D({
        prompt: `${params.product_description} — ${params.brand_name} brand, premium quality, hero product shot`,
        art_style: params.art_style ?? 'realistic',
        negative_prompt: 'low quality, noisy, blurry, distorted',
        ai_model: 'meshy-4',
        enable_pbr: true,
        topology: 'quad',
    });

    return {
        brand: params.brand_name,
        model_urls: result.model_urls,
        thumbnail_url: result.thumbnail_url,
        texture_urls: result.texture_urls,
        download_formats: Object.keys(result.model_urls ?? {}),
    };
}

// ─── MCP Tool Registration ────────────────────────────────────────────────────

export const MESHY_3D_TOOLS = [
    {
        name: 'meshy_text_to_3d',
        description: 'Generate a 3D model from a text prompt using Meshy-4. Returns GLB, FBX, USDZ, and OBJ URLs with optional PBR textures.',
        inputSchema: TextTo3DInputSchema,
        handler: textTo3D,
        agentPermissions: ['GOD_PROMPT', 'NOVA', 'ORACLE'],
        estimatedCost: '$0.05–0.30/model',
    },
    {
        name: 'meshy_image_to_3d',
        description: 'Convert a reference image to a 3D model using Meshy AI image-to-3D.',
        inputSchema: ImageTo3DInputSchema,
        handler: imageTo3D,
        agentPermissions: ['GOD_PROMPT', 'NOVA'],
        estimatedCost: '$0.10–0.50/model',
    },
    {
        name: 'meshy_text_to_texture',
        description: 'Apply AI-generated PBR textures to an existing 3D model from a text description.',
        inputSchema: TextToTextureInputSchema,
        handler: textToTexture,
        agentPermissions: ['GOD_PROMPT', 'NOVA'],
        estimatedCost: '$0.05/texture set',
    },
];
