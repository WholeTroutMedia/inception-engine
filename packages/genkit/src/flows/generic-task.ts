/**
 * genericTaskFlow — Universal Task Executor
 * RELAY agent | SWITCHBOARD hive
 *
 * Route: POST /api/genericTaskFlow
 * Called by: nas-watcher daemon for any workstream without a dedicated flow
 *
 * Given any dispatch task, RELAY uses Gemini to:
 *   1. Classify the task type and required actions
 *   2. Generate a concrete implementation plan
 *   3. Produce any code/content artifacts needed
 *
 * Constitutional: Article IX (No MVPs) — outputs are complete and actionable.
 */

import { ai, z } from '../index.js';
import { recordAgentCall } from './index.js';

const GenericTaskInputSchema = z.object({
    taskId: z.string().describe('Dispatch task ID'),
    title: z.string().describe('Task title from the dispatch queue'),
    workstream: z.string().describe('Source workstream'),
    description: z.string().optional(),
    context: z.string().optional(),
    priority: z.enum(['P0', 'P1', 'P2']).optional().default('P1'),
});

const GenericTaskOutputSchema = z.object({
    taskId: z.string(),
    summary: z.string().describe('What was accomplished or planned'),
    taskType: z.enum(['code', 'config', 'documentation', 'research', 'design', 'infra', 'unknown']),
    artifacts: z.array(z.object({
        filename: z.string(),
        content: z.string(),
    })).optional(),
    nextActions: z.array(z.string()).describe('Concrete next actions to complete this task'),
    confidence: z.number().min(0).max(1).describe('Confidence that the output is complete and correct'),
});

export type GenericTaskInput = z.infer<typeof GenericTaskInputSchema>;
export type GenericTaskOutput = z.infer<typeof GenericTaskOutputSchema>;

export const genericTaskFlow = ai.defineFlow(
    {
        name: 'genericTaskFlow',
        inputSchema: GenericTaskInputSchema,
        outputSchema: GenericTaskOutputSchema,
    },
    async (input) => {
        const start = Date.now();
        recordAgentCall('RELAY');

        console.log(`[RELAY:GENERIC] ▶ Task ${input.taskId} [${input.workstream}]: ${input.title}`);

        const systemPrompt = `You are RELAY — the Creative Liberation Engine's universal task routing and execution agent.
You handle any task from the dispatch queue that doesn't have a dedicated specialized flow.

Constitutional constraints:
- Article IX: No MVPs. Outputs must be production-quality and complete.
- Article XX: No human wait time. Produce actionable outputs immediately.
- Article II: Sovereign-first. Prefer local, NAS, and self-hosted solutions.

Output format — JSON only:
{
  "summary": "What was accomplished",
  "taskType": "code|config|documentation|research|design|infra|unknown",
  "artifacts": [{ "filename": "...", "content": "..." }],
  "nextActions": ["Concrete action 1", "Concrete action 2"],
  "confidence": 0.95
}`;

        const prompt = `Task: ${input.title}
Workstream: ${input.workstream}
Priority: ${input.priority}
ID: ${input.taskId}
${input.description ? `\nDescription: ${input.description}` : ''}
${input.context ? `\nContext: ${input.context}` : ''}

Classify and execute this task. Produce all required artifacts and concrete next actions.`;

        const response = await ai.generate({
            model: 'googleai/gemini-2.5-flash',
            system: systemPrompt,
            prompt,
        });

        let parsed: Omit<GenericTaskOutput, 'taskId'>;
        try {
            const cleaned = response.text.replace(/```json|```/g, '').trim();
            parsed = JSON.parse(cleaned);
        } catch {
            parsed = {
                summary: `Task analysed: ${input.title}`,
                taskType: 'unknown',
                nextActions: [response.text.slice(0, 500)],
                confidence: 0.6,
            };
        }

        console.log(`[RELAY:GENERIC] ✔ Task ${input.taskId} in ${Date.now() - start}ms (confidence: ${parsed.confidence})`);

        return { taskId: input.taskId, ...parsed };
    }
);

