/**
 * Creative Video Provider (Kling & Wan)
 *
 * Generates cinematic video clips from camera path specs.
 * Used in the Nano Banana 2 scroll animation pipeline to produce
 * transition clips between scroll sections.
 *
 * API pattern: 
 *  1. Local fallback (LOCAL_VIDEO_URL) if available
 *  2. Fal.ai API (FAL_KEY) for hosted Kling/Wan
 *  3. Kling official API (KLING_API_KEY)
 *  4. Mock fallback
 */

const KLING_API_BASE = 'https://api.kling.ai/v1';
const KLING_API_KEY = process.env['KLING_API_KEY'] ?? '';
const FAL_KEY = process.env['FAL_KEY'] ?? '';
const LOCAL_VIDEO_URL = process.env['LOCAL_VIDEO_URL'] ?? '';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CameraControl {
    time: number;
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    fov?: number;
}

export interface KlingVideoSpec {
    prompt: string;
    /** Camera path controls — required for text-to-video, optional for img2vid */
    camera_controls?: CameraControl[];
    duration: number;           // seconds (3 | 5 | 10)
    model?: 'kling-3.0' | 'kling-2.0' | 'wan-2.1';
    /** img2vid mode: provide an image URL as the starting frame */
    mode?: 'txt2vid' | 'img2vid';
    /** Reference image for img2vid mode — file:// or https:// URL */
    image_url?: string;
    negative_prompt?: string;
    aspect_ratio?: '16:9' | '9:16' | '1:1' | '4:3';
    cfg_scale?: number;
    seed?: number;
}

export interface KlingJob {
    jobId: string;
    status: 'pending' | 'processing' | 'succeeded' | 'failed';
    createdAt: string;
    estimatedDurationMs: number;
    provider?: 'kling' | 'fal' | 'local' | 'mock';
}

export interface KlingJobResult extends KlingJob {
    status: 'succeeded';
    videoUrl: string;
    thumbnailUrl?: string;
    durationSeconds?: number;
}

// ─── KlingProvider (Creative Video Engine) ────────────────────────────────────

export class KlingProvider {
    private readonly providerType: 'kling' | 'fal' | 'local' | 'mock';

    constructor() {
        if (LOCAL_VIDEO_URL) {
            this.providerType = 'local';
            console.log(`[VideoProvider] Using LOCAL fallback at ${LOCAL_VIDEO_URL}`);
        } else if (FAL_KEY) {
            this.providerType = 'fal';
            console.log(`[VideoProvider] Using FAL.AI API`);
        } else if (KLING_API_KEY) {
            this.providerType = 'kling';
            console.log(`[VideoProvider] Using KLING Official API`);
        } else {
            this.providerType = 'mock';
            console.warn('[VideoProvider] No API keys set — using mock video generation');
        }
    }

    /**
     * Submit a video generation job
     */
    async generateVideo(spec: KlingVideoSpec): Promise<KlingJob> {
        if (this.providerType === 'local') {
            const response = await fetch(`${LOCAL_VIDEO_URL}/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(spec),
            });
            if (!response.ok) throw new Error(`Local API failed: ${response.status}`);
            const data = await response.json();
            return {
                jobId: data.id || `local-${Date.now()}`,
                status: 'pending',
                createdAt: new Date().toISOString(),
                estimatedDurationMs: 5000,
                provider: 'local'
            };
        }

        if (this.providerType === 'fal') {
            // Map models for Fal.ai
            let endpoint = 'fal-ai/kling-video/v1/standard/text-to-video';
            if (spec.model === 'wan-2.1') {
                endpoint = spec.mode === 'img2vid' ? 'fal-ai/wan-i2v' : 'fal-ai/wan-t2v';
            } else if (spec.mode === 'img2vid') {
                endpoint = 'fal-ai/kling-video/v1/standard/image-to-video';
            }

            let inputArgs: any = { prompt: spec.prompt };
            if (spec.image_url) {
                inputArgs.image_url = spec.image_url;
            }
            if (spec.duration === 10) inputArgs.duration = '10';
            else if (spec.duration === 5) inputArgs.duration = '5';
            if (spec.aspect_ratio) inputArgs.aspect_ratio = spec.aspect_ratio;

            const response = await fetch(`https://queue.fal.run/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Key ${FAL_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(inputArgs)
            });

            if (!response.ok) {
                throw new Error(`[VideoProvider] Fal.ai failed ${response.status}: ${await response.text()}`);
            }

            const data = await response.json();
            return {
                jobId: `${endpoint}|${data.request_id}`,
                status: 'pending',
                createdAt: new Date().toISOString(),
                estimatedDurationMs: 30000,
                provider: 'fal'
            };
        }

