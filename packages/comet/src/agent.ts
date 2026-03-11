/**
 * COMET — Autonomous Task Consumer
 *
 * Background agent loop that wires COMET into the Creative Liberation Engine dispatch system.
 * Polls the dispatch REST API for tasks with workstream=comet-browser, executes
 * them using the full COMET pipeline (Router → ExecutionAgent → Validator),
 * and marks them complete with structured results.
 *
 * Entry point: `npm run agent` (runs standalone as a Docker sidecar)
 *
 * Protocol (REST, no shared store — COMET and dispatch run in separate containers):
 *   GET  DISPATCH_URL/api/tasks?workstream=comet-browser&status=queued
 *   PATCH DISPATCH_URL/api/tasks/:id  { status: 'active', claimed_by: AGENT_ID }
 *   POST  COMET_URL/execute           { url, instruction, autonomy: 'autonomous' }
 *   PATCH DISPATCH_URL/api/tasks/:id  { status: 'done'|'failed', handoff_note, artifacts }
 *
 * Task format (type:browse tasks):
 *   title:       "[browse] <instruction>"
 *   description: "url:<url>\ninstruction:<instruction>"
 *   workstream:  "comet-browser"
 */

const DISPATCH_URL = process.env.DISPATCH_URL ?? 'http://localhost:5050';
const COMET_URL = process.env.COMET_URL ?? 'http://localhost:7100';
const AGENT_ID = process.env.COMET_AGENT_ID ?? `comet-agent-${process.pid}`;
const POLL_INTERVAL_MS = parseInt(process.env.COMET_POLL_MS ?? '10000', 10); // 10s
const PROJECT = process.env.PROJECT ?? 'brainchild-v5';

let running = true;
let tasksCompleted = 0;
let tasksFailed = 0;
let currentTaskId: string | null = null;

// ─── Types (mirrors dispatch/src/types.ts, no import coupling) ───────────────

interface DispatchTask {
    id: string;
    org: string;
    project: string;
    workstream: string;
    title: string;
    description?: string;
    acceptance_criteria?: string[];
    priority: 'P0' | 'P1' | 'P2' | 'P3';
    status: 'queued' | 'active' | 'blocked' | 'done' | 'failed' | 'handoff';
    dependencies: string[];
    claimed_by: string | null;
    claimed_at: string | null;
    completed_at: string | null;
    handoff_note: string | null;
    artifacts: string[];
    created: string;
    updated: string;
}

interface BrowseSpec {
    url: string;
    instruction: string;
}

interface TaskResult {
    success: boolean;
    output?: string;
    error?: string;
    artifacts?: string[];
}

// ─── Dispatch REST Client ─────────────────────────────────────────────────────

async function fetchQueuedTasks(): Promise<DispatchTask[]> {
    try {
        const res = await fetch(
            `${DISPATCH_URL}/api/tasks?workstream=comet-browser&status=queued&project=${PROJECT}`,
            { signal: AbortSignal.timeout(5000) },
        );
        if (!res.ok) return [];
        const data = await res.json() as { tasks?: DispatchTask[] } | DispatchTask[];
        return Array.isArray(data) ? data : (data.tasks ?? []);
    } catch {
        return [];
    }
}

async function claimTask(taskId: string): Promise<boolean> {
    try {
        const res = await fetch(`${DISPATCH_URL}/api/tasks/${taskId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                status: 'active',
                claimed_by: AGENT_ID,
                claimed_at: new Date().toISOString(),
            }),
            signal: AbortSignal.timeout(5000),
        });
        return res.ok;
    } catch {
        return false;
    }
}

async function completeTask(taskId: string, result: TaskResult): Promise<void> {
    try {
        await fetch(`${DISPATCH_URL}/api/tasks/${taskId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                status: result.success ? 'done' : 'failed',
                completed_at: new Date().toISOString(),
                handoff_note: (result.output ?? result.error ?? '').slice(0, 500),
                artifacts: result.artifacts ?? [],
            }),
            signal: AbortSignal.timeout(5000),
        });
    } catch (err: any) {
        console.error(`[COMET/AGENT] Failed to mark task ${taskId} complete:`, err.message);
    }
}

