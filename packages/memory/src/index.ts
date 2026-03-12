/**
 * @cle/memory — In-memory memory bus and chroma stub
 *
 * Provides memoryBus for recall/commit with in-memory storage,
 * MemoryEntry types, zod schemas, and chromaMemory stub (offline).
 */

import { z } from 'zod';

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

export const MemoryEntrySchema = z.object({
  id: z.string(),
  content: z.string(),
  tags: z.array(z.string()).default([]),
  agentId: z.string().optional(),
  timestamp: z.number(),
  metadata: z.record(z.unknown()).optional(),
});

export const MemoryQuerySchema = z.object({
  query: z.string(),
  tags: z.array(z.string()).optional(),
});

export const MemoryWriteSchema = z.object({
  content: z.string(),
  tags: z.array(z.string()).optional(),
  agentId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type MemoryEntry = z.infer<typeof MemoryEntrySchema>;
export type MemoryQuery = z.infer<typeof MemoryQuerySchema>;
export type MemoryWrite = z.infer<typeof MemoryWriteSchema>;

// ─── MemoryBus Type ──────────────────────────────────────────────────────────

export interface MemoryBus {
  withMemory<T>(
    agentId: string,
    query: string,
    tags: string[],
    fn: (entries: MemoryEntry[]) => T | { result: T; write?: MemoryWrite }
  ): T;
  recall(query: MemoryQuery | string): MemoryEntry[];
  commit(write: MemoryWrite): MemoryEntry;
  setPatternExtractor(fn: (content: string) => string[]): void;
  logBoot(msg: string): void;
}

// ─── In-Memory Store ────────────────────────────────────────────────────────

const store: MemoryEntry[] = [];
let patternExtractor: ((content: string) => string[]) | null = null;
const bootLog: string[] = [];

function generateId(): string {
  return `mem_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function matchesQuery(entry: MemoryEntry, query: string, tags?: string[]): boolean {
  const q = query.toLowerCase();
  const contentMatch = entry.content.toLowerCase().includes(q);
  const tagMatch = !tags?.length || tags.some((t) => entry.tags.includes(t));
  return contentMatch && tagMatch;
}

// ─── memoryBus Implementation ───────────────────────────────────────────────

export const memoryBus: MemoryBus = {
  withMemory<T>(
    agentId: string,
    query: string,
    tags: string[],
    fn: (entries: MemoryEntry[]) => T | { result: T; write?: MemoryWrite }
  ): T {
    const entries = this.recall({ query, tags });
    const out = fn(entries);
    if (typeof out === 'object' && out !== null && 'write' in out && out.write) {
      this.commit({ ...out.write, agentId: out.write.agentId ?? agentId });
    }
    return typeof out === 'object' && out !== null && 'result' in out ? out.result : (out as T);
  },

  recall(query: MemoryQuery | string): MemoryEntry[] {
    const q = typeof query === 'string' ? query : query.query;
    const tags = typeof query === 'string' ? undefined : query.tags;
    return store.filter((e) => matchesQuery(e, q, tags));
  },

  commit(write: MemoryWrite): MemoryEntry {
    const parsed = MemoryWriteSchema.parse(write);
    const entry: MemoryEntry = {
      id: generateId(),
      content: parsed.content,
      tags: parsed.tags ?? [],
      agentId: parsed.agentId,
      timestamp: Date.now(),
      metadata: parsed.metadata,
    };
    if (patternExtractor) {
      entry.tags = [...new Set([...entry.tags, ...patternExtractor(parsed.content)])];
    }
    store.push(entry);
    return entry;
  },

  setPatternExtractor(fn: (content: string) => string[]): void {
    patternExtractor = fn;
  },

  logBoot(msg: string): void {
    bootLog.push(`[${new Date().toISOString()}] ${msg}`);
  },
};

// ─── chromaMemory Stub ──────────────────────────────────────────────────────

export const chromaMemory = {
  isOnline(): boolean {
    return false;
  },
  recall(_collection: string, _query: string, _k: number): MemoryEntry[] {
    return [];
  },
  persist(_entry: MemoryEntry): void {
    // no-op
  },
};
