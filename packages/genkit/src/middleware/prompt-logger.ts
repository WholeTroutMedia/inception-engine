/**
 * PromptLogger — W7 Coding Standards Automation (ZDNet Practice #4)
 *
 * Genkit middleware that appends every flow invocation to PROMPT_LOG.md.
 * Implements a timestamped audit trail for all AI operations.
 *
 * Usage: Import and register as Genkit middleware in server.ts
 *   import { promptLoggerMiddleware } from './middleware/prompt-logger.js';
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../../../../');
const LOG_PATH = path.join(REPO_ROOT, 'PROMPT_LOG.md');
const MAX_SUMMARY_LENGTH = 120;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PromptLogEntry {
    timestamp: string;
    flowName: string;
    agentId?: string;
    mode?: string;
    taskId?: string;
    inputSummary: string;
    outputSummary?: string;
    tokensUsed?: number;
    latencyMs?: number;
    provider?: string;
    error?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function truncate(value: unknown, maxLen = MAX_SUMMARY_LENGTH): string {
    const str = typeof value === 'string' ? value : JSON.stringify(value);
    if (!str) return '';
    return str.length > maxLen ? str.slice(0, maxLen) + '…' : str;
}

function formatEntry(entry: PromptLogEntry): string {
    const lines = [
        `[${entry.timestamp}] FLOW: ${entry.flowName}`,
        `  AGENT: ${entry.agentId ?? 'unknown'} | MODE: ${entry.mode ?? 'SHIP'} | TASK: ${entry.taskId ?? 'unset'}`,
        `  INPUT:  "${entry.inputSummary}"`,
    ];

    if (entry.outputSummary) {
        lines.push(`  OUTPUT: "${entry.outputSummary}"`);
    }

    const meta: string[] = [];
    if (entry.tokensUsed !== undefined) meta.push(`TOKENS: ${entry.tokensUsed}`);
    if (entry.latencyMs !== undefined) meta.push(`LATENCY: ${entry.latencyMs}ms`);
    if (entry.provider) meta.push(`PROVIDER: ${entry.provider}`);
    if (meta.length > 0) lines.push(`  ${meta.join(' | ')}`);

    if (entry.error) {
        lines.push(`  ERROR: ${entry.error}`);
    }

    return lines.join('\n');
}

// ─── PromptLogger ─────────────────────────────────────────────────────────────

export class PromptLogger {
    private logPath: string;

    constructor(logPath = LOG_PATH) {
        this.logPath = logPath;
    }

    /**
     * Log a flow invocation. Non-blocking — never throws.
     */
    log(entry: PromptLogEntry): void {
        try {
            const formatted = formatEntry(entry) + '\n\n';
            fs.appendFileSync(this.logPath, formatted, 'utf-8');
        } catch {
            // Non-fatal — log failure must never break execution
        }
    }

    /**
     * Create a Genkit-compatible middleware wrapper.
     * Wraps a flow execution with pre/post logging.
     */
    wrapFlow<I, O>(
        flowName: string,
        fn: (input: I, meta?: Record<string, string>) => Promise<O>
    ): (input: I, meta?: Record<string, string>) => Promise<O> {
        return async (input: I, meta?: Record<string, string>): Promise<O> => {
            const start = Date.now();
            const timestamp = new Date().toISOString();

            let output: O;
            let error: string | undefined;

            try {
                output = await fn(input, meta);
            } catch (err) {
                error = err instanceof Error ? err.message : String(err);
                this.log({
                    timestamp,
                    flowName,
                    agentId: meta?.agentId,
                    mode: meta?.mode,
                    taskId: meta?.taskId,
                    inputSummary: truncate(input),
                    latencyMs: Date.now() - start,
                    provider: meta?.provider,
                    error,
                });
                throw err;
            }

            this.log({
                timestamp,
                flowName,
                agentId: meta?.agentId,
                mode: meta?.mode,
                taskId: meta?.taskId,
                inputSummary: truncate(input),
                outputSummary: truncate(output),
                latencyMs: Date.now() - start,
                provider: meta?.provider,
            });

            return output;
        };
    }

    /**
     * Log a session start event.
     */
    logSessionStart(meta: {
        instance: string;
        window?: string;
        bootCount?: number;
        genkitStatus: string;
    }): void {
        try {
            const lines = [
                `[${new Date().toISOString()}] SESSION_START`,
                `  INSTANCE: ${meta.instance} | WINDOW: ${meta.window ?? 'unset'} | BOOT: ${meta.bootCount ?? '?'}`,
                `  GENKIT: ${meta.genkitStatus}`,
                '',
            ];
            fs.appendFileSync(this.logPath, lines.join('\n'), 'utf-8');
        } catch {
            // Non-fatal
        }
    }
}

// Singleton export
export const promptLogger = new PromptLogger();
