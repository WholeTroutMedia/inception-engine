/**
 * @inception/claude-agent â€” Dispatch Runner
 *
 * Autonomous poller that pulls queued tasks from the Creative Liberation Engine
 * Dispatch server and executes them with the Claude Agent SDK.
 *
 * Usage: pnpm --filter @inception/claude-agent runner
 */

import 'dotenv/config';
import { executeClaudeTask } from './executor.js';
import type { AgentTask } from './types.js';

const DISPATCH_URL = process.env.DISPATCH_SERVER ?? 'http://127.0.0.1:5050';
const POLL_INTERVAL_MS = Number(process.env.CLAUDE_RUNNER_POLL_MS ?? 10_000);
const AGENT_ID = 'claude-runner';

interface DispatchTask {
    id: string;
    title: string;
    workstream: string;
    priority: 'P1' | 'P2' | 'P3';
    status: string;
    claimed_by: string | null;
    context?: string;
}

interface DispatchStatus {
    queued_tasks: DispatchTask[];
}

async function fetchQueuedTasks(): Promise<DispatchTask[]> {
    const res = await fetch(`${DISPATCH_URL}/api/status`);
    if (!res.ok) throw new Error(`Dispatch /api/status returned ${res.status}`);
    const data = (await res.json()) as DispatchStatus;
    return (data.queued_tasks ?? []).filter(
        (t) => t.status === 'queued' && t.claimed_by === null,
    );
}

async function claimTask(taskId: string): Promise<boolean> {
    const res = await fetch(`${DISPATCH_URL}/api/tasks/${taskId}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: AGENT_ID, tool: 'claude-code' }),
    });
    return res.ok;
}

async function completeTask(taskId: string, success: boolean, summary: string): Promise<void> {
    await fetch(`${DISPATCH_URL}/api/tasks/${taskId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: AGENT_ID, success, summary }),
    }).catch(() => { /* best-effort */ });
}

/** Pick highest-priority task (P1 > P2 > P3) */
function pickBestTask(tasks: DispatchTask[]): DispatchTask | null {
    const order: Record<string, number> = { P1: 0, P2: 1, P3: 2 };
    return tasks.sort((a, b) => (order[a.priority] ?? 9) - (order[b.priority] ?? 9))[0] ?? null;
}

async function runOnce(): Promise<void> {
    let tasks: DispatchTask[];

    try {
        tasks = await fetchQueuedTasks();
    } catch (err) {
        console.warn(`[claude-runner] Dispatch unreachable: ${err instanceof Error ? err.message : err}`);
        return;
    }

    if (tasks.length === 0) {
        console.log('[claude-runner] Queue empty â€” waiting...');
        return;
    }

    const dispatch = pickBestTask(tasks);
    if (!dispatch) return;

    console.log(`[claude-runner] Claiming ${dispatch.id} (${dispatch.priority}): ${dispatch.title}`);

    const claimed = await claimTask(dispatch.id);
    if (!claimed) {
        console.warn(`[claude-runner] Failed to claim ${dispatch.id} â€” already taken?`);
        return;
    }

    const task: AgentTask = {
        id: dispatch.id,
        title: dispatch.title,
        workstream: dispatch.workstream,
        priority: dispatch.priority,
        context: dispatch.context,
    };

    const result = await executeClaudeTask(task);

    console.log(
        `[claude-runner] ${result.success ? 'âœ…' : 'âŒ'} ${task.id} â€” ${result.numTurns} turns, ${result.durationMs}ms`,
    );

    await completeTask(
        task.id,
        result.success,
        result.result || (result.error ?? 'No result captured'),
    );
}

async function main(): Promise<void> {
    console.log(`[claude-runner] ðŸ¤– Claude Agent Dispatch Runner online`);
    console.log(`[claude-runner] Dispatch: ${DISPATCH_URL}`);
    console.log(`[claude-runner] Poll interval: ${POLL_INTERVAL_MS}ms`);

    // Run immediately then poll
    await runOnce();

    setInterval(() => {
        runOnce().catch((err) => {
            console.error('[claude-runner] Poll error:', err);
        });
    }, POLL_INTERVAL_MS);
}

main().catch((err) => {
    console.error('[claude-runner] Fatal:', err);
    process.exit(1);
});
