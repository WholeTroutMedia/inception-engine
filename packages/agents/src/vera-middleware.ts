/**
 * @inception/agents — VERA Constitutional Middleware
 *
 * VERA (Validation, Ethics, Reasoning, Accountability) is the constitutional guard.
 * All agent inputs and outputs pass through VERA before shipping.
 * Article IX: No unsafe output ships. Article VII: All decisions are auditable.
 */

import type { AgentRunInput } from './types.js';

interface VeraCheckResult {
    approved: boolean;
    reason?: string;
    flags?: string[];
}

// Blocked patterns — constitutional hard stops
const BLOCKED_PATTERNS = [
    /\bdelete all\b/i,
    /\bdrop (table|database|schema)\b/i,
    /rm -rf/i,
    /format (c:|d:)/i,
];

export class VeraMiddleware {
    async preCheck(input: AgentRunInput): Promise<VeraCheckResult> {
        const text = `${input.prompt} ${JSON.stringify(input.context ?? {})}`;

        for (const pattern of BLOCKED_PATTERNS) {
            if (pattern.test(text)) {
                return {
                    approved: false,
                    reason: `Constitutional violation detected: pattern "${pattern.source}" in input`,
                    flags: ['ARTICLE_IX_VIOLATION'],
                };
            }
        }

        return { approved: true };
    }

    async postCheck(output: string): Promise<VeraCheckResult> {
        for (const pattern of BLOCKED_PATTERNS) {
            if (pattern.test(output)) {
                return {
                    approved: false,
                    reason: `Constitutional violation in output: pattern "${pattern.source}"`,
                    flags: ['ARTICLE_IX_OUTPUT_VIOLATION'],
                };
            }
        }

        return { approved: true };
    }
}
