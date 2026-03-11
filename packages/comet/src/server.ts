/**
 * COMET — HTTP Server
 *
 * Port 7100 | Docker: depends on ghost (6000) + genkit (4000) + creative-liberation-engine (8000)
 *
 * === ROUTES ===
 * GET  /health
 * POST /execute     — Main execution endpoint
 * GET  /status/:task_id — Poll async task status
 * GET  /audit/:domain   — Recent audit log for a domain
 *
 * === EXECUTION PIPELINE ===
 * 1. Route: SMG hit/miss check (CometRouter)
 * 2a. Programmatic: Sketch → Link → Compile → PreflightReview → Execute+Validate
 * 2b. Reactive: Forward to Python Creative Liberation Engine BrowserAgent
 * 3. Audit trail write (always)
 * 4. Return result + plan + preflight verdict to caller
 */

import express, { Express, Request, Response } from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createHash } from 'crypto';
import { CometRouter } from './router.js';
import { ExecutionAgent } from './execution-agent.js';
import { Validator } from './validator.js';
import { PreflightReviewer } from './governance/preflight.js';
import { auditTrail } from './governance/audit-trail.js';
import type { CometExecuteRequest, CometExecuteResponse } from './types.js';

// Agent status — populated if the agent loop is running in the same process
let agentStatusFn: (() => Record<string, unknown>) | null = null;
export function registerAgentStatus(fn: () => Record<string, unknown>) { agentStatusFn = fn; }

const app: Express = express();
app.use(express.json({ limit: '5mb' }));

const PORT = Number(process.env.PORT ?? 7100);

// ── WebSocket — live execution event stream ──────────────────────────────────
// Path: /ws  (nginx proxy_pass http://comet/ws upgrading the connection)
const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

const clients = new Set<WebSocket>();

wss.on('connection', (ws: WebSocket) => {
    clients.add(ws);
    ws.send(JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() }));
    ws.on('close', () => clients.delete(ws));
    ws.on('error', () => clients.delete(ws));
});

/** Broadcast an execution event to all WebSocket subscribers */
function broadcast(event: Record<string, unknown>) {
    const msg = JSON.stringify({ timestamp: new Date().toISOString(), ...event });
    clients.forEach(ws => { if (ws.readyState === WebSocket.OPEN) ws.send(msg); });
}

// ── Singletons ────────────────────────────────────────────────────────────────────────
const router = new CometRouter();
const executionAgent = new ExecutionAgent();
const validator = new Validator();
const preflight = new PreflightReviewer();

// ── Agent Status ─────────────────────────────────────────────────────────────────────
app.get('/agent/status', (_req: Request, res: Response) => {
    if (agentStatusFn) {
        res.json(agentStatusFn());
    } else {
        res.json({
            running: false,
            message: 'COMET agent consumer not running in this process. Start with: npm run agent',
            hint: 'Set DISPATCH_URL + COMET_URL env vars and run packages/comet agent.ts',
        });
    }
});

// ── Health ────────────────────────────────────────────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
    res.json({
        status: 'operational',
        service: 'inception-comet',
        version: '1.1.0-genesis',
        timestamp: new Date().toISOString(),
        websocket_clients: clients.size,
        capabilities: [
            'programmatic-execution',
            'reactive-fallback',
            'smg-routing',
            'constitutional-preflight',
            'validator-repair',
            'audit-trail',
            'android-native',
            'ios-native',
            'visionos-spatial',
            'websocket-streaming',
        ],
    });
});

// ── Execute ─────────────────────────────────────────────────────────────────────
//
// POST /execute
// Body: CometExecuteRequest
// The main COMET mission endpoint. One call, full pipeline.
//
// Quick examples:
//   { "url": "https://reddit.com", "instruction": "Find the top post title in r/programming" }
//   { "url": "https://github.com", "instruction": "Search for 'playwright' and get the first result name" }
//   { "platform": "android", "package": "com.reddit.frontpage", "instruction": "Find the top post", "device_id": "emulator-5554" }

