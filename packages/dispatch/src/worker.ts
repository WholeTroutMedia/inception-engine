/**
 * packages/dispatch/src/worker.ts
 * Creative Liberation Engine — Autonomous Dispatch Worker
 *
 * Background agent loop that:
 *   1. Polls the dispatch task queue every POLL_INTERVAL ms
 *   2. Claims the highest-priority queued task
 *   3. AI-routes the task to the correct Genkit flow or HTTP endpoint
 *   4. Executes, marks done, loops
 *
 * Run standalone: node dist/worker.js
 * Or as a Docker service alongside the dispatch server.
 *
 * Constitutional: Article IX (Ship Complete) — this is the autonomous backbone
 */

import { getTasks, getTask, saveTask, getAgent, saveAgent, ensureStore } from './store.js';
import type { Task } from './types.js';
import { v4 as uuidv4 } from 'uuid';

const POLL_INTERVAL_MS = parseInt(process.env.WORKER_POLL_MS ?? '15000'); // 15s default
const GENKIT_URL = process.env.GENKIT_URL ?? 'http://localhost:4100';
const DISPATCH_URL = process.env.DISPATCH_URL ?? 'http://localhost:5050';
const WORKER_ID = process.env.WORKER_ID ?? `dispatch-worker-${process.pid}`;
const PROJECT = process.env.PROJECT ?? 'brainchild-v5';

let running = true;
let tasksCompleted = 0;
let tasksFailed = 0;

// ─────────────────────────────────────────────────────────────────────────────
// ROUTER — maps task workstream/keywords → execution handler
// ─────────────────────────────────────────────────────────────────────────────

type TaskResult = { success: boolean; output?: string; artifacts?: string[]; error?: string };

