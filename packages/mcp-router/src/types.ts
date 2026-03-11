/**
 * @inception/mcp-router — Types & Schemas (MCP-01)
 *
 * Defines the canonical types for the MCP capability manifest,
 * server registry entries, and tool catalog.
 */

import { z } from 'zod';
import type { ChildProcess } from 'child_process';

// ─────────────────────────────────────────────────────────────────────────────
// DOMAIN TYPES
// ─────────────────────────────────────────────────────────────────────────────

/** Top-level capability domains that MCP servers are grouped into */
export const MCPDomainSchema = z.enum([
    'memory',
    'browser',
    'cloud',
    'compute',
    'design',
    'data',
    'logging',
    'media',
    'infra',
    'firebase',
    'search',
    'maps',
    'knowledge',
    'reasoning',
    'utilities',
    'general',
]);
export type MCPDomain = z.infer<typeof MCPDomainSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// CAPABILITY MANIFEST SCHEMA
// ─────────────────────────────────────────────────────────────────────────────

/** One server entry in the capability manifest */
export const MCPServerManifestEntrySchema = z.object({
    /** Unique server identifier (matches MCP config key) */
    id: z.string(),
    /** Human-readable name */
    name: z.string(),
    /** Short description of what this server can do */
    description: z.string(),
    /** Keywords for fast keyword-match routing (pre-LLM) */
    keywords: z.array(z.string()),
    /** Whether this server is always-on or lazy-loaded */
    alwaysOn: z.boolean().default(false),
    /** Priority within its domain (1 = highest) */
    priority: z.number().int().min(1).default(1),
    /** Whether this server is enabled */
    enabled: z.boolean().default(true),
    /** Transport type for the MCP server connection */
    transport: z.enum(['stdio', 'sse', 'websocket']).optional(),
    /** Command to launch the server (for stdio transport) */
    command: z.string().optional(),
    /** Arguments for the command */
    args: z.array(z.string()).optional(),
    /** Environment variables to pass to the server */
    env: z.record(z.string()).optional(),
});
export type MCPServerManifestEntry = z.infer<typeof MCPServerManifestEntrySchema>;

/** Full capability manifest — maps domains to server lists */
export const CapabilityManifestSchema = z.object({
    version: z.string(),
    updatedAt: z.string().optional(),
    maxActiveConcurrent: z.number().int().min(1).optional(),
    defaultEvictionPolicy: z.enum(['lru', 'fifo']).optional(),
    domains: z.record(z.string(), z.array(MCPServerManifestEntrySchema)),
});
export type CapabilityManifest = z.infer<typeof CapabilityManifestSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// BACKWARDS COMPAT — keep old names as type aliases
// ─────────────────────────────────────────────────────────────────────────────

/** @deprecated Use MCPServerManifestEntrySchema */
export const MCPServerManifestEntry = MCPServerManifestEntrySchema;
/** @deprecated Use CapabilityManifestSchema */
export const CapabilityManifest = CapabilityManifestSchema;
/** @deprecated Use MCPDomainSchema */
export const MCPDomain = MCPDomainSchema;

// ─────────────────────────────────────────────────────────────────────────────
// SERVER REGISTRY TYPES (live runtime state)
// ─────────────────────────────────────────────────────────────────────────────

export type ServerStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

/** Runtime entry for a server in the active registry */
export interface ServerRegistryEntry {
    /** Server manifest entry (config) */
    config: MCPServerManifestEntry;
    /** Current connection status */
    status: ServerStatus;
    /** When this connection was last established */
    connectedAt?: Date;
    /** When this server was last used */
    lastUsedAt?: Date;
    /** Number of active requests */
    activeRequests: number;
    /** Error message if status === 'error' */
    error?: string;
    /** LRU eviction timestamp target */
    idleTimeoutAt?: Date;
    /** Spawned child process handle (stdio transport) */
    process?: ChildProcess;
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTING TYPES
// ─────────────────────────────────────────────────────────────────────────────

/** Result of the intent classifier / router */
export interface RoutingDecision {
    /** Matched domains for the given task */
    matchedDomains: MCPDomain[];
    /** Server IDs that should be active for this task */
    serversToActivate: string[];
    /** Routing method used */
    method: 'keyword' | 'llm' | 'default';
    /** Confidence score 0-1 */
    confidence: number;
    /** Which keywords matched (if method === 'keyword') */
    matchedKeywords?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// MCP TOOL CATALOG
// ─────────────────────────────────────────────────────────────────────────────

/** A single tool exposed by an MCP server */
export interface MCPTool {
    serverId: string;
    name: string;
    description: string;
    domain: MCPDomain;
    inputSchema?: Record<string, unknown>;
}

export interface MCPToolCatalog {
    tools: MCPTool[];
    serverCount: number;
    generatedAt: string;
}
