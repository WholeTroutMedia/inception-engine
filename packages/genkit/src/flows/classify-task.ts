/**
 * Task Classification Flow
 *
 * Genkit flow that replaces NEXUS TaskClassifierV2.
 * Takes a user request string, uses LLM to classify intent,
 * returns structured TaskClassification.
 *
 * Constitutional: Article V (Transparency) — full reasoning in classification
 */

import { z } from 'genkit';
import { ai } from '../index.js';
import { defaultMiddleware } from '../middleware/fallback-chain.js';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const TaskClassificationSchema = z.object({
    primaryObjective: z.string().describe('Concise one-sentence goal'),
    requiredCapabilities: z.array(z.string()).describe('Required capabilities: code, strategy, design, search, memory, browser, media'),
    complexityScore: z.number().min(1).max(10).describe('Task complexity 1-10'),
    modeSuggestion: z.enum(['IDEATE', 'PLAN', 'SHIP', 'VALIDATE']).describe('Recommended operational mode'),
    requiresBrowser: z.boolean().describe('Whether browser automation is needed'),
    estimatedCredits: z.number().describe('Estimated API credit cost'),
    suggestedAgents: z.array(z.string()).describe('Recommended agent names: BOLT, AURORA, KEEPER, etc.'),
    reasoning: z.string().describe('Transparent reasoning for classification'),
});

export type TaskClassification = z.infer<typeof TaskClassificationSchema>;

// ---------------------------------------------------------------------------
// Flow
// ---------------------------------------------------------------------------

export const classifyTaskFlow = ai.defineFlow(
    {
        name: 'classifyTask',
        inputSchema: z.object({
            userRequest: z.string().describe('Raw natural-language task description'),
        }),
        outputSchema: TaskClassificationSchema,
    },
    async (input) => {
        const { output } = await ai.generate({
            prompt: `You are the NEXUS task classifier for the Creative Liberation Engine agentic OS.

Analyze the following user request and classify it.

User request:
${input.userRequest}

Consider the full spectrum of capabilities: code generation, strategic planning, creative design, web search, memory operations, browser automation, and media generation.

Suggest agents from: BOLT (builder), AURORA (architect), KEEPER (knowledge), ARCH (patterns), CODEX (docs), LEX (compliance), COMPASS (constitution), RELAY (routing), SIGNAL (integration), COMET (automator).`,
            output: { schema: TaskClassificationSchema },
            use: defaultMiddleware(),
        });

        if (!output) {
            // Fallback classification if LLM fails
            return {
                primaryObjective: input.userRequest.slice(0, 100),
                requiredCapabilities: ['chat'],
                complexityScore: 3,
                modeSuggestion: 'SHIP' as const,
                requiresBrowser: false,
                estimatedCredits: 1,
                suggestedAgents: ['BOLT'],
                reasoning: 'Fallback classification — LLM classification unavailable',
            };
        }

        return output;
    }
);
