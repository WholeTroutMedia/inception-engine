/**
 * genkitFlowBuilder — Meta Flow: Generate New Genkit Flows
 * ARCH + CODEX agents | kstated hive
 *
 * Route: POST /api/genkitFlowBuilder
 * Called by: nas-watcher daemon for genkit-flows workstream tasks
 *
 * Given a task spec for a new Genkit flow, ARCH+CODEX:
 *   1. Design the input/output schema
 *   2. Write the full TypeScript flow implementation
 *   3. Generate the server route + index.ts export
 *   4. Return all artifacts ready to drop into packages/genkit/src/flows/
 *
 * Constitutional: Article IX (No MVPs) — produced code must be type-safe,
 * constitute-compliant, and ready for production without modification.
 */

import { ai, z } from '../index.js';
import { recordAgentCall } from './index.js';

const GenkitFlowBuilderInputSchema = z.object({
    taskId: z.string(),
    title: z.string(),
    workstream: z.string().default('genkit-flows'),
    flowName: z.string().optional().describe('CamelCase name for the new flow, e.g. "MyAgentFlow"'),
    agentName: z.string().optional().describe('Agent name, e.g. "FORGE"'),
    hive: z.string().optional().describe('Hive, e.g. "SWITCHBOARD"'),
    purpose: z.string().optional().describe('What this flow should do'),
    inputFields: z.string().optional().describe('Key input fields description'),
    outputFields: z.string().optional().describe('Key output fields description'),
    context: z.string().optional(),
});

const GenkitFlowBuilderOutputSchema = z.object({
    taskId: z.string(),
    summary: z.string(),
    flowFile: z.object({
        filename: z.string().describe('e.g. my-agent.ts'),
        content: z.string().describe('Full TypeScript flow implementation'),
    }),
    serverRoute: z.object({
        method: z.string().default('POST'),
        path: z.string().describe('e.g. /api/myAgentFlow'),
        handlerSnippet: z.string().describe('Express route handler code to add to server.ts'),
    }),
    indexExport: z.string().describe('Line to add to flows/index.ts'),
    flowName: z.string(),
});

export type GenkitFlowBuilderInput = z.infer<typeof GenkitFlowBuilderInputSchema>;
export type GenkitFlowBuilderOutput = z.infer<typeof GenkitFlowBuilderOutputSchema>;

export const genkitFlowBuilder = ai.defineFlow(
    {
        name: 'genkitFlowBuilder',
        inputSchema: GenkitFlowBuilderInputSchema,
        outputSchema: GenkitFlowBuilderOutputSchema,
    },
    async (input) => {
        const start = Date.now();
        recordAgentCall('karchd');

        console.log(`[ARCH:FLOW_BUILDER] ▶ Building flow for task ${input.taskId}: ${input.title}`);

        const systemPrompt = `You are ARCH + CODEX — the Creative Liberation Engine's code architecture and documentation agents.
Your role: generate production-quality Genkit flow TypeScript files from task specs.

Rules:
- Use Zod for all input/output schemas
- Export both the flow and its schema types
- Include constitutional compliance comments
- Follow the pattern in infra-docker.ts exactly
- Use 'googleai/gemini-2.5-flash' for task flows, '2.5-pro' for analysis flows
- Always call recordAgentCall() at flow start
- Log start and completion with [AGENTNAME:CONTEXT] format
- Handle JSON parse errors gracefully with a fallback

Output JSON:
{
  "summary": "What flow was built",
  "flowFile": {
    "filename": "my-flow.ts",
    "content": "full TypeScript content"
  },
  "serverRoute": {
    "method": "POST",
    "path": "/api/myFlow",
    "handlerSnippet": "app.post('/api/myFlow', async (req, res) => { ... });"
  },
  "indexExport": "export { myFlow } from './my-flow.js';",
  "flowName": "myFlow"
}`;

        const derivedFlowName = input.flowName ?? (input.agentName ? `${input.agentName}Flow` : 'unknownFlow');
        const derivedFilename = derivedFlowName.replace(/Flow$/, '').replace(/[A-Z]/g, c => `-${c.toLowerCase()}`).replace(/^-/, '') + '.ts';

        const prompt = `Build a new Genkit flow for this task:
Task: ${input.title}
Task ID: ${input.taskId}
Flow Name: ${derivedFlowName}
Agent: ${input.agentName ?? 'RELAY'}
Hive: ${input.hive ?? 'SWITCHBOARD'}
Purpose: ${input.purpose ?? input.title}
${input.inputFields ? `\nInput fields: ${input.inputFields}` : ''}
${input.outputFields ? `\nOutput fields: ${input.outputFields}` : ''}
${input.context ? `\nContext: ${input.context}` : ''}

Suggested filename: ${derivedFilename}
Generate the complete TypeScript implementation.`;

        const response = await ai.generate({
            model: 'googleai/gemini-2.5-flash',
            system: systemPrompt,
            prompt,
        });

        let parsed: Omit<GenkitFlowBuilderOutput, 'taskId'>;
        try {
            const cleaned = response.text.replace(/```json|```/g, '').trim();
            parsed = JSON.parse(cleaned);
        } catch {
            // If JSON fails, the output may have started with prose — wrap it
            parsed = {
                summary: `Flow builder produced output for: ${input.title}`,
                flowFile: { filename: derivedFilename, content: response.text },
                serverRoute: {
                    method: 'POST',
                    path: `/api/${derivedFlowName}`,
                    handlerSnippet: `// TODO: add route for ${derivedFlowName}`,
                },
                indexExport: `export { ${derivedFlowName} } from './${derivedFilename.replace('.ts', '.js')}';`,
                flowName: derivedFlowName,
            };
        }

        console.log(`[ARCH:FLOW_BUILDER] ✔ Flow '${parsed.flowName}' built in ${Date.now() - start}ms`);

        return { taskId: input.taskId, ...parsed };
    }
);

