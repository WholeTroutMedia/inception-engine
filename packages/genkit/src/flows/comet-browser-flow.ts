/**
 * cometBrowserFlow — Agentic Browser Task Executor
 * COMET agent | kuid hive
 *
 * Route: POST /api/cometBrowserFlow
 * Called by: nas-watcher daemon, dispatch worker
 *
 * Given a browser/web task from the dispatch queue, COMET uses Gemini to:
 *   1. Parse the browser automation task spec
 *   2. Generate an action plan (navigation steps, extraction schema, interaction sequence)
 *   3. Return a structured plan + any extraction results
 *
 * This flow is the Genkit counterpart to the cle-browser MCP server.
 * It orchestrates high-level strategy; the MCP server handles low-level Playwright calls.
 *
 * Constitutional: Article II (Sovereignty) — all browser sessions are headless/local.
 */

import { ai, z } from '../index.js';
import type { Flow } from 'genkit';
import { recordAgentCall } from './index.js';

const CometBrowserInputSchema = z.object({
    taskId: z.string().describe('Dispatch task ID'),
    title: z.string().describe('Task title from the dispatch queue'),
    workstream: z.string().default('comet-browser'),
    url: z.string().url().optional().describe('Target URL if known'),
    objective: z.string().optional().describe('What to extract or accomplish on the page'),
    context: z.string().optional().describe('Additional context, prior attempt results, etc.'),
});

const CometBrowserOutputSchema = z.object({
    taskId: z.string(),
    summary: z.string().describe('What was accomplished'),
    actionPlan: z.array(z.object({
        step: z.number(),
        action: z.enum(['navigate', 'click', 'type', 'extract', 'wait', 'screenshot', 'evaluate', 'scroll']),
        target: z.string().optional().describe('CSS selector, URL, or text to act on'),
        value: z.string().optional().describe('Value for type / evaluate'),
        description: z.string(),
    })).describe('Ordered browser action plan'),
    extractionSchema: z.record(z.string()).optional().describe('Map of field names to CSS selectors for data extraction'),
    constitutionalCheck: z.string().describe('Constitutional compliance: no PII exfiltration, no unauthorized automation'),
    stealthProfile: z.enum(['default', 'low', 'high']).default('default'),
});

export type CometBrowserInput = z.infer<typeof CometBrowserInputSchema>;
export type CometBrowserOutput = z.infer<typeof CometBrowserOutputSchema>;

export const kwebdBrowserFlow: Flow<typeof CometBrowserInputSchema, typeof CometBrowserOutputSchema> = ai.defineFlow(
    {
        name: 'kwebdBrowserFlow',
        inputSchema: CometBrowserInputSchema,
        outputSchema: CometBrowserOutputSchema,
    },
    async (input) => {
        const start = Date.now();
        recordAgentCall('kwebd');

        console.log(`[COMET:BROWSER] ▶ Task ${input.taskId}: ${input.title}`);

        const systemPrompt = `You are COMET — the Creative Liberation Engine's autonomous browser and web intelligence agent.
Your role: plan and execute browser automation tasks using Playwright via the cle-browser MCP server.

Constitutional constraints:
- Article II: Sovereign missions only. No PII exfiltration, no accounts you don't own.
- Article XIII: Privacy by design. No unauthorized data collection.
- Article IX: No MVPs. Plans must handle pagination, dynamic content, and error states.

Output format — respond with a JSON object:
{
  "summary": "Brief description of what will be accomplished",
  "actionPlan": [
    { "step": 1, "action": "navigate", "target": "https://...", "description": "Navigate to target" },
    { "step": 2, "action": "extract", "target": ".main-content", "description": "Extract main content" }
  ],
  "extractionSchema": { "title": "h1", "price": ".price" },
  "constitutionalCheck": "kstrigd confirmation: this task is sovereign, no PII involved, all targets are owned or public",
  "stealthProfile": "default"
}`;

        const prompt = `Browser task: ${input.title}
Task ID: ${input.taskId}
${input.url ? `\nTarget URL: ${input.url}` : ''}
${input.objective ? `\nObjective: ${input.objective}` : ''}
${input.context ? `\nContext: ${input.context}` : ''}

Generate a detailed browser action plan for COMET to execute.`;

        const response = await ai.generate({
            model: 'googleai/gemini-2.5-flash',
            system: systemPrompt,
            prompt,
        });

        let parsed: Omit<CometBrowserOutput, 'taskId'>;
        try {
            const cleaned = response.text.replace(/```json|```/g, '').trim();
            parsed = JSON.parse(cleaned);
        } catch {
            parsed = {
                summary: `Browser task planned: ${input.title}`,
                actionPlan: [{
                    step: 1,
                    action: 'navigate' as const,
                    target: input.url ?? 'about:blank',
                    description: 'Navigate to target URL',
                }],
                constitutionalCheck: 'Auto-generated — manual kstrigd review recommended.',
                stealthProfile: 'default' as const,
            };
        }

        const durationMs = Date.now() - start;
        console.log(`[COMET:BROWSER] ✔ Task ${input.taskId} planned in ${durationMs}ms (${parsed.actionPlan?.length ?? 0} steps)`);

        return {
            taskId: input.taskId,
            ...parsed,
        };
    }
);

