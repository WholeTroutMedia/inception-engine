import { MemoryCompactor } from './compactor.js';

/**
 * Memory Consolidation Engine: SHARD v2
 * Provides KV Compaction, Dream Cycles, and Long-Term Crystallization.
 */
export class ShardEngine {
  private compactor = new MemoryCompactor();

  public async initialize(): Promise<void> {
    console.log('[SHARD v2] Memory consolidation engine initialized.');
  }

  public async triggerDreamCycle(): Promise<void> {
    await this.compactor.runCompactionCycle();
  }
}

export { MemoryCompactor };
export type { CompactionMetrics } from './compactor.js';
