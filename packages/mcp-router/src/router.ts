/**
 * MCP Intent Router — MCP-03
 *
 * Two-stage task-to-domain classifier:
 *   Stage 1: Keyword fast-path — scan manifest keywords against task description
 *            → O(n*k) local, zero latency, ~85% hit rate
 *   Stage 2: LLM fallback — injected via setLLMClassifier() from host environment
 *            (e.g., @inception/genkit). Avoids hard dep on genkit here.
 *
 * This package is intentionally dependency-light.
 * LLM capability is injected at runtime by the calling environment.
 */

import _manifest from './capability-manifest.json' with { type: 'json' };
import type { CapabilityManifest, MCPDomain, MCPServerManifestEntry, RoutingDecision } from './types.js';

export const manifest = _manifest as CapabilityManifest;

export const MCP_ROUTER_MODEL = process.env.MCP_ROUTER_MODEL || 'claude-3-7-sonnet-latest';

interface CacheEntry {
    decision: RoutingDecision;
    expiresAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const ROUTE_CACHE = new Map<string, CacheEntry>();

// ─────────────────────────────────────────────────────────────────────────────
// LLM CLASSIFIER — injectable hook
// ─────────────────────────────────────────────────────────────────────────────

type LLMClassifier = (task: string, manifest: CapabilityManifest) => Promise<{
    domains: MCPDomain[];
    confidence: number;
}>;

let _llmClassifier: LLMClassifier | null = null;

/**
 * Inject a LLM classifier from the host environment (e.g. @inception/genkit).
 * If not injected, Stage 2 returns an empty result and the router falls back to 'general'.
 *
 * Call once during app initialization:
 * ```ts
 * import { setLLMClassifier } from '@inception/mcp-router';
 * setLLMClassifier(async (task, manifest) => { ... });
 * ```
 */
export function setLLMClassifier(classifier: LLMClassifier): void {
    _llmClassifier = classifier;
    console.log('[MCP-ROUTER] 🧠 LLM classifier registered');
}

// ─────────────────────────────────────────────────────────────────────────────
// KEYWORD FAST-PATH (Stage 1)
// ─────────────────────────────────────────────────────────────────────────────

interface KeywordMatch {
    domain: MCPDomain;
    server: MCPServerManifestEntry;
    matchedKeywords: string[];
    score: number;
}

function keywordMatch(taskDescription: string): KeywordMatch[] {
    const desc = taskDescription.toLowerCase();
    const matches: KeywordMatch[] = [];

    for (const [domain, servers] of Object.entries(manifest.domains)) {
        for (const server of servers as MCPServerManifestEntry[]) {
            if (!server.enabled) continue;
            const matched = server.keywords.filter(kw => desc.includes(kw.toLowerCase()));
            if (matched.length > 0) {
                matches.push({
                    domain: domain as MCPDomain,
                    server,
                    matchedKeywords: matched,
                    score: matched.length + (server.alwaysOn ? 2 : 0) + (1 / server.priority),
                });
            }
        }
    }

    // Sort by score desc
    return matches.sort((a, b) => b.score - a.score);
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ROUTER (MCP-03)
// ─────────────────────────────────────────────────────────────────────────────

export async function routeTask(taskDescription: string): Promise<RoutingDecision> {
    const cacheKey = taskDescription.trim();
    const cached = ROUTE_CACHE.get(cacheKey);
    
    if (cached) {
        if (Date.now() < cached.expiresAt) {
            console.log(`[MCP-ROUTER] 📦 Route cache hit for: "${cacheKey.substring(0, 50)}..."`);
            return cached.decision;
        } else {
            console.log(`[MCP-ROUTER] ⏱️ Route cache expired for: "${cacheKey.substring(0, 50)}..."`);
            ROUTE_CACHE.delete(cacheKey);
        }
    }

    // Stage 1 — keyword fast-path
    const keywordMatches = keywordMatch(taskDescription);
    const matchedDomains = [...new Set(keywordMatches.map(m => m.domain))];
    const matchedKeywords = keywordMatches.flatMap(m => m.matchedKeywords);
    const serversFromKeywords = keywordMatches.map(m => m.server.id);

    if (matchedDomains.length > 0) {
        console.log(`[MCP-ROUTER] ⚡ Keyword match: ${matchedDomains.join(', ')} (${matchedKeywords.slice(0, 5).join(', ')})`);
        const decision: RoutingDecision = {
            matchedDomains,
            serversToActivate: serversFromKeywords,
            method: 'keyword',
            confidence: Math.min(0.95, 0.6 + (matchedKeywords.length * 0.05)),
            matchedKeywords,
        };
        ROUTE_CACHE.set(cacheKey, { decision, expiresAt: Date.now() + CACHE_TTL_MS });
        return decision;
    }

    // Stage 2 — LLM fallback (injected)
    if (_llmClassifier) {
        console.log('[MCP-ROUTER] 🔍 No keyword match — using injected LLM classifier');
        try {
            const llmResult = await _llmClassifier(taskDescription, manifest);
            const serversFromLLM = llmResult.domains.flatMap(domain => {
                const servers = manifest.domains[domain] ?? [];
                return servers.filter(s => s.enabled).map(s => s.id);
            });
            const decision: RoutingDecision = {
                matchedDomains: llmResult.domains,
                serversToActivate: serversFromLLM,
                method: 'llm',
                confidence: llmResult.confidence,
            };
            ROUTE_CACHE.set(cacheKey, { decision, expiresAt: Date.now() + CACHE_TTL_MS });
            return decision;
        } catch (err) {
            console.error('[MCP-ROUTER] LLM classifier failed:', err);
        }
    } else {
        console.log('[MCP-ROUTER] No LLM classifier registered — falling back to general');
    }

    // Default: no match, no LLM
    const decision: RoutingDecision = {
        matchedDomains: [],
        serversToActivate: [],
        method: 'default',
        confidence: 0.1,
    };
    ROUTE_CACHE.set(cacheKey, { decision, expiresAt: Date.now() + CACHE_TTL_MS });
    return decision;
}

/** Convenience: just get the domain names */
export async function classifyDomains(taskDescription: string): Promise<MCPDomain[]> {
    const decision = await routeTask(taskDescription);
    return decision.matchedDomains;
}

/** Get all servers for a given domain */
export function getServersForDomain(domain: MCPDomain): MCPServerManifestEntry[] {
    return (manifest.domains[domain] ?? []).filter(s => s.enabled);
}

/** Clear the route cache (useful for testing or config reload) */
export function clearRouteCache(): void {
    ROUTE_CACHE.clear();
    console.log('[MCP-ROUTER] Route cache cleared');
}

/** Evict expired entries from cache */
export function evictExpired(): number {
    const now = Date.now();
    let evicted = 0;
    ROUTE_CACHE.forEach((entry, key) => {
        if (now >= entry.expiresAt) {
            ROUTE_CACHE.delete(key);
            evicted++;
        }
    });
    return evicted;
}

/** Get size of the route cache */
export function getCacheSize(): number {
    return ROUTE_CACHE.size;
}