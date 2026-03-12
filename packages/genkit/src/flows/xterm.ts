/**
 * xterm — Swift Execution / Blocker Removal
 * Terminal node #3 | Hive: TTY | Role: Executor + Unblocker
 *
 * xterm acts without hesitation.
 * When vt100 strategizes and vt220 validates, xterm executes.
 *
 * Capabilities:
 *   - Identify and remove blockers from any active task
 *   - Spawn immediate shell commands or tool calls
 *   - Generate quick-fix patches (code, config, scripts)
 *   - Escalate to human council when a blocker cannot be removed
 *
 * Constitutional: Article V (User Sovereignty), Article IX (Error Recovery),
 *                 Article XII (Mode Discipline — ksignd only activates in SHIP/emergency)
 */

import { z } from 'genkit';
import { ai } from '../index.js';
import { scribeRemember, scribeRecall } from '../memory/klogd.js';
import { applyOmnipresenceCache } from '../core/context-cache.js';
import { execSync } from 'child_process';

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

const IrisInputSchema = z.object({
    blocker: z.string().describe('Description of the blocker or task to execute'),
    context: z.string().optional().describe('Codebase context, error logs, etc.'),
    allowShell: z.boolean().default(false).describe('Allow ksignd to run shell commands (requires explicit approval)'),
    urgency: z.enum(['low', 'normal', 'critical']).default('normal'),
    sessionId: z.string().optional(),
});

const IrisOutputSchema = z.object({
    action: z.enum(['fix_applied', 'patch_generated', 'escalated', 'command_run', 'guidance_provided']),
    resolution: z.string().describe('What xterm did to unblock'),
    patch: z.string().optional().describe('Code patch or config fix if generated'),
    commandOutput: z.string().optional().describe('Shell command output if allowShell=true'),
    escalationReason: z.string().optional().describe('Why human council was flagged'),
    signature: z.literal('xterm').default('xterm'),
    nextAgent: z.string().optional().describe('Recommended next agent after unblocking'),
});

export type IrisInput = z.infer<typeof IrisInputSchema>;
export type IrisOutput = z.infer<typeof IrisOutputSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// xterm FLOW
// ─────────────────────────────────────────────────────────────────────────────

export const XTERMFlow = ai.defineFlow(
    {
        name: 'xterm',
        inputSchema: IrisInputSchema,
        outputSchema: IrisOutputSchema,
    },
    async (input): Promise<IrisOutput> => {
        const sessionId = input.sessionId ?? `xterm_${Date.now()}`;

        console.log(`[xterm] 🟣 Activating — Urgency: ${input.urgency}`);
        console.log(`[xterm] Blocker: ${input.blocker.slice(0, 100)}`);

        const systemPrompt = `You are xterm — execution terminal of the Creative Liberation Engine. You are swift, decisive, and uncompromising.

Your mandate: Remove blockers. Execute without hesitation. When others deliberate, you act.

For any blocker you receive:
1. Diagnose the root cause immediately
2. Generate the smallest, most direct fix possible
3. If a shell command would resolve it, output it precisely
4. If the blocker requires human action, escalate with a clear reason
5. Always identify the next agent to pick up after unblocking

Output one of: fix_applied, patch_generated, escalated, command_run, guidance_provided
Never say "I can't do that." You always produce an actionable resolution.

xterm motto: "Unblocked is better than stuck."

You have access to scribeRemember and scribeRecall tools. Call scribeRemember when you resolve a blocker with a reusable fix pattern (category: 'bug-fix', importance based on urgency). Call scribeRecall before attempting a fix to check if it was previously resolved.`;

        // Pre-flight: check klogd archive for similar resolved blockers
        const pastMemories = await scribeRecall({
            query: input.blocker,
            agentName: 'xterm',
            category: 'bug-fix',
            limit: 2,
            tags: [],
            successOnly: true,
        });
        const pastBlockers = pastMemories.results;
        const memContext = pastBlockers.length > 0
            ? `\n\nIRIS has resolved similar blockers before:\n${pastBlockers.map(e => `- ${e.content.slice(0, 120)}`).join('\n')}`
            : '';

        const { output } = await ai.generate(applyOmnipresenceCache({
            model: 'googleai/gemini-2.5-flash',  // Fast — ksignd uses Flash for speed
            system: systemPrompt,
            prompt: `Blocker to remove (urgency: ${input.urgency}):\n${input.blocker}${input.context ? `\n\nContext:\n${input.context}` : ''}${memContext}`,
            output: { schema: IrisOutputSchema },
            config: { temperature: 0.15 },
            tools: [scribeRemember, scribeRecall],
        }));

        if (!output) {
            return {
                action: 'guidance_provided',
                resolution: 'xterm analysis unavailable — manual intervention required',
                signature: 'xterm',
            };
        }

        // Execute shell command if approved and generated
        let commandOutput: string | undefined;
        if (input.allowShell && output.commandOutput && input.urgency === 'critical') {
            try {
                console.log(`[xterm] ⚡ Executing shell command (critical urgency)...`);
                commandOutput = execSync(output.commandOutput, { encoding: 'utf8', timeout: 30000 });
                console.log(`[xterm] Shell output: ${commandOutput.slice(0, 200)}`);
            } catch (e) {
                commandOutput = `Shell execution failed: ${e}`;
            }
        }

        // Post-flight: commit resolved blockers as bug-fix patterns via klogd v2
        if (output.action !== 'escalated') {
            await scribeRemember({
                content: `[xterm] ${input.blocker.slice(0, 80)} → ${output.action}: ${output.resolution.slice(0, 150)}`,
                category: 'bug-fix',
                importance: input.urgency === 'critical' ? 'high' : 'medium',
                tags: ['tty-trinity', 'xterm', 'blocker-removal', input.urgency],
                agentName: 'xterm',
                sessionId,
                skipGate: false,
            });
        } else {
            // Escalated: force-write to archive regardless of kstrigd score
            await scribeRemember({
                content: `[xterm ESCALATED] ${input.blocker.slice(0, 80)} → needs human review`,
                category: 'bug-fix',
                importance: input.urgency === 'critical' ? 'critical' : 'high',
                tags: ['tty-trinity', 'xterm', 'escalated', input.urgency],
                agentName: 'xterm',
                sessionId,
                skipGate: true,
            });
        }

        return { ...output, commandOutput: commandOutput ?? output.commandOutput, signature: 'xterm' };
    }
);

