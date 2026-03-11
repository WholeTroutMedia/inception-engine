/**
 * @module memory/VectorStore
 * @description Episodic + semantic vector store with KEEPER flush protocol
 * Closes #76
 */
import { z } from 'zod';

// ── Schemas ──────────────────────────────────────────────
export const MemoryType = z.enum(['episodic', 'semantic', 'procedural', 'working']);
export type MemoryType = z.infer<typeof MemoryType>;

export const MemoryEntrySchema = z.object({
  id: z.string().uuid(),
  type: MemoryType,
  content: z.string(),
  embedding: z.array(z.number()).optional(),
  agentId: z.string(),
  timestamp: z.string().datetime(),
  importance: z.number().min(0).max(1).default(0.5),
  accessCount: z.number().int().min(0).default(0),
  lastAccessed: z.string().datetime().optional(),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.string(), z.unknown()).default({}),
  ttlMs: z.number().positive().optional(),
  parentId: z.string().uuid().optional(),
  decayRate: z.number().min(0).max(1).default(0.01),
});
export type MemoryEntry = z.infer<typeof MemoryEntrySchema>;

export const KeeperFlushConfigSchema = z.object({
  maxEntries: z.number().int().positive().default(10_000),
  importanceThreshold: z.number().min(0).max(1).default(0.1),
  decayIntervalMs: z.number().positive().default(60_000),
  flushBatchSize: z.number().int().positive().default(100),
  retentionPolicyDays: z.number().int().positive().default(90),
});
export type KeeperFlushConfig = z.infer<typeof KeeperFlushConfigSchema>;

// ── Cosine Similarity ────────────────────────────────────
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

// ── VectorStore ──────────────────────────────────────────
export interface FlushLogEntry {
  timestamp: string;
  flushedCount: number;
  reason: string;
}

export class VectorStore {
  private entries: Map<string, MemoryEntry> = new Map();
  private config: KeeperFlushConfig;
  private flushLog: FlushLogEntry[] = [];

  constructor(config?: Partial<KeeperFlushConfig>) {
    this.config = KeeperFlushConfigSchema.parse(config ?? {});
  }

  /** Store a memory entry */
  store(input: Partial<MemoryEntry> & Pick<MemoryEntry, 'id' | 'type' | 'content' | 'agentId' | 'timestamp'>): MemoryEntry {
    const entry = MemoryEntrySchema.parse(input);
    this.entries.set(entry.id, entry);
    if (this.entries.size > this.config.maxEntries) {
      this.keeperFlush('max_entries_exceeded');
    }
    return entry;
  }

  /** Retrieve by ID */
  get(id: string): MemoryEntry | undefined {
    const entry = this.entries.get(id);
    if (entry) {
      entry.accessCount++;
      entry.lastAccessed = new Date().toISOString();
    }
    return entry;
  }

  /** Semantic search via cosine similarity */
  search(queryEmbedding: number[], opts?: { topK?: number; type?: MemoryType; agentId?: string; minImportance?: number }): { entry: MemoryEntry; score: number }[] {
    const topK = opts?.topK ?? 10;
    const results: { entry: MemoryEntry; score: number }[] = [];

    for (const entry of this.entries.values()) {
      if (opts?.type && entry.type !== opts.type) continue;
      if (opts?.agentId && entry.agentId !== opts.agentId) continue;
      if (opts?.minImportance && entry.importance < opts.minImportance) continue;
      if (!entry.embedding) continue;

      const score = cosineSimilarity(queryEmbedding, entry.embedding);
      results.push({ entry, score });
    }

    results.sort((a, b) => b.score - a.score);
    // Update access counts
    const top = results.slice(0, topK);
    for (const r of top) {
      r.entry.accessCount++;
      r.entry.lastAccessed = new Date().toISOString();
    }
    return top;
  }

  /** Get entries by tag */
  getByTag(tag: string): MemoryEntry[] {
    return Array.from(this.entries.values()).filter((e) => e.tags.includes(tag));
  }

  /** Get entries by agent */
  getByAgent(agentId: string): MemoryEntry[] {
    return Array.from(this.entries.values()).filter((e) => e.agentId === agentId);
  }

