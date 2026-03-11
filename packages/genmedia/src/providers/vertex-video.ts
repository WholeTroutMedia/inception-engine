/**
 * packages/genmedia/src/providers/vertex-video.ts
 * Veo 3 video + Lyria music via Google Vertex AI
 */

import https from 'https';
import type { IncomingMessage } from 'http';
import fs from 'fs';
import path from 'path';

// ─────────────────────────────────────────────────────────────────────────────
// VEO 3 VIDEO
// ─────────────────────────────────────────────────────────────────────────────

export interface VertexVideoRequest {
    prompt: string;
    duration_seconds?: 5 | 8;
    aspect_ratio?: '16:9' | '9:16' | '1:1';
    resolution?: '720p' | '1080p';
    output_dir: string;
    session_id?: string;
}

export interface VertexVideoResult {
    local_path: string;
    operation_name: string;
    duration_ms: number;
}

async function vertexPost(endpoint: string, body: unknown, token: string): Promise<unknown> {
    const payload = JSON.stringify(body);
    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: 'us-central1-aiplatform.googleapis.com',
            path: endpoint,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload),
            },
        }, (res: IncomingMessage) => {
            let d = '';
            res.on('data', (c: Buffer) => d += c.toString());
            res.on('end', () => {
                try { resolve(JSON.parse(d)); }
                catch { reject(new Error(`Vertex non-JSON: ${d.slice(0, 200)}`)); }
            });
        });
        req.on('error', (e: Error) => reject(e));
        req.write(payload);
        req.end();
    });
}

async function vertexGet(endpoint: string, token: string): Promise<unknown> {
    return new Promise((resolve, reject) => {
        https.get(`https://us-central1-aiplatform.googleapis.com${endpoint}`, {
            headers: { 'Authorization': `Bearer ${token}` },
        }, (res: IncomingMessage) => {
            let d = '';
            res.on('data', (c: Buffer) => d += c.toString());
            res.on('end', () => {
                try { resolve(JSON.parse(d)); }
                catch { reject(new Error(`Vertex GET non-JSON: ${d.slice(0, 200)}`)); }
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

export async function veo3Provider(req: VertexVideoRequest): Promise<VertexVideoResult> {
    const PROJECT = process.env.GOOGLE_CLOUD_PROJECT;
    const TOKEN = process.env.GOOGLE_ACCESS_TOKEN;   // service account access token
    if (!PROJECT || !TOKEN) throw new Error('GOOGLE_CLOUD_PROJECT and GOOGLE_ACCESS_TOKEN required for Veo 3');

    const startMs = Date.now();
    const sessionId = req.session_id ?? `veo3_${Date.now()}`;
    console.log(`[VEO3] 🎬 Generating ${req.duration_seconds ?? 8}s video | ${req.aspect_ratio ?? '16:9'}`);

    const operation: any = await vertexPost(
        `/v1/projects/${PROJECT}/locations/us-central1/publishers/google/models/veo-3.0-generate-preview:predictLongRunning`,
        {
            instances: [{
                prompt: req.prompt,
                generate_audio: false,
                number_of_videos: 1,
                duration_seconds: req.duration_seconds ?? 8,
                aspect_ratio: req.aspect_ratio ?? '16:9',
                resolution: req.resolution ?? '1080p',
            }],
            parameters: { storageUri: `gs://${PROJECT}-media-output` },
        },
        TOKEN
    );

    const operationName: string = operation.name;
    if (!operationName) throw new Error(`Veo 3 operation creation failed: ${JSON.stringify(operation)}`);
    console.log(`[VEO3] Operation: ${operationName}`);

    // Poll
    let attempts = 0;
    while (attempts < 120) {
        await new Promise(r => setTimeout(r, 5000));
        const status: any = await vertexGet(`/v1/${operationName}`, TOKEN);
        if (status.done) {
            if (status.error) throw new Error(`Veo 3 error: ${JSON.stringify(status.error)}`);
            const gcsUri: string = status.response?.predictions?.[0]?.gcsUri;
            if (!gcsUri) throw new Error('Veo 3: no GCS URI in response');

            // Convert GCS URI to signed URL or download via gsutil — for now return GCS path
            fs.mkdirSync(req.output_dir, { recursive: true });
            const localPath = path.join(req.output_dir, `${sessionId}_veo3.mp4`);
            // NOTE: in production, use GCS client to download. Returning path as placeholder.
            console.log(`[VEO3] ✅ GCS output: ${gcsUri} → ${localPath} (${Date.now() - startMs}ms)`);
            return { local_path: gcsUri, operation_name: operationName, duration_ms: Date.now() - startMs };
        }
        console.log(`[VEO3] ⏳ Still running... (${Math.round((Date.now() - startMs) / 1000)}s)`);
        attempts++;
    }
    throw new Error('Veo 3 timed out after 10 minutes');
}

// ─────────────────────────────────────────────────────────────────────────────
// LYRIA MUSIC
// ─────────────────────────────────────────────────────────────────────────────

export interface LyriaRequest {
    prompt: string;                  // music direction from AUDIO LoRA
    duration_seconds?: number;
    output_dir: string;
    session_id?: string;
}

export interface LyriaResult {
    local_path: string;
    duration_ms: number;
}

export async function lyriaProvider(req: LyriaRequest): Promise<LyriaResult> {
    const PROJECT = process.env.GOOGLE_CLOUD_PROJECT;
    const TOKEN = process.env.GOOGLE_ACCESS_TOKEN;
    if (!PROJECT || !TOKEN) throw new Error('GOOGLE_CLOUD_PROJECT and GOOGLE_ACCESS_TOKEN required for Lyria');

    const startMs = Date.now();
    const sessionId = req.session_id ?? `lyria_${Date.now()}`;
    console.log(`[LYRIA] 🎵 Generating music: "${req.prompt.slice(0, 60)}..."`);

    const response: any = await vertexPost(
        `/v1/projects/${PROJECT}/locations/us-central1/publishers/google/models/lyria-002:predict`,
        {
            instances: [{
                prompt: req.prompt,
                duration_seconds: req.duration_seconds ?? 30,
            }],
        },
        TOKEN
    );

    const audioB64: string = response.predictions?.[0]?.bytesBase64Encoded;
    if (!audioB64) throw new Error(`Lyria: no audio in response: ${JSON.stringify(response)}`);

    fs.mkdirSync(req.output_dir, { recursive: true });
    const localPath = path.join(req.output_dir, `${sessionId}_lyria.wav`);
    fs.writeFileSync(localPath, Buffer.from(audioB64, 'base64'));

    console.log(`[LYRIA] ✅ ${localPath} (${Date.now() - startMs}ms)`);
    return { local_path: localPath, duration_ms: Date.now() - startMs };
}