async function registerAgent(): Promise<void> {
    try {
        await fetch(`${DISPATCH_URL}/api/agents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                agent_id: AGENT_ID,
                tool: 'script',
                capabilities: ['comet-browser', 'browse', 'playwright', 'smg'],
                session_id: `comet-${Date.now()}`,
                connected_at: new Date().toISOString(),
                last_seen: new Date().toISOString(),
                active_task_id: null,
                notifications: [],
            }),
            signal: AbortSignal.timeout(5000),
        });
        console.log(`[COMET/AGENT] ✅ Registered as ${AGENT_ID} at dispatch`);
    } catch {
        console.warn(`[COMET/AGENT] ⚠️  Dispatch offline — running in standalone mode`);
    }
}

async function heartbeat(): Promise<void> {
    try {
        await fetch(`${DISPATCH_URL}/api/agents/${AGENT_ID}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                last_seen: new Date().toISOString(),
                active_task_id: currentTaskId,
            }),
            signal: AbortSignal.timeout(3000),
        });
    } catch { /* Best-effort heartbeat — never block on this */ }
}

// ─── Browse Task Parser ───────────────────────────────────────────────────────

function parseBrowseSpec(task: DispatchTask): BrowseSpec | null {
    const desc = task.description ?? '';

    // Format 1: "url:<url>\ninstruction:<instruction>"
    const urlMatch = desc.match(/^url:\s*(.+)/m);
    const instrMatch = desc.match(/^instruction:\s*(.+)/m);
    if (urlMatch && instrMatch) {
        return { url: urlMatch[1].trim(), instruction: instrMatch[1].trim() };
    }

    // Format 2: title starts with "[browse] <url> — <instruction>"
    const titleMatch = task.title.match(/\[browse\]\s+(https?:\/\/[^\s]+)\s+[—-]\s+(.+)/i);
    if (titleMatch) {
        return { url: titleMatch[1].trim(), instruction: titleMatch[2].trim() };
    }

    // Format 3: description IS the instruction, title contains URL
    const urlInTitle = task.title.match(/https?:\/\/[^\s]+/);
    if (urlInTitle && desc.length > 0) {
        return { url: urlInTitle[0], instruction: desc.trim() };
    }

    // Format 4: bare URL in description first line
    const bareUrl = desc.match(/^(https?:\/\/[^\s]+)/m);
    if (bareUrl) {
        const instruction = task.acceptance_criteria?.join(' ') ?? task.title;
        return { url: bareUrl[1], instruction };
    }

    console.warn(`[COMET/AGENT] Could not parse browse spec from task ${task.id}`);
    return null;
}

// ─── Execute via COMET HTTP API ───────────────────────────────────────────────

