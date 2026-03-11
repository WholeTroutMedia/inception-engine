/**
 * packages/genmedia/src/providers/runway.ts
 * Runway Gen-3 Alpha + Gen-3 Alpha Turbo provider
 * Supports: text-to-video, image-to-video
 */

import https from 'https';
import type { IncomingMessage } from 'http';
import fs from 'fs';
import path from 'path';

export interface RunwayRequest {
    prompt: string;
    image_url?: string;              // for image-to-video
    duration: 5 | 10;
    ratio: '1280:720' | '720:1280' | '1104:832' | '832:1104' | '960:960';
    model?: 'gen3a_turbo' | 'gen3a';
    output_dir: string;
    session_id?: string;
}

export interface RunwayResult {
    local_path: string;
    task_id: string;
    duration_ms: number;
    model: string;
}

async function callRunway(method: string, pathStr: string, body?: unknown): Promise<unknown> {
    const API_KEY = process.env.RUNWAY_API_SECRET;
    if (!API_KEY) throw new Error('RUNWAY_API_SECRET not set');

    return new Promise((resolve, reject) => {
        const payload = body ? JSON.stringify(body) : undefined;
        const req = https.request({
            hostname: 'api.dev.runwayml.com',
            path: `/v1${pathStr}`,
            method,
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
                'X-Runway-Version': '2024-11-06',
                ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
            },
        }, (res) => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => {
                try { resolve(JSON.parse(d)); }
                catch { reject(new Error(`Runway non-JSON response: ${d.slice(0, 200)}`)); }
            });
        });
        req.on('error', reject);
        if (payload) req.write(payload);
        req.end();
    });
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

export async function runwayProvider(req: RunwayRequest): Promise<RunwayResult> {
    const startMs = Date.now();
    const model = req.model ?? 'gen3a_turbo';
    const sessionId = req.session_id ?? `runway_${Date.now()}`;

    console.log(`[RUNWAY] 🎬 ${req.image_url ? 'img2vid' : 'txt2vid'} | ${req.ratio} | ${req.duration}s | model:${model}`);

    // Submit task
    const taskPayload: Record<string, unknown> = {
        model,
        prompt_text: req.prompt,
        ratio: req.ratio,
        duration: req.duration,
        ...(req.image_url ? { prompt_image: req.image_url } : {}),
    };

    const task: any = await callRunway('POST', '/tasks', taskPayload);
    const taskId: string = task.id;

    if (!taskId) throw new Error(`Runway task creation failed: ${JSON.stringify(task)}`);
    console.log(`[RUNWAY] Task submitted: ${taskId}`);

    // Poll for completion
    let attempts = 0;
    while (attempts < 120) { // 10 minute timeout
        await new Promise(r => setTimeout(r, 5000));
        const status: any = await callRunway('GET', `/tasks/${taskId}`);

        if (status.status === 'SUCCEEDED') {
            const outputUrl: string = status.output?.[0];
            if (!outputUrl) throw new Error('Runway: no output URL in succeeded task');

            fs.mkdirSync(req.output_dir, { recursive: true });
            const localPath = path.join(req.output_dir, `${sessionId}_runway_${model}.mp4`);
            await downloadFile(outputUrl, localPath);

            console.log(`[RUNWAY] ✅ ${localPath} (${Date.now() - startMs}ms)`);
            return { local_path: localPath, task_id: taskId, duration_ms: Date.now() - startMs, model };
        }

        if (status.status === 'FAILED') {
            throw new Error(`Runway task failed: ${JSON.stringify(status.failure)}`);
        }

        console.log(`[RUNWAY] ⏳ ${status.status} (${Math.round((Date.now() - startMs) / 1000)}s)`);
        attempts++;
    }

    throw new Error('Runway task timed out after 10 minutes');
}
