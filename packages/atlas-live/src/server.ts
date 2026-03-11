/**
 * ATLAS LIVE — Broadcast Engine Server
 * Express HTTP server exposing CasparCG graphics engine.
 * Port 8000 | Docker healthcheck: GET /health
 */

import express, { Request, Response, Application } from 'express';

const app: Application = express();
app.use(express.json());

const PORT = process.env.PORT || 8000;

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
    res.json({
        status: 'operational',
        service: 'inception-atlas-live',
        version: '1.0.0-genesis',
        timestamp: new Date().toISOString(),
        caspar_host: process.env.CASPAR_HOST || 'not-configured',
        capabilities: ['lower-third', 'fullscreen-slate', 'scoreboard', 'social-post', 'countdown', 'video-playout'],
    });
});

// ── Graphics Commands ─────────────────────────────────────────────────────────
app.post('/graphics/lower-third', async (req: Request, res: Response) => {
    try {
        const { name, title, subtitle } = req.body;
        if (!name || !title) {
            res.status(400).json({ error: '"name" and "title" are required' });
            return;
        }
        // Import engine dynamically to avoid top-level net import failure when CasparCG isn't available
        const { AtlasGraphicsEngine } = await import('./engine.js');
        const engine = new AtlasGraphicsEngine();
        await engine.connect();
        await engine.showLowerThird(name, title, subtitle);
        res.json({ status: 'sent', command: 'lower-third', name, title });
    } catch (err: any) {
        res.status(500).json({ error: err.message, note: 'CasparCG may not be available' });
    }
});

app.post('/graphics/slate', async (req: Request, res: Response) => {
    try {
        const { headline, subtext, style } = req.body;
        if (!headline) {
            res.status(400).json({ error: '"headline" is required' });
            return;
        }
        const { AtlasGraphicsEngine } = await import('./engine.js');
        const engine = new AtlasGraphicsEngine();
        await engine.connect();
        await engine.showFullscreenSlate(headline, subtext, style || 'dark');
        res.json({ status: 'sent', command: 'fullscreen-slate', headline });
    } catch (err: any) {
        res.status(500).json({ error: err.message, note: 'CasparCG may not be available' });
    }
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════╗
║   ATLAS LIVE — BROADCAST ENGINE                  ║
║   v1.0.0-genesis | Port ${PORT}                     ║
╠══════════════════════════════════════════════════╣
║   GET  /health              — Health check       ║
║   POST /graphics/lower-third — Lower third       ║
║   POST /graphics/slate      — Fullscreen slate   ║
╚══════════════════════════════════════════════════╝
    `);
});

export { app };
