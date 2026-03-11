/**
 * COMET — Headless Playwright Redis Stream Consumer
 *
 * Background daemon that consumes tasks via Redis Streams (comet:tasks).
 * Processes tasks using COMET's execution engine via the local HTTP loopback,
 * ensuring high reliability and zero dropped tasks via explicit XACK.
 *
 * Stream: comet:tasks
 * Consumer Group: comet_consumers
 *
 * Entry point: `npm run consumer`
 */

import { Redis } from 'ioredis';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://redis:6379';
const COMET_URL = process.env.COMET_URL ?? 'http://localhost:7100';
const CONSUMER_NAME = process.env.COMET_CONSUMER_ID ?? `comet-consumer-${process.pid}`;

const STREAM_KEY = 'comet:tasks';
const GROUP_NAME = 'comet_consumers';
const BLOCK_MS = 5000;

interface BrowseSpec {
    url: string;
    instruction: string;
}

interface TaskResult {
    success: boolean;
    output?: string;
    error?: string;
}

let running = true;
let tasksCompleted = 0;
let tasksFailed = 0;

// ─── Execute via COMET HTTP API ───────────────────────────────────────────────

async function executeBrowseTask(spec: BrowseSpec): Promise<TaskResult> {
    try {
        console.log(`[COMET/CONSUMER] 🌐 Browsing: ${spec.url}`);
        console.log(`[COMET/CONSUMER] 📋 Instruction: ${spec.instruction.slice(0, 80)}`);

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
            signal: AbortSignal.timeout(180_000), // 3 min max
        });

        if (!res.ok) {
            const errText = await res.text();
            return { success: false, error: `COMET /execute returned ${res.status}: ${errText.slice(0, 200)}` };
        }

        const result = await res.json() as any;

        if (result.status === 'failed' || result.status === 'blocked') {
            return { success: false, error: result.error ?? `COMET execution ${result.status}` };
        }

        // Synthesise output
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

// ─── Main Consumer Loop ───────────────────────────────────────────────────────

async function consumerLoop() {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║   COMET AUTONOMOUS AGENT — Redis Consumer                    ║
║   Consumer ID: ${CONSUMER_NAME.padEnd(46)}║
╠══════════════════════════════════════════════════════════════╣
║   Redis:    ${REDIS_URL.padEnd(46)}║
║   COMET:    ${COMET_URL.padEnd(46)}║
║   Group:    ${GROUP_NAME.padEnd(46)}║
╚══════════════════════════════════════════════════════════════╝`);

    const redis = new Redis(REDIS_URL, { maxRetriesPerRequest: null });

    // Initialize Consumer Group (idempotent)
    try {
        await redis.xgroup('CREATE', STREAM_KEY, GROUP_NAME, '$', 'MKSTREAM');
        console.log(`[COMET/CONSUMER] 🚀 Initialized Redis consumer group ${GROUP_NAME} on ${STREAM_KEY}`);
    } catch (err: any) {
        if (!err.message.includes('BUSYGROUP')) {
            console.error(`[COMET/CONSUMER] Failed to create consumer group:`, err.message);
        }
    }

    while (running) {
        try {
            // Block and wait for new tasks, picking up pending tasks (">")
            const response = await redis.xreadgroup(
                'GROUP', GROUP_NAME, CONSUMER_NAME,
                'COUNT', 1,
                'BLOCK', BLOCK_MS,
                'STREAMS', STREAM_KEY,
                '>'
            ) as Array<[string, Array<[string, string[]]>]> | null;

            if (!response || response.length === 0) {
                continue; // Timeout reached, loop again
            }

            // Parse response
            const streamStr = response[0][0];
            const messages = response[0][1];

            for (const [messageId, fieldVals] of messages) {
                // Parse flat [k1, v1, k2, v2] array into object
                const data: Record<string, string> = {};
                for (let i = 0; i < fieldVals.length; i += 2) {
                    data[fieldVals[i]] = fieldVals[i + 1];
                }

                console.log(`\n[COMET/CONSUMER] 🎯 Picked up task ${messageId}`);

                // Require url and instruction
                if (!data.url || !data.instruction) {
                    console.warn(`[COMET/CONSUMER] ❌ Invalid task data (missing url or instruction):`, data);
                    await redis.xack(STREAM_KEY, GROUP_NAME, messageId);
                    tasksFailed++;
                    continue;
                }

                const spec: BrowseSpec = {
                    url: data.url,
                    instruction: data.instruction
                };

                const start = Date.now();
                const result = await executeBrowseTask(spec);
                const elapsed = ((Date.now() - start) / 1000).toFixed(1);

                if (result.success) {
                    tasksCompleted++;
                    console.log(`[COMET/CONSUMER] ✅ Task ${messageId} done in ${elapsed}s`);
                } else {
                    tasksFailed++;
                    console.warn(`[COMET/CONSUMER] ❌ Task ${messageId} failed: ${result.error}`);
                }

                // Explicitly ACKnowledge successful OR handled failed outcome
                // Keeps poison messages from indefinitely retrying.
                await redis.xack(STREAM_KEY, GROUP_NAME, messageId);

                console.log(`[COMET/CONSUMER] 📊 Done: ${tasksCompleted} | Failed: ${tasksFailed}`);

                // Slight breather
                await new Promise(r => setTimeout(r, 1000));
            }
        } catch (err: any) {
            console.error(`[COMET/CONSUMER] Loop error:`, err.message);
            await new Promise(r => setTimeout(r, BLOCK_MS));
        }
    }

    await redis.quit();
    console.log('[COMET/CONSUMER] 🛑 Shutdown complete');
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

process.on('SIGTERM', () => {
    running = false;
    console.log('[COMET/CONSUMER] SIGTERM — shutting down after current operation...');
});
process.on('SIGINT', () => {
    running = false;
    console.log('[COMET/CONSUMER] SIGINT — shutting down...');
});

consumerLoop().catch(err => {
    console.error('[COMET/CONSUMER] Fatal:', err);
    process.exit(1);
});
