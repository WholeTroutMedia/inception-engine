import { Genkit } from 'genkit';
import { LOCAL_MODELS as LOCAL_MODEL_IDS } from '../local-providers.js';

export interface FallbackOptions {
    /** The primary model to attempt first */
    primaryModel: string;
    /** Ordered list of fallback models if the primary (or previous fallback) fails with a 429 / 503 */
    fallbackModels: string[];
    /** Log transitions? */
    verbose?: boolean;
}

/**
 * Executes a generation request with automatic failover to a list of fallback models
 * if the current model returns a rate limit (429) or service unavailable (503) error.
 */
export async function generateWithFallback(
    ai: Genkit,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    request: any,
    options: FallbackOptions
) {
    const modelsToTry = [options.primaryModel, ...options.fallbackModels];
    let lastError: Error | null = null;

    for (const model of modelsToTry) {
        try {
            if (options.verbose) {
                console.log(`[CIRCUIT BREAKER] 🔄 Routing request to: ${model}`);
            }

            // Attempt generation with the current model in the fallback chain
            const response = await ai.generate({
                ...request,
                model,
            });

            if (options.verbose && model !== options.primaryModel) {
                console.log(`[CIRCUIT BREAKER] ✅ Fallback successful: ${model}`);
            }

            return response;
        } catch (error: any) {
            lastError = error;
            const status = error?.status || error?.response?.status;
            const message = error?.message || '';

            // 429: Too Many Requests (Rate Limit)
            // 503: Service Unavailable (Overloaded)
            const isRateLimit = status === 429 || message.includes('429');
            const isServiceUnavailable = status === 503 || message.includes('503');
            const isQuotaExceeded = message.includes('quota') || message.toLowerCase().includes('exhausted');

            if (isRateLimit || isServiceUnavailable || isQuotaExceeded) {
                const reason = isRateLimit ? 'Rate Limit (429)' :
                    isServiceUnavailable ? 'Service Unavailable (503)' :
                        'Quota Exceeded';
                console.warn(`[CIRCUIT BREAKER] ⚠️ ${model} failed: ${reason}. Attempting next callback...`);
                // Continue loop to try the next model
                continue;
            }

            // If it's a structural error (bad prompt, auth error, etc.), throw immediately
            // Don't waste API calls trying other models with a broken prompt
            throw error;
        }
    }

    // If we exhaust all models in the chain
    throw new Error(
        `[CIRCUIT BREAKER] ❌ Exhausted all fallback models. Last error from ${modelsToTry[modelsToTry.length - 1]}: ${lastError?.message}`
    );
}

/**
 * Pre-configured fallback chains for standard Creative Liberation Engine workloads
 */
export const FALLBACK_CHAINS = {
    // Maximum reasoning capabilities. Start with Gemini Pro 2.5, fallback to DeepSeek, then Claude Sonnet
    tier3Max: {
        primaryModel: 'googleai/gemini-2.5-flash',
        fallbackModels: ['deepseek/deepseek-reasoner', 'anthropic/claude-3-7-sonnet'],
        verbose: true
    },
    // Fast cloud tasks. Start with Flash, fallback to Haiku
    tier2Fast: {
        primaryModel: 'googleai/gemini-2.5-flash',
        fallbackModels: ['anthropic/claude-3-5-haiku-latest'],
        verbose: true
    },
    // Local processing. If Gemma 3 27B fails, try the coder model
    tier1Local: {
        primaryModel: `ollama/${LOCAL_MODEL_IDS.fast}`,
        fallbackModels: [`ollama/${LOCAL_MODEL_IDS.code}`],
        verbose: true
    }
};

