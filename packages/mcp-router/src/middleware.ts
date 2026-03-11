/**
 * MCP-05: Genkit Pre-Flow Middleware — Auto-inject MCP tools from active servers
 * packages/mcp-router/src/middleware.ts
 *
 * Genkit middleware that:
 *   1. Extracts task hint from req.input.task or first message content
 *   2. Calls routeTask(taskHint) to detect relevant MCP domains
 *   3. Calls mcpLifecycle.activateForTask(domains) — lazy-connects servers
 *   4. Merges tool catalog into req (via context decoration)
 *
 * Registration: call registerMCPMiddleware(ai) once in genkit/src/server.ts
 */

import { mcpLifecycle } from './lifecycle.js';
import { routeTask } from './router.js';
import type { MCPDomain } from './types.js';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES — minimal Genkit-compatible middleware shapes
// ─────────────────────────────────────────────────────────────────────────────

export interface MCPMiddlewareOptions {
    /** Minimum confidence score (0-1) to activate a domain. Default: 0.5 */
    minConfidence?: number;
    /** Domains to always activate (always-on servers). Default: [] */
    alwaysActivate?: MCPDomain[];
    /** Skip activation for flows matching these names */
    skipFlows?: string[];
    /** Log activation details to console. Default: true */
    verbose?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// MIDDLEWARE FACTORY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a Genkit-compatible middleware function that:
 *   - Inspects the flow input for a task/intent string
 *   - Routes to appropriate MCP domains
 *   - Activates those servers via the lifecycle manager
 *
 * Install: call once at genkit server startup.
 */
export function createMCPAutoloadMiddleware(opts: MCPMiddlewareOptions = {}) {
    const {
        minConfidence = 0.5,
        alwaysActivate = [],
        skipFlows = [],
        verbose = true,
    } = opts;

    return async function mcpAutoloadMiddleware(
        req: {
            flowName?: string;
            input?: unknown;
            messages?: Array<{ role: string; content: string | Array<{ text: string }> }>;
        },
        next: () => Promise<unknown>
    ): Promise<unknown> {
        const flowName = req.flowName ?? 'unknown';

        // Skip excluded flows
        if (skipFlows.includes(flowName)) {
            return next();
        }

        // Extract task hint from request
        const taskHint = extractTaskHint(req);

        if (!taskHint && alwaysActivate.length === 0) {
            return next();
        }

        // Route to domains
        const domainsToActivate: MCPDomain[] = [...alwaysActivate];
        if (taskHint) {
            const routing = await routeTask(taskHint);
            // Only activate if confidence meets threshold
            if (routing.confidence >= minConfidence) {
                domainsToActivate.push(...routing.matchedDomains);
            }
        }

        const uniqueDomains = [...new Set(domainsToActivate)] as MCPDomain[];

        if (uniqueDomains.length > 0) {
            if (verbose) {
                console.log(`[MCP-MIDDLEWARE] 🔌 Flow "${flowName}" → activating domains: [${uniqueDomains.join(', ')}]`);
            }
            const report = await mcpLifecycle.activateForTask(uniqueDomains);
            if (verbose && report.failed.length > 0) {
                console.warn(`[MCP-MIDDLEWARE] ⚠️ Failed to activate: ${report.failed.join(', ')}`);
            }
        }

        return next();
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: extract task hint from Genkit request
// ─────────────────────────────────────────────────────────────────────────────

function extractTaskHint(req: {
    input?: unknown;
    messages?: Array<{ role: string; content: string | Array<{ text: string }> }>;
}): string | null {
    // Try req.input.task (our convention for AVERI flows)
    if (req.input && typeof req.input === 'object') {
        const input = req.input as Record<string, unknown>;
        if (typeof input['task'] === 'string') return input['task'].slice(0, 500);
        if (typeof input['blocker'] === 'string') return input['blocker'].slice(0, 500);
        if (typeof input['topic'] === 'string') return input['topic'].slice(0, 500);
        if (typeof input['prompt'] === 'string') return input['prompt'].slice(0, 500);
    }

    // Try first user message
    if (Array.isArray(req.messages)) {
        const firstUser = req.messages.find(m => m.role === 'user');
        if (firstUser) {
            const content = firstUser.content;
            if (typeof content === 'string') return content.slice(0, 500);
            if (Array.isArray(content) && content[0]?.text) return content[0].text.slice(0, 500);
        }
    }

    return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// SINGLETON — ready-to-use middleware with defaults
// ─────────────────────────────────────────────────────────────────────────────

export const mcpAutoloadMiddleware = createMCPAutoloadMiddleware({
    minConfidence: 0.5,
    alwaysActivate: ['memory'] as MCPDomain[],  // Memory domain always active for context
    verbose: true,
});

/**
 * Explicitly activate servers for named domains — use in flows that know
 * their domain ahead of time without routing inference.
 */
export async function activateForDomains(domains: MCPDomain[]): Promise<{
    connectedServers: string[];
    failed: string[];
}> {
    const report = await mcpLifecycle.activateForTask(domains);
    return {
        connectedServers: report.connected,
        failed: report.failed,
    };
}
