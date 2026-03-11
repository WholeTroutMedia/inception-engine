/**
 * @inception/gen-ui — IRIS-GEN HTTP Server
 *
 * Wraps the gen-ui Genkit flow as a standalone HTTP microservice.
 * Port: 4300 (per genesis stack service map)
 *
 * Endpoints:
 *   POST /generate  — Run IRIS-GEN flow (prompt → tokens → VERA quality gate)
 *   GET  /health    — Health check
 *   GET  /status    — Last generation result summary
 */

import http from 'http';
import { IrisGenUiFlow } from './iris-gen.js';
import type { GenerationRequest, GenerationResult } from './iris-gen.js';

const PORT = Number(process.env.PORT ?? 4300);

// ─── In-Memory State ──────────────────────────────────────────────────────────

let lastResult: GenerationResult | null = null;
let generationCount = 0;
const startTime = new Date().toISOString();

// ─── Request Helpers ──────────────────────────────────────────────────────────

function readBody(req: http.IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
        req.on('end', () => resolve(body));
        req.on('error', reject);
    });
}

function sendJson(res: http.ServerResponse, status: number, data: unknown): void {
    const body = JSON.stringify(data);
    res.writeHead(status, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    });
    res.end(body);
}

// ─── Request Handler ──────────────────────────────────────────────────────────

async function handler(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const url = req.url ?? '/';
    const method = req.method ?? 'GET';

    // CORS preflight
    if (method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        });
        res.end();
        return;
    }

    // GET /health
    if (method === 'GET' && url === '/health') {
        sendJson(res, 200, {
            status: 'operational',
            service: 'inception-gen-ui',
            version: '5.0.0',
            port: PORT,
            generationCount,
            startTime,
            timestamp: new Date().toISOString(),
        });
        return;
    }

    // GET /status
    if (method === 'GET' && url === '/status') {
        sendJson(res, 200, {
            generationCount,
            lastGeneration: lastResult
                ? {
                    score: lastResult.report.score,
                    grade: lastResult.report.grade,
                    promoted: lastResult.promoted,
                    tokenCount: Object.keys(lastResult.rawTokens).length,
                }
                : null,
        });
        return;
    }

    // POST /generate
    if (method === 'POST' && url === '/generate') {
        let body: string;
        try {
            body = await readBody(req);
        } catch {
            sendJson(res, 400, { error: 'Failed to read request body' });
            return;
        }

        let request: GenerationRequest;
        try {
            request = JSON.parse(body) as GenerationRequest;
            if (!request.prompt || typeof request.prompt !== 'string') {
                throw new Error('Missing required field: prompt');
            }
        } catch (err) {
            sendJson(res, 400, { error: (err as Error).message });
            return;
        }

        try {
            const result = await IrisGenUiFlow.generate(request);
            lastResult = result;
            generationCount++;

            sendJson(res, 200, {
                tokens: result.rawTokens,
                score: result.report.score,
                grade: result.report.grade,
                promoted: result.promoted,
                issues: result.report.issues,
            });
        } catch (err) {
            console.error('[gen-ui] Generation error:', err);
            sendJson(res, 500, { error: 'Generation failed', detail: (err as Error).message });
        }
        return;
    }

    // 404
    sendJson(res, 404, { error: `Not found: ${method} ${url}` });
}

// ─── Server Boot ──────────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
    handler(req, res).catch((err: unknown) => {
        console.error('[gen-ui] Unhandled error:', err);
        res.writeHead(500);
        res.end('Internal server error');
    });
});

server.listen(PORT, () => {
    console.log(`[IRIS-GEN] gen-ui server online → http://localhost:${PORT}`);
    console.log(`[IRIS-GEN] /health · /status · POST /generate`);
});

export default server;
