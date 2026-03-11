/**
 * Perplexity Custom Genkit Plugin
 *
 * Wraps the Perplexity API (OpenAI-compatible format) as a Genkit model plugin.
 * Supports Sonar models with built-in web search capabilities.
 *
 * Constitutional: Article V (Transparency) — search citations exposed in response
 */

import { z, type Genkit } from 'genkit';
import type { GenerateRequest, GenerateResponseData } from 'genkit/model';
import { genkitPlugin, type GenkitPlugin } from 'genkit/plugin';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PerplexityConfig {
    apiKey?: string;
}

interface PerplexityRequestMessage {
    role: string;
    content: string;
}

interface PerplexityApiResponse {
    id: string;
    model: string;
    choices: Array<{
        message: {
            role: string;
            content: string;
        };
        finish_reason: string;
    }>;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
    citations?: string[];
}

// ---------------------------------------------------------------------------
// Supported Models
// ---------------------------------------------------------------------------

const PERPLEXITY_MODELS = [
    'sonar',
    'sonar-pro',
    'sonar-reasoning',
    'sonar-reasoning-pro',
    'sonar-deep-research',
] as const;

type PerplexityModelId = (typeof PERPLEXITY_MODELS)[number];

// ---------------------------------------------------------------------------
// Plugin Definition
// ---------------------------------------------------------------------------

export function perplexity(config?: PerplexityConfig) {
    return async (ai: Genkit) => {
        const apiKey = config?.apiKey || process.env.PERPLEXITY_API_KEY;

        if (!apiKey) {
            console.warn('[GENKIT:PERPLEXITY] No API key found. Set PERPLEXITY_API_KEY environment variable.');
        }

        for (const modelId of PERPLEXITY_MODELS) {
            ai.defineModel(
                {
                    name: `perplexity/${modelId}`,
                    label: `Perplexity ${modelId}`,
                    supports: {
                        multiturn: true,
                        systemRole: true,
                        media: false,
                        tools: false,
                        output: ['text'],
                    },
                },
                async (request: GenerateRequest): Promise<GenerateResponseData> => {
                    if (!apiKey) {
                        throw new Error('Perplexity API key not configured. Set PERPLEXITY_API_KEY.');
                    }

                    // Transform Genkit messages → Perplexity format
                    const messages: PerplexityRequestMessage[] = [];

                    for (const msg of request.messages) {
                        const role = msg.role === 'model' ? 'assistant' : msg.role;
                        const textParts = msg.content.filter((p) => p.text);
                        const content = textParts.map((p) => p.text).join('');
                        messages.push({ role, content });
                    }

                    // Call Perplexity API (OpenAI-compatible)
                    const response = await fetch('https://api.perplexity.ai/chat/completions', {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${apiKey}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            model: modelId,
                            messages,
                            max_tokens: request.config?.maxOutputTokens || 4096,
                            temperature: request.config?.temperature ?? 0.7,
                        }),
                    });

                    if (!response.ok) {
                        const errorBody = await response.text();
                        throw new Error(`Perplexity API error ${response.status}: ${errorBody}`);
                    }

                    const data = (await response.json()) as PerplexityApiResponse;
                    const choice = data.choices?.[0];

                    if (!choice) {
                        throw new Error('Perplexity returned empty response');
                    }

                    // Build response with citations metadata
                    const result: GenerateResponseData = {
                        message: {
                            role: 'model',
                            content: [{ text: choice.message?.content || '' }],
                        },
                        finishReason: choice.finish_reason === 'stop' ? 'stop' : 'other',
                        usage: {
                            inputTokens: data.usage?.prompt_tokens,
                            outputTokens: data.usage?.completion_tokens,
                            totalTokens: data.usage?.total_tokens,
                        },
                        custom: {
                            citations: data.citations || [],
                            perplexityModel: data.model,
                            requestId: data.id,
                        },
                    };

                    return result;
                }
            );
        }

        console.log('[GENKIT] ✓ Perplexity plugin loaded (sonar, sonar-pro, etc)');
    };
}

// ---------------------------------------------------------------------------
// Model Reference Helper
// ---------------------------------------------------------------------------

export const perplexityModel = (modelId: PerplexityModelId = 'sonar-pro') => {
    return `perplexity/${modelId}` as const;
};
