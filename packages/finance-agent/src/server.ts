/**
 * Inception Finance Agent — HTTP Server
 *
 * Express server exposing the FinanceAgent as REST endpoints for:
 * - Console dashboard integration
 * - Manual signal triggering
 * - Status monitoring
 * - Emergency stop
 */

import 'dotenv/config';
import express, { Application } from 'express';
import cors from 'cors';
import { FinanceAgent } from './vault.js';
import { MODERATE_AGGRESSIVE_CONFIG } from './guards/risk-engine.js';

const app: Application = express();
app.use(cors());
app.use(express.json());

const PORT = process.env['FINANCE_AGENT_PORT'] ?? 4500;

// Initialize agent
const agent = new FinanceAgent({
    riskConfig: MODERATE_AGGRESSIVE_CONFIG,
    genkitUrl: process.env['GENKIT_URL'] ?? 'http://genkit:4100',
    scanIntervalMs: parseInt(process.env['SCAN_INTERVAL_MS'] ?? '60000'),
    liveTrading: process.env['LIVE_TRADING'] === 'true', // Must be explicitly set
});

// ---- Health ----------------------------------------------------------------

app.get('/health', (_req, res) => {
    res.json({ status: 'operational', service: 'inception-finance-agent', version: '1.0.0' });
});

// ---- Status ----------------------------------------------------------------

app.get('/status', async (_req, res) => {
    try {
        const status = await agent.getStatus();
        res.json(status);
    } catch (err: unknown) {
        res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
});

// ---- Scan History ----------------------------------------------------------

app.get('/scans', (_req, res) => {
    res.json(agent.getScanHistory());
});

// ---- Manual Scan -----------------------------------------------------------

app.post('/scan', async (_req, res) => {
    try {
        const result = await agent.scan();
        res.json(result);
    } catch (err: unknown) {
        res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
});

// ---- Start Agent -----------------------------------------------------------

app.post('/start', async (_req, res) => {
    try {
        await agent.start();
        res.json({ message: 'Finance agent started', timestamp: new Date().toISOString() });
    } catch (err: unknown) {
        res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
});

// ---- Emergency Stop --------------------------------------------------------

app.post('/stop', (_req, res) => {
    agent.stop();
    res.json({ message: 'Finance agent stopped', timestamp: new Date().toISOString() });
});

// ---- Boot ------------------------------------------------------------------

app.listen(PORT, async () => {
    console.log(`
╔════════════════════════════════════════╗
║   INCEPTION FINANCE AGENT v1.0.0       ║
║   Port: ${PORT}                          ║
╠════════════════════════════════════════╣
║   POST /start    — Start agent         ║
║   POST /stop     — Emergency stop      ║
║   POST /scan     — Manual scan         ║
║   GET  /status   — Live status         ║
║   GET  /scans    — Scan history        ║
║   GET  /health   — Health check        ║
╚════════════════════════════════════════╝
    `);

    // Auto-start if env flag set
    if (process.env['AUTO_START'] === 'true') {
        console.log('[FA] AUTO_START=true — starting agent...');
        await agent.start();
    } else {
        console.log('[FA] AUTO_START not set — call POST /start to activate agent');
    }
});

export default app;