async function executeBrowseTask(spec: BrowseSpec): Promise<TaskResult> {
    try {
        console.log(`[COMET/AGENT] 🌐 Browsing: ${spec.url}`);
        console.log(`[COMET/AGENT] 📋 Instruction: ${spec.instruction.slice(0, 80)}`);

        const res = await fetch(`${COMET_URL}/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: spec.url,
                instruction: spec.instruction,
                mode: 'auto',
                autonomy: 'autonomous',
                platform: 'web',
            }),
            signal: AbortSignal.timeout(180_000), // 3 min max for complex browsing
        });

        if (!res.ok) {
            const errText = await res.text();
            return { success: false, error: `COMET /execute returned ${res.status}: ${errText.slice(0, 200)}` };
        }

        const result = await res.json() as {
            status: string;
            mode_used: string;
            smg_hit: boolean;
            result?: {
                status: string;
                context_snapshot: Record<string, unknown>;
                node_results: Array<{ node_id: string; status: string; output?: unknown }>;
                smg_updates: number;
                duration_ms: number;
            };
            error?: string;
            task_id: string;
        };

        if (result.status === 'failed' || result.status === 'blocked') {
            return { success: false, error: result.error ?? `COMET execution ${result.status}` };
        }

        // Synthesise output from context snapshot
        const snapshot = result.result?.context_snapshot ?? {};
        const readOutputs = Object.entries(snapshot)
            .filter(([, v]) => v !== null && v !== undefined)
            .map(([k, v]) => `${k}: ${String(v).slice(0, 200)}`)
            .join('\n');

        const output = [
            `COMET executed: ${spec.url}`,
            `Mode: ${result.mode_used} | SMG hit: ${result.smg_hit}`,
            `Duration: ${result.result?.duration_ms ?? '?'}ms`,
            `SMG updates: ${result.result?.smg_updates ?? 0}`,
            readOutputs ? `\nExtracted data:\n${readOutputs}` : '',
        ].filter(Boolean).join('\n');

        return { success: true, output };

    } catch (err: any) {
        if (err.name === 'TimeoutError') {
            return { success: false, error: 'COMET execution timed out after 3 minutes' };
        }
        return { success: false, error: err.message };
    }
}

// ─── Priority Sorter ──────────────────────────────────────────────────────────

const PRIORITY_ORDER: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };

function sortByPriority(tasks: DispatchTask[]): DispatchTask[] {
    return [...tasks].sort(
        (a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9),
    );
}

// ─── Main Poll Loop ───────────────────────────────────────────────────────────

async function agentLoop(): Promise<void> {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║   COMET AUTONOMOUS AGENT — Task Consumer                     ║
║   Agent ID: ${AGENT_ID.padEnd(48)}║
╠══════════════════════════════════════════════════════════════╣
║   Dispatch: ${DISPATCH_URL.padEnd(48)}║
║   COMET:    ${COMET_URL.padEnd(48)}║
║   Project:  ${PROJECT.padEnd(48)}║
║   Poll:     ${String(POLL_INTERVAL_MS + 'ms').padEnd(48)}║
╚══════════════════════════════════════════════════════════════╝`);

    // Register with dispatch server
    await registerAgent();

    // Heartbeat every 30s
    const heartbeatInterval = setInterval(() => { void heartbeat(); }, 30_000);

    while (running) {
        try {
            const tasks = await fetchQueuedTasks();
            const sorted = sortByPriority(tasks);

            if (sorted.length === 0) {
                await sleep(POLL_INTERVAL_MS);
                continue;
            }

            // Pick highest-priority task and claim it atomically
            let claimed: DispatchTask | null = null;
            for (const task of sorted) {
                const ok = await claimTask(task.id);
                if (ok) { claimed = task; break; }
                // If claim failed, someone else got it — try the next
            }

            if (!claimed) {
                await sleep(POLL_INTERVAL_MS);
                continue;
            }

            currentTaskId = claimed.id;
            console.log(`\n[COMET/AGENT] 🎯 Claimed: ${claimed.id} [${claimed.priority}]`);
            console.log(`[COMET/AGENT]    "${claimed.title.slice(0, 80)}"`);

            const spec = parseBrowseSpec(claimed);
            if (!spec) {
                await completeTask(claimed.id, {
                    success: false,
                    error: 'Could not parse browse spec — missing URL or instruction in task description',
                });
                currentTaskId = null;
                tasksFailed++;
                continue;
            }

            const start = Date.now();
            const result = await executeBrowseTask(spec);
            const elapsed = ((Date.now() - start) / 1000).toFixed(1);

            await completeTask(claimed.id, result);
            currentTaskId = null;

            if (result.success) {
                tasksCompleted++;
                console.log(`[COMET/AGENT] ✅ ${claimed.id} done in ${elapsed}s`);
            } else {
                tasksFailed++;
                console.warn(`[COMET/AGENT] ❌ ${claimed.id} failed: ${result.error}`);
            }

            console.log(`[COMET/AGENT] 📊 Done: ${tasksCompleted} | Failed: ${tasksFailed}`);

            // Brief pause between tasks to avoid hammering
            await sleep(2000);

        } catch (err: any) {
            console.error(`[COMET/AGENT] Loop error:`, err.message);
            currentTaskId = null;
            await sleep(POLL_INTERVAL_MS);
        }
    }

    clearInterval(heartbeatInterval);
    console.log('[COMET/AGENT] 🛑 Shutdown complete');
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Status Export (for /agent/status route in server.ts) ────────────────────

export function getAgentStatus() {
    return {
        agent_id: AGENT_ID,
        dispatch_url: DISPATCH_URL,
        running,
        current_task_id: currentTaskId,
        tasks_completed: tasksCompleted,
        tasks_failed: tasksFailed,
        poll_interval_ms: POLL_INTERVAL_MS,
        uptime_ms: process.uptime() * 1000,
    };
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

process.on('SIGTERM', () => {
    running = false;
    console.log('[COMET/AGENT] SIGTERM — draining current task then shutting down...');
});
process.on('SIGINT', () => {
    running = false;
    console.log('[COMET/AGENT] SIGINT — shutting down...');
});

agentLoop().catch(err => {
    console.error('[COMET/AGENT] Fatal:', err);
    process.exit(1);
});
