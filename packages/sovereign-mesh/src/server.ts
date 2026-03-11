import { createServer, type IncomingMessage, type ServerResponse } from 'http';
import { collectWorkstationSnapshot } from './cortex/workstation-agent.js';
import { collectNASSnapshot } from './cortex/nas-client.js';
import { collectGCPSnapshot } from './cortex/gcp-watcher.js';
import { buildAttentionBrief, formatBootPanel } from './nerve/attention-engine.js';
import type { MeshSnapshot } from './schema/index.js';

// ─── SAR API Server ───────────────────────────────────────────────────────────
// Extends the sovereign mesh with a REST API for AVERI to query.
// Runs standalone or sits alongside the dispatch server.
// Routes:
//   GET /health                  — liveness probe
//   GET /api/sar/snapshot        — full mesh snapshot (all tiers)
//   GET /api/sar/workstation     — workstation tier only
//   GET /api/sar/nas             — NAS tier only
//   GET /api/sar/gcp             — GCP tier only
//   GET /api/sar/attention       — NERVE attention brief
//   GET /api/sar/boot-panel      — AVERI boot panel formatted string

const PORT = 5051;

// Simple in-memory cache — refreshed every 60 seconds
let cachedSnapshot: MeshSnapshot | null = null;
let lastRefresh = 0;
const CACHE_TTL = 60_000;

async function getSnapshot(): Promise<MeshSnapshot> {
    const now = Date.now();
    if (cachedSnapshot && (now - lastRefresh) < CACHE_TTL) {
        return cachedSnapshot;
    }

    console.log('[SAR] Refreshing mesh snapshot...');
    const [workstation, nas, gcp] = await Promise.all([
        collectWorkstationSnapshot(),
        collectNASSnapshot(),
        collectGCPSnapshot(),
    ]);

    const snapshot: MeshSnapshot = {
        captured_at: new Date().toISOString(),
        workstation,
        nas,
        gcp,
        attention: buildAttentionBrief({ captured_at: new Date().toISOString(), workstation, nas, gcp, attention: null! }),
    };

    snapshot.attention = buildAttentionBrief(snapshot);
    cachedSnapshot = snapshot;
    lastRefresh = now;
    return snapshot;
}

function json(res: ServerResponse, data: unknown, status = 200): void {
    res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(data, null, 2));
}

function text(res: ServerResponse, data: string, status = 200): void {
    res.writeHead(status, { 'Content-Type': 'text/plain' });
    res.end(data);
}

async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = req.url ?? '/';
    const method = req.method ?? 'GET';

    if (method !== 'GET') {
        json(res, { error: 'Method not allowed' }, 405);
        return;
    }

    try {
        switch (url) {
            case '/health':
                json(res, { status: 'operational', service: 'sovereign-mesh-sar', ts: new Date().toISOString() });
                return;

            case '/api/sar/snapshot': {
                const snap = await getSnapshot();
                json(res, snap);
                return;
            }

            case '/api/sar/workstation': {
                const snap = await getSnapshot();
                json(res, snap.workstation);
                return;
            }

            case '/api/sar/nas': {
                const snap = await getSnapshot();
                json(res, snap.nas);
                return;
            }

            case '/api/sar/gcp': {
                const snap = await getSnapshot();
                json(res, snap.gcp);
                return;
            }

            case '/api/sar/attention': {
                const snap = await getSnapshot();
                json(res, snap.attention);
                return;
            }

            case '/api/sar/boot-panel': {
                const snap = await getSnapshot();
                text(res, formatBootPanel(snap.attention));
                return;
            }

            default:
                json(res, { error: 'Not found', available: ['/health', '/api/sar/snapshot', '/api/sar/workstation', '/api/sar/nas', '/api/sar/gcp', '/api/sar/attention', '/api/sar/boot-panel'] }, 404);
        }
    } catch (err) {
        console.error('[SAR] Handler error:', err);
        json(res, { error: 'Internal server error' }, 500);
    }
}

const server = createServer((req, res) => {
    void handler(req, res);
});

server.listen(PORT, () => {
    console.log(`[SAR] Sovereign Mesh Intelligence API running on :${PORT}`);
    console.log(`[SAR] Boot panel: http://localhost:${PORT}/api/sar/boot-panel`);
    console.log(`[SAR] Full snapshot: http://localhost:${PORT}/api/sar/snapshot`);
});
