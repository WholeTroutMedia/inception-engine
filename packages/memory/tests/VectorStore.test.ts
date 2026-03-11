/**
 * @module memory/tests/VectorStore.test
 * @description Comprehensive test suite for VectorStore + KEEPER flush
 * Closes #80 (partial)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { VectorStore, MemoryEntrySchema, KeeperFlushConfigSchema } from '../src/VectorStore';

const uuid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

function makeEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: uuid(),
    type: 'episodic' as const,
    content: 'test memory content',
    agentId: 'agent-001',
    timestamp: now(),
    importance: 0.7,
    embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
    tags: ['test'],
    ...overrides,
  };
}

describe('VectorStore', () => {
  let store: VectorStore;

  beforeEach(() => {
    store = new VectorStore({ maxEntries: 100, importanceThreshold: 0.1 });
  });

  describe('store', () => {
    it('should store a valid memory entry', () => {
      const entry = store.store(makeEntry());
      expect(entry.type).toBe('episodic');
      expect(store.getSize()).toBe(1);
    });

    it('should reject invalid memory type', () => {
      expect(() => store.store(makeEntry({ type: 'invalid' }))).toThrow();
    });

    it('should support all memory types', () => {
      for (const type of ['episodic', 'semantic', 'procedural', 'working'] as const) {
        store.store(makeEntry({ type }));
      }
      expect(store.getSize()).toBe(4);
    });
  });

  describe('get', () => {
    it('should retrieve entry by ID and increment accessCount', () => {
      const entry = store.store(makeEntry());
      const retrieved = store.get(entry.id);
      expect(retrieved?.content).toBe('test memory content');
      expect(retrieved?.accessCount).toBe(1);
    });

    it('should return undefined for missing ID', () => {
      expect(store.get(uuid())).toBeUndefined();
    });
  });

  describe('search', () => {
    it('should find entries by cosine similarity', () => {
      store.store(makeEntry({ embedding: [1, 0, 0, 0, 0] }));
      store.store(makeEntry({ embedding: [0, 1, 0, 0, 0] }));
      store.store(makeEntry({ embedding: [0.9, 0.1, 0, 0, 0] }));
      const results = store.search([1, 0, 0, 0, 0], { topK: 2 });
      expect(results.length).toBe(2);
      expect(results[0].score).toBeGreaterThan(results[1].score);
    });

    it('should filter by type', () => {
      store.store(makeEntry({ type: 'episodic', embedding: [1, 0, 0, 0, 0] }));
      store.store(makeEntry({ type: 'semantic', embedding: [1, 0, 0, 0, 0] }));
      const results = store.search([1, 0, 0, 0, 0], { type: 'semantic' });
      expect(results.length).toBe(1);
      expect(results[0].entry.type).toBe('semantic');
    });

    it('should filter by agentId', () => {
      store.store(makeEntry({ agentId: 'a1', embedding: [1, 0, 0, 0, 0] }));
      store.store(makeEntry({ agentId: 'a2', embedding: [1, 0, 0, 0, 0] }));
      const results = store.search([1, 0, 0, 0, 0], { agentId: 'a1' });
      expect(results.length).toBe(1);
    });

    it('should skip entries without embeddings', () => {
      store.store(makeEntry({ embedding: undefined }));
      const results = store.search([1, 0, 0, 0, 0]);
      expect(results.length).toBe(0);
    });
  });

  describe('getByTag / getByAgent', () => {
    it('should filter by tag', () => {
      store.store(makeEntry({ tags: ['alpha'] }));
      store.store(makeEntry({ tags: ['beta'] }));
      expect(store.getByTag('alpha').length).toBe(1);
    });

    it('should filter by agent', () => {
      store.store(makeEntry({ agentId: 'x' }));
      store.store(makeEntry({ agentId: 'y' }));
      expect(store.getByAgent('x').length).toBe(1);
    });
  });

  describe('delete', () => {
    it('should delete entry', () => {
      const entry = store.store(makeEntry());
      expect(store.delete(entry.id)).toBe(true);
      expect(store.getSize()).toBe(0);
    });
  });

  describe('applyDecay', () => {
    it('should reduce importance by decayRate', () => {
      store.store(makeEntry({ importance: 0.5, decayRate: 0.1 }));
      const decayed = store.applyDecay();
      expect(decayed).toBe(1);
    });

    it('should not go below 0', () => {
      const entry = store.store(makeEntry({ importance: 0.05, decayRate: 0.1 }));
      store.applyDecay();
      const retrieved = store.get(entry.id);
      expect(retrieved?.importance).toBe(0);
    });
  });

  describe('keeperFlush', () => {
    it('should flush low-importance entries', () => {
      store.store(makeEntry({ importance: 0.01 }));
      store.store(makeEntry({ importance: 0.9 }));
      const flushed = store.keeperFlush('test');
      expect(flushed.length).toBe(1);
      expect(store.getSize()).toBe(1);
    });

    it('should flush expired TTL entries', () => {
      const old = new Date(Date.now() - 120_000).toISOString();
      store.store(makeEntry({ timestamp: old, ttlMs: 1000, importance: 0.9 }));
      const flushed = store.keeperFlush('ttl_check');
      expect(flushed.length).toBe(1);
    });

    it('should log flush events', () => {
      store.store(makeEntry({ importance: 0.01 }));
      store.keeperFlush('manual');
      const log = store.getFlushLog();
      expect(log.length).toBe(1);
      expect(log[0].reason).toBe('manual');
    });

    it('should auto-flush when maxEntries exceeded', () => {
      const small = new VectorStore({ maxEntries: 2, importanceThreshold: 0.5 });
      small.store(makeEntry({ importance: 0.3 }));
      small.store(makeEntry({ importance: 0.3 }));
      small.store(makeEntry({ importance: 0.9 }));
      expect(small.getFlushLog().length).toBe(1);
    });
  });

  describe('consolidate', () => {
    it('should merge similar episodic memories into semantic', () => {
      store.store(makeEntry({ agentId: 'a1', embedding: [1, 0, 0, 0, 0] }));
      store.store(makeEntry({ agentId: 'a1', embedding: [0.99, 0.01, 0, 0, 0] }));
      store.store(makeEntry({ agentId: 'a1', embedding: [0, 1, 0, 0, 0] }));
      const consolidated = store.consolidate('a1', 0.9);
      expect(consolidated.length).toBe(1);
      expect(consolidated[0].type).toBe('semantic');
    });
  });

  describe('stats', () => {
    it('should return accurate stats', () => {
      store.store(makeEntry({ type: 'episodic', agentId: 'a' }));
      store.store(makeEntry({ type: 'semantic', agentId: 'b' }));
      const stats = store.getStats();
      expect(stats.total).toBe(2);
      expect(stats.byType['episodic']).toBe(1);
      expect(stats.byAgent['b']).toBe(1);
    });
  });

  describe('schema validation', () => {
    it('should validate MemoryEntrySchema', () => {
      const result = MemoryEntrySchema.safeParse(makeEntry());
      expect(result.success).toBe(true);
    });

    it('should validate KeeperFlushConfigSchema defaults', () => {
      const result = KeeperFlushConfigSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });
});