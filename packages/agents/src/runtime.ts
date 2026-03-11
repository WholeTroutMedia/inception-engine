/**
 * @inception/agents — Agent Runtime
 *
 * Core execution loop for the Creative Liberation Engine agent hive.
 * Wraps Genkit flows with VERA constitutional middleware before every invocation.
 * Article IX: No agent output ships without VERA approval.
 */

import type { AgentRunInput, AgentRunResult } from './types.js';
import { VeraMiddleware } from './vera-middleware.js';

export class AgentRuntime {
    private genkitUrl: string;
    private vera: VeraMiddleware;

    constructor(options: { genkitUrl?: string } = {}) {
        this.genkitUrl = options.genkitUrl || process.env.GENKIT_URL || 'http://localhost:4001';
        this.vera = new VeraMiddleware();
    }

    async run(input: AgentRunInput): Promise<AgentRunResult> {
        const start = Date.now();
        const mode = input.mode ?? 'SHIP';

        // Constitutional pre-check via VERA
        const preCheck = await this.vera.preCheck(input);
        if (!preCheck.approved) {
            return {
                agentId: input.agentId,
                output: `[BLOCKED BY VERA] ${preCheck.reason}`,
                mode,
                sessionId: input.sessionId,
                constitutionalApproval: false,
                latencyMs: Date.now() - start,
                timestamp: new Date().toISOString(),
            };
        }

        // Dispatch to Genkit flow
        let output: string;
        try {
            const res = await fetch(`${this.genkitUrl}/run-agent`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(input),
            });
            const data = await res.json() as { output: string };
            output = data.output;
        } catch (err) {
            output = `[RUNTIME ERROR] ${(err as Error).message}`;
        }

        // Constitutional post-check
        const postCheck = await this.vera.postCheck(output);

        return {
            agentId: input.agentId,
            output,
            mode,
            sessionId: input.sessionId,
            constitutionalApproval: postCheck.approved,
            latencyMs: Date.now() - start,
            timestamp: new Date().toISOString(),
        };
    }
}