async function routeAndExecute(task: Task): Promise<TaskResult> {
    const ws = task.workstream.toLowerCase();
    const title = task.title.toLowerCase();

    // ── IECR Creative Runtime — Director Agent ────────────────────────────────
    if (ws === 'iecr' || ws === 'creative' || ws === 'creative-runtime' ||
        title.includes('task graph') || title.includes('creative runtime') ||
        title.includes('iecr')) {
        return await callGenkit('/api/iecr/decompose', {
            prompt: `${task.title}. ${task.description ?? ''}`.trim(),
            sessionId: task.id,
        });
    }

    // ── Campaign DAG ──────────────────────────────────────────────────────────
    if (ws === 'campaign' || title.includes('campaign') || title.includes('brief')) {
        return await runCampaignTask(task);
    }

    // ── AVERI Ideate/Plan ──────────────────────────────────────────────────────
    if (title.includes('ideate') || title.includes('brainstorm') || title.includes('explore')) {
        return await callGenkit('/averi/ideate', {
            topic: task.title,
            context: task.description ?? '',
            depth: 'deep',
            sessionId: task.id,
        });
    }

    if (title.includes('plan') || title.includes('spec') || title.includes('architecture')) {
        return await callGenkit('/averi/plan', {
            topic: task.title,
            context: task.description ?? '',
            depth: 'deep',
            sessionId: task.id,
        });
    }

    // ── Research ─────────────────────────────────────────────────────────────
    if (title.includes('research') || title.includes('search') || ws.includes('research')) {
        return await callGenkit('/search', {
            query: `${task.title}. ${task.description ?? ''}`.trim(),
        });
    }

    // ── Generate (any media/copy) ─────────────────────────────────────────────
    if (title.includes('generate') || title.includes('create') || title.includes('write')) {
        return await callGenkit('/generate', {
            model: 'googleai/gemini-2.0-flash',
            prompt: `You are an autonomous Creative Liberation Engine agent completing this task:

Title: ${task.title}
Description: ${task.description ?? 'No additional description'}
Acceptance Criteria: ${task.acceptance_criteria?.join(', ') || 'Complete the task as described'}

Produce a detailed, complete output. Be specific and actionable.`,
        });
    }

    // ── Default: Use ATHENA for strategic routing ─────────────────────────────
    return await callGenkit('/generate', {
        model: 'googleai/gemini-2.0-flash',
        system: `You are ATHENA, the strategic director of the Creative Liberation Engine. You are executing tasks autonomously from the dispatch queue.`,
        prompt: `Complete this task and produce a concrete, actionable output:

Task ID: ${task.id}
Workstream: ${task.workstream}
Title: ${task.title}
Description: ${task.description ?? 'No additional description'}
Priority: ${task.priority}
Acceptance Criteria: ${task.acceptance_criteria?.join('\n- ') || 'Complete the task'}

Produce complete output that satisfies the acceptance criteria.`,
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// CAMPAIGN TASK HANDLER
// ─────────────────────────────────────────────────────────────────────────────

async function runCampaignTask(task: Task): Promise<TaskResult> {
    try {
        // Check if task has a campaign ID in artifacts/description
        const campaignIdMatch = task.description?.match(/campaign[_-]?id[:\s]+([a-zA-Z0-9-]+)/i);
        if (campaignIdMatch) {
            const campaignId = campaignIdMatch[1];
            const res = await fetch(`http://campaign:3002/execute/${campaignId}`, { method: 'POST' });
            if (!res.ok) throw new Error(`Campaign execute returned ${res.status}`);
            const data = await res.json() as { id: string; status: string };
            return { success: true, output: `Campaign ${campaignId} executed — status: ${data.status}` };
        }

        // Otherwise use ATHENA to plan campaign approach
        return await callGenkit('/averi/plan', {
            topic: `Campaign execution: ${task.title}`,
            context: task.description ?? '',
            sessionId: task.id,
        });
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// GENKIT HTTP HELPER
// ─────────────────────────────────────────────────────────────────────────────

async function callGenkit(endpoint: string, body: Record<string, unknown>): Promise<TaskResult> {
    try {
        const res = await fetch(`${GENKIT_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(120_000), // 2 minute max per task
        });
        if (!res.ok) throw new Error(`Genkit ${endpoint} returned ${res.status}`);
        const data = await res.json() as Record<string, unknown>;
        const output = typeof data.text === 'string' ? data.text
            : typeof data.directive === 'string' ? data.directive
                : JSON.stringify(data, null, 2);
        return { success: true, output };
    } catch (err: any) {
        return { success: false, error: `Genkit call failed: ${err.message}` };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// CLAIM + EXECUTE
// ─────────────────────────────────────────────────────────────────────────────

async function claimNextTask(): Promise<Task | null> {
    const tasks = await getTasks();
    const priorityOrder: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };

    // Only claim tasks that are queued and not assigned to a specific human window
    const eligible = tasks
        .filter(t =>
            t.status === 'queued' &&
            t.project === PROJECT &&
            // Skip tasks assigned to human windows (contains "Window")
            !t.assigned_to_agent?.toLowerCase().includes('window') &&
            // Skip tasks with unmet dependencies
            t.dependencies.every(dep => {
                const depTask = tasks.find(x => x.id === dep);
                return !depTask || depTask.status === 'done';
            })
        )
        .sort((a, b) => (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9));

    if (eligible.length === 0) return null;

    const task = eligible[0];
    const now = new Date().toISOString();
    task.status = 'active';
    task.claimed_by = WORKER_ID;
    task.claimed_at = now;
    task.updated = now;
    await saveTask(task);

    // Register worker as an agent if needed
    let agent = await getAgent(WORKER_ID);
    if (!agent) {
        agent = {
            agent_id: WORKER_ID,
            tool: 'script',
            capabilities: ['genkit', 'campaign', 'research', 'plan', 'ideate'],
            session_id: uuidv4(),
            connected_at: now,
            last_seen: now,
            active_task_id: task.id,
            notifications: [],
        };
    } else {
        agent.active_task_id = task.id;
        agent.last_seen = now;
    }
    await saveAgent(agent);

    return task;
}

async function markTaskDone(task: Task, result: TaskResult): Promise<void> {
    const now = new Date().toISOString();
    task.status = result.success ? 'done' : 'failed';
    task.completed_at = now;
    task.updated = now;
    if (result.artifacts) task.artifacts = result.artifacts;
    if (result.output) task.handoff_note = result.output.slice(0, 500); // cap note length
    await saveTask(task);

    const agent = await getAgent(WORKER_ID);
    if (agent) {
        agent.active_task_id = null;
        agent.last_seen = now;
        await saveAgent(agent);
    }

    if (result.success) {
        tasksCompleted++;
        console.log(`[WORKER] ✅ ${task.id} — ${task.title.slice(0, 60)}`);
    } else {
        tasksFailed++;
        console.warn(`[WORKER] ❌ ${task.id} — ${result.error}`);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN LOOP
// ─────────────────────────────────────────────────────────────────────────────

async function workerLoop(): Promise<void> {
    console.log(`[WORKER] 🤖 Inception Dispatch Worker ${WORKER_ID}`);
    console.log(`[WORKER] 📡 Genkit: ${GENKIT_URL} | Dispatch: ${DISPATCH_URL}`);
    console.log(`[WORKER] ⏱️  Poll interval: ${POLL_INTERVAL_MS}ms`);
    console.log(`[WORKER] 🏃 Worker loop started`);

    while (running) {
        try {
            const task = await claimNextTask();

            if (!task) {
                // No eligible tasks — idle
                await sleep(POLL_INTERVAL_MS);
                continue;
            }

            console.log(`[WORKER] 🎯 Claimed: ${task.id} [${task.priority}] — ${task.workstream}`);
            console.log(`[WORKER]    "${task.title.slice(0, 80)}"`);

            const start = Date.now();
            const result = await routeAndExecute(task);
            const elapsed = ((Date.now() - start) / 1000).toFixed(1);

            await markTaskDone(task, result);
            console.log(`[WORKER] ⏱️  ${elapsed}s | ✅ ${tasksCompleted} done | ❌ ${tasksFailed} failed`);

            // Brief pause between tasks
            await sleep(2000);

        } catch (err: any) {
            console.error(`[WORKER] Loop error:`, err.message);
            await sleep(POLL_INTERVAL_MS);
        }
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ─────────────────────────────────────────────────────────────────────────────
// BOOT
// ─────────────────────────────────────────────────────────────────────────────

process.on('SIGTERM', () => { running = false; console.log('[WORKER] SIGTERM — shutting down gracefully'); });
process.on('SIGINT', () => { running = false; console.log('[WORKER] SIGINT — shutting down gracefully'); });

await ensureStore();
workerLoop().catch(err => {
    console.error('[WORKER] Fatal:', err);
    process.exit(1);
});
