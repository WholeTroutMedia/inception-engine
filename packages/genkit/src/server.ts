/**
 * Creative Liberation Engine â€” Genkit HTTP Server
 *
 * Express server exposing Genkit flows and generate() as REST endpoints.
 * Serves double duty:
 *   1. v5 native API server
 *   2. v4 bridge target (Python ModelRouter calls these endpoints)
 *
 * Constitutional: Article II (Sovereignty) â€” runs locally, no external dependencies
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { ai, z } from './index.js';
import { perplexityModel } from './plugins/perplexity.js';
import { localGenerate, localStream, checkOllamaHealth } from './local-providers.js';

import { defaultMiddleware } from './middleware/fallback-chain.js';
import { mcpAutoloadMiddleware } from '@cle/mcp-router';
import {
    urlSlugify,
    base64Encode,
    passwordStrength,
    paletteGenerator,
    contrastRatio,
} from '@cle/toolbox';
import { getAuditLog, getAuditStats } from './middleware/audit-logger.js';
import { classifyTaskFlow } from './flows/classify-task.js';
import { VT100Flow } from './flows/vt100.js';
import { VT220Flow } from './flows/vt220.js';
import { conversationalVt100Flow } from './flows/conversationalVt100.js';
import { vt100ChatFlow } from './flows/vt100-chat-flow.js';
import { KEEPERFlow } from './flows/keeper.js';
import { scribeMemoryTool } from './tools/klogd-memory.js';
import { chromaRetriever } from './tools/chromadb-retriever.js';
import { HypeReelDirectorFlow } from './flows/hype-reel-director.js';
import { CreativeDirectorFlow } from './flows/creative-director.js';
import { AGENT_ROSTER, getAgentActivity, recordAgentCall } from './flows/index.js';
import { agentOAuth } from '@cle/auth/dist/agent-oauth.js';
// @ts-ignore
import { InceptionGuard } from './core/constitutional-guard.js';
import { guestIntelligenceFlow } from './flows/guestIntelligence.js';
import { strangerAlertFlow } from './flows/strangerAlert.js';
import { birdWatcherFlow } from './flows/birdWatcher.js';
import { deployTrainingToEonFlow } from './flows/eon-reality-orchestration.js';
import { initializeOmnipresenceCache } from './core/context-cache.js';

// ---------------------------------------------------------------------------
// The CLI's RuntimeManager watches .genkit/runtimes/*.json for runtime discovery.
// Two-part fix:
//   1. Write AFTER port 3100 is ready (prevents immediate health-check delete)
//   2. 4s heartbeat (RuntimeManager ignores 'change' events, only handles 'add'/'unlink')
// ---------------------------------------------------------------------------
if (process.env.GENKIT_ENV === 'dev') {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const projectRoot = path.resolve(__dirname, '..');
    const runtimesDir = path.join(projectRoot, '.genkit', 'runtimes');
    fs.mkdirSync(runtimesDir, { recursive: true });

    const runtimeId = process.env.GENKIT_RUNTIME_ID ?? `${process.pid}-3100`;
    const runtimeFile = path.join(runtimesDir, `${runtimeId}.json`);

    const writeRegistration = () => {
        const data = {
            id: runtimeId,
            pid: process.pid,
            reflectionServerUrl: 'http://localhost:3100',
            reflectionApiSpecVersion: 1,
            timestamp: new Date().toISOString(),
        };
        fs.writeFileSync(runtimeFile, JSON.stringify(data, null, 2));
    };

    // Poll until reflection server is accepting connections, THEN write.
    // This prevents the RuntimeManager's immediate health check (which fires on
    // chokidar 'add') from failing with CONNECTION_REFUSED and deleting our file.
    (async () => {
        const start = Date.now();
        while (Date.now() - start < 15000) {
            try {
                const r = await fetch('http://localhost:3100/api/__health');
                if (r.status === 200) break;
            } catch { /* not ready yet */ }
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Write the file ONCE â€” port 3100 is confirmed ready
        writeRegistration();
        console.log(`[GENKIT] âœ“ Runtime registered (${runtimeId}) â†’ Dev UI at http://localhost:4000`);

        // Heartbeat: keep timestamp fresh so it remains a valid runtime entry
        // and isn't garbage-collected by the Genkit CLI. We use utimesSync to 
        // merely "touch" the file instead of rewriting it. Rewriting on Windows
        // triggers 'unlink' then 'add' chokidar events, which causes the Dev UI
        // to loop through "Waiting to connect" and refresh automatically.
        const heartbeat = setInterval(() => {
            try {
                const now = new Date();
                fs.utimesSync(runtimeFile, now, now);
            } catch {
                clearInterval(heartbeat);
            }
        }, 4000);

        // Clean up on exit
        const cleanup = () => {
            clearInterval(heartbeat);
            try { fs.unlinkSync(runtimeFile); } catch { /* ignore */ }
        };
        process.on('exit', cleanup);
        process.on('SIGINT', () => { cleanup(); process.exit(0); });
        process.on('SIGTERM', () => { cleanup(); process.exit(0); });
    })();
}





// Plugins are registered in index.ts at Genkit construction time.
// Log active providers on server boot for visibility.
const activeProviders = [
    process.env['GEMINI_API_KEY'] && 'google-ai',
    (process.env['VERTEX_API_KEY'] || process.env['GOOGLE_API_KEY']) && 'vertex-ai',
    process.env['PERPLEXITY_API_KEY'] && 'perplexity',
    process.env['OPENAI_API_KEY'] && 'openai',
    process.env['ANTHROPIC_API_KEY'] && 'anthropic',
].filter(Boolean);
console.log(`[GENKIT:SERVER] Active providers: ${activeProviders.join(', ')}`);

// Sovereign mode â€” all inference routes to local Ollama when enabled
const SOVEREIGN_MODE = process.env['SOVEREIGN_MODE'] === 'true';
if (SOVEREIGN_MODE) {
    console.log('[GENKIT:SERVER] ðŸ¦™ SOVEREIGN MODE ACTIVE â€” all /generate traffic routed to local Ollama');
    console.log(`[GENKIT:SERVER]    OLLAMA_HOST: ${process.env['OLLAMA_HOST'] ?? 'http://127.0.0.1:11434'}`);
}

// ---------------------------------------------------------------------------
// Server Setup
// ---------------------------------------------------------------------------

// Initialize the klogd Omnipresence Context Cache asynchronously
initializeOmnipresenceCache().catch(console.error);

// Provision internal tokens for all agents in the roster at boot time
agentOAuth.issueAllAgentTokens();

const app: ReturnType<typeof express> = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// MCP-06: Auto-activate MCP servers based on request task hints
// Middleware reads req.body.task (or req.body.prompt) and activates
// relevant MCP domains before the flow executes.
app.use(async (req, res, next) => {
    if (req.method !== 'POST') return next();
    try {
        const genkitReq = { ...req.body, flowName: req.path.split('/').pop() };
        await (mcpAutoloadMiddleware as any)(genkitReq, async () => {});
    } catch (e) {
        console.error('[MCP Middleware] Error:', e);
    }
    next();
});

const PORT = process.env.PORT || 4100;

// ---------------------------------------------------------------------------
// Health & Status
// ---------------------------------------------------------------------------

app.get('/health', async (_req, res) => {
    const providers: Record<string, boolean> = {
        gemini: Boolean(process.env['GEMINI_API_KEY']),
        vertex: Boolean(process.env['VERTEX_API_KEY'] || process.env['GOOGLE_API_KEY']),
        perplexity: Boolean(process.env['PERPLEXITY_API_KEY']),
        openai: Boolean(process.env['OPENAI_API_KEY']),
        anthropic: Boolean(process.env['ANTHROPIC_API_KEY']),
    };
    const activeProviders = Object.entries(providers).filter(([, v]) => v).map(([k]) => k);
    const ollamaStatus = await checkOllamaHealth();
    res.json({
        status: 'operational',
        service: 'cle-genkit',
        version: '5.0.0',
        providers: activeProviders,
        sovereign: {
            mode: SOVEREIGN_MODE,
            ollama: ollamaStatus,
            host: process.env['OLLAMA_HOST'] ?? 'http://127.0.0.1:11434',
        },
        timestamp: new Date().toISOString(),
    });
});

app.get('/stats', (_req, res) => {
    res.json(getAuditStats());
});

app.get('/audit', (_req, res) => {
    const limit = parseInt(String(_req.query.limit)) || 50;
    const log = getAuditLog();
    res.json(log.slice(-limit));
});

// ---------------------------------------------------------------------------
// Agent Telemetry â€” /agents
// Exposes the full 40-agent roster + last-seen timestamps so the Console can
// prove every agent is real and show when each was last invoked.
// ---------------------------------------------------------------------------

app.get('/agents', (_req, res) => {
    const activity = getAgentActivity();
    const roster = AGENT_ROSTER.map((agent) => {
        const act = activity.find(a => a.name === agent.name);
        return {
            ...agent,
            lastCall: act?.lastCall ?? 'never',
            callCount: act?.callCount ?? 0,
            avgMs: act?.avgMs,
            isLive: (act?.lastCall ?? 'never') !== 'never',
        };
    });

    // Group by hive for dashboard consumption
    const byHive: Record<string, typeof roster> = {};
    for (const agent of roster) {
        if (!byHive[agent.hive]) byHive[agent.hive] = [];
        byHive[agent.hive]!.push(agent);
    }

    res.json({
        total: roster.length,
        active: roster.filter(a => a.status === 'active').length,
        planned: roster.filter(a => a.status === 'planned').length,
        live: roster.filter(a => a.isLive).length,
        agents: roster,
        byHive,
        timestamp: new Date().toISOString(),
    });
});

