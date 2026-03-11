/**
 * Creative Liberation Engine — Fallback Chain Middleware
 *
 * Default middleware stack for all Genkit generate() calls.
 * Provides ordered fallback, retry, and audit logging.
 *
 * Order: Constitutional Firewall → Retry → Fallback → Audit
 *
 * Constitutional: Article III (Human Supremacy), Article IX (Quality)
 */

import { retry, fallback } from 'genkit/model/middleware';
import type { ModelMiddleware } from 'genkit/model';
import { ai } from '../index.js';
import { constitutionalFirewall } from './constitutional-firewall.js';
import { auditLogger } from './audit-logger.js';

// ---------------------------------------------------------------------------
// Default Middleware Stack
// ---------------------------------------------------------------------------

/**
 * Build the default middleware stack for Creative Liberation Engine.
 *
 * Models fallback chain: Gemini 2.5 Flash → Claude Sonnet → GPT-4o
 * Each layer wraps the next, so Constitutional runs first and Audit runs last.
 */
export function defaultMiddleware(): ModelMiddleware[] {
    const stack: ModelMiddleware[] = [];

    // 1. Constitutional Firewall (pre/post-flight)
    stack.push(constitutionalFirewall());

    // 2. Retry with exponential backoff
    stack.push(
        retry({
            maxRetries: 2,
            initialDelayMs: 1000,
            backoffFactor: 2,
            onError: (error, retryCount) => {
                console.warn(`[GENKIT:RETRY] Attempt ${retryCount} failed:`, error.message);
            },
        })
    );

    // 3. Audit logger (logs every request/response for SCRIBE)
    stack.push(auditLogger());

    return stack;
}

/**
 * Build fallback-enabled middleware with model chain.
 * Use this when you want auto-fallback across providers.
 */
export function fallbackMiddleware(
    fallbackModels: string[] = []
): ModelMiddleware[] {
    const stack = defaultMiddleware();

    if (fallbackModels.length > 0) {
        stack.push(
            fallback(ai, {
                models: fallbackModels,
                statuses: ['UNAVAILABLE', 'RESOURCE_EXHAUSTED', 'DEADLINE_EXCEEDED', 'INTERNAL'],
                onError: (error: Error) => {
                    console.warn(`[GENKIT:FALLBACK] Model failed, trying next:`, error.message);
                },
            })
        );
    }

    return stack;
}
