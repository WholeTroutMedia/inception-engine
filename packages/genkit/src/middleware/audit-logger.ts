/**
 * Audit Logger Middleware
 *
 * Logs every Genkit generate() call for the SCRIBE compound learning system.
 * Records: model, intent, latency, token usage, and success/failure.
 *
 * Constitutional: Article X (Compound Learning), Article V (Transparency)
 */

import type { ModelMiddleware } from 'genkit/model';

// ---------------------------------------------------------------------------
// Audit Store (in-memory for now, SCRIBE bridge later)
// ---------------------------------------------------------------------------

interface AuditEntry {
    timestamp: string;
    model: string;
    inputTokens?: number;
    outputTokens?: number;
    latencyMs: number;
    success: boolean;
    error?: string;
    finishReason?: string;
}

const auditLog: AuditEntry[] = [];

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export function auditLogger(): ModelMiddleware {
    return async (req, next) => {
        const startTime = Date.now();
        const model = req.config?.model || 'unknown';

        try {
            const resp = await next(req);
            const latencyMs = Date.now() - startTime;

            const entry: AuditEntry = {
                timestamp: new Date().toISOString(),
                model: typeof model === 'string' ? model : 'configured-model',
                inputTokens: resp.usage?.inputTokens,
                outputTokens: resp.usage?.outputTokens,
                latencyMs,
                success: true,
                finishReason: resp.candidates?.[0]?.finishReason,
            };

            auditLog.push(entry);

            // Keep log bounded (last 1000 entries)
            if (auditLog.length > 1000) {
                auditLog.splice(0, auditLog.length - 1000);
            }

            return resp;
        } catch (error: any) {
            const latencyMs = Date.now() - startTime;

            auditLog.push({
                timestamp: new Date().toISOString(),
                model: typeof model === 'string' ? model : 'configured-model',
                latencyMs,
                success: false,
                error: error.message,
            });

            throw error;
        }
    };
}

// ---------------------------------------------------------------------------
// Audit Access (for SCRIBE integration)
// ---------------------------------------------------------------------------

export function getAuditLog(): AuditEntry[] {
    return [...auditLog];
}

export function getAuditStats(): {
    totalCalls: number;
    successRate: number;
    avgLatencyMs: number;
    totalInputTokens: number;
    totalOutputTokens: number;
} {
    const total = auditLog.length;
    if (total === 0) {
        return { totalCalls: 0, successRate: 0, avgLatencyMs: 0, totalInputTokens: 0, totalOutputTokens: 0 };
    }

    const successes = auditLog.filter((e) => e.success).length;
    const avgLatency = auditLog.reduce((sum, e) => sum + e.latencyMs, 0) / total;
    const totalInput = auditLog.reduce((sum, e) => sum + (e.inputTokens || 0), 0);
    const totalOutput = auditLog.reduce((sum, e) => sum + (e.outputTokens || 0), 0);

    return {
        totalCalls: total,
        successRate: (successes / total) * 100,
        avgLatencyMs: Math.round(avgLatency),
        totalInputTokens: totalInput,
        totalOutputTokens: totalOutput,
    };
}
