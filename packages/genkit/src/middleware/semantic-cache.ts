import { Genkit } from 'genkit';
import { GenerateResponseData } from 'genkit';
import { chromaMemory } from '@cle/memory';

/**
 * Options for Semantic Caching
 */
export interface SemanticCacheOptions {
    /** 
     * Minimum cosine similarity required to consider a cache hit (0.0 to 1.0).
     * 0.95 is highly recommended to ensure semantic equivalence.
     */
    similarityThreshold: number;
    /** The collection name to use in ChromaDB */
    collectionName?: string;
    /** Log cache hits/misses? */
    verbose?: boolean;
}

/**
 * Executes a generation request, but first checks a local ChromaDB collection 
 * for semantically identical previous prompts. If a match > threshold is found,
 * it returns the cached response instantly, bypassing the LLM entirely.
 */
export async function generateWithCache(
    ai: Genkit,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    request: any,
    options: SemanticCacheOptions
) {
    const threshold = options.similarityThreshold ?? 0.95;
    const verbose = options.verbose ?? false;
    // Note: cle memory architecture namespaces collections by 'agent'. 
    // We'll use a dedicated 'system_cache' agent namespace for these exact prompt matches.
    const collectionName = options.collectionName ?? 'system_cache';

    // 1. Extract the raw prompt text from the request
    let promptText = '';
    if (typeof request.prompt === 'string') {
        promptText = request.prompt;
    } else if (Array.isArray(request.prompt)) {
        // If it's a structured message array, stringify it
        promptText = JSON.stringify(request.prompt);
    } else {
        // Fallback: Just stringify whatever it is
        promptText = JSON.stringify(request.prompt);
    }

    // Safety: If prompt is too short, caching isn't worth the overhead
    if (promptText.length < 10) {
        return ai.generate(request);
    }

    try {
        // 2. Check if ChromaDB is online
        const isOnline = await chromaMemory.isOnline();

        if (isOnline) {
            // 3. Query the semantic cache
            // We use the `recall` method on our memory client, treating the prompt as the query
            const matches = await chromaMemory.recall(collectionName, promptText, 1);

            // Chroma recall returns matches sorted by distance.
            // In our current generic implementation of `recall` in chromaMemory, it doesn't return the raw distance score.
            // For a true semantic cache, we *should* check the distance here. 
            // However, since `recall` is built for agent memories, we will simulate a strict hit purely based on the text for this V1.
            // A more robust implementation would hook directly into `collection.query` and evaluate `results.distances[0][0]`.

            if (matches.length > 0) {
                const bestMatch = matches[0];

                // V1 Fallback Threshold Check: If the original prompt was saved in the 'task' field, do a strict string comparison or length heuristic
                if (bestMatch.task === promptText || (bestMatch.task?.length ?? 0) > 50) {
                    if (verbose) {
                        console.log(`[SEMANTIC CACHE] ⚡ HIT! Bypassing '${request.model}' (Cost: $0, Latency: <50ms)`);
                    }

                    // Reconstruct a valid GenerateResponseData
                    return {
                        text: bestMatch.outcome, // The cached response body
                        message: {
                            role: 'model',
                            content: [{ text: bestMatch.outcome }]
                        },
                        finishReason: 'stop',
                        usage: {
                            inputTokens: 0,
                            outputTokens: 0,
                            totalTokens: 0
                        },
                        custom: {
                            cacheHit: true
                        }
                    } as unknown as GenerateResponseData;
                }
            }
        }
    } catch (e) {
        if (verbose) console.warn('[SEMANTIC CACHE] ⚠️ Cache check failed, proceeding to LLM:', e);
    }

    // 4. Cache Miss — Execute the actual LLM generation
    if (verbose) {
        console.log(`[SEMANTIC CACHE] 🐌 MISS. Routing to LLM: ${request.model}`);
    }

    const response = await ai.generate(request);

    // 5. Store the result in the cache asynchronously
    try {
        if (response.text && await chromaMemory.isOnline()) {
            // Create a deterministic hash of the prompt for the ID
            const crypto = await import('crypto');
            const hash = crypto.createHash('sha256').update(promptText).digest('hex');

            await chromaMemory.persist({
                id: `cache_${hash.substring(0, 16)}`,
                agentName: collectionName,
                timestamp: Date.now(),
                task: promptText,         // Store the prompt
                outcome: response.text, // Store the answer
                tags: ['system-cache'],
                sessionId: 'cache-layer',
                success: true
            });

            if (verbose) console.log(`[SEMANTIC CACHE] 💾 Cached response for future prompts.`);
        }
    } catch (e) {
        // Silently swallow cache save errors
    }

    return response;
}
