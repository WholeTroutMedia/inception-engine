/**
 * @inception/blueprints — HTTP Server
 *
 * Creative Liberation Engine v5.0.0 (GENESIS)
 *
 * REST API server for the Blueprint runtime. Exposes:
 *   GET  /health             — Health check
 *   GET  /blueprints         — List all registered blueprints
 *   GET  /blueprints/:id     — Get a specific blueprint definition
 *   GET  /blueprints/vertical/:vertical — Get blueprints by vertical
 *   POST /blueprint/run      — Execute a Blueprint end-to-end
 *
 * Default port: 4200 (configurable via BLUEPRINTS_PORT env var)
 *
 * Constitutional: Article II (Sovereignty) — self-hosted, Article IX — complete
 */

import 'dotenv/config';
import express from 'express';
import type { Request, Response, Express } from 'express';
import { BLUEPRINT_REGISTRY, getBlueprintById, getBlueprintsByVertical } from './index.js';
import { runBlueprint } from './runner.js';
import { BlueprintRunInputSchema } from './types.js';
import type { Blueprint } from './types.js';

// ── Config ────────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.BLUEPRINTS_PORT || '4200', 10);

// ── App ───────────────────────────────────────────────────────────────────────

const app: Express = express();
app.use(express.json({ limit: '10mb' }));

// ── CORS (permissive for internal services) ───────────────────────────────────
app.use((_req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

// ── GET /health ───────────────────────────────────────────────────────────────

app.get('/health', (_req: Request, res: Response) => {
    res.json({
        status: 'operational',
        service: 'inception-blueprints',
        version: '5.0.0',
        blueprints_loaded: BLUEPRINT_REGISTRY.length,
        timestamp: new Date().toISOString(),
    });
});

// ── GET /blueprints ───────────────────────────────────────────────────────────

app.get('/blueprints', (_req: Request, res: Response) => {
    res.json({
        total: BLUEPRINT_REGISTRY.length,
        blueprints: BLUEPRINT_REGISTRY.map((b: Blueprint) => ({
            id: b.id,
            name: b.name,
            vertical: b.vertical,
            description: b.description,
            version: b.version,
            tags: b.tags,
            agent_team: b.agentTeam,
            trace_count: b.reasoningTraces.length,
            simulation_count: b.simulationSteps.length,
            constitutional_flags: b.constitutionalFlags,
        })),
    });
});

// ── GET /blueprints/vertical/:vertical ───────────────────────────────────────

app.get('/blueprints/vertical/:vertical', (req: Request, res: Response) => {
    const { vertical } = req.params;
    const validVerticals = ['finance', 'healthcare', 'media', 'telco', 'real-estate', 'custom'];

    if (!validVerticals.includes(vertical)) {
        return res.status(400).json({
            error: `Invalid vertical. Must be one of: ${validVerticals.join(', ')}`,
        });
    }

    const blueprints = getBlueprintsByVertical(
        vertical as Blueprint['vertical'],
    );

    res.json({
        vertical,
        total: blueprints.length,
        blueprints,
    });
});

// ── GET /blueprints/:id ───────────────────────────────────────────────────────

app.get('/blueprints/:id', (req: Request, res: Response) => {
    const blueprint = getBlueprintById(req.params.id);

    if (!blueprint) {
        return res.status(404).json({
            error: `Blueprint "${req.params.id}" not found`,
            available_ids: BLUEPRINT_REGISTRY.map((b) => b.id),
        });
    }

    res.json(blueprint);
});

// ── POST /blueprint/run ───────────────────────────────────────────────────────
/**
 * Execute a Blueprint by ID.
 *
 * Body:
 *   { blueprintId: string, query: string, context?: object, sessionId?: string }
 *
 * Returns full BlueprintRunResult with:
 *   - All reasoning trace outputs
 *   - Simulation step results
 *   - Constitutional approval
 *   - Total latency
 */
app.post('/blueprint/run', async (req: Request, res: Response) => {
    // Validate input
    const parsed = BlueprintRunInputSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.format() });
    }

    const input = parsed.data;

    // Find blueprint
    const blueprint = getBlueprintById(input.blueprintId);
    if (!blueprint) {
        return res.status(404).json({
            error: `Blueprint "${input.blueprintId}" not found`,
            available_ids: BLUEPRINT_REGISTRY.map((b) => b.id),
        });
    }

    console.log(
        `[BLUEPRINTS:SERVER] POST /blueprint/run — ${blueprint.name} | query: "${input.query.slice(0, 80)}"`,
    );

    try {
        const result = await runBlueprint(blueprint, input);

        res.json({
            ...result,
            blueprint_name: blueprint.name,
            vertical: blueprint.vertical,
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[BLUEPRINTS:SERVER] Run error:', message);
        res.status(500).json({ error: message });
    }
});

// ── POST /blueprint/validate ──────────────────────────────────────────────────
/**
 * Dry-run validation — ensure a blueprint configuration is valid without executing.
 */
app.post('/blueprint/validate', (req: Request, res: Response) => {
    const parsed = req.body;

    if (!parsed.id || !parsed.vertical || !parsed.reasoningTraces) {
        return res.status(400).json({
            valid: false,
            error: 'Missing required fields: id, vertical, reasoningTraces',
        });
    }

    const existing = getBlueprintById(parsed.id);

    res.json({
        valid: true,
        is_registered: Boolean(existing),
        trace_count: Array.isArray(parsed.reasoningTraces) ? parsed.reasoningTraces.length : 0,
        simulation_count: Array.isArray(parsed.simulationSteps)
            ? parsed.simulationSteps.length
            : 0,
        constitutional_flags: parsed.constitutionalFlags ?? [],
    });
});

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════╗
║   INCEPTION BLUEPRINTS — VERTICAL RUNTIME        ║
║   v5.0.0 | Port ${PORT}                            ║
╠══════════════════════════════════════════════════╣
║   Blueprints Loaded: ${BLUEPRINT_REGISTRY.length.toString().padEnd(27)}║
║   Verticals: Finance · Healthcare · Media        ║
╠══════════════════════════════════════════════════╣
║   Endpoints:                                     ║
║     GET  /health              — Health check     ║
║     GET  /blueprints          — List all         ║
║     GET  /blueprints/:id      — Get one          ║
║     GET  /blueprints/vertical/:v — By vertical   ║
║     POST /blueprint/run       — Execute blueprint║
║     POST /blueprint/validate  — Dry-run validate ║
╚══════════════════════════════════════════════════╝
    `);
});

export { app };
export default app;
