/**
 * @cle/core — Error Formatting Utilities
 *
 * Standard error types and formatting utilities for the Creative Liberation Engine.
 * Ensures consistent error shapes across all packages.
 *
 * Zero runtime dependencies — Node.js built-ins only.
 *
 * Constitutional: Article IX (Error Recovery) — graceful failure always.
 *                 Article IV (Transparency) — all reasoning observable.
 */

// ─── cle Error Types ─────────────────────────────────────────────────────

/** Base error codes used across the engine */
export type ErrorCode =
    | 'CONSTITUTIONAL_VIOLATION'    // Article enforcement failure
    | 'AGENT_UNAVAILABLE'           // Agent offline or not registered
    | 'FLOW_FAILURE'                // Genkit flow error
    | 'PROVIDER_FAILURE'            // LLM provider error
    | 'MEMORY_FAILURE'              // MemoryBus read/write error
    | 'VALIDATION_FAILURE'          // Schema or input validation error
    | 'NOT_FOUND'                   // Resource not found
    | 'UNAUTHORIZED'                // Access tier violation
    | 'RATE_LIMITED'                // Provider rate limit hit
    | 'TIMEOUT'                     // Operation timed out
    | 'INTERNAL';                   // Unexpected internal error

/** Structured error with code, message, and optional context */
export interface CLEError {
    code: ErrorCode;
    message: string;
    /** Agent that generated this error */
    agent?: string;
    /** Additional diagnostic context */
    context?: Record<string, unknown>;
    /** Original cause (if wrapping another error) */
    cause?: string;
    /** ISO timestamp */
    ts: string;
}

// ─── Error Factories ──────────────────────────────────────────────────────────

/** Create a structured CLEError */
export function makeError(
    code: ErrorCode,
    message: string,
    options?: {
        agent?: string;
        context?: Record<string, unknown>;
        cause?: unknown;
    }
): CLEError {
    return {
        code,
        message,
        agent: options?.agent,
        context: options?.context,
        cause: options?.cause instanceof Error
            ? options.cause.message
            : options?.cause != null ? String(options.cause) : undefined,
        ts: new Date().toISOString(),
    };
}

// ─── Error Formatter ──────────────────────────────────────────────────────────

/** Format any error into a plain string for logging */
export function formatError(e: unknown): string {
    if (e instanceof Error) {
        return `${e.name}: ${e.message}${e.cause ? ` (caused by: ${e.cause})` : ''}`;
    }
    if (typeof e === 'string') return e;
    try { return JSON.stringify(e); } catch { return String(e); }
}

/** Extract a message from any thrown value */
export function errorMessage(e: unknown): string {
    if (e instanceof Error) return e.message;
    if (typeof e === 'string') return e;
    return formatError(e);
}

/** Truncate a message to a safe log length */
export function truncate(s: string, maxLen = 200): string {
    return s.length > maxLen ? `${s.slice(0, maxLen - 3)}...` : s;
}

// ─── Agent Error Response ──────────────────────────────────────────────────────

/** Standard error response shape for Express/HTTP handlers */
export interface ErrorResponse {
    error: string;
    code?: ErrorCode;
    agent?: string;
    ts: string;
}

/** Create a standard JSON error response for Express routes */
export function toErrorResponse(e: unknown, agent?: string, code?: ErrorCode): ErrorResponse {
    return {
        error: errorMessage(e),
        code,
        agent,
        ts: new Date().toISOString(),
    };
}