        if (this.providerType === 'kling') {
            const response = await fetch(`${KLING_API_BASE}/videos/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${KLING_API_KEY}`,
                },
                body: JSON.stringify(spec),
            });
            if (!response.ok) throw new Error(`[Kling] Generate failed ${response.status}: ${await response.text()}`);
            const data = await response.json();
            return { ...(data as KlingJob), provider: 'kling' };
        }

        // Mock
        return {
            jobId: `mock-${Date.now()}`,
            status: 'pending',
            createdAt: new Date().toISOString(),
            estimatedDurationMs: 2000,
            provider: 'mock',
        };
    }

    /**
     * Poll a job until it completes.
     */
    async pollJob(jobId: string, maxWaitMs = 120_000): Promise<KlingJobResult> {
        // Resolve provider via job prefix if possible
        let provider = this.providerType;
        if (jobId.startsWith('mock-')) provider = 'mock';
        if (jobId.startsWith('local-')) provider = 'local';
        if (jobId.startsWith('fal-ai/')) provider = 'fal';

        if (provider === 'mock') {
            await new Promise(r => setTimeout(r, 2000));
            return {
                jobId,
                status: 'succeeded',
                createdAt: new Date().toISOString(),
                estimatedDurationMs: 2000,
                videoUrl: 'https://test-streams.mux.com/x36xhzz/x36xhzz.m3u8',
                durationSeconds: 5,
                provider: 'mock'
            };
        }

        const start = Date.now();
        while (Date.now() - start < maxWaitMs) {
            let status = 'pending';
            let videoUrl = '';

            if (provider === 'local') {
                const res = await fetch(`${LOCAL_VIDEO_URL}/status/${jobId}`);
                if (!res.ok) throw new Error(`Local poll failed: ${res.status}`);
                const data = await res.json();
                status = data.status;
                videoUrl = data.video_url;
            } else if (provider === 'fal') {
                const [endpoint, requestId] = jobId.split('|');
                const res = await fetch(`https://queue.fal.run/${endpoint}/requests/${requestId}`, {
                    headers: { 'Authorization': `Key ${FAL_KEY}` }
                });
                if (!res.ok) throw new Error(`[VideoProvider] Fal.ai poll failed: ${res.status}`);
                const data = await res.json();

                if (data.status === 'COMPLETED') {
                    status = 'succeeded';
                    videoUrl = data.video?.url || (data.video && data.video[0]?.url) || '';
                } else if (data.status === 'FAILED' || data.status === 'CANCELED') {
                    status = 'failed';
                }
            } else if (provider === 'kling') {
                const res = await fetch(`${KLING_API_BASE}/videos/${jobId}`, {
                    headers: { Authorization: `Bearer ${KLING_API_KEY}` }
                });
                if (!res.ok) throw new Error(`[Kling] Poll failed ${res.status}`);
                const data = await res.json();
                status = data.status;
                videoUrl = data.videoUrl;
            }

            if (status === 'succeeded') {
                return {
                    jobId,
                    status: 'succeeded',
                    createdAt: new Date().toISOString(),
                    estimatedDurationMs: Date.now() - start,
                    videoUrl,
                    provider
                };
            }
            if (status === 'failed') throw new Error(`Job ${jobId} failed`);

            // Exponential backoff
            const waited = Date.now() - start;
            const delay = Math.min(2000 * Math.pow(2, Math.floor(waited / 10_000)), 8000);
            await new Promise(r => setTimeout(r, delay));
        }

        throw new Error(`Job ${jobId} timed out after ${maxWaitMs}ms`);
    }

    /**
     * Download the completed video into a buffer.
     */
    async downloadVideo(result: KlingJobResult): Promise<Buffer> {
        if (result.provider === 'mock') {
            return Buffer.alloc(0);
        }

        const response = await fetch(result.videoUrl);
        if (!response.ok) {
            throw new Error(`[VideoProvider] Download failed ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
    }
}

export const klingProvider = new KlingProvider();
