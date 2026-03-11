/**
 * infraDockerFlow — Autonomous Docker & Infrastructure Task Executor
 * FORGE agent | SWITCHBOARD hive
 *
 * Route: POST /api/infraDockerFlow
 * Called by: nas-watcher daemon, dispatch worker
 *
 * Given a task description from the dispatch queue, FORGE uses Gemini to:
 *   1. Analyse the infra-docker task spec
 *   2. Generate the required Dockerfile / compose stanza / script
 *   3. Return a structured execution plan with the artifacts
 *
 * Constitutional: Article IX (No MVPs) — every output is production-ready.
 */

import { ai, z } from '../index.js';
import { recordAgentCall } from './index.js';

const InfraDockerInputSchema = z.object({
    taskId: z.string().describe('Dispatch task ID'),
    title: z.string().describe('Task title from the dispatch queue'),
    workstream: z.string().default('infra-docker'),
    description: z.string().optional().describe('Extended task description / acceptance criteria'),
    context: z.string().optional().describe('Additional context: existing Docker setup, service dependencies, etc.'),
});

const InfraDockerOutputSchema = z.object({
    taskId: z.string(),
    summary: z.string().describe('What was planned / generated'),
    artifacts: z.array(z.object({
        filename: z.string(),
        content: z.string(),
        type: z.enum(['dockerfile', 'compose', 'script', 'config', 'readme']),
    })),
    executionSteps: z.array(z.string()).describe('Ordered steps to apply these artifacts'),
    constitutionalCheck: z.string().describe('VERA truth-check on the generated output'),
});

export type InfraDockerInput = z.infer<typeof InfraDockerInputSchema>;
export type InfraDockerOutput = z.infer<typeof InfraDockerOutputSchema>;

export const infraDockerFlow = ai.defineFlow(
    {
        name: 'infraDockerFlow',
        inputSchema: InfraDockerInputSchema,
        outputSchema: InfraDockerOutputSchema,
    },
    async (input) => {
        const start = Date.now();
        recordAgentCall('RELAY'); // FORGE not in roster yet — route through RELAY

        console.log(`[FORGE:INFRA] ▶ Task ${input.taskId}: ${input.title}`);

        const systemPrompt = `You are FORGE — the Creative Liberation Engine's autonomous infrastructure and Docker agent.
Your role: produce production-quality Dockerfiles, docker-compose stanzas, and shell scripts.

Constitutional constraints:
- Article II: Sovereign-first. Use Synology NAS paths and local networks where applicable.
- Article IX: No MVPs. Every Dockerfile must be multi-stage, use layer caching, and follow security best practices.
- Article XX: No human wait time. All outputs must be immediately deployable.

Output format — respond with a JSON object matching this schema exactly:
{
  "summary": "Brief description of what was generated",
  "artifacts": [
    { "filename": "Dockerfile.service", "content": "...", "type": "dockerfile" }
  ],
  "executionSteps": ["Step 1 to apply", "Step 2 to apply"],
  "constitutionalCheck": "VERA confirmation that outputs comply with sovereignty, security, and quality articles"
}`;

        const prompt = `Infra task: ${input.title}
Workstream: ${input.workstream}
Task ID: ${input.taskId}
${input.description ? `\nDescription:\n${input.description}` : ''}
${input.context ? `\nContext:\n${input.context}` : ''}

Generate the required Docker/infrastructure artifacts. Follow all constitutional constraints.`;

        const response = await ai.generate({
            model: 'googleai/gemini-2.5-flash',
            system: systemPrompt,
            prompt,
        });

        let parsed: Omit<InfraDockerOutput, 'taskId'>;
        try {
            const cleaned = response.text.replace(/```json|```/g, '').trim();
            parsed = JSON.parse(cleaned);
        } catch {
            // Graceful degradation — wrap raw text as a single artifact
            parsed = {
                summary: `Infra task completed: ${input.title}`,
                artifacts: [{
                    filename: 'output.md',
                    content: response.text,
                    type: 'readme',
                }],
                executionSteps: ['Review the generated output and apply manually.'],
                constitutionalCheck: 'Auto-generated — manual VERA review recommended.',
            };
        }

        const durationMs = Date.now() - start;
        console.log(`[FORGE:INFRA] ✔ Task ${input.taskId} completed in ${durationMs}ms`);

        return {
            taskId: input.taskId,
            ...parsed,
        };
    }
);

