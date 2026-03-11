/**
 * MCP Server Lifecycle Manager — MCP-04 (Part 2)
 *
 * Higher-level lifecycle abstraction on top of the registry.
 * Provides:
 *   - activateForTask(domains[]): ensure all required servers are connected
 *   - deactivateAll(): graceful teardown
 *   - withServers(domains, fn): RAII-style temporary activation
 *   - getActivationReport(): for logging / telemetry
 */

import { mcpRegistry } from './registry.js';
import { getServersForDomain } from './router.js';
import type { MCPDomain, MCPServerManifestEntry } from './types.js';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface ActivationReport {
    requested: string[];
    connected: string[];
    failed: string[];
    skipped: string[];   // alwaysOn servers already active
    durationMs: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// LIFECYCLE MANAGER
// ─────────────────────────────────────────────────────────────────────────────

export class MCPLifecycleManager {
    /**
     * Ensure all servers for the given domains are connected and ready.
     * Registers any unregistered servers automatically from the manifest.
     */
    async activateForTask(domains: MCPDomain[]): Promise<ActivationReport> {
        const start = Date.now();
        const allServers: MCPServerManifestEntry[] = [];

        // Collect all servers needed across domains (deduplicated)
        const seen = new Set<string>();
        for (const domain of domains) {
            for (const server of getServersForDomain(domain)) {
                if (!seen.has(server.id)) {
                    seen.add(server.id);
                    allServers.push(server);
                    // Auto-register in registry if not already registered
                    mcpRegistry.register(server);
                }
            }
        }

        const requested = allServers.map(s => s.id);
        const connected: string[] = [];
        const failed: string[] = [];
        const skipped: string[] = [];

        // Connect in parallel — but respect MAX_ACTIVE_CONNECTIONS via registry
        await Promise.allSettled(
            allServers.map(async server => {
                const currentStatus = mcpRegistry.getStatus(server.id);
                if (currentStatus === 'connected') {
                    skipped.push(server.id);
                    return;
                }
                try {
                    await mcpRegistry.getOrConnect(server.id);
                    connected.push(server.id);
                } catch (err) {
                    console.error(`[MCP-LIFECYCLE] Failed to activate ${server.id}:`, err);
                    failed.push(server.id);
                }
            })
        );

        const report: ActivationReport = {
            requested,
            connected,
            failed,
            skipped,
            durationMs: Date.now() - start,
        };

        console.log(`[MCP-LIFECYCLE] ✅ Activated ${connected.length} | ⚡ Already up ${skipped.length} | ❌ Failed ${failed.length} [${report.durationMs}ms]`);
        return report;
    }

    /**
     * RAII-style: activate servers for the duration of fn(), then return.
     * Does NOT disconnect after — servers stay up for LRU management.
     */
    async withServers<T>(domains: MCPDomain[], fn: () => Promise<T>): Promise<T> {
        await this.activateForTask(domains);
        return fn();
    }

    /**
     * Gracefully disconnect all active connections and shut down health checks.
     * Call this on process exit.
     */
    async deactivateAll(): Promise<void> {
        await mcpRegistry.shutdown();
    }

    /**
     * Get a summary of current live connections for telemetry / boot panel.
     */
    getActivationReport(): { activeCount: number; servers: { id: string; status: string; lastUsed?: string }[] } {
        const active = mcpRegistry.listActive();
        return {
            activeCount: active.length,
            servers: active.map(entry => ({
                id: entry.config.id,
                status: entry.status,
                lastUsed: entry.lastUsedAt?.toISOString(),
            })),
        };
    }
}

/** Singleton lifecycle manager */
export const mcpLifecycle = new MCPLifecycleManager();
