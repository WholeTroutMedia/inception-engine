/**
 * GOD PROMPT — Creative Pipeline Server
 * Express HTTP server exposing Genkit flows for brand creation and content remix.
 * Port 7000 | Docker healthcheck: GET /health
 */

import express, { Request, Response, Application } from 'express';
import cors from 'cors';
import { godPromptFlow, remixFlow } from './flows/god-prompt.flow.js';
import { gtmKitFlow } from './flows/gtm-kit.flow.js';
import { VisionScoreFlow } from './loras/vision.js';
import { AudioDirectorFlow } from './loras/audio.js';
import { SpatialDirectorFlow } from './loras/spatial.js';
import { CreativeDirectorFlow } from './vision/director.js';

const app: Application = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.PORT || 7000;

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
    res.json({
        status: 'operational',
        service: 'inception-god-prompt',
        version: '1.0.0-genesis',
        timestamp: new Date().toISOString(),
        flows: ['godPrompt', 'remix', 'gtmKit', 'iris', 'visionLora', 'audioLora', 'spatialLora'],
    });
});

// ── GOD PROMPT — Full Creative Package ────────────────────────────────────────
app.post('/god-prompt', async (req: Request, res: Response) => {
    try {
        const { brief, client_id, skip_images } = req.body;
        if (!brief || !client_id) {
            res.status(400).json({ error: '"brief" and "client_id" are required' });
            return;
        }
        const result = await godPromptFlow({ brief, client_id, skip_images: skip_images ?? true });
        res.json(result);
    } catch (err: any) {
        console.error('[GOD-PROMPT] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── REMIX — Multi-platform Content Remixing ───────────────────────────────────
app.post('/remix', async (req: Request, res: Response) => {
    try {
        const { source_content, target_platforms, client_id, tone_adjustment } = req.body;
        if (!source_content || !target_platforms || !client_id) {
            res.status(400).json({ error: '"source_content", "target_platforms", and "client_id" are required' });
            return;
        }
        const result = await remixFlow({ source_content, target_platforms, client_id, tone_adjustment });
        res.json(result);
    } catch (err: any) {
        console.error('[REMIX] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── GTM KIT — Full Go-to-Market Automation ────────────────────────────────────
app.post('/gtm-kit', async (req: Request, res: Response) => {
    try {
        const { one_sentence_brief, output_dir, agency_name, skip_demo_video, skip_demo_app, ...rest } = req.body;
        if (!one_sentence_brief) {
            res.status(400).json({ error: '"one_sentence_brief" is required' });
            return;
        }
        const result = await gtmKitFlow({
            one_sentence_brief,
            output_dir: output_dir ?? '/tmp/gtm-output',
            agency_name: agency_name ?? 'Whole Trout Media',
            skip_demo_video: skip_demo_video ?? false,
            skip_demo_app: skip_demo_app ?? false,
            ...rest,
        });
        res.json(result);
    } catch (err: any) {
        console.error('[GTM-KIT] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── IRIS — Creative Vision Document ───────────────────────────────────────────
app.post('/iris', async (req: Request, res: Response) => {
    try {
        const { brief } = req.body;
        if (!brief) { res.status(400).json({ error: '"brief" is required' }); return; }
        const result = await CreativeDirectorFlow({ brief });
        res.json(result);
    } catch (err: any) {
        console.error('[IRIS] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── LoRA: VISION — Visual Quality Scorer ──────────────────────────────────────
app.post('/lora/vision', async (req: Request, res: Response) => {
    try {
        const result = await VisionScoreFlow(req.body);
        res.json(result);
    } catch (err: any) {
        console.error('[VISION LoRA] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── LoRA: AUDIO — Acoustic Direction Generator ────────────────────────────────
app.post('/lora/audio', async (req: Request, res: Response) => {
    try {
        const result = await AudioDirectorFlow(req.body);
        res.json(result);
    } catch (err: any) {
        console.error('[AUDIO LoRA] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── LoRA: SPATIAL — 3D/Volumetric Direction Generator ─────────────────────────
app.post('/lora/spatial', async (req: Request, res: Response) => {
    try {
        const result = await SpatialDirectorFlow(req.body);
        res.json(result);
    } catch (err: any) {
        console.error('[SPATIAL LoRA] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════╗
║   GOD PROMPT — CREATIVE PIPELINE                         ║
║   v1.0.0-genesis | Port ${PORT}                             ║
╠══════════════════════════════════════════════════════════╣
║   GET  /health          — Health check                   ║
║   POST /god-prompt      — Full creative package           ║
║   POST /remix           — Multi-platform remix            ║
║   POST /gtm-kit         — Go-to-market automation         ║
║   POST /iris            — Creative Vision Document        ║
║   POST /lora/vision     — VISION quality scorer           ║
║   POST /lora/audio      — AUDIO direction generator       ║
║   POST /lora/spatial    — SPATIAL 3D direction            ║
╚══════════════════════════════════════════════════════════╝
    `);
});

export { app };
