/**
 * SCRIBE â€” Persistent Memory Layer
 *
 * Writes decisisons, discoveries, and patterns to long-term memory.
 * Reads prior context for planning and ideation phases.
 * Connects to ChromaDB (vector), SQLite (structured), and conversation logs.
 *
 * Hive: MEMORY | Constitutional Access: false
 * Mode compatibility: IDEATE, PLAN, SHIP, VALIDATE
 */

import type { AgentDefinition } from '../types.js';

export const SCRIBE: AgentDefinition = {
    id: 'SCRIBE',
    name: 'SCRIBE',
    description: 'Persistent memory â€” episodic/semantic writes, ChromaDB retrieval, context injection for KEEPER',
    hive: 'MEMORY',
    modes: ['IDEATE', 'PLAN', 'SHIP', 'VALIDATE'],
    constitutionalAccess: false,
};

// â”€â”€â”€ SCRIBE Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type MemoryTier = 'episodic' | 'semantic' | 'procedural';

export interface MemoryEntry {
    id: string;
    tier: MemoryTier;
    content: string;
    tags: string[];
    sourceAgent?: string;
    sessionId?: string;
    timestamp: string;
    embedding?: number[];
}

export interface RetrievalResult {
    entries: MemoryEntry[];
    queryTime: number;
}

// â”€â”€â”€ In-Memory Fallback Store â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const memoryStore: MemoryEntry[] = [];

// â”€â”€â”€ SCRIBE API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const ScribeMemory = {
    /**
     * Write a memory entry.
     * Attempts to persist to ChromaDB via Genkit server.
     * Always writes to in-memory store as fallback.
     */
    async write(
        content: string,
        opts: { tier?: MemoryTier; tags?: string[]; sourceAgent?: string; sessionId?: string } = {}
    ): Promise<MemoryEntry> {
        const entry: MemoryEntry = {
            id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            tier: opts.tier ?? 'episodic',
            content,
            tags: opts.tags ?? [],
            sourceAgent: opts.sourceAgent,
            sessionId: opts.sessionId,
            timestamp: new Date().toISOString(),
        };

        // Local write
        memoryStore.push(entry);

        // Remote write â€” fire and forget
        fetch('http://127.0.0.1:4100/memory/write', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entry),
        }).catch(() => {
            // ChromaDB offline â€” local write already committed
        });

        console.log(`[SCRIBE] âœ ${entry.tier.toUpperCase()} â€” ${content.slice(0, 80)}â€¦`);
        return entry;
    },

    /**
     * Retrieve memory entries matching a query (text search + tag filter).
     */
    async retrieve(query: string, opts: { tier?: MemoryTier; limit?: number; tags?: string[] } = {}): Promise<RetrievalResult> {
        const start = Date.now();
        const lq = query.toLowerCase();

        // Try remote ChromaDB first
        try {
            const res = await fetch(`http://127.0.0.1:4100/memory/retrieve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, ...opts }),
            });
            if (res.ok) {
                const data = await res.json() as { entries: MemoryEntry[] };
                return { entries: data.entries, queryTime: Date.now() - start };
            }
        } catch {
            // Fall through to local
        }

        // Local fallback â€” BM25-like text search
        let matches = memoryStore.filter(e => {
            const contentMatch = e.content.toLowerCase().includes(lq);
            const tagMatch = opts.tags ? opts.tags.some(t => e.tags.includes(t)) : true;
            const tierMatch = opts.tier ? e.tier === opts.tier : true;
            return contentMatch && tagMatch && tierMatch;
        });

        if (opts.limit) matches = matches.slice(-opts.limit);

        return { entries: matches, queryTime: Date.now() - start };
    },

    /** Total entries in local store */
    count(): number {
        return memoryStore.length;
    },

    /** Snapshot of all local entries */
    snapshot(): MemoryEntry[] {
        return [...memoryStore];
    },
};
