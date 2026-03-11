/**
 * MCP Server Registry — MCP-04 (Part 1)
 *
 * Maintains the map of configured servers (from manifest) and the map of
 * active live connections. Implements lazy-connect getOrConnect() with:
 *   - Max 6 concurrent active connections (LRU eviction on overflow)
 *   - 5-minute idle timeout → auto-disconnect
 *   - 30s health-check loop on active connections
 *   - 1 restart attempt on connection failure before marking as error
 */

import { spawn } from 'child_process';
import type { MCPServerManifestEntry, ServerRegistryEntry, ServerStatus } from './types.js';
import { getServersForDomain } from './router.js';
import type { MCPDomain } from './types.js';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const MAX_ACTIVE_CONNECTIONS = 6;
const IDLE_TIMEOUT_MS = 5 * 60 * 1000;       // 5 minutes
const HEALTH_CHECK_INTERVAL_MS = 30 * 1000;   // 30 seconds
const CONNECT_TIMEOUT_MS = 10 * 1000;         // 10 seconds

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRY CLASS
// ─────────────────────────────────────────────────────────────────────────────

export class MCPServerRegistry {
    /** All servers from the capability manifest (config, not live) */
    private readonly registeredServers = new Map<string, MCPServerManifestEntry>();
    /** Live connection state for active servers */
    private readonly activeConnections = new Map<string, ServerRegistryEntry>();
    /** LRU access order (most recent last) */
    private readonly lruOrder: string[] = [];

    private healthCheckTimer?: ReturnType<typeof setInterval>;
    private readonly maxActive: number;
    private readonly idleTimeoutMs: number;

    constructor(options?: { maxActive?: number; idleTimeoutMs?: number }) {
        this.maxActive = options?.maxActive ?? MAX_ACTIVE_CONNECTIONS;
        this.idleTimeoutMs = options?.idleTimeoutMs ?? IDLE_TIMEOUT_MS;
        this.startHealthCheck();
    }

    // ─── Registration ───────────────────────────────────────────────────────

    /** Register a server config from the manifest */
    register(entry: MCPServerManifestEntry): void {
        this.registeredServers.set(entry.id, entry);
    }

    /** Register all servers from a domain */
    registerDomain(domain: MCPDomain): void {
        for (const server of getServersForDomain(domain)) {
            this.register(server);
        }
    }

    // ─── Lazy Connect / GetOrConnect ────────────────────────────────────────

    /**
     * Get or lazily start a server connection.
     * Evicts LRU if at capacity.
     */
    async getOrConnect(serverId: string): Promise<ServerRegistryEntry> {
        // Already active and healthy
        const existing = this.activeConnections.get(serverId);
        if (existing && existing.status === 'connected') {
            this.touchLRU(serverId);
            existing.lastUsedAt = new Date();
            return existing;
        }

        // Ensure config exists
        const config = this.registeredServers.get(serverId);
        if (!config) {
            throw new Error(`[MCP-REGISTRY] Unknown server: ${serverId}. Register it first.`);
        }

        // Evict LRU if at capacity
        if (this.activeConnections.size >= this.maxActive) {
            await this.evictLRU();
        }

        // Create registry entry
        const entry: ServerRegistryEntry = {
            config,
            status: 'connecting',
            activeRequests: 0,
            connectedAt: undefined,
            lastUsedAt: new Date(),
        };
        this.activeConnections.set(serverId, entry);
        this.lruOrder.push(serverId);

        // Attempt connection
        try {
            await this.connectServer(entry);
        } catch (err) {
            // One restart attempt
            console.warn(`[MCP-REGISTRY] ⚠️ ${serverId} connection failed — retrying once`);
            try {
                await this.connectServer(entry);
            } catch (retryErr) {
                entry.status = 'error';
                entry.error = String(retryErr);
                console.error(`[MCP-REGISTRY] ❌ ${serverId} failed after retry:`, retryErr);
            }
        }

        return entry;
    }

    // ─── Disconnect ──────────────────────────────────────────────────────────

    async disconnect(serverId: string): Promise<void> {
        const entry = this.activeConnections.get(serverId);
        if (!entry) return;

        // Kill the child process if this is a stdio server
        if (entry.process && !entry.process.killed) {
            entry.process.kill('SIGTERM');
            entry.process = undefined;
        }

        entry.status = 'disconnected';
        this.activeConnections.delete(serverId);
        this.removeLRU(serverId);
        console.log(`[MCP-REGISTRY] 🔌 Disconnected: ${serverId}`);
    }

    // ─── Status ───────────────────────────────────────────────────────────────

    getStatus(serverId: string): ServerStatus | 'unregistered' {
        const active = this.activeConnections.get(serverId);
        if (active) return active.status;
        if (this.registeredServers.has(serverId)) return 'disconnected';
        return 'unregistered';
    }

    getActiveCount(): number {
        return this.activeConnections.size;
    }

    listActive(): ServerRegistryEntry[] {
        return [...this.activeConnections.values()];
    }

