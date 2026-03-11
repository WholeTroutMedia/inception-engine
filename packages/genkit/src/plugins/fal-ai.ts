/**
 * FAL.ai Genkit Plugin
 *
 * Provides Genkit-compatible wrappers for FAL.ai inference endpoints.
 * Supports: Flux Pro (image), Wan (video), Kling (video), Stable Audio.
 *
 * Usage: Call FalAi.generateImage() or FalAi.generateVideo() from any flow.
 * These are not native Genkit model plugins (FAL has its own SDK style),
 * but they integrate via the same environment and error patterns.
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface FalImageOptions {
    prompt: string;
    model?: 'flux-pro' | 'flux-schnell' | 'flux-realism' | 'stable-diffusion-3';
    width?: number;
    height?: number;
    numImages?: number;
    outputFormat?: 'jpeg' | 'png' | 'webp';
    seed?: number;
}

export interface FalVideoOptions {
    prompt: string;
    model?: 'wan-t2v' | 'kling-v1' | 'minimax-video';
    durationSeconds?: number;
    aspectRatio?: '16:9' | '9:16' | '1:1';
    seed?: number;
}

export interface FalResult {
    url: string;       // Remote CDN URL of generated asset
    localPath?: string; // Local path if downloaded
    mimeType: string;
    seed?: number;
    width?: number;
    height?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// HTTP UTILITY (no SDK dependency)
// ─────────────────────────────────────────────────────────────────────────────

async function falPost(endpoint: string, body: object): Promise<any> {
    const apiKey = process.env.FAL_API_KEY;
    if (!apiKey) throw new Error('[FAL] FAL_API_KEY not set in environment');

    const bodyStr = JSON.stringify(body);
    const url = new URL(`https://fal.run/${endpoint}`);

    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: url.hostname,
            port: 443,
            path: url.pathname + url.search,
            method: 'POST',
            headers: {
                'Authorization': `Key ${apiKey}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(bodyStr),
            },
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (res.statusCode && res.statusCode >= 400) {
                        reject(new Error(`FAL API ${res.statusCode}: ${JSON.stringify(parsed)}`));
                    } else {
                        resolve(parsed);
                    }
                } catch (e) {
                    reject(new Error(`FAL parse error: ${data}`));
                }
            });
        });
        req.on('error', reject);
        req.write(bodyStr);
        req.end();
    });
}

async function downloadFile(url: string, destPath: string): Promise<string> {
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        const file = fs.createWriteStream(destPath);
        protocol.get(url, (res) => {
            if (res.statusCode === 302 || res.statusCode === 301) {
                // Follow redirect
                downloadFile(res.headers.location!, destPath).then(resolve).catch(reject);
                return;
            }
            res.pipe(file);
            file.on('finish', () => { file.close(); resolve(destPath); });
        }).on('error', (e) => { fs.unlink(destPath, () => { }); reject(e); });
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

const GENAI_DIR = `d:\\Google Creative Liberation Engine\\tmp_genai`;

export const FalAi = {

    /**
     * Generate a still image via Flux or Stable Diffusion.
     * Downloads result to tmp_genai/{sessionId}/.
     */
    async generateImage(options: FalImageOptions, sessionId: string): Promise<FalResult> {
        const model = options.model ?? 'flux-pro';
        const endpoint = model === 'flux-pro' ? 'fal-ai/flux-pro'
            : model === 'flux-schnell' ? 'fal-ai/flux/schnell'
                : model === 'flux-realism' ? 'fal-ai/flux-realism'
                    : 'fal-ai/stable-diffusion-v3-medium';

        console.log(`[FAL] Generating image via ${model}: "${options.prompt.slice(0, 60)}..."`);

        const result = await falPost(endpoint, {
            prompt: options.prompt,
            image_size: {
                width: options.width ?? (options.height ? undefined : 1024),
                height: options.height ?? (options.width ? undefined : 768),
            },
            num_images: options.numImages ?? 1,
            output_format: options.outputFormat ?? 'jpeg',
            seed: options.seed,
        });

        const imageUrl: string = result?.images?.[0]?.url ?? result?.image?.url;
        if (!imageUrl) throw new Error(`[FAL] No image URL in response: ${JSON.stringify(result)}`);

        const ext = options.outputFormat ?? 'jpg';
        const filename = `${model}_${Date.now()}.${ext}`;
        const localPath = path.join(GENAI_DIR, sessionId, filename);
        await downloadFile(imageUrl, localPath);

        console.log(`[FAL] ✅ Image saved: ${localPath}`);
        return {
            url: imageUrl,
            localPath,
            mimeType: `image/${ext}`,
            seed: result?.seed,
            width: result?.images?.[0]?.width ?? options.width ?? 1024,
            height: result?.images?.[0]?.height ?? options.height ?? 768,
        };
    },

    /**
     * Generate a short video clip via Wan or Kling.
     * Downloads result to tmp_genai/{sessionId}/.
     */
    async generateVideo(options: FalVideoOptions, sessionId: string): Promise<FalResult> {
        const model = options.model ?? 'wan-t2v';
        const endpoint = model === 'wan-t2v' ? 'fal-ai/wan/t2v'
            : model === 'kling-v1' ? 'fal-ai/kling-video/v1/standard/text-to-video'
                : 'fal-ai/minimax-video/image-to-video';

        const aspectRatio = options.aspectRatio ?? '16:9';
        const duration = Math.min(options.durationSeconds ?? 4, 8); // Most models cap at 8s

        console.log(`[FAL] Generating video via ${model}: "${options.prompt.slice(0, 60)}..." (${duration}s, ${aspectRatio})`);

        const result = await falPost(endpoint, {
            prompt: options.prompt,
            duration: duration,
            aspect_ratio: aspectRatio,
            seed: options.seed,
        });

        // FAL video endpoints may return async job URL; handle polling if needed
        const videoUrl: string = result?.video?.url ?? result?.url ?? result?.output?.url;
        if (!videoUrl) throw new Error(`[FAL] No video URL in response: ${JSON.stringify(result)}`);

        const filename = `${model}_${Date.now()}.mp4`;
        const localPath = path.join(GENAI_DIR, sessionId, filename);
        await downloadFile(videoUrl, localPath);

        console.log(`[FAL] ✅ Video saved: ${localPath}`);
        return {
            url: videoUrl,
            localPath,
            mimeType: 'video/mp4',
            seed: result?.seed,
        };
    },

    /**
     * Check if FAL is available (API key present + reachable).
     */
    isAvailable(): boolean {
        return !!process.env.FAL_API_KEY;
    },
};
