/**
 * packages/genmedia/src/providers/fal-tripo.ts
 * FAL.ai TripoSR — 3D asset generation from image or text
 */

import https from 'https';
import type { IncomingMessage } from 'http';
import fs from 'fs';
import path from 'path';

export interface FalTripoRequest {
    image_url?: string;       // image-to-3D
    prompt?: string;          // text description
    output_format?: 'glb' | 'obj' | 'stl';
    output_dir: string;
    session_id?: string;
}

export interface FalTripoResult {
    local_path: string;
    model_url: string;
    duration_ms: number;
}

async function falPost(endpoint: string, body: unknown, apiKey: string): Promise<unknown> {
    const payload = JSON.stringify(body);
    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: 'queue.fal.run',
            path: `/${endpoint}`,
            method: 'POST',
            headers: {
                'Authorization': `Key ${apiKey}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload),
            },
        }, (res: IncomingMessage) => {
            let d = '';
            res.on('data', (c: Buffer) => d += c.toString());
            res.on('end', () => {
                try { resolve(JSON.parse(d)); }
                catch { reject(new Error(`FAL non-JSON: ${d.slice(0, 200)}`)); }
            });
        });
        req.on('error', (e: Error) => reject(e));
        req.write(payload);
        req.end();
    });
}

async function falGet(url: string, apiKey: string): Promise<unknown> {
    return new Promise((resolve, reject) => {
        https.get(url, {
            headers: { 'Authorization': `Key ${apiKey}` },
        }, (res: IncomingMessage) => {
            let d = '';
            res.on('data', (c: Buffer) => d += c.toString());
            res.on('end', () => {
                try { resolve(JSON.parse(d)); }
                catch { reject(new Error(`FAL GET non-JSON: ${d.slice(0, 200)}`)); }
            });
        }).on('error', (e: Error) => reject(e));
    });
}

async function downloadFile(url: string, dest: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (res: IncomingMessage) => {
            res.pipe(file);
            file.on('finish', () => { file.close(); resolve(); });
        }).on('error', (e: Error) => { fs.unlink(dest, () => { }); reject(e); });
    });
}

export async function falTripoProvider(req: FalTripoRequest): Promise<FalTripoResult> {
    const FAL_KEY = process.env.FAL_API_KEY;
    if (!FAL_KEY) throw new Error('FAL_API_KEY not set');

    const startMs = Date.now();
    const sessionId = req.session_id ?? `tripo_${Date.now()}`;
    const endpoint = req.image_url ? 'fal-ai/triposr' : 'fal-ai/hyper3d/rodin';

    console.log(`[TRIPO] 🧊 3D generation | mode: ${req.image_url ? 'image-to-3D' : 'text-to-3D'}`);

    const body = req.image_url
        ? { image_url: req.image_url, output_format: req.output_format ?? 'glb' }
        : { prompt: req.prompt, output_format: req.output_format ?? 'glb' };

    const submission: any = await falPost(endpoint, body, FAL_KEY);
    const requestId: string = submission.request_id;
    if (!requestId) throw new Error(`TripoSR submission failed: ${JSON.stringify(submission)}`);

    // Poll
    let attempts = 0;
    while (attempts < 60) {
        await new Promise(r => setTimeout(r, 5000));
        const status: any = await falGet(
            `https://queue.fal.run/${endpoint}/requests/${requestId}/status`,
            FAL_KEY
        );

        if (status.status === 'COMPLETED') {
            const modelUrl: string = status.response?.model_url ?? status.response?.model?.url;
            if (!modelUrl) throw new Error('TripoSR: no model URL in response');

            const ext = req.output_format ?? 'glb';
            fs.mkdirSync(req.output_dir, { recursive: true });
            const localPath = path.join(req.output_dir, `${sessionId}_tripo.${ext}`);
            await downloadFile(modelUrl, localPath);

            console.log(`[TRIPO] ✅ ${localPath} (${Date.now() - startMs}ms)`);
            return { local_path: localPath, model_url: modelUrl, duration_ms: Date.now() - startMs };
        }

        if (status.status === 'FAILED') throw new Error(`TripoSR failed: ${JSON.stringify(status)}`);
        attempts++;
    }

    throw new Error('TripoSR timed out after 5 minutes');
}
