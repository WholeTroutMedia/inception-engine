import { Redis } from 'ioredis';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const DISPATCH_URL = process.env.DISPATCH_URL || 'http://localhost:5050';
const GENKIT_URL = process.env.GENKIT_URL || 'http://localhost:4100';
const WINDOW_ID = process.env.WINDOW_ID || 'cle-nas-W1';

// Workstreams this daemon handles autonomously
const WORKSTREAMS = ['infra-docker', 'genkit-flows', 'zero-day', 'comet-browser', 'iecr', 'creative'];

console.log(`[NAS Daemon] ◉ Booting autonomous worker (${WINDOW_ID})...`);
console.log(`[NAS Daemon]   DISPATCH → ${DISPATCH_URL}`);
console.log(`[NAS Daemon]   REDIS    → ${REDIS_URL}`);
console.log(`[NAS Daemon]   GENKIT   → ${GENKIT_URL}`);
console.log(`[NAS Daemon]   Watching workstreams: ${WORKSTREAMS.join(', ')}`);

/* ── Redis client ────────────────────────────────────── */
const redis = new Redis(REDIS_URL);

redis.on('error', (e) => console.error('[NAS Daemon] Redis error:', e.message));

/* ── Heartbeat ───────────────────────────────────────── */
async function sendHeartbeat() {
    try {
        await fetch(`${DISPATCH_URL}/api/agents/heartbeat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                agent_id: WINDOW_ID,
                tool: 'cle',
                timestamp: new Date().toISOString(),
                workstreams: WORKSTREAMS,
            }),
        });
    } catch {
        // Heartbeat failure is non-fatal — dispatch may be restarting
    }
}

/* ── Task execution: dispatch a Genkit flow for a task ─ */
async function executeTask(task: { id: string; workstream: string; title: string }): Promise<void> {
    console.log(`[NAS Daemon] ▶ Executing task ${task.id}: ${task.title}`);

    try {
        // Route to the appropriate Genkit flow by workstream
        const flowMap: Record<string, string> = {
            'infra-docker': 'infraDockerFlow',
            'genkit-flows': 'genkitFlowBuilder',
            'zero-day': 'zeroDayBriefPipeline',
            'comet-browser': 'cometBrowserFlow',
            'iecr': 'iecr/decompose',
            'creative': 'iecr/decompose',
        };

        const flowName = flowMap[task.workstream] || 'genericTaskFlow';

        // IECR flows need `prompt` + `sessionId`; others use the task metadata envelope
        const isIecr = flowName === 'iecr/decompose';
        const requestBody = isIecr
            ? { prompt: `${task.title}. ${task.workstream}`, sessionId: task.id }
            : { taskId: task.id, title: task.title, workstream: task.workstream };

        const res = await fetch(`${GENKIT_URL}/api/${flowName}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });

        if (res.ok) {
            const result = await res.json() as { summary?: string };
            console.log(`[NAS Daemon] ✔ Task ${task.id} flow completed: ${result.summary ?? 'ok'}`);

            // Mark resolved
            await fetch(`${DISPATCH_URL}/api/tasks/${task.id}/resolve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    resolution_note: `Executed via ${flowName} on ${WINDOW_ID}. Flow result: ${result.summary ?? 'completed'}`,
                }),
            });
            console.log(`[NAS Daemon] ✔ Resolved ${task.id} in dispatch`);
        } else {
            throw new Error(`Genkit returned ${res.status}`);
        }
    } catch (err: any) {
        console.error(`[NAS Daemon] ✖ Task ${task.id} execution error:`, err.message);

        // Release the claim so another agent can retry
        await fetch(`${DISPATCH_URL}/api/tasks/${task.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'queued', claimed_by: null, claimed_at: null }),
        }).catch(() => null);
    }
}

/* ── Loop 1: Dispatch Poller ─────────────────────────── */
const activeTasks = new Set<string>(); // prevent re-claiming mid-execution

async function pollDispatch() {
    try {
        const res = await fetch(`${DISPATCH_URL}/api/tasks?status=queued`);
        if (!res.ok) throw new Error(`Dispatch responded with ${res.status}`);

        const data = (await res.json()) as { tasks: any[] };
        const eligible = data.tasks.filter(
            (t) => WORKSTREAMS.includes(t.workstream) && !activeTasks.has(t.id)
        );

        if (eligible.length === 0) return;

        // Take highest priority task (P0 < P1 < P2)
        const task = eligible.sort((a, b) => a.priority.localeCompare(b.priority))[0];

        console.log(`[NAS Daemon] → Found task ${task.id} [${task.priority}] (${task.title})`);

        // Claim it
        const claimRes = await fetch(`${DISPATCH_URL}/api/tasks/${task.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                status: 'active',
                claimed_by: WINDOW_ID,
                assigned_to_agent: 'cle',
                claimed_at: new Date().toISOString(),
            }),
        });

        if (claimRes.ok) {
            activeTasks.add(task.id);
            executeTask(task).finally(() => activeTasks.delete(task.id));
        } else {
            console.warn(`[NAS Daemon] Claim rejected for ${task.id} (${claimRes.status})`);
        }
    } catch (err: any) {
        console.error('[NAS Daemon] Poller error:', err.message);
    }
}

/* ── Loop 2: Zero-Day Redis Subscriber ──────────────── */
async function listenRedis() {
    const streamKey = 'stream:zeroday:briefs';
    const groupName = 'nas_workers';
    const consumerName = WINDOW_ID;

    try {
        await redis.xgroup('CREATE', streamKey, groupName, '$', 'MKSTREAM');
    } catch (e: any) {
        if (!e.message?.includes('BUSYGROUP')) {
            console.error('[NAS Daemon] Redis Group Error:', e.message);
        }
    }

    console.log(`[NAS Daemon] ◉ Listening to Redis stream ${streamKey}...`);

    while (true) {
        try {
            // @ts-ignore — ioredis xreadgroup typing is loose
            const result = await redis.xreadgroup(
                'GROUP', groupName, consumerName,
                'COUNT', 1,
                'BLOCK', 5000,
                'STREAMS', streamKey, '>'
            ) as any;

            if (result) {
                const messages = result[0][1] as [string, string[]][];
                for (const [id] of messages) {
                    console.log(`[NAS Daemon] ◉ Zero-Day brief received: ${id}`);

                    await fetch(`${GENKIT_URL}/api/zeroDayBriefPipeline`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ streamId: id }),
                    }).catch((e) => console.error('[NAS Daemon] Genkit brief call failed:', e.message));

                    await redis.xack(streamKey, groupName, id);
                }
            }
        } catch (err: any) {
            console.error('[NAS Daemon] Stream error:', err.message);
            await new Promise((r) => setTimeout(r, 5000));
        }
    }
}

/* ── Boot ────────────────────────────────────────────── */
sendHeartbeat();
setInterval(sendHeartbeat, 30_000); // Heartbeat every 30s

pollDispatch();
setInterval(pollDispatch, 15_000); // Poll dispatch every 15s

listenRedis(); // Blocking Redis stream listener