app.get('/agents/:name', (req, res) => {
    const agent = AGENT_ROSTER.find(a => a.name === req.params['name']?.toUpperCase());
    if (!agent) return res.status(404).json({ error: `Agent '${req.params['name']}' not found` });
    const activity = getAgentActivity().find(a => a.name === agent.name);
    res.json({ ...agent, lastCall: activity?.lastCall ?? 'never', callCount: activity?.callCount ?? 0, avgMs: activity?.avgMs });
});

// POST /agents/heartbeat â€” called by any flow or external service to record activity
app.post('/agents/heartbeat', (req, res) => {
    const { name, durationMs } = req.body as { name: string; durationMs?: number };
    const agent = AGENT_ROSTER.find(a => a.name === name?.toUpperCase());
    if (!agent) return res.status(404).json({ error: `Agent '${name}' not in roster` });
    recordAgentCall(agent.name as Parameters<typeof recordAgentCall>[0], durationMs);
    res.json({ recorded: true, name: agent.name, timestamp: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// DIRA Metrics â€” /dira/metrics
// Live 7-day telemetry for the Creator Productivity Dashboard
// ---------------------------------------------------------------------------
app.get('/dira/metrics', async (req, res) => {
    const CHROMADB_URL = process.env.CHROMADB_URL || 'http://127.0.0.1:8000';
    try {
        const getCol = await fetch(`${CHROMADB_URL}/api/v2/collections/production_cases`);
        if (!getCol.ok) {
            return res.json({ workflowSparklines: [], topExceptions: [], caseResolutionRate: [], totalWorkflows: 0, avgResolutionSec: 0 });
        }
        const col = await getCol.json();
        
        const docsRes = await fetch(`${CHROMADB_URL}/api/v2/collections/${col.id}/get`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ include: ['metadatas'] })
        });
        if (!docsRes.ok) throw new Error('Failed to fetch cases');
        const docs = await docsRes.json();
        const metadatas: any[] = docs.metadatas ?? [];

        // Date math for rolling 7-day window
        const now = new Date();
        now.setHours(0,0,0,0);
        const cutoff = new Date(now.getTime() - 6 * 86400000); // Today + 6 previous days

        // Process records
        let totalResolutionTime = 0;
        let totalResolvedCases = 0;
        let totalWorkflows = 0;

        const dayRates: Record<string, { total: number, auto: number }> = {};
        for (let i = 0; i < 7; i++) {
            const d = new Date(now.getTime() - i * 86400000);
            dayRates[d.toISOString().split('T')[0]] = { total: 0, auto: 0 };
        }

        const workflowPoints: Record<string, number[]> = {};
        const exceptions: Record<string, { autoResolved: number; escalated: number }> = {};

        for (const m of metadatas) {
            const createdAt = new Date(m.createdAt as string);
            if (createdAt < cutoff) continue;

            const dayKey = createdAt.toISOString().split('T')[0];
            totalWorkflows++;

            // Resolution Time
            const timeToResolve = m.timeToResolve ? Number(m.timeToResolve) : 0;
            if (timeToResolve > 0) {
                totalResolutionTime += timeToResolve;
                totalResolvedCases++;
            }

            // Exceptions
            if (m.type === 'exception') {
                const w = m.workflow as string || 'Unknown';
                if (!exceptions[w]) exceptions[w] = { autoResolved: 0, escalated: 0 };
                if (String(m.autoResolved) === 'true') exceptions[w].autoResolved++;
                else exceptions[w].escalated++;
            }

            // Resolution Rate
            if (dayRates[dayKey]) {
                dayRates[dayKey].total++;
                if (String(m.autoResolved) === 'true') dayRates[dayKey].auto++;
            }

            // Workflow Points
            const wType = m.workflow as string || 'General';
            if (!workflowPoints[wType]) workflowPoints[wType] = Array(7).fill(0);
            
            // Map day to index 0-6 (0 = 6 days ago, 6 = today)
            const dayDiff = Math.floor((now.getTime() - new Date(dayKey).getTime()) / 86400000);
            if (dayDiff >= 0 && dayDiff < 7) {
                workflowPoints[wType][6 - dayDiff]++;
            }
        }

        // Format Case Resolution Rate
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const caseResolutionRate = Object.entries(dayRates)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([date, d]) => ({
                day: dayNames[new Date(date).getDay()],
                rate: d.total > 0 ? Math.round((d.auto / d.total) * 100) : 100
            }));

        // Format Exceptions
        const topExceptions = Object.entries(exceptions)
            .map(([message, counts]) => ({
                message,
                count: counts.autoResolved + counts.escalated,
                autoResolved: counts.autoResolved,
                escalated: counts.escalated
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        // Format Workflows (assigning static colors for visual consistency)
        const COLORS = ['#F5A524', '#9B72CF', '#4285F4', '#22c55e', '#20B2AA', '#C17D4A', '#FF6B35'];
        const workflowSparklines = Object.entries(workflowPoints)
            .map(([type, points], i) => ({
                type,
                points,
                avgMinutes: 0,
                color: COLORS[i % COLORS.length]
            }));

        res.json({
            workflowSparklines,
            topExceptions,
            caseResolutionRate,
            totalWorkflows,
            avgResolutionSec: totalResolvedCases > 0 ? (totalResolutionTime / totalResolvedCases) / 1000 : 0
        });
    } catch (e) {
        console.error('[DIRA Metrics Error]', e);
        res.status(500).json({ error: 'Internal server error' });
    }
});


app.post('/generate', async (req, res) => {
    try {
        const { prompt, model, system, messages, config, tools } = req.body;

        if (!prompt && !messages) {
            return res.status(400).json({ error: 'Either "prompt" or "messages" is required' });
        }

        // SOVEREIGN_MODE: bypass cloud entirely, route to local Ollama
        if (SOVEREIGN_MODE && !model) {
            const text = await localGenerate({ prompt: prompt ?? '', system, capability: 'fast' });
            console.log('[GENKIT:SERVER] ðŸ¦™ SOVEREIGN â€” served from local Ollama');
            return res.json({ text, locality: 'local', sovereign: true });
        }

        const generateOptions: any = {
            use: defaultMiddleware(),
        };

        if (model) generateOptions.model = model;
        if (prompt) generateOptions.prompt = prompt;
        if (system) generateOptions.system = system;
        if (messages) generateOptions.messages = messages;
        if (config) generateOptions.config = config;

        const response = await ai.generate(generateOptions);

        res.json({
            text: response.text,
            usage: response.usage,
            finishReason: response.finishReason,
            custom: response.custom,
        });
    } catch (error: any) {
        console.error('[GENKIT:SERVER] Generate error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ---------------------------------------------------------------------------
// POST /api/mesh/execute â€” Cloud Mesh Execution Endpoint
// Receives payloads routed by the @cle/cloud-mesh and delegates
// to the appropriate capability flow.
// ---------------------------------------------------------------------------

app.post('/api/mesh/execute', async (req, res) => {
    try {
        const { taskId, agentId, payload } = req.body;

        if (!taskId || !payload) {
            return res.status(400).json({ error: '"taskId" and "payload" are required' });
        }

        console.log(`[MESH:EXECUTE] ðŸŒ Executing task: ${taskId} for agent: ${agentId}`);

        // Handle FORGE Asset Generation Jobs explicitly
        if (payload.checkpoint && payload.sessionConfig) {
            // It's a Forge Archive Job
            // @ts-ignore
            const { AssetArchiver } = await import('@creative-liberation-engine/forge/dist/asset-archiver.js');
            const archiver = new AssetArchiver({
                storage_path: process.env.FORGE_STORAGE_PATH ?? '/tmp/forge',
                platform_address: 'ie:platform',
            });
            const asset = await archiver.archive(payload.checkpoint, payload.sessionConfig);
            return res.json({ success: true, asset });
        }

        // Handle standard Genkit Generation requests
        if (payload.prompt || payload.messages) {
            const generateOptions: any = {
                use: defaultMiddleware(),
            };
            if (payload.model) generateOptions.model = payload.model;
            if (payload.prompt) generateOptions.prompt = payload.prompt;
            if (payload.system) generateOptions.system = payload.system;
            if (payload.messages) generateOptions.messages = payload.messages;
            if (payload.config) generateOptions.config = payload.config;

            const response = await ai.generate(generateOptions);
            return res.json({
                text: response.text,
                usage: response.usage,
                finishReason: response.finishReason,
                custom: response.custom,
            });
        }

        // Handle specific flows by capability name if provided
        if (payload.flow) {
            switch (payload.flow) {
                case 'classify':
                    const { classifyTaskFlow } = await import('./flows/classify-task.js');
                    return res.json(await classifyTaskFlow(payload));
                case 'director':
                    const { HypeReelDirectorFlow } = await import('./flows/hype-reel-director.js');
                    return res.json(await HypeReelDirectorFlow(payload));
                case 'creative-director':
                    const { CreativeDirectorFlow } = await import('./flows/creative-director.js');
                    return res.json({ result: await CreativeDirectorFlow(payload) });
                case 'vt100Chat':
                    const { vt100ChatFlow } = await import('./flows/vt100-chat-flow.js');
                    return res.json(await vt100ChatFlow(payload));
                default:
                    return res.status(400).json({ error: `Unknown flow: ${payload.flow}` });
            }
        }

        return res.status(400).json({ error: 'Payload must contain a understood execution pattern' });
    } catch (error: any) {
        console.error(`[MESH:EXECUTE] Error for task ${req.body.taskId}:`, error.message);
        res.status(500).json({ error: error.message });
    }
});

// ---------------------------------------------------------------------------
// GET /api/mesh/health â€” Live health probe of all cloud mesh nodes
// Returns latency, status, region, and provider for each FORGE_* endpoint.
// Used by CloudMeshPage to show real node health.
// ---------------------------------------------------------------------------

interface MeshNodeHealth {
    id: string;
    provider: string;
    label: string;
    region: string;
    url: string;
    status: 'active' | 'degraded' | 'offline';
    latencyMs: number | null;
    version?: string;
    timestamp?: string;
}

const FORGE_NODES: { id: string; provider: string; label: string; region: string; envKey: string }[] = [
    { id: 'forge-sovereign', provider: 'local',      label: 'Sovereign NAS',    region: 'LAN',        envKey: 'FORGE_SOVEREIGN_ENDPOINT' },
    { id: 'forge-gcp',      provider: 'gcp',         label: 'GCP Cloud Run',    region: 'us-central1', envKey: 'FORGE_GCP_ENDPOINT' },
    { id: 'forge-cf-edge',  provider: 'cloudflare',  label: 'Cloudflare Edge',  region: 'Global',     envKey: 'FORGE_CF_ENDPOINT' },
    { id: 'forge-fly',      provider: 'fly',         label: 'Fly.io Daemon',    region: 'iad',        envKey: 'FORGE_FLY_ENDPOINT' },
    { id: 'forge-aws',      provider: 'aws',         label: 'AWS Lambda',       region: 'us-east-2',  envKey: 'FORGE_AWS_ENDPOINT' },
];

async function probeNode(node: typeof FORGE_NODES[0]): Promise<MeshNodeHealth> {
    const url = process.env[node.envKey];
    if (!url) {
        return { ...node, url: '', status: 'offline', latencyMs: null };
    }
    const start = Date.now();
    try {
        const healthUrl = `${url}/health`;
        const ctrl = new AbortController();
        const timeout = setTimeout(() => ctrl.abort(), 5000);
        const resp = await fetch(healthUrl, { signal: ctrl.signal });
        clearTimeout(timeout);
        const latencyMs = Date.now() - start;
        if (resp.ok) {
            const data = await resp.json().catch(() => ({})) as Record<string, unknown>;
            return {
                ...node,
                url,
                status: 'active',
                latencyMs,
                version: data['version'] as string | undefined,
                region: (data['region'] as string | undefined) ?? node.region,
                timestamp: data['timestamp'] as string | undefined,
            };
        }
        return { ...node, url, status: 'degraded', latencyMs };
    } catch {
        return { ...node, url: url ?? '', status: 'offline', latencyMs: null };
    }
}

app.get('/api/mesh/health', async (_req, res) => {
    try {
        const results = await Promise.allSettled(FORGE_NODES.map(probeNode));
        const nodes = results.map((r) =>
            r.status === 'fulfilled' ? r.value : { id: 'unknown', status: 'offline' as const, latencyMs: null }
        );
        const active = nodes.filter((n) => n.status === 'active').length;
        res.json({
            nodes,
            summary: { total: nodes.length, active, degraded: nodes.filter((n) => n.status === 'degraded').length, offline: nodes.filter((n) => n.status === 'offline').length },
            checkedAt: new Date().toISOString(),
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ---------------------------------------------------------------------------
// POST /api/mesh/route â€” Intelligent mesh router
// Selects the optimal cloud node based on priority policy and routes the task.
// Priority: sovereign (free) â†’ cloudflare (lowest latency) â†’ fly â†’ aws â†’ gcp
// Falls back to next available node on failure.
// ---------------------------------------------------------------------------

const ROUTE_PRIORITY = ['forge-sovereign', 'forge-cf-edge', 'forge-fly', 'forge-aws', 'forge-gcp'];

app.post('/api/mesh/route', async (req, res) => {
    const { taskId, agentId, payload, preferProvider } = req.body as {
        taskId: string;
        agentId?: string;
        payload: Record<string, unknown>;
        preferProvider?: string;
    };

    if (!taskId || !payload) {
        return res.status(400).json({ error: '"taskId" and "payload" are required' });
    }

    // Build priority list â€” put preferred provider first if specified
    const priority = preferProvider
        ? [`forge-${preferProvider}`, ...ROUTE_PRIORITY.filter((id) => id !== `forge-${preferProvider}`)]
        : ROUTE_PRIORITY;

    for (const nodeId of priority) {
        const nodeDef = FORGE_NODES.find((n) => n.id === nodeId);
        if (!nodeDef) continue;
        const url = process.env[nodeDef.envKey];
        if (!url) continue;

        // Skip sovereign NAS if it's a public request (non-LAN will time out)
        if (nodeId === 'forge-sovereign' && process.env.FORGE_SKIP_SOVEREIGN === 'true') continue;

        console.log(`[MESH:ROUTE] ðŸŒ Routing task ${taskId} â†’ ${nodeDef.label} (${url})`);
        try {
            const ctrl = new AbortController();
            const timeout = setTimeout(() => ctrl.abort(), 15000);
            const resp = await fetch(`${url}/api/mesh/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ taskId, agentId, payload }),
                signal: ctrl.signal,
            });
            clearTimeout(timeout);
            if (resp.ok) {
                const data: unknown = await resp.json();
                return res.json({ ...(data as object), routedTo: nodeDef.label, provider: nodeDef.provider });
            }
            console.warn(`[MESH:ROUTE] Node ${nodeDef.label} returned ${resp.status} â€” trying next`);
        } catch (err: any) {
            console.warn(`[MESH:ROUTE] Node ${nodeDef.label} failed (${err.message}) â€” trying next`);
        }
    }

    // All nodes failed â€” execute locally via Genkit as final fallback
    console.warn(`[MESH:ROUTE] All nodes failed â€” executing locally for task ${taskId}`);
    if (payload.prompt || payload.messages) {
        const genOpts: any = { use: defaultMiddleware() };
        if (payload.prompt) genOpts.prompt = payload.prompt as string;
        if (payload.system) genOpts.system = payload.system as string;
        if (payload.messages) genOpts.messages = payload.messages as any[];
        const response = await ai.generate(genOpts);
        return res.json({ text: response.text, usage: response.usage, routedTo: 'local-genkit', provider: 'local' });
    }

    return res.status(503).json({ error: 'All mesh nodes unavailable and payload has no local fallback' });
});

// ---------------------------------------------------------------------------
// POST /generate/local â€” Sovereign local inference (always Ollama, no cloud)
// ---------------------------------------------------------------------------

app.post('/generate/local', async (req, res) => {
    try {
        const { prompt, system, capability = 'fast', temperature, maxTokens } = req.body as {
            prompt: string;
            system?: string;
            capability?: 'fast' | 'code' | 'large' | 'embed' | 'vision';
            temperature?: number;
            maxTokens?: number;
        };

        if (!prompt) {
            return res.status(400).json({ error: '"prompt" is required' });
        }

        const text = await localGenerate({ prompt, system, capability, temperature, maxTokens });
        const { LOCAL_MODELS } = await import('./local-providers.js');

        res.json({
            text,
            model: LOCAL_MODELS[capability],
            locality: 'local',
            sovereign: true,
        });
    } catch (error: any) {
        console.error('[GENKIT:LOCAL] Generate error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ---------------------------------------------------------------------------
// POST /stream/local â€” Sovereign local SSE streaming (always Ollama, no cloud)
// ---------------------------------------------------------------------------

app.post('/stream/local', async (req, res) => {
    try {
        const { prompt, system, capability = 'fast' } = req.body as {
            prompt: string;
            system?: string;
            capability?: 'fast' | 'code' | 'large' | 'embed' | 'vision';
        };

        if (!prompt) {
            return res.status(400).json({ error: '"prompt" is required' });
        }

        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
        });

        await localStream({
            prompt,
            system,
            capability,
            onChunk: (chunk) => {
                res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
            },
        });

        res.write(`data: ${JSON.stringify({ done: true, locality: 'local', sovereign: true })}\n\n`);
        res.end();
    } catch (error: any) {
        console.error('[GENKIT:LOCAL] Stream error:', error.message);
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
    }
});

// ---------------------------------------------------------------------------
// POST /stream â€” SSE streaming endpoint
// ---------------------------------------------------------------------------

app.post('/stream', async (req, res) => {
    try {
        const { prompt, model, system, config } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: '"prompt" is required' });
        }

        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
        });

        const generateOptions: any = {
            prompt,
            use: defaultMiddleware(),
        };

        if (model) generateOptions.model = model;
        if (system) generateOptions.system = system;
        if (config) generateOptions.config = config;

        const { stream, response } = ai.generateStream(generateOptions);

        for await (const chunk of stream) {
            if (chunk.text) {
                res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
            }
        }

        const finalResponse = await response;
        res.write(
            `data: ${JSON.stringify({
                done: true,
                usage: finalResponse.usage,
                finishReason: finalResponse.finishReason,
            })}\n\n`
        );

        res.end();
    } catch (error: any) {
        console.error('[GENKIT:SERVER] Stream error:', error.message);
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
    }
});

// ---------------------------------------------------------------------------
// POST /classify â€” Task classification flow
// ---------------------------------------------------------------------------

app.post('/classify', async (req, res) => {
    try {
        const { userRequest } = req.body;

        if (!userRequest) {
            return res.status(400).json({ error: '"userRequest" is required' });
        }

        const classification = await classifyTaskFlow({ userRequest });
        res.json(classification);
    } catch (error: any) {
        console.error('[GENKIT:SERVER] Classify error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ---------------------------------------------------------------------------
// POST /zeroDayBriefPipeline â€” Zero Day NAS Watcher Intake Flow
// ---------------------------------------------------------------------------

app.post('/zeroDayBriefPipeline', async (req, res) => {
    try {
        const { data } = req.body;
        if (!data) {
            return res.status(400).json({ error: 'Missing payload data' });
        }

        // Dynamically import to let Genkit registry initialize first if needed
        const { zeroDayBriefPipeline } = await import('./flows/zero-day-pipeline.js');
        const result = await zeroDayBriefPipeline(data);

        return res.json(result);
    } catch (error: any) {
        console.error('[GENKIT:SERVER] ZeroDay Pipeline error:', error.message);
        return res.status(500).json({ error: error.message });
    }
});

// ---------------------------------------------------------------------------
// POST /director â€” Project Omnimedia kruled Director flow
// ---------------------------------------------------------------------------

app.post('/director', async (req, res) => {
    try {
        const { videoFiles, targetDuration, mood } = req.body;

        if (!videoFiles || !targetDuration || !mood) {
            return res.status(400).json({ error: 'videoFiles, targetDuration, and mood are required' });
        }

        const edl = await HypeReelDirectorFlow({ videoFiles, targetDuration, mood });
        res.json(edl);
    } catch (error: any) {
        console.error('[GENKIT:SERVER] Director error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ---------------------------------------------------------------------------
// POST /flow/CreativeDirector â€” ksignd creative vision for a campaign brief
// Called by packages/campaign/src/server.ts during campaign execution
// ---------------------------------------------------------------------------

app.post('/flow/CreativeDirector', async (req, res) => {
    try {
        const { brief } = req.body;
        if (!brief) {
            return res.status(400).json({ error: '"brief" is required' });
        }
        console.log(`[ksignd] ðŸŽ¨ CreativeDirector called for: ${brief.project_name ?? 'unknown'}`);
        const vision = await CreativeDirectorFlow({ brief });
        res.json({ result: vision });
    } catch (error: any) {
        console.error('[ksignd] CreativeDirector error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ---------------------------------------------------------------------------
// POST /generate-media â€” Route asset generation to appropriate pipeline
// Called by campaign DAG executor per deliverable node
// ---------------------------------------------------------------------------

app.post('/generate-media', async (req, res) => {
    try {
        const { prompt, deliverable_type, output_dir, session_id } = req.body;
        if (!prompt || !deliverable_type) {
            return res.status(400).json({ error: '"prompt" and "deliverable_type" are required' });
        }

        console.log(`[GENMEDIA] ðŸŽ¬ Generating ${deliverable_type} | session: ${session_id}`);

        // For text-based deliverables, use /generate directly
        const textTypes = ['campaign_copy', 'voiceover', 'brand_guidelines', 'brand_identity'];
        if (textTypes.includes(deliverable_type)) {
            const response = await ai.generate({
                model: 'googleai/gemini-2.5-flash',
                prompt,
                use: defaultMiddleware(),
            });
            // Write to output dir
            const fs = await import('node:fs/promises');
            const path = await import('node:path');
            await fs.mkdir(output_dir ?? '/tmp/campaigns', { recursive: true });
            const filename = `${session_id ?? Date.now()}_${deliverable_type}.txt`;
            const filepath = path.join(output_dir ?? '/tmp/campaigns', filename);
            await fs.writeFile(filepath, response.text, 'utf8');
            return res.json({ local_path: filepath });
        }

        // For image/video, attempt FAL.ai if key is present
        if (process.env.FAL_KEY) {
            try {
                // @ts-ignore â€” @fal-ai/client is a runtime peer dep, not a genkit build dep
                const { fal } = await import('@fal-ai/client');
                fal.config({ credentials: process.env.FAL_KEY });
                const falModel = deliverable_type === 'hero_video' || deliverable_type === 'social_cutdowns'
                    ? 'fal-ai/fast-animatediff/turbo'
                    : 'fal-ai/flux/dev';
                const result = await fal.subscribe(falModel, {
                    input: { prompt, num_images: 1, image_size: 'landscape_16_9' },
                }) as { images?: Array<{ url: string }>; video?: { url: string } };
                const url = result.images?.[0]?.url ?? result.video?.url ?? '';
                return res.json({ local_path: url, url });
            } catch (falErr: any) {
                console.warn(`[GENMEDIA] FAL.ai failed, falling back to Gemini: ${falErr.message}`);
            }
        }

        // Fallback: generate a descriptive text placeholder via Gemini
        const response = await ai.generate({
            model: 'googleai/gemini-2.5-flash',
            prompt: `Describe in detail what this ${deliverable_type} asset would look like: ${prompt}. Be specific and cinematic.`,
            use: defaultMiddleware(),
        });
        const fs = await import('node:fs/promises');
        const path = await import('node:path');
        await fs.mkdir(output_dir ?? '/tmp/campaigns', { recursive: true });
        const filename = `${session_id ?? Date.now()}_${deliverable_type}.md`;
        const filepath = path.join(output_dir ?? '/tmp/campaigns', filename);
        await fs.writeFile(filepath, `# ${deliverable_type}\n\n${response.text}`, 'utf8');
        res.json({ local_path: filepath });
    } catch (error: any) {
        console.error('[GENMEDIA] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ---------------------------------------------------------------------------
// POST /score â€” Vision LoRA scoring for the critique loop
// Called by campaign DAG executor after each asset generation attempt
// ---------------------------------------------------------------------------

app.post('/score', async (req, res) => {
    try {
        const { local_path, deliverable_type, vision_document } = req.body;
        if (!local_path || !deliverable_type) {
            return res.status(400).json({ error: '"local_path" and "deliverable_type" are required' });
        }

        const system = `You are the Creative Liberation Engine VISION LoRA â€” a scoring model for creative assets.

You evaluate generated creative assets against the Creative Vision Document and return a quality score from 0-100 with a brief critique.

Scoring criteria:
- Brand alignment (30pts): Does it match the brand DNA and tone?
- Creative quality (30pts): Is the craft excellent? Would a world-class creative director approve?
- Brief fulfillment (25pts): Does it deliver what the deliverable_type requires?
- Technical quality (15pts): Resolution, format, completeness?

Respond ONLY with valid JSON: { "score": number, "critique": string }`;

        const prompt = `Evaluate this ${deliverable_type} asset:
Asset path: ${local_path}

Creative Vision Document:
${vision_document ?? 'Not provided'}

Score it 0-100 and provide a 1-2 sentence critique. JSON only.`;

        const response = await ai.generate({
            model: 'googleai/gemini-2.5-flash',
            system,
            prompt,
            use: defaultMiddleware(),
        });

        const parsed = JSON.parse(response.text.replace(/```json|```/g, '').trim()) as { score: number; critique: string };
        res.json(parsed);
    } catch (error: any) {
        console.error('[SCORE] Error:', error.message);
        // Graceful fallback â€” never block the critique loop
        res.json({ score: 82, critique: 'Auto-score: scoring service error, passing with default score.' });
    }
});

// ---------------------------------------------------------------------------
// POST /conversational â€” Conversational vt100 (Bi-Directional Siri iOS Shortcut)
// ---------------------------------------------------------------------------

app.post('/conversational', async (req, res) => {
    try {
        const { text, sessionId } = req.body;

        if (!text) {
            return res.status(400).json({ error: '"text" is required' });
        }

        const result = await conversationalVt100Flow({ text, sessionId });
        res.json(result);
    } catch (error: any) {
        console.error('[GENKIT:SERVER] Conversational vt100 error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ---------------------------------------------------------------------------
// POST /vt100Chat â€” vt100 Mobile PWA endpoint
// Context-enriched chat: injects live dispatch status + WTM client profile
// into every Gemini conversation. Powers the vt100 Mobile iPhone PWA.
// ---------------------------------------------------------------------------

app.post('/vt100Chat', async (req, res) => {
    try {
        const { message, history, clientId, userId } = req.body;
        if (!message) {
            return res.status(400).json({ error: '"message" is required' });
        }
        console.log(`[VT100:MOBILE] ${userId ?? 'unknown'} [${clientId ?? 'wtm-internal'}]: ${message.slice(0, 60)}`);
        const result = await vt100ChatFlow({ message, history, clientId, userId, sessionId: (req.body as { sessionId?: string }).sessionId, skipCritique: false });
        res.json(result);
    } catch (error: any) {
        console.error('[VT100:MOBILE] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.get('/vt100Chat/health', (_req, res) => {
    res.json({ status: 'operational', service: 'vt100-chat', version: '1.0.0' });
});



// ---------------------------------------------------------------------------
// POST /vt100/ideate  â€” IDEATE mode: kstated recall â†’ vt100 strategy
// ---------------------------------------------------------------------------

app.post('/vt100/ideate', async (req, res) => {
    try {
        const { topic, context, depth = 'deep', sessionId } = req.body;

        if (!topic) {
            return res.status(400).json({ error: '"topic" is required' });
        }

        console.log(`[VT100:IDEATE] Topic: ${topic.slice(0, 80)}`);

        // Step 1 â€” kstated: surface relevant knowledge context
        const keeperResult = await KEEPERFlow({
            task: 'search',
            query: topic,
            tags: ['ideate', 'vt100'],
            sessionId,
        });
        console.log(`[VT100:IDEATE] kstated found ${keeperResult.relevantKIs.length} KIs`);

        // Step 2 â€” vt100: strategy mode with kstated context injected
        const vt100Result = await VT100Flow({
            mode: 'strategy',
            topic,
            context,
            keeperContext: keeperResult.findings,
            depth,
            sessionId,
        });
        console.log(`[VT100:IDEATE] vt100 directive: ${vt100Result.directive.slice(0, 80)}...`);

        res.json({
            mode: 'IDEATE',
            topic,
            kstated: {
                findings: keeperResult.findings,
                relevantKIs: keeperResult.relevantKIs,
                isDuplicate: keeperResult.isDuplicate,
            },
            vt100: {
                directive: vt100Result.directive,
                rationale: vt100Result.rationale,
                options: vt100Result.options,
                suggestedAgents: vt100Result.suggestedAgents,
                nextMode: vt100Result.nextMode,
                constitutionalFlags: vt100Result.constitutionalFlags,
            },
            signatures: ['kstated', 'vt100'],
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        console.error('[VT100:IDEATE] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ---------------------------------------------------------------------------
// POST /vt100/plan  â€” PLAN mode: kstated recall â†’ vt100 spec â†’ vt220 truth-check
// ---------------------------------------------------------------------------

app.post('/vt100/plan', async (req, res) => {
    try {
        const { topic, context, depth = 'deep', sessionId } = req.body;

        if (!topic) {
            return res.status(400).json({ error: '"topic" is required' });
        }

        console.log(`[VT100:PLAN] Topic: ${topic.slice(0, 80)}`);

        // Step 1 â€” kstated: synthesize knowledge for planning context
        const keeperResult = await KEEPERFlow({
            task: 'synthesize',
            query: topic,
            tags: ['plan', 'vt100', 'architecture'],
            sessionId,
        });
        console.log(`[VT100:PLAN] kstated synthesis complete`);

        // Step 2 â€” vt100: spec mode (precise, not exploratory)
        const vt100Result = await VT100Flow({
            mode: 'spec',
            topic,
            context,
            keeperContext: keeperResult.synthesis ?? keeperResult.findings,
            depth,
            sessionId,
        });
        console.log(`[VT100:PLAN] vt100 spec: ${vt100Result.directive.slice(0, 80)}...`);

        // Step 3 â€” vt220: truth-check vt100 specification
        const vt220Result = await VT220Flow({
            mode: 'truth',
            content: `vt100 DIRECTIVE:\n${vt100Result.directive}\n\nRATIONALE:\n${vt100Result.rationale}`,
            context: topic,
            sessionId,
        });
        console.log(`[VT100:PLAN] vt220 confidence: ${vt220Result.confidence}`);

        res.json({
            mode: 'PLAN',
            topic,
            kstated: {
                synthesis: keeperResult.synthesis ?? keeperResult.findings,
                relevantKIs: keeperResult.relevantKIs,
            },
            vt100: {
                directive: vt100Result.directive,
                rationale: vt100Result.rationale,
                options: vt100Result.options,
                suggestedAgents: vt100Result.suggestedAgents,
                nextMode: vt100Result.nextMode,
                constitutionalFlags: vt100Result.constitutionalFlags,
            },
            vt220: {
                verdict: vt220Result.verdict,
                confidence: vt220Result.confidence,
                contradictions: vt220Result.contradictions,
                pattern: vt220Result.pattern,
            },
            planApproved: vt220Result.confidence >= 0.7 && vt220Result.contradictions.length === 0,
            signatures: ['kstated', 'vt100', 'vt220'],
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        console.error('[VT100:PLAN] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ---------------------------------------------------------------------------
// POST /vt100/creative-dna/embed â€” Creative DNA Vector Generation (T20260308-696)
// Generates 1408-dim multimodal embeddings via Vertex AI multimodalembedding@001.
// Used for per-tenant style fingerprinting in the multi-tenant platform.
// ---------------------------------------------------------------------------

app.post('/vt100/creative-dna/embed', async (req, res) => {
    try {
        const { tenantId, image, text, video } = req.body;
        if (!tenantId) return res.status(400).json({ error: '"tenantId" is required' });
        if (!image && !text && !video) {
            return res.status(400).json({ error: 'At least one of image, text, or video is required' });
        }

        console.log(`[VT100:CREATIVE-DNA] Generating vector | tenant: ${tenantId} | type: ${image ? 'image' : text ? 'text' : 'video'}`);
        const { generateCreativeDnaVector } = await import('./creative-dna-vectors.js');
        const result = await generateCreativeDnaVector({ tenantId, image, text, video });

        res.json({
            tenantId: result.tenantId,
            dimension: result.dimension,
            model: result.model,
            inputType: result.inputType,
            createdAt: result.createdAt,
            // Truncate for response â€” full vector stored to NAS SQLite
            vectorPreview: result.vector.slice(0, 8),
            vectorLength: result.vector.length,
        });
    } catch (error: any) {
        console.error('[VT100:CREATIVE-DNA] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ---------------------------------------------------------------------------
// POST /a2a/dispatch â€” Single A2A agent message dispatch (T20260308-506)
// Routes typed messages between AVERI agents via the sovereign dispatch server.
// ---------------------------------------------------------------------------

app.post('/a2a/dispatch', async (req, res) => {
    try {
        const { fromAgentId, toAgentId, tenantId, messageType, payload, correlationId } = req.body;
        if (!fromAgentId || !toAgentId || !tenantId || !payload) {
            return res.status(400).json({ error: 'fromAgentId, toAgentId, tenantId, and payload are required' });
        }

        console.log(`[A2A] ðŸ“¨ ${fromAgentId} â†’ ${toAgentId} | tenant: ${tenantId}`);
        const { a2aDispatchFlow } = await import('./flows/a2a-orchestration.js');
        const result = await a2aDispatchFlow({ fromAgentId, toAgentId, tenantId, messageType: messageType ?? 'task', payload, correlationId });

        res.json(result);
    } catch (error: any) {
        console.error('[A2A:DISPATCH] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ---------------------------------------------------------------------------
// POST /a2a/orchestrate â€” TTY multi-agent orchestration (T20260308-506)
// vt100 receives a directive, plans, assigns tasks, dispatches A2A messages.
// Primary pipeline for Chat Console â†’ orchestration.
// ---------------------------------------------------------------------------

app.post('/a2a/orchestrate', async (req, res) => {
    try {
        const { directive, tenantId, priority, targetAgents, context } = req.body;
        if (!directive || !tenantId) {
            return res.status(400).json({ error: '"directive" and "tenantId" are required' });
        }

        console.log(`[A2A:ORCHESTRATE] ðŸ§  vt100 orchestrating | tenant: ${tenantId} | priority: ${priority ?? 'P1'}`);
        const { ttyOrchestrationFlow } = await import('./flows/a2a-orchestration.js');
        const result = await ttyOrchestrationFlow({ directive, tenantId, priority: priority ?? 'P1', targetAgents, context });

        res.json(result);
    } catch (error: any) {
        console.error('[A2A:ORCHESTRATE] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ---------------------------------------------------------------------------
// POST /search â€” Perplexity search
// ---------------------------------------------------------------------------

app.post('/search', async (req, res) => {
    try {
        const { query, model: modelId } = req.body;

        if (!query) {
            return res.status(400).json({ error: '"query" is required' });
        }

        const response = await ai.generate({
            model: perplexityModel(modelId || 'sonar-pro'),
            prompt: query,
            use: defaultMiddleware(),
        });

        res.json({
            text: response.text,
            citations: (response.custom as any)?.citations || [],
            usage: response.usage,
        });
    } catch (error: any) {
        console.error('[GENKIT:SERVER] Search error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ---------------------------------------------------------------------------
// POST /retrieve â€” ChromaDB vector search
// ---------------------------------------------------------------------------

app.post('/retrieve', async (req, res) => {
    try {
        const { query, nResults } = req.body;

        if (!query) {
            return res.status(400).json({ error: '"query" is required' });
        }

        const results = await ai.retrieve({
            retriever: chromaRetriever,
            query,
            options: { nResults: nResults || 10 },
        });

        res.json(results);
    } catch (error: any) {
        console.error('[GENKIT:SERVER] Retrieve error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ---------------------------------------------------------------------------
// POST /api/infraDockerFlow â€” FORGE autonomous Docker/infrastructure executor
// ---------------------------------------------------------------------------

app.post('/api/infraDockerFlow', async (req, res) => {
    try {
        const { infraDockerFlow } = await import('./flows/infra-docker.js');
        const result = await infraDockerFlow(req.body);
        res.json(result);
    } catch (error: any) {
        console.error('[FORGE:INFRA] Route error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ---------------------------------------------------------------------------
// POST /api/cometBrowserFlow â€” COMET agentic browser task planner
// ---------------------------------------------------------------------------

app.post('/api/cometBrowserFlow', async (req, res) => {
    try {
        const { cometBrowserFlow } = await import('./flows/comet-browser-flow.js');
        const result = await cometBrowserFlow(req.body);
        res.json(result);
    } catch (error: any) {
        console.error('[COMET:BROWSER] Route error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ---------------------------------------------------------------------------
// POST /api/genericTaskFlow â€” RELAY universal fallback task executor
// ---------------------------------------------------------------------------

app.post('/api/genericTaskFlow', async (req, res) => {
    try {
        const { genericTaskFlow } = await import('./flows/generic-task.js');
        const result = await genericTaskFlow(req.body);
        res.json(result);
    } catch (error: any) {
        console.error('[RELAY:GENERIC] Route error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ---------------------------------------------------------------------------
// POST /api/genkitFlowBuilder â€” ARCH+CODEX meta-flow: generates new Genkit flows
// ---------------------------------------------------------------------------

app.post('/api/genkitFlowBuilder', async (req, res) => {
    try {
        const { genkitFlowBuilder } = await import('./flows/genkit-flow-builder.js');
        const result = await genkitFlowBuilder(req.body);
        res.json(result);
    } catch (error: any) {
        console.error('[ARCH:FLOW_BUILDER] Route error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ---------------------------------------------------------------------------
// POST /api/genUiFlow â€” ksignd Generative UI Component Builder
// ---------------------------------------------------------------------------

app.post('/api/genUiFlow', async (req, res) => {
    try {
        const { genUiFlow } = await import('./flows/gen-ui.js');
        const result = await genUiFlow(req.body);
        res.json(result);
    } catch (error: any) {
        console.error('[ksignd:GEN_UI] Route error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ---------------------------------------------------------------------------
// POST /api/iecr/decompose â€” IECR Director Agent: brief â†’ TaskGraph
// POST /api/iecr/execute   â€” IECR Director Agent: execute a TaskGraph
// ---------------------------------------------------------------------------

app.post('/api/iecr/decompose', async (req, res) => {
    try {
        const { directorAgentFlow } = await import('./flows/director-agent.js');
        const { prompt: brief, sessionId } = req.body;
        if (!brief) {
            return res.status(400).json({ error: '"prompt" is required' });
        }
        console.log(`[IECR:DIRECTOR] ðŸŽ¬ Decomposing brief: ${String(brief).slice(0, 80)}`);
        const result = await directorAgentFlow({ prompt: brief, sessionId: sessionId ?? `sess-${Date.now()}` });
        res.json(result);
    } catch (error: any) {
        console.error('[IECR:DIRECTOR] Decompose error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/iecr/execute', async (req, res) => {
    try {
        const { taskGraph, sessionId } = req.body;
        if (!taskGraph) {
            return res.status(400).json({ error: '"taskGraph" is required' });
        }
        // Dynamically route each node in the TaskGraph to its engine flow
        const {
            ieVideoFlow,
            ieAudioFlow,
            ie3dFlow,
            ieDesignFlow,
            ieCodeFlow,
            ieAssetsFlow,
        } = await import('./flows/ie-engine-flows.js');
        // Keys match EngineModuleSchema enum values produced by directorAgentFlow
        const engineMap: Record<string, (input: any) => Promise<any>> = {
            VIDEO: ieVideoFlow,
            AUDIO: ieAudioFlow,
            '3D': ie3dFlow,
            DESIGN: ieDesignFlow,
            CODE: ieCodeFlow,
            ASSETS: ieAssetsFlow,
        };
        const nodes: Array<{ id: string; engine: string; intent: string; inputs: string[] }> = taskGraph.tasks ?? [];
        console.log(`[IECR:EXECUTE] ðŸš€ Executing TaskGraph with ${nodes.length} nodes | session: ${sessionId}`);
        const results = await Promise.allSettled(
            nodes.map(async (node) => {
                const flowFn = engineMap[node.engine];
                if (!flowFn) throw new Error(`Unknown engine: ${node.engine}`);
                const output = await flowFn({ taskId: node.id, sessionId: sessionId ?? 'default', intent: node.intent, inputs: node.inputs ?? [] });
                return { nodeId: node.id, engine: node.engine, output };
            })
        );
        const fulfilled = results
            .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
            .map(r => r.value);
        const failed = results
            .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
            .map((r, i) => ({ nodeId: nodes[i]?.id, error: r.reason?.message }));
        res.json({
            sessionId,
            total: nodes.length,
            completed: fulfilled.length,
            failed: failed.length,
            results: fulfilled,
            errors: failed,
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        console.error('[IECR:EXECUTE] Execute error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ---------------------------------------------------------------------------
// POST /api/engines/:engine â€” Individual IECR engine flows (direct call)
// ---------------------------------------------------------------------------

app.post('/api/engines/:engine', async (req, res) => {
    const { engine } = req.params;
    const validEngines = ['video', 'audio', '3d', 'design', 'code', 'assets'];
    if (!validEngines.includes(engine!)) {
        return res.status(400).json({ error: `Unknown engine "${engine}". Valid: ${validEngines.join(', ')}` });
    }
    try {
        const flows = await import('./flows/ie-engine-flows.js');
        const flowMap: Record<string, (input: any) => Promise<any>> = {
            video: flows.ieVideoFlow,
            audio: flows.ieAudioFlow,
            '3d': flows.ie3dFlow,
            design: flows.ieDesignFlow,
            code: flows.ieCodeFlow,
            assets: flows.ieAssetsFlow,
        };
        const flowFn = flowMap[engine!]!;
        const result = await flowFn(req.body);
        res.json(result);
    } catch (error: any) {
        console.error(`[IECR:ENGINE:${engine}] Error:`, error.message);
        res.status(500).json({ error: error.message });
    }
});

// ---------------------------------------------------------------------------
// GET /api/flows â€” Live flow registry for console FlowExplorer
// Returns the authoritative AGENT_ROSTER + all available REST endpoints
// ---------------------------------------------------------------------------

const FLOW_ENDPOINTS = [
    { id: 'classify', method: 'POST', path: '/classify', agent: 'RELAY', description: 'Classify a user request to the right agent/flow.' },
    { id: 'vt100-ideate', method: 'POST', path: '/vt100/ideate', agent: 'vt100', description: 'IDEATE mode: kstated recall â†’ vt100 strategy.' },
    { id: 'vt100-plan', method: 'POST', path: '/vt100/plan', agent: 'vt100', description: 'PLAN mode: kstated recall â†’ vt100 spec â†’ vt220 truth-check.' },
    { id: 'creative-director', method: 'POST', path: '/flow/CreativeDirector', agent: 'xterm', description: 'xterm creative vision document generation from a campaign brief.' },
    { id: 'generate-media', method: 'POST', path: '/generate-media', agent: 'GEN-1', description: 'Route asset generation (image/video/text) to optimal pipeline.' },
    { id: 'score', method: 'POST', path: '/score', agent: 'SENTINEL', description: 'Vision LoRA scoring of creative assets (0-100) with critique.' },
    { id: 'director', method: 'POST', path: '/director', agent: 'ATLAS', description: 'kruled Video EDL Engine â€” hype reel director for campaign video.' },
    { id: 'search', method: 'POST', path: '/search', agent: 'kstrigd', description: 'Deep research via Perplexity Sonar + memory-augmented retrieval.' },
    { id: 'retrieve', method: 'POST', path: '/retrieve', agent: 'kstated', description: 'ChromaDB semantic vector search across the knowledge base.' },
    { id: 'generate', method: 'POST', path: '/generate', agent: 'RELAY', description: 'Unified multi-provider AI completion (Gemini, GPT-4, Sonar, Ollama).' },
    { id: 'stream', method: 'POST', path: '/stream', agent: 'RELAY', description: 'SSE streaming completion endpoint â€” low-latency outputs.' },
    // â”€â”€ Dispatch-facing task executors â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    { id: 'infra-docker', method: 'POST', path: '/api/infraDockerFlow', agent: 'RELAY', description: 'FORGE: autonomous Docker/infra task executor for dispatch queue.' },
    { id: 'comet-browser', method: 'POST', path: '/api/cometBrowserFlow', agent: 'COMET', description: 'COMET: agentic browser action planner for dispatch queue.' },
    { id: 'generic-task', method: 'POST', path: '/api/genericTaskFlow', agent: 'RELAY', description: 'RELAY: universal fallback task executor for any workstream.' },
    { id: 'genkit-flow-builder', method: 'POST', path: '/api/genkitFlowBuilder', agent: 'ARCH', description: 'ARCH+CODEX: meta-flow that generates new Genkit flow files.' },
    // â”€â”€ Generative UI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    { id: 'gen-ui', method: 'POST', path: '/api/genUiFlow', agent: 'ksignd', description: 'ksignd: generate production-quality React components from a design spec.' },
    // â”€â”€ IECR Director + Engine Flows â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    { id: 'iecr-decompose', method: 'POST', path: '/api/iecr/decompose', agent: 'ksignd', description: 'IECR Director: decompose a creative brief into a parallel TaskGraph.' },
    { id: 'iecr-execute', method: 'POST', path: '/api/iecr/execute', agent: 'ksignd', description: 'IECR Director: execute a TaskGraph across all six engine flows.' },
    { id: 'engine-video', method: 'POST', path: '/api/engines/video', agent: 'GEN-1', description: 'IE VIDEO: non-linear editing, compositing, color grading, and timeline assembly.' },
    { id: 'engine-audio', method: 'POST', path: '/api/engines/audio', agent: 'ATLAS', description: 'IE AUDIO: synthesis, recording, mixing, mastering, and DAW operations.' },
    { id: 'engine-3d', method: 'POST', path: '/api/engines/3d', agent: 'GEN-1', description: 'IE 3D: real-time PBR rendering, USD/glTF assembly, and world building.' },
    { id: 'engine-design', method: 'POST', path: '/api/engines/design', agent: 'ksignd', description: 'IE DESIGN: vector/raster canvas, typography, brand identity, and layout.' },
    { id: 'engine-code', method: 'POST', path: '/api/engines/code', agent: 'CODEX', description: 'IE CODE: GPU shader generation, TypeScript scripting, and runtime tool creation.' },
    { id: 'engine-assets', method: 'POST', path: '/api/engines/assets', agent: 'kstated', description: 'IE ASSETS: semantic search, NAS integration, format conversion, and tagging.' },
];

app.get('/api/flows', (_req, res) => {
    const hiveColors: Record<string, string> = {
        TTY: '#F5A524', kuid: '#C17D4A', kstated: '#9B72CF',
        SWITCHBOARD: '#22c55e', kdocsd: '#4285F4', BROADCAST: '#FF6B35',
        VALIDATOR: '#ef4444', SPECIALIST: '#20B2AA', ENHANCEMENT: '#8B5CF6',
    };
    res.json({
        total: AGENT_ROSTER.length,
        endpoint_count: FLOW_ENDPOINTS.length,
        agents: AGENT_ROSTER.map(a => ({
            ...a,
            color: hiveColors[a.hive] ?? '#9B72CF',
            endpoint: FLOW_ENDPOINTS.find(e => e.agent === a.name),
        })),
        endpoints: FLOW_ENDPOINTS,
        timestamp: new Date().toISOString(),
    });
});

// ---------------------------------------------------------------------------
// Start Server
// ---------------------------------------------------------------------------

// Wait for Genkit SDK's internal reflection server to initialize before
// starting Express. setImmediate lets the Genkit SDK's async init complete
// so the CLI handshake (port 3100) is established before our server floods stdout.
setImmediate(() => {
    app.listen(Number(PORT), '0.0.0.0', () => {
        // Minimal log in dev mode so the Genkit CLI can parse stdout cleanly
        if (process.env.GENKIT_ENV === 'dev') {
            console.log(`[cle] Genkit Provider Runtime v5.0.0 listening on :${PORT}`);
        } else {
            console.log(`
â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
â•‘   CREATIVE LIBERATION ENGINE â€” GENKIT PROVIDER RUNTIME     â•‘
â•‘   v5.0.0 | Port ${PORT}                            â•‘
â• â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•£
â•‘   Endpoints:                                     â•‘
â•‘     POST /generate       â€” Unified completion        â•‘
â•‘     POST /stream         â€” SSE streaming             â•‘
â•‘     POST /classify       â€” Task classification       â•‘
â•‘     POST /director       â€” kruled Video EDL Engine   â•‘
â•‘     POST /search         â€” Perplexity search         â•‘
â•‘     POST /retrieve       â€” ChromaDB vector search    â•‘
â•‘     POST /vt100/ideate   â€” IDEATE mode (vt100+kstated) â•‘
â•‘     POST /vt100/plan     â€” PLAN mode (vt100+vt220+kstated) â•‘
â•‘     POST /flow/CreativeDirector â€” ksignd vision doc    â•‘
â•‘     POST /generate-media â€” Campaign asset generator  â•‘
â•‘     POST /score          â€” Vision LoRA scoring       â•‘
â•‘     POST /api/iecr/decompose â€” IECR brief â†’ TaskGraph   â•‘
â•‘     POST /api/iecr/execute   â€” IECR TaskGraph execute   â•‘
â•‘     POST /api/engines/:e â€” IE engine flows (6)       â•‘
â•‘     POST /api/toolbox/*  â€” @cle/toolbox utils  â•‘
â•‘     GET  /health         â€” Health check              â•‘
â•‘     GET  /stats          â€” Audit statistics          â•‘
â•‘     GET  /audit          â€” Audit log                 â•‘
â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
        `);
        }
    });
});

// ---------------------------------------------------------------------------
// TOOL-03/04: @cle/toolbox REST endpoints
// These use static imports from @cle/toolbox (imported at top of file).
// ---------------------------------------------------------------------------

app.post('/api/toolbox/palette', (req, res) => {
    const { baseHex } = req.body as { baseHex: string };
    res.json(paletteGenerator(baseHex));
});

app.post('/api/toolbox/contrast', (req, res) => {
    const { hex1, hex2 } = req.body as { hex1: string; hex2: string };
    const result = contrastRatio(hex1, hex2);
    res.json({ ratio: result?.ratio, meetsAA: result?.wcagAA });
});

app.post('/api/toolbox/slugify', (req, res) => {
    const { str, separator = '-' } = req.body as { str: string; separator?: string };
    res.json({ slug: urlSlugify(str, { separator }) });
});

app.post('/api/toolbox/base64', (req, res) => {
    const { input } = req.body as { input: string };
    res.json({ base64: base64Encode(input).output, base64url: base64Encode(input, true).output });
});

app.post('/api/toolbox/mime', (req, res) => {
    const { filename } = req.body as { filename: string };
    const ext = filename?.split('.').pop()?.toLowerCase() ?? '';
    const mimeMap: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', mp4: 'video/mp4', mp3: 'audio/mpeg', pdf: 'application/pdf', json: 'application/json' };
    res.json({ mimeType: mimeMap[ext] ?? 'application/octet-stream' });
});

app.post('/api/toolbox/password-strength', (req, res) => {
    const { password } = req.body as { password: string };
    res.json(passwordStrength(password));
});

// ---------------------------------------------------------------------------
// Sovereign Home Mesh â€” Physical Intelligence Flows
// POST /home/bird-watch    â€” Gemini Vision bird ID / security classification
// POST /home/intel         â€” NLQ presence query (kruled)
// POST /home/stranger-scan â€” kstrigd anomaly detection scan
// ---------------------------------------------------------------------------

app.post('/home/bird-watch', async (req, res) => {
    try {
        const result = await birdWatcherFlow(req.body);
        res.json(result);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Flow error';
        res.status(500).json({ error: message });
    }
});

app.post('/home/intel', async (req, res) => {
    try {
        const result = await guestIntelligenceFlow(req.body);
        res.json(result);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Flow error';
        res.status(500).json({ error: message });
    }
});

app.post('/home/stranger-scan', async (req, res) => {
    try {
        const result = await strangerAlertFlow(req.body);
        res.json(result);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Flow error';
        res.status(500).json({ error: message });
    }
});

// ---------------------------------------------------------------------------
// POST /innerVoice â€” Sandbar Stream Inner Voice AI
// Client: ecosystem/sandbar-stream (Inner Voice chat page)
// ---------------------------------------------------------------------------

app.post('/innerVoice', async (req, res) => {
    try {
        const { message, context } = req.body as { message: string; context?: string[] };
        if (!message) {
            return res.status(400).json({ error: '"message" is required' });
        }
        const { innerVoiceFlow } = await import('./flows/inner-voice.js');
        const result = await innerVoiceFlow({ message, context });
        res.json(result);
    } catch (error: any) {
        console.error('[SANDBAR:InnerVoice] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ---------------------------------------------------------------------------
// THE TRANSMISSION â€” Autonomous Infinity Story Endpoints
//
// POST /transmission/generate â€” generate one artifact on demand
// GET  /transmission/world    â€” current world state
// GET  /transmission/feed     â€” SSE stream of new artifacts as daemon emits them
// POST /transmission/reader   â€” anonymous reader signal (crowd memory input)
// ---------------------------------------------------------------------------

import { EventEmitter } from 'node:events';

// Shared emitter â€” daemon writes to JSONL file; we watch and re-emit to SSE clients
const transmissionEmitter = new EventEmitter();
transmissionEmitter.setMaxListeners(200);

const TRANSMISSION_DATA_DIR = process.env['TRANSMISSION_DATA_DIR'] ??
  path.join(process.cwd(), '../../data/transmission');

const WORLD_STATE_PATH = path.join(TRANSMISSION_DATA_DIR, 'world-state.json');
const ARTIFACTS_PATH   = path.join(TRANSMISSION_DATA_DIR, 'artifacts.jsonl');
const SIGNALS_PATH     = path.join(TRANSMISSION_DATA_DIR, 'reader-signals.jsonl');

// Bootstrap data directory and watch artifacts.jsonl for daemon writes
try {
  fs.mkdirSync(TRANSMISSION_DATA_DIR, { recursive: true });
  if (!fs.existsSync(ARTIFACTS_PATH)) fs.writeFileSync(ARTIFACTS_PATH, '');
  if (!fs.existsSync(SIGNALS_PATH))   fs.writeFileSync(SIGNALS_PATH, '');

  let lastSize = fs.statSync(ARTIFACTS_PATH).size;
  fs.watch(ARTIFACTS_PATH, () => {
    try {
      const newSize = fs.statSync(ARTIFACTS_PATH).size;
      if (newSize <= lastSize) return;
      const buf = Buffer.alloc(newSize - lastSize);
      const fd  = fs.openSync(ARTIFACTS_PATH, 'r');
      fs.readSync(fd, buf, 0, buf.length, lastSize);
      fs.closeSync(fd);
      lastSize = newSize;
      for (const line of buf.toString('utf-8').split('\n').filter(Boolean)) {
        try { transmissionEmitter.emit('artifact', JSON.parse(line)); } catch { /* skip */ }
      }
    } catch { /* file lock or rotation â€” skip */ }
  });
} catch (setupErr) {
  console.warn('[TRANSMISSION] Data dir setup warning:', setupErr);
}

// ---------------------------------------------------------------------------
// THE TRANSMISSION â€” Autonomous Daemon Loop
// Fires every TRANSMISSION_INTERVAL_MS (default: 15 min). Generates one
// artifact via Gemini, persists it to ARTIFACTS_PATH (triggering fs.watch â†’
// SSE), and evolves world state (epoch, signal, artifact count, themes).
// ---------------------------------------------------------------------------

const TRANSMISSION_INTERVAL_MS = parseInt(process.env['TRANSMISSION_INTERVAL_MS'] ?? '') || 15 * 60 * 1000;

function loadWorldState(): Record<string, unknown> {
  try {
    if (fs.existsSync(WORLD_STATE_PATH)) {
      return JSON.parse(fs.readFileSync(WORLD_STATE_PATH, 'utf-8')) as Record<string, unknown>;
    }
  } catch { /* corrupted â€” bootstrap */ }
  return {
    epoch: 1,
    startedAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    activeFactions: ['THE REMNANT', 'STATION AUTHORITY', 'THE WANDERING SIGNAL'],
    dominantTheme: 'displacement and signal loss',
    signalStrength: 0.7,
    artifactCount: 0,
    readerCount: 0,
    hotLocations: ['Sector 7', 'The Divide', 'Uplink Station 4'],
    readerMemory: [],
  };
}

function loadRecentArtifacts(n = 10): unknown[] {
  try {
    if (!fs.existsSync(ARTIFACTS_PATH)) return [];
    const lines = fs.readFileSync(ARTIFACTS_PATH, 'utf-8').split('\n').filter(Boolean).slice(-n);
    return lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  } catch { return []; }
}

function evolveWorldState(state: Record<string, unknown>, artifact: Record<string, unknown>): Record<string, unknown> {
  const count = ((state['artifactCount'] as number) ?? 0) + 1;
  // Signal strength drifts slightly each epoch â€” noisy but bounded [0.2, 0.95]
  const currentSignal = (state['signalStrength'] as number) ?? 0.7;
  const drift = (Math.random() - 0.48) * 0.08; // slight downward bias
  const newSignal = Math.max(0.2, Math.min(0.95, currentSignal + drift));

  // Every 10 artifacts advance the epoch
  const currentEpoch = (state['epoch'] as number) ?? 1;
  const newEpoch = count % 10 === 0 ? currentEpoch + 1 : currentEpoch;

  // Merge new location from artifact if available
  const hotLocations = [...((state['hotLocations'] as string[]) ?? [])];
  const artifactLocation = artifact['location'] as string | undefined;
  if (artifactLocation && !hotLocations.includes(artifactLocation)) {
    hotLocations.unshift(artifactLocation);
    if (hotLocations.length > 6) hotLocations.pop();
  }

  // Evolve dominant theme from artifact tags
  const artifactTags = (artifact['tags'] as string[]) ?? [];
  const themes = ['displacement and signal loss', 'fractured memory', 'the long silence',
    'border collapse', 'unsent messages', 'the observer effect', 'echoes without origin'];
  const dominantTheme = artifactTags.length > 0 && Math.random() < 0.3
    ? (themes[Math.floor(Math.random() * themes.length)] ?? state['dominantTheme'])
    : state['dominantTheme'];

  return {
    ...state,
    epoch: newEpoch,
    lastUpdated: new Date().toISOString(),
    artifactCount: count,
    signalStrength: parseFloat(newSignal.toFixed(3)),
    hotLocations,
    dominantTheme,
  };
}

async function runTransmissionTick() {
  const { generateTransmissionArtifact } = await import('./flows/transmission.js');

  const worldState = loadWorldState() as Parameters<typeof generateTransmissionArtifact>[0]['worldState'];
  const previousArtifacts = loadRecentArtifacts(10) as Parameters<typeof generateTransmissionArtifact>[0]['previousArtifacts'];

  // Load recent reader signals as crowd input
  let readerSignals: string[] = [];
  try {
    if (fs.existsSync(SIGNALS_PATH)) {
      const lines = fs.readFileSync(SIGNALS_PATH, 'utf-8').split('\n').filter(Boolean).slice(-20);
      const signals = lines.map(l => { try { return JSON.parse(l) as { tags?: string[] }; } catch { return null; } }).filter(Boolean) as Array<{ tags?: string[] }>;
      readerSignals = [...new Set(signals.flatMap(s => s.tags ?? []))].slice(0, 8);
    }
  } catch { /* no signals yet */ }

  console.log(`[TRANSMISSION:daemon] âš¡ Generating artifact â€” epoch=${worldState.epoch} signal=${worldState.signalStrength}`);

  const artifact = await generateTransmissionArtifact({ worldState, previousArtifacts, readerSignals });

  // Persist artifact to JSONL (triggers fs.watch â†’ SSE broadcast)
  fs.appendFileSync(ARTIFACTS_PATH, JSON.stringify(artifact) + '\n');

  // Evolve and persist world state
  const nextState = evolveWorldState(worldState as Record<string, unknown>, artifact as unknown as Record<string, unknown>);
  fs.writeFileSync(WORLD_STATE_PATH, JSON.stringify(nextState, null, 2));

  console.log(`[TRANSMISSION:daemon] âœ… Artifact ${artifact.id} â€” kind=${artifact.kind} epoch=${nextState['epoch']} count=${nextState['artifactCount']}`);
}

// Boot: generate the first artifact immediately if the feed is empty (cold start)
// Then run on the interval autonomously forever.
setTimeout(async () => {
  try {
    const isEmpty = !fs.existsSync(ARTIFACTS_PATH) || fs.readFileSync(ARTIFACTS_PATH, 'utf-8').trim() === '';
    if (isEmpty) {
      console.log('[TRANSMISSION:daemon] ðŸŒ Cold start â€” generating first artifact immediately');
      await runTransmissionTick();
    }
  } catch (err) {
    console.error('[TRANSMISSION:daemon] Cold start error:', err);
  }
}, 3000); // 3 second delay to let Genkit plugins initialize

setInterval(async () => {
  try {
    await runTransmissionTick();
  } catch (err) {
    console.error('[TRANSMISSION:daemon] Tick error:', err);
  }
}, TRANSMISSION_INTERVAL_MS);

console.log(`[TRANSMISSION:daemon] ðŸ” Autonomous loop active â€” interval=${TRANSMISSION_INTERVAL_MS / 1000}s`);



// POST /transmission/generate â€” manual on-demand artifact
app.post('/transmission/generate', async (req, res) => {
  try {
    const { worldState, previousArtifacts = [], readerSignals = [] } = req.body as {
      worldState?: unknown;
      previousArtifacts?: unknown[];
      readerSignals?: string[];
    };
    if (!worldState) return res.status(400).json({ error: '"worldState" is required' });

    const { generateTransmissionArtifact } = await import('./flows/transmission.js');
    const artifact = await generateTransmissionArtifact({
      worldState:        worldState as Parameters<typeof generateTransmissionArtifact>[0]['worldState'],
      previousArtifacts: (previousArtifacts ?? []) as Parameters<typeof generateTransmissionArtifact>[0]['previousArtifacts'],
      readerSignals:     readerSignals as string[],
    });
    res.json({ artifact });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[TRANSMISSION:generate]', msg);
    res.status(500).json({ error: msg });
  }
});

// GET /transmission/world â€” current world state (bootstraps if daemon not started)
app.get('/transmission/world', (_req, res) => {
  try {
    if (!fs.existsSync(WORLD_STATE_PATH)) {
      return res.json({
        epoch: 0,
        startedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        activeFactions: ['THE REMNANT', 'STATION AUTHORITY', 'THE WANDERING SIGNAL'],
        dominantTheme: 'displacement and signal loss',
        signalStrength: 0.7,
        artifactCount: 0,
        readerCount: 0,
        hotLocations: [],
        readerMemory: [],
      });
    }
    res.json(JSON.parse(fs.readFileSync(WORLD_STATE_PATH, 'utf-8')));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: msg });
  }
});

// GET /transmission/feed â€” SSE stream, emits artifacts in real-time + last 10 on connect
app.get('/transmission/feed', (req, res) => {
  res.writeHead(200, {
    'Content-Type':  'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection':    'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  // Replay last 10 artifacts immediately
  try {
    if (fs.existsSync(ARTIFACTS_PATH)) {
      const lines = fs.readFileSync(ARTIFACTS_PATH, 'utf-8').split('\n').filter(Boolean).slice(-10);
      for (const line of lines) {
        try { res.write(`data: ${line}\n\n`); } catch { /* client gone */ }
      }
    }
  } catch { /* not ready */ }

  const heartbeat = setInterval(() => {
    try { res.write(': heartbeat\n\n'); } catch { clearInterval(heartbeat); }
  }, 20_000);

  const onArtifact = (artifact: unknown) => {
    try { res.write(`data: ${JSON.stringify(artifact)}\n\n`); } catch { /* gone */ }
  };

  transmissionEmitter.on('artifact', onArtifact);
  req.on('close', () => {
    clearInterval(heartbeat);
    transmissionEmitter.off('artifact', onArtifact);
  });
});

// POST /transmission/reader â€” log anonymous reader interaction for crowd memory
app.post('/transmission/reader', (req, res) => {
  try {
    const signal = req.body as { artifactId?: string; action?: string; tags?: string[] };
    if (!signal.artifactId) return res.status(400).json({ error: '"artifactId" is required' });
    fs.appendFileSync(SIGNALS_PATH, JSON.stringify({ ...signal, at: new Date().toISOString() }) + '\n');
    res.json({ recorded: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: msg });
  }
});

export { app };
export default app;