  /** Delete entry */
  delete(id: string): boolean {
    return this.entries.delete(id);
  }

  /** Apply importance decay to all entries */
  applyDecay(): number {
    let decayed = 0;
    for (const entry of this.entries.values()) {
      const oldImportance = entry.importance;
      entry.importance = Math.max(0, entry.importance - entry.decayRate);
      if (entry.importance !== oldImportance) decayed++;
    }
    return decayed;
  }

  /** KEEPER flush protocol — remove low-importance, expired entries */
  keeperFlush(reason: string = 'scheduled'): MemoryEntry[] {
    const now = Date.now();
    const flushed: MemoryEntry[] = [];
    const sorted = Array.from(this.entries.values())
      .sort((a, b) => a.importance - b.importance);

    for (const entry of sorted) {
      if (flushed.length >= this.config.flushBatchSize) break;

      const isExpired = entry.ttlMs && (now - new Date(entry.timestamp).getTime() > entry.ttlMs);
      const isLowImportance = entry.importance < this.config.importanceThreshold;
      const isOld = (now - new Date(entry.timestamp).getTime()) > this.config.retentionPolicyDays * 86_400_000;

      if (isExpired || isLowImportance || isOld) {
        this.entries.delete(entry.id);
        flushed.push(entry);
      }
    }

    this.flushLog.push({
      timestamp: new Date().toISOString(),
      flushedCount: flushed.length,
      reason,
    });

    return flushed;
  }

  /** Consolidate similar episodic memories into semantic */
  consolidate(agentId: string, similarityThreshold: number = 0.85): MemoryEntry[] {
    const episodic = this.getByAgent(agentId).filter((e) => e.type === 'episodic' && e.embedding);
    const consolidated: MemoryEntry[] = [];
    const consumed = new Set<string>();

    for (let i = 0; i < episodic.length; i++) {
      if (consumed.has(episodic[i].id)) continue;
      const cluster = [episodic[i]];

      for (let j = i + 1; j < episodic.length; j++) {
        if (consumed.has(episodic[j].id)) continue;
        const sim = cosineSimilarity(episodic[i].embedding!, episodic[j].embedding!);
        if (sim >= similarityThreshold) {
          cluster.push(episodic[j]);
          consumed.add(episodic[j].id);
        }
      }

      if (cluster.length > 1) {
        consumed.add(episodic[i].id);
        // Average embeddings
        const dim = cluster[0].embedding!.length;
        const avgEmb = new Array(dim).fill(0);
        for (const c of cluster) {
          for (let d = 0; d < dim; d++) avgEmb[d] += c.embedding![d];
        }
        for (let d = 0; d < dim; d++) avgEmb[d] /= cluster.length;

        const semantic: MemoryEntry = {
          id: crypto.randomUUID(),
          type: 'semantic',
          content: `Consolidated from ${cluster.length} episodic memories`,
          embedding: avgEmb,
          agentId,
          timestamp: new Date().toISOString(),
          importance: Math.max(...cluster.map((c) => c.importance)),
          accessCount: 0,
          tags: [...new Set(cluster.flatMap((c) => c.tags))],
          metadata: { sourceIds: cluster.map((c) => c.id), clusterSize: cluster.length },
          decayRate: 0.005,
        };
        this.entries.set(semantic.id, semantic);
        consolidated.push(semantic);

        // Remove consumed episodic entries
        for (const c of cluster) this.entries.delete(c.id);
      }
    }
    return consolidated;
  }

  /** Stats */
  getStats(): { total: number; byType: Record<string, number>; byAgent: Record<string, number>; flushLog: FlushLogEntry[] } {
    const byType: Record<string, number> = {};
    const byAgent: Record<string, number> = {};
    for (const e of this.entries.values()) {
      byType[e.type] = (byType[e.type] ?? 0) + 1;
      byAgent[e.agentId] = (byAgent[e.agentId] ?? 0) + 1;
    }
    return { total: this.entries.size, byType, byAgent, flushLog: [...this.flushLog] };
  }

  getSize(): number { return this.entries.size; }
  getConfig(): KeeperFlushConfig { return { ...this.config }; }
  getFlushLog() { return [...this.flushLog]; }
}