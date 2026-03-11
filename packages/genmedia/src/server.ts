/**
 * packages/genmedia/src/server.ts
 * GenMedia Studio — HTTP Server v5.1
 *
 * Exposes GenMedia, GenMediaBatch, and IECR Director flows as REST endpoints.
 *
 * Endpoints:
 *   POST /generate           — Single asset generation
 *   POST /batch              — Parallel batch generation
 *   POST /iecr/decompose     — IECR Director: decompose brief → TaskGraph
 *   POST /iecr/execute       — IECR Director: run a TaskGraph
 *   GET  /health             — Provider health check
 *
 * Port: 4300 (GENMEDIA_PORT)
 */

import 'dotenv/config';
import express, { type Express } from 'express';
import cors from 'cors';
import { GenMediaFlow, GenMediaBatchFlow } from './index.js';
import { IECRDirectorFlow, IECRExecuteGraphFlow, DirectorInputSchema, TaskGraphSchema } from './pipeline/director.js';

const app: Express = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.GENMEDIA_PORT || 4300;

// ─── Health ───────────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
    const providers: Record<string, boolean> = {
        vertex: Boolean(process.env['GOOGLE_CLOUD_PROJECT'] && (process.env['VERTEX_API_KEY'] || process.env['GOOGLE_API_KEY'])),
        fal: Boolean(process.env['FAL_KEY']),
        comfyui: Boolean(process.env['COMFYUI_URL']),
    };
    const active = Object.entries(providers).filter(([, v]) => v).map(([k]) => k);
    res.json({
        status: 'operational',
        service: 'inception-genmedia',
        version: '5.1.0',
        providers: active,
        iecr: 'active',
        timestamp: new Date().toISOString(),
    });
});

// ─── POST /generate ───────────────────────────────────────────────────────────
// Routes a single generation request to the appropriate media provider.

app.post('/generate', async (req, res) => {
    try {
        const result = await GenMediaFlow(req.body);
        res.json(result);
    } catch (err: any) {
        console.error('[GENMEDIA] Generate error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /batch ──────────────────────────────────────────────────────────────
// Routes multiple generation requests in parallel.

app.post('/batch', async (req, res) => {
    try {
        const { requests } = req.body;
        if (!requests || !Array.isArray(requests)) {
            return res.status(400).json({ error: '"requests" must be an array' });
        }
        const results = await GenMediaBatchFlow({ requests });
        res.json(results);
    } catch (err: any) {
        console.error('[GENMEDIA] Batch error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /iecr/decompose ─────────────────────────────────────────────────────
// IECR Director: decompose a creative brief into a TaskGraph.
// Body: { brief: string, quality?: 'draft'|'standard'|'ultra', maxParallelism?: number }

app.post('/iecr/decompose', async (req, res) => {
    try {
        const input = DirectorInputSchema.parse(req.body);
        const result = await IECRDirectorFlow(input);
        res.json(result);
    } catch (err: any) {
        console.error('[IECR] Decompose error:', err.message);
        res.status(err.name === 'ZodError' ? 400 : 500).json({ error: err.message });
    }
});

// ─── POST /iecr/execute ───────────────────────────────────────────────────────
// IECR Director: execute a pre-built TaskGraph.
// Body: TaskGraph (from /iecr/decompose)

app.post('/iecr/execute', async (req, res) => {
    try {
        const graph = TaskGraphSchema.parse(req.body);
        const result = await IECRExecuteGraphFlow(graph);
        res.json(result);
    } catch (err: any) {
        console.error('[IECR] Execute error:', err.message);
        res.status(err.name === 'ZodError' ? 400 : 500).json({ error: err.message });
    }
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════╗
║   CREATIVE LIBERATION ENGINE — GENMEDIA STUDIO v5.1        ║
║   Port ${PORT}                                   ║
╠══════════════════════════════════════════════════╣
║   POST /generate         — Single generation     ║
║   POST /batch            — Parallel batch        ║
║   POST /iecr/decompose   — IECR brief → graph    ║
║   POST /iecr/execute     — IECR run graph        ║
║   GET  /health           — Provider health       ║
╚══════════════════════════════════════════════════╝
`);
});

export { app };
export default app;


