/**
 * THE PLUG — Relay-MCP Broker Server
 * Express HTTP server exposing plug registry, discovery, and status.
 * Port 5000 | Docker healthcheck: GET /health
 */

import express, { Request, Response, Application } from 'express';
import cors from 'cors';
import { loadRegistry, discoverActivePlugs, getPlugStatus, getPlugsForAgent, logPlugStatus } from './registry.js';

const app: Application = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
    res.json({
        status: 'operational',
        service: 'inception-relay-mcp',
        version: '1.0.0-genesis',
        timestamp: new Date().toISOString(),
    });
});

// ── Plug Status — which plugs are active based on env vars ────────────────────
app.get('/status', (_req: Request, res: Response) => {
    try {
        const statuses = getPlugStatus();
        const active = statuses.filter(s => s.active);
        res.json({
            total: statuses.length,
            active: active.length,
            plugs: statuses,
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ── Discovery — return all plugs whose env vars are present ───────────────────
app.post('/discover', (_req: Request, res: Response) => {
    try {
        const active = discoverActivePlugs();
        res.json({ active_plugs: active, count: active.length });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ── Agent Plugs — which plugs can a specific agent use ────────────────────────
app.get('/agent/:agentId/plugs', (req: Request, res: Response) => {
    try {
        const agentId = String(req.params.agentId);
        const plugs = getPlugsForAgent(agentId);
        res.json({ agent: agentId, plugs, count: plugs.length });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ── Registry — raw plug registry ──────────────────────────────────────────────
app.get('/registry', (_req: Request, res: Response) => {
    try {
        const registry = loadRegistry();
        res.json(registry);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════╗
║   THE PLUG — RELAY-MCP BROKER                    ║
║   v1.0.0-genesis | Port ${PORT}                     ║
╠══════════════════════════════════════════════════╣
║   GET  /health          — Health check           ║
║   GET  /status          — Plug status            ║
║   POST /discover        — Active plug discovery  ║
║   GET  /agent/:id/plugs — Agent permissions      ║
║   GET  /registry        — Raw registry           ║
╚══════════════════════════════════════════════════╝
    `);
    logPlugStatus();
});

export { app };
