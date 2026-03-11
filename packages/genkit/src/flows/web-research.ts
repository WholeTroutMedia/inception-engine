/**
 * Web Research Flow
 *
 * Standalone Genkit flow: any agent calls this to get real-time web data + citations.
 * Wraps Perplexity Sonar API with structured output, model selection, and graceful degradation.
 *
 * Usage:
 *   const result = await webResearchFlow({ query: "...", depth: "fast" });
 *   // → { answer, citations, model, tokensUsed, success }
 *
 * Constitutional: Article V (Transparency — citations always surfaced)
 *                 Article XX (zero wait — Perplexity responds in ~2s)
 *                 Article I  (Sovereign fallback — never throws, always returns)
 */

import { z } from 'genkit';
import { ai } from '../index.js';

// ─── TYPES ───────────────────────────────────────────────────────────────────

export const WebResearchInputSchema = z.object({
    query: z.string().describe('Search query for Perplexity'),
    depth: z.enum(['fast', 'standard', 'deep']).default('standard')
        .describe('fast → sonar | standard → sonar-pro | deep → sonar-deep-research'),
    model: z.enum(['sonar', 'sonar-pro', 'sonar-deep-research']).optional()
        .describe('Override model selection (takes precedence over depth)'),
    systemContext: z.string().optional()
        .describe('Optional system context to inject into Perplexity request'),
});

export const WebResearchOutputSchema = z.object({
    success: z.boolean(),
    answer: z.string().describe('Perplexity answer text'),
    citations: z.array(z.string()).describe('Source URLs cited in the answer'),
    model: z.string().describe('Actual model used'),
    tokensUsed: z.number().optional(),
    errorMessage: z.string().optional().describe('Set if success=false, explains failure'),
});

export type WebResearchInput = z.infer<typeof WebResearchInputSchema>;
export type WebResearchOutput = z.infer<typeof WebResearchOutputSchema>;

// ─── MODEL SELECTION ─────────────────────────────────────────────────────────

function resolvePerplexityModel(
    depth: 'fast' | 'standard' | 'deep',
    override?: 'sonar' | 'sonar-pro' | 'sonar-deep-research',
): string {
    if (override) return override;
    const env = process.env.MODEL_WEB_RESEARCH;
    if (env) return env;
    const map: Record<string, string> = {
        fast: 'sonar',
        standard: 'sonar-pro',
        deep: 'sonar-deep-research',
    };
    return map[depth] ?? 'sonar-pro';
}

// ─── CORE PERPLEXITY CALLER ──────────────────────────────────────────────────

interface PerplexityApiResponse {
    id: string;
    model: string;
    choices: Array<{
        message: { role: string; content: string };
        finish_reason: string;
    }>;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
    citations?: string[];
}

export async function callPerplexity(
    query: string,
    modelId: string,
    systemContext?: string,
): Promise<WebResearchOutput> {
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
        return {
            success: false,
            answer: '',
            citations: [],
            model: modelId,
            errorMessage: 'PERPLEXITY_API_KEY not set — set it in .env to enable real-time research',
        };
    }

    const messages: Array<{ role: string; content: string }> = [];
    if (systemContext) {
        messages.push({
            role: 'system',
            content: systemContext,
        });
    }
    messages.push({ role: 'user', content: query });

    try {
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: modelId,
                messages,
                max_tokens: 2048,
                temperature: 0.2, // Lower temp for factual research
                return_citations: true,
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            return {
                success: false,
                answer: '',
                citations: [],
                model: modelId,
                errorMessage: `Perplexity API error ${response.status}: ${errText}`,
            };
        }

        const data = (await response.json()) as PerplexityApiResponse;
        const choice = data.choices?.[0];

        if (!choice) {
            return {
                success: false,
                answer: '',
                citations: [],
                model: modelId,
                errorMessage: 'Perplexity returned empty choices array',
            };
        }

        return {
            success: true,
            answer: choice.message.content,
            citations: data.citations ?? [],
            model: data.model ?? modelId,
            tokensUsed: data.usage?.total_tokens,
        };
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
            success: false,
            answer: '',
            citations: [],
            model: modelId,
            errorMessage: `Perplexity fetch failed: ${message}`,
        };
    }
}

// ─── GENKIT FLOW ─────────────────────────────────────────────────────────────

export const webResearchFlow = ai.defineFlow(
    {
        name: 'webResearch',
        inputSchema: WebResearchInputSchema,
        outputSchema: WebResearchOutputSchema,
    },
    async (input) => {
        const modelId = resolvePerplexityModel(input.depth, input.model);
        const result = await callPerplexity(input.query, modelId, input.systemContext);

        if (!result.success) {
            console.warn(`[WEB-RESEARCH] Perplexity failed for query "${input.query.slice(0, 80)}": ${result.errorMessage}`);
        } else {
            console.log(`[WEB-RESEARCH] ✓ ${modelId} → ${result.citations.length} citations | ${result.tokensUsed ?? '?'} tokens`);
        }

        return result;
    }
);
