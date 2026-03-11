/**
 * @inception/live-animate — Studio Server
 *
 * Local Express + WebSocket server on port 4242.
 * - Serves studio/index.html and assets
 * - Proxies /api/comfyui/* → localhost:8188 (CORS bypass)
 * - WebSocket server on /ws — streams live entity snapshots to browser clients
 * - /api/engine/stats — live engine telemetry
 * - /api/engine/start?feed=nba|f1|opensky — start a feed
 */

import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { fileURLToPath } from 'url';
import path from 'path';
import { spawn } from 'child_process';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { LiveAnimateEngine } from '../src/engine.js';
import { NbaAdapter } from '../src/feeds/nba-stats.js';
import { OpenF1Adapter } from '../src/feeds/openf1.js';
import { OpenSkyAdapter } from '../src/feeds/opensky.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 4242;
const COMFYUI_DIR = 'D:\\ComfyUI';
const COMFYUI_URL = 'http://localhost:8188';

app.use(express.json());

// ─── Static — serve studio HTML + assets ────────────────────────────────────
app.use(express.static(path.join(__dirname)));

// ─── Engine instances (one per active feed) ──────────────────────────────────
const engines = new Map<string, LiveAnimateEngine>();

function getOrCreateEngine(feed: string): LiveAnimateEngine {
    if (engines.has(feed)) return engines.get(feed)!;

    let adapter;
    switch (feed) {
        case 'f1':       adapter = new OpenF1Adapter(); break;
        case 'opensky':  adapter = new OpenSkyAdapter(); break;
        case 'nba':
        default:         adapter = new NbaAdapter(); break;
    }

    const engine = new LiveAnimateEngine({ adapter });
    engines.set(feed, engine);
    return engine;
}

// ─── ComfyUI status ─────────────────────────────────────────────────────────
app.get('/api/comfyui/status', async (_req, res) => {
    try {
        const r = await fetch(`${COMFYUI_URL}/system_stats`, { signal: AbortSignal.timeout(1500) });
        const data = await r.json() as unknown;
        res.json({ running: true, stats: data });
    } catch {
        res.json({ running: false });
    }
});

// ─── ComfyUI start ───────────────────────────────────────────────────────────
app.post('/api/comfyui/start', (_req, res) => {
    try {
        const child = spawn(
            'cmd', ['/c', `cd /d ${COMFYUI_DIR} && .\\venv\\Scripts\\python.exe main.py --listen 0.0.0.0 --port 8188`],
            { detached: true, stdio: 'ignore', shell: false }
        );
        child.unref();
        res.json({ started: true, pid: child.pid });
    } catch (err) {
        res.status(500).json({ error: (err as Error).message });
    }
});

// ─── ComfyUI proxy ───────────────────────────────────────────────────────────
app.use('/api/comfyui', createProxyMiddleware({
    target: COMFYUI_URL,
    changeOrigin: true,
    pathRewrite: { '^/api/comfyui': '' },
}));

// ─── Engine stats ────────────────────────────────────────────────────────────
app.get('/api/engine/stats', (_req, res) => {
    const stats: Record<string, unknown> = {};
    for (const [feed, engine] of engines) {
        stats[feed] = engine.getStats();
    }
    res.json({ engines: stats, feeds: [...engines.keys()] });
});

// ─── Engine start ────────────────────────────────────────────────────────────
app.post('/api/engine/start', async (req, res) => {
    const feed = (req.body as { feed?: string }).feed ?? 'nba';
    try {
        const engine = getOrCreateEngine(feed);
        if (!engine.listenerCount('snapshot')) {
            await engine.start();
        }
        res.json({ started: true, feed });
    } catch (err) {
        res.status(500).json({ error: (err as Error).message });
    }
});

// ─── HTTP + WebSocket server ─────────────────────────────────────────────────
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const clients = new Set<WebSocket>();

wss.on('connection', (ws, req) => {
    clients.add(ws);
    const feedParam = new URL(req.url ?? '/', `http://localhost`).searchParams.get('feed') ?? 'nba';
    console.log(`[studio] 🔌 Client connected — feed: ${feedParam} (${clients.size} total)`);

    // Auto-start the requested engine
    const engine = getOrCreateEngine(feedParam);
    const alreadyRunning = engine.listenerCount('snapshot') > 0;

    // Wire snapshot relay to this client
    const onSnapshot = (entities: unknown) => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'snapshot', entities, ts: Date.now(), feed: feedParam }));
        }
    };

    engine.on('snapshot', onSnapshot);

    if (!alreadyRunning) {
        engine.start().catch((err: Error) => {
            console.error(`[studio] Engine start failed:`, err.message);
        });
    }

    ws.on('message', (raw) => {
        try {
            const msg = JSON.parse(raw.toString()) as { type: string; feed?: string };
            if (msg.type === 'ping') ws.send(JSON.stringify({ type: 'pong', ts: Date.now() }));
            if (msg.type === 'stats') ws.send(JSON.stringify({ type: 'stats', ...engine.getStats() }));
        } catch { /* ignore malformed */ }
    });

    ws.on('close', () => {
        clients.delete(ws);
        engine.removeListener('snapshot', onSnapshot);
        console.log(`[studio] 🔌 Client disconnected (${clients.size} remaining)`);
    });

    ws.on('error', () => clients.delete(ws));

    // Send initial handshake
    ws.send(JSON.stringify({ type: 'connected', feed: feedParam, ts: Date.now() }));
});

server.listen(PORT, () => {
    console.log(`\n🎬 LIVE ANIMATE STUDIO`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`   Studio:    http://localhost:${PORT}`);
    console.log(`   WebSocket: ws://localhost:${PORT}/ws?feed=nba`);
    console.log(`   ComfyUI:   ${COMFYUI_URL} (start via UI)`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`   Options:   D=Skeleton  A=Avatar  C=Shader  B=StyleTransfer`);
    console.log(`\n   Open Chrome → allow camera → all 4 panels start live.\n`);
});

export default app;
