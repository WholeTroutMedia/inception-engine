/**
 * @inception/claude-agent — Genkit Flow Integration
 *
 * Exposes the Claude Agent executor as a Genkit-compatible flow,
 * making Claude a first-class provider alongside Gemini in the
 * Creative Liberation Engine orchestration layer.
 */

import { z } from 'genkit';
import { ai } from '../index.js';
import { executeClaudeTask } from '@inception/claude-agent';
import type { AgentTask, ClaudeTool } from '@inception/claude-agent';

const ClaudeToolSchema = z.enum([
    'Read', 'Edit', 'Bash', 'Glob', 'LS',
    'MultiEdit', 'Write', 'WebFetch', 'WebSearch', 'Task',
]);

const AgentTaskSchema = z.object({
    id: z.string(),
    title: z.string(),
    context: z.string().optional(),
    cwd: z.string().optional(),
    tools: z.array(ClaudeToolSchema).optional(),
    maxTurns: z.number().optional(),
    workstream: z.string().optional(),
    priority: z.enum(['P1', 'P2', 'P3']).optional(),
});

const AgentResultSchema = z.object({
    taskId: z.string(),
    success: z.boolean(),
    result: z.string(),
    numTurns: z.number(),
    durationMs: z.number(),
    error: z.string().optional(),
});

/**
 * claudeAgentFlow — Execute a task with the Claude Agent SDK.
 *
 * This flow is registered with Genkit and can be:
 * - Called directly via `runFlow(claudeAgentFlow, task)`
 * - Invoked from the Genkit Dev UI at http://localhost:4000
 * - Chained with other Genkit flows (e.g., after an ATHENA planning flow)
 */
export const claudeAgentFlow = ai.defineFlow(
    {
        name: 'claudeAgentFlow',
        inputSchema: AgentTaskSchema,
        outputSchema: AgentResultSchema,
    },
    async (input): Promise<z.infer<typeof AgentResultSchema>> => {
        const task: AgentTask = {
            ...input,
            tools: input.tools as ClaudeTool[] | undefined,
            priority: input.priority as AgentTask['priority'],
        };

        return await executeClaudeTask(task);
    },
);