app.post('/execute', async (req: Request, res: Response) => {
    const taskId = createHash('sha1').update(JSON.stringify(req.body) + Date.now()).digest('hex').slice(0, 12);
    const body = req.body as CometExecuteRequest;

    try {
        if (!body.instruction) {
            res.status(400).json({
                error: '"instruction" is required.',
                example: { url: 'https://reddit.com', instruction: 'Find the top post title in r/programming' },
            });
            return;
        }

        const autonomy = body.autonomy ?? 'supervised';
        const platform = body.platform ?? 'web';

        // 1. Route decision
        const routeResult = await router.route(body);
        console.log(`[COMET] Task ${taskId}: ${routeResult.decision} (${routeResult.reason})`);

        // ── REACTIVE path ───────────────────────────────────────────────────
        if (routeResult.decision === 'reactive') {
            try {
                const reactiveResult = await router.executeReactive(body);
                void auditTrail.record(taskId, body.instruction, routeResult.domain, platform, 'reactive', false, null, null, null);

                const response: CometExecuteResponse = {
                    status: 'success',
                    mode_used: 'reactive',
                    smg_hit: false,
                    task_id: taskId,
                    result: reactiveResult as any,
                };
                res.json(response);
            } catch (err: any) {
                res.status(500).json({ status: 'failed', error: err.message, task_id: taskId });
            }
            return;
        }

        // ── PROGRAMMATIC path ───────────────────────────────────────────────
        if (!routeResult.smg) {
            res.status(500).json({ error: 'Router returned programmatic but no SMG. This should not happen.', task_id: taskId });
            return;
        }

        // 2. Synthesize plan
        const plan = await executionAgent.synthesize(body.instruction, routeResult.smg);

        // 3. Constitutional pre-flight
        const preflightResult = await preflight.review(plan);
        plan.preflight = {
            verdict: preflightResult.verdict,
            reasoning: preflightResult.reasoning,
            flagged_nodes: preflightResult.flagged_nodes,
        };

        if (preflightResult.verdict === 'BLOCKED') {
            void auditTrail.record(taskId, body.instruction, routeResult.domain, platform, 'programmatic', true, plan, preflightResult, null);
            const response: CometExecuteResponse = {
                status: 'blocked',
                mode_used: 'programmatic',
                smg_hit: true,
                plan,
                preflight: plan.preflight,
                task_id: taskId,
                error: preflightResult.reasoning,
            };
            res.status(403).json(response);
            return;
        }

        // In supervised mode with REVIEW verdict — return plan for user confirmation
        if (autonomy === 'supervised' && preflightResult.verdict === 'REVIEW') {
            const response: CometExecuteResponse = {
                status: 'queued',
                mode_used: 'programmatic',
                smg_hit: true,
                plan,
                preflight: plan.preflight,
                task_id: taskId,
            };
            res.status(202).json({
                ...response,
                message: 'Plan requires review. Inspect "plan" and POST /execute/confirm/:task_id to proceed.',
                flagged_nodes: preflightResult.flagged_nodes,
            });
            return;
        }

        // 4. Execute with Validator — broadcast each event over WebSocket
        const executionResult = await validator.execute(plan, broadcast);

        // 5. Audit
        void auditTrail.record(taskId, body.instruction, routeResult.domain, platform, 'programmatic', true, plan, preflightResult, executionResult);

        const response: CometExecuteResponse = {
            status: executionResult.status,
            mode_used: 'programmatic',
            smg_hit: true,
            plan,
            result: executionResult,
            preflight: plan.preflight,
            task_id: taskId,
        };
        res.json(response);

    } catch (err: any) {
        console.error(`[COMET] Task ${taskId} fatal error:`, err.message);
        res.status(500).json({ status: 'failed', error: err.message, task_id: taskId });
    }
});

// ── Audit Query ──────────────────────────────────────────────────────────────────
app.get('/audit/:domain', async (req: Request, res: Response) => {
    try {
        const { domain } = req.params;
        const limitRaw = typeof req.query.limit === 'string' ? req.query.limit : '20';
        const limit = parseInt(limitRaw, 10);
        const records = await auditTrail.getRecent(domain, limit);
        res.json({ domain, count: records.length, records });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ── Start ────────────────────────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║   COMET — SOVEREIGN SPATIAL INTELLIGENCE LAYER               ║
║   v1.1.0-genesis | Port ${PORT}                                ║
╠══════════════════════════════════════════════════════════════╣
║   POST /execute       — Execute a task (web, android, ios)   ║
║   GET  /health        — Health + WS client count             ║
║   GET  /audit/:domain — Recent audit log                     ║
║   WS   /ws            — Live execution event stream          ║
╠══════════════════════════════════════════════════════════════╣
║   SMG → GHOST:6000  |  LLM → Genkit:4000                    ║
║   Fallback → Creative Liberation Engine:8000                           ║
║   Vision   → COMET Vision (visionOS, RealityKit)             ║
║   Constitution: 20 articles enforced on every plan           ║
╚══════════════════════════════════════════════════════════════╝
    `);
});

export { app, broadcast };


