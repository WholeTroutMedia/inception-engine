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
  content: z.string().optional(),
  task: z.string().optional(),
  outcome: z.string().optional(),
  pattern: z.string().optional(),
  tags: z.array(z.string()).default([]),
  agentId: z.string().optional(),
  agentName: z.string().optional(),
  timestamp: z.number(),
  metadata: z.record(z.unknown()).optional(),
}).passthrough();

export const MemoryQuerySchema = z.object({
  query: z.string(),
  tags: z.array(z.string()).optional(),
  agentName: z.string().optional(),
  limit: z.number().optional(),
  successOnly: z.boolean().optional(),
  where: z.record(z.unknown()).optional(),
}).passthrough();

export const MemoryWriteSchema = z.object({
  content: z.string().optional(),
  task: z.string().optional(),
  outcome: z.string().optional(),
  tags: z.array(z.string()).optional(),
  agentId: z.string().optional(),
  agentName: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  sessionId: z.string().optional(),
  success: z.boolean().optional(),
}).passthrough();

export type MemoryEntry = z.infer<typeof MemoryEntrySchema>;
export type MemoryQuery = z.infer<typeof MemoryQuerySchema>;
export type MemoryWrite = z.infer<typeof MemoryWriteSchema>;

// ─── MemoryBus Type ──────────────────────────────────────────────────────────

export interface MemoryBus {
  withMemory<T>(
    agentId: string,
    query: string,
    tags: string[],
    fn: (entries: MemoryEntry[]) => Promise<T | { result: T; write?: MemoryWrite }> | T | { result: T; write?: MemoryWrite }
  ): Promise<T>;
  recall(query: MemoryQuery | string): Promise<MemoryEntry[]>;
  commit(write: MemoryWrite): Promise<MemoryEntry>;
  setPatternExtractor(fn: (content: string) => string[] | Promise<string[]>): void;
  logBoot(msg: string, ...rest: unknown[]): void;
}

// ─── In-Memory Store ────────────────────────────────────────────────────────

const store: MemoryEntry[] = [];
let patternExtractor: ((content: string) => string[] | Promise<string[]>) | null = null;
const bootLog: string[] = [];

function generateId(): string {
  return `mem_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function matchesQuery(entry: MemoryEntry, query: string, tags?: string[]): boolean {
  const q = query.toLowerCase();
  const text = (entry.content ?? entry.outcome ?? entry.task ?? '').toLowerCase();
  const contentMatch = text.includes(q);
  const tagMatch = !tags?.length || tags.some((t) => entry.tags.includes(t));
  return contentMatch && tagMatch;
}

// ─── memoryBus Implementation ───────────────────────────────────────────────

export const memoryBus: MemoryBus = {
  async withMemory<T>(
    agentId: string,
    query: string,
    tags: string[],
    fn: (entries: MemoryEntry[]) => Promise<T | { result: T; write?: MemoryWrite }> | T | { result: T; write?: MemoryWrite }
  ): Promise<T> {
    const entries = await this.recall({ query, tags });
    const out = await fn(entries);
    if (typeof out === 'object' && out !== null && 'write' in out && out.write) {
      await this.commit({ ...out.write, agentId: out.write.agentId ?? out.write.agentName ?? agentId });
    }
    return typeof out === 'object' && out !== null && 'result' in out ? out.result : (out as T);
  },

  async recall(query: MemoryQuery | string): Promise<MemoryEntry[]> {
    const q = typeof query === 'string' ? query : query.query;
    const tags = typeof query === 'string' ? undefined : query.tags;
    const limit = typeof query === 'object' && query.limit ? query.limit : undefined;
    let results = store.filter((e) => matchesQuery(e, q, tags));
    if (limit) results = results.slice(0, limit);
    return results;
  },

  async commit(write: MemoryWrite): Promise<MemoryEntry> {
    const parsed = MemoryWriteSchema.parse(write);
    const content = parsed.outcome ?? parsed.task ?? parsed.content ?? '';
    const agent = parsed.agentId ?? parsed.agentName ?? '';
    const entry: MemoryEntry = {
      id: generateId(),
      content,
      task: parsed.task,
      outcome: parsed.outcome,
      tags: parsed.tags ?? [],
      agentId: agent,
      agentName: agent,
      timestamp: Date.now(),
      metadata: parsed.metadata,
    };
    if (patternExtractor) {
      const extracted = await Promise.resolve(patternExtractor(content));
      entry.tags = [...new Set([...entry.tags, ...(Array.isArray(extracted) ? extracted : [extracted])])];
    }
    store.push(entry);
    return entry;
  },

  setPatternExtractor(fn: (content: string) => string[] | Promise<string[]>): void {
    patternExtractor = fn;
  },

  logBoot(msg: string, ..._rest: unknown[]): void {
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
  persist(_entry: Partial<MemoryEntry> & { id?: string }): void {
    // no-op stub
  },
};