    // ─── Internal: Connect ────────────────────────────────────────────────────

    private async connectServer(entry: ServerRegistryEntry): Promise<void> {
        const { id, transport, command, args, env } = entry.config;
        console.log(`[MCP-REGISTRY] 🔌 Connecting: ${id} (transport: ${transport ?? 'stdio'})`);

        if (transport === 'sse' || transport === 'websocket') {
            // SSE / WebSocket transports — mark as connected (client manages lifecycle)
            // Future: establish EventSource or WebSocket connection here
            entry.status = 'connected';
            entry.connectedAt = new Date();
            entry.lastUsedAt = new Date();
            entry.error = undefined;
            console.log(`[MCP-REGISTRY] ✅ Connected (${transport}): ${id}`);
            return;
        }

        // stdio transport — spawn MCP server as child process
        if (!command) {
            throw new Error(`[MCP-REGISTRY] Server "${id}" uses stdio transport but has no command`);
        }

        const child = spawn(command, args ?? [], {
            env: { ...process.env, ...(env ?? {}) },
            stdio: ['pipe', 'pipe', 'inherit'],
        });

        // Handle premature exit before we confirm "connected"
        await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(
                () => reject(new Error(`[MCP-REGISTRY] Connection timeout: ${id}`)),
                CONNECT_TIMEOUT_MS
            );

            // MCP stdio protocol: server is ready as soon as it's spawned
            // (stdin/stdout pipes open = ready for JSON-RPC messages)
            child.once('spawn', () => {
                clearTimeout(timeout);
                resolve();
            });

            child.once('error', (err) => {
                clearTimeout(timeout);
                reject(err);
            });
        });

        // Register exit handler AFTER confirming spawn
        child.on('exit', (code, signal) => {
            const msg = signal ? `killed by signal ${signal}` : `exited with code ${code}`;
            entry.status = 'error';
            entry.error = `Process ${msg}`;
            entry.process = undefined;
            console.warn(`[MCP-REGISTRY] ⚠️  ${id} — ${msg}`);
        });

        entry.process = child;
        entry.status = 'connected';
        entry.connectedAt = new Date();
        entry.lastUsedAt = new Date();
        entry.error = undefined;
        console.log(`[MCP-REGISTRY] ✅ Connected (pid: ${child.pid}): ${id}`);
    }

    // ─── LRU Management ───────────────────────────────────────────────────────

    private touchLRU(serverId: string): void {
        this.removeLRU(serverId);
        this.lruOrder.push(serverId);
    }

    private removeLRU(serverId: string): void {
        const idx = this.lruOrder.indexOf(serverId);
        if (idx !== -1) this.lruOrder.splice(idx, 1);
    }

    private async evictLRU(): Promise<void> {
        // Find LRU server with no active requests
        const candidate = this.lruOrder.find(id => {
            const entry = this.activeConnections.get(id);
            return entry && entry.activeRequests === 0 && !entry.config.alwaysOn;
        });
        if (candidate) {
            console.log(`[MCP-REGISTRY] ♻️ LRU evicting: ${candidate}`);
            await this.disconnect(candidate);
        }
    }

    // ─── Health Check Loop ───────────────────────────────────────────────────

    private startHealthCheck(): void {
        this.healthCheckTimer = setInterval(async () => {
            const now = Date.now();
            for (const [id, entry] of this.activeConnections) {
                // Idle timeout check
                if (entry.lastUsedAt && !entry.config.alwaysOn) {
                    const idleMs = now - entry.lastUsedAt.getTime();
                    if (idleMs > this.idleTimeoutMs && entry.activeRequests === 0) {
                        console.log(`[MCP-REGISTRY] ⏱️ Idle timeout: ${id} (${Math.round(idleMs / 1000)}s idle)`);
                        await this.disconnect(id);
                        continue;
                    }
                }
                // Health check ping (in production: send a lightweight ping)
                if (entry.status === 'error') {
                    console.warn(`[MCP-REGISTRY] 🔴 Server in error state: ${id} — ${entry.error}`);
                }
            }
        }, HEALTH_CHECK_INTERVAL_MS);
    }

    /** Cleanly shut down — disconnect all and stop health check */
    async shutdown(): Promise<void> {
        if (this.healthCheckTimer) clearInterval(this.healthCheckTimer);
        for (const id of [...this.activeConnections.keys()]) {
            await this.disconnect(id);
        }
        console.log('[MCP-REGISTRY] 🛑 Registry shut down');
    }

    async destroy(): Promise<void> {
        return this.shutdown();
    }

    telemetryReport() {
        return {
            activeCount: this.activeConnections.size,
            registeredCount: this.registeredServers.size,
            status: Array.from(this.activeConnections.values()).map(entry => ({
                id: entry.config.id,
                status: entry.status,
                activeRequests: entry.activeRequests
            }))
        };
    }
}

/** Singleton registry instance */
export const mcpRegistry = new MCPServerRegistry();
