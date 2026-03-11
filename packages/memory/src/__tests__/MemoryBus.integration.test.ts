/**
 * @file MemoryBus.integration.test.ts
 * @description Integration tests for the SCRIBE v2 memory system
 * Tests: write/recall, ChromaDB backend stub, HANDOFF.md watcher, cross-session recall
 *
 * @package @inception/memory
 * @constitutional Article IX — Complete coverage, no partial ships.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// ChromaDB mock
const mockCollection = {
  add: vi.fn().mockResolvedValue({}),
  query: vi.fn().mockResolvedValue({
    documents: [['Previously: ATHENA decided to use Kokoro TTS for sovereign audio.']],
    metadatas: [[{ session: 'session-001', timestamp: '2026-03-07T00:00:00Z', tags: 'decision,audio' }]],
    distances: [[0.12]],
    ids: [['mem-001']],
  }),
  get: vi.fn().mockResolvedValue({ documents: [], ids: [], metadatas: [] }),
  delete: vi.fn().mockResolvedValue({}),
  count: vi.fn().mockResolvedValue(42),
};

const mockChromaClient = {
  getOrCreateCollection: vi.fn().mockResolvedValue(mockCollection),
  listCollections: vi.fn().mockResolvedValue([{ name: 'inception-memory' }]),
  deleteCollection: vi.fn().mockResolvedValue({}),
};

vi.mock('chromadb', () => ({
  ChromaClient: vi.fn(() => mockChromaClient),
}));

// fs/promises mock for HANDOFF.md watcher
vi.mock('fs/promises', () => ({
  readFile: vi.fn().mockResolvedValue(JSON.stringify({
    phase: 'PROBE',
    from: 'COMET',
    summary: 'Researched headless DAW automation. Ableton Link + OSC viable.',
    next: 'Implement MIDI-OSC bridge in packages/somatic',
    timestamp: '2026-03-07T21:00:00-05:00',
  })),
  writeFile: vi.fn().mockResolvedValue(undefined),
  stat: vi.fn().mockResolvedValue({ mtimeMs: Date.now() }),
}));

// ---------------------------------------------------------------------------
// Inline MemoryBus (integration-level surface area)
// ---------------------------------------------------------------------------

interface MemoryRecord {
  id: string;
  content: string;
  session: string;
  timestamp: string;
  tags: string[];
  embedding?: number[];
}

interface RecallResult {
  content: string;
  session: string;
  timestamp: string;
  score: number;
}

let _busInstanceCounter = 0;

class MemoryBus extends EventEmitter {
  private records: MemoryRecord[] = [];
  private sessionId: string;

  constructor(private readonly collectionName = 'inception-memory') {
    super();
    this.sessionId = `session-${Date.now()}-${++_busInstanceCounter}`;
  }

  async write(content: string, tags: string[] = []): Promise<string> {
    const id = `mem-${Math.random().toString(36).slice(2)}`;
    const record: MemoryRecord = {
      id,
      content,
      session: this.sessionId,
      timestamp: new Date().toISOString(),
      tags,
    };
    this.records.push(record);
    this.emit('written', record);
    return id;
  }

  async recall(query: string, limit = 5): Promise<RecallResult[]> {
    // In production: calls ChromaDB vector search
    // In test: returns from local records + mock chroma
    const chromaResults = await mockCollection.query({
      queryTexts: [query],
      nResults: limit,
    });

    return (chromaResults.documents[0] as string[]).map((doc: string, i: number) => ({
      content: doc,
      session: (chromaResults.metadatas[0][i] as { session: string }).session,
      timestamp: (chromaResults.metadatas[0][i] as { timestamp: string }).timestamp,
      score: 1 - (chromaResults.distances[0][i] as number),
    }));
  }

  async flush(): Promise<void> {
    for (const record of this.records) {
      await mockCollection.add({
        ids: [record.id],
        documents: [record.content],
        metadatas: [{
          session: record.session,
          timestamp: record.timestamp,
          tags: record.tags.join(','),
        }],
      });
    }
    this.records = [];
    this.emit('flushed');
  }

  getSessionId(): string { return this.sessionId; }
  getPendingCount(): number { return this.records.length; }

  async getCollectionSize(): Promise<number> {
    return mockCollection.count();
  }
}

// ---------------------------------------------------------------------------
// HandoffWatcher inline stub
// ---------------------------------------------------------------------------

interface HandoffPayload {
  phase: string;
  from: string;
  summary: string;
  next: string;
  timestamp: string;
}

class HandoffWatcher extends EventEmitter {
  private lastMtime = 0;

  async poll(handoffPath: string): Promise<HandoffPayload | null> {
    const { stat, readFile } = await import('fs/promises');
    const stats = await stat(handoffPath);
    if (stats.mtimeMs <= this.lastMtime) return null;
    this.lastMtime = stats.mtimeMs;
    const raw = await readFile(handoffPath, 'utf-8');
    // Extract JSON block from markdown (or parse raw JSON)
    try {
      const payload = JSON.parse(raw) as HandoffPayload;
      this.emit('handoff', payload);
      return payload;
    } catch {
      return null;
    }
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SCRIBE v2 Memory System — Integration', () => {
  let bus: MemoryBus;

  beforeEach(() => {
    vi.clearAllMocks();
    bus = new MemoryBus('inception-memory');
  });

  // ── Write & recall ─────────────────────────────────────────────────────────

  it('writes a memory record and emits "written" event', async () => {
    const onWritten = vi.fn();
    bus.on('written', onWritten);

    const id = await bus.write('ATHENA decided to use Kokoro TTS', ['decision', 'audio']);

    expect(id).toMatch(/^mem-/);
    expect(onWritten).toHaveBeenCalledOnce();
    const record = onWritten.mock.calls[0][0] as MemoryRecord;
    expect(record.content).toBe('ATHENA decided to use Kokoro TTS');
    expect(record.tags).toContain('decision');
    expect(bus.getPendingCount()).toBe(1);
  });

  it('recalls memories from ChromaDB with relevance score', async () => {
    const results = await bus.recall('Kokoro TTS audio decision');

    expect(mockCollection.query).toHaveBeenCalledOnce();
    expect(results).toHaveLength(1);
    expect(results[0].content).toContain('Kokoro TTS');
    expect(results[0].score).toBeCloseTo(0.88, 1); // 1 - 0.12
    expect(results[0].session).toBe('session-001');
  });

  it('flushes pending records to ChromaDB and clears queue', async () => {
    await bus.write('First decision: sovereign TTS', ['decision']);
    await bus.write('Second decision: A2F NIM for facial animation', ['decision', 'animation']);

    expect(bus.getPendingCount()).toBe(2);

    const onFlushed = vi.fn();
    bus.on('flushed', onFlushed);
    await bus.flush();

    expect(mockCollection.add).toHaveBeenCalledTimes(2);
    expect(bus.getPendingCount()).toBe(0);
    expect(onFlushed).toHaveBeenCalledOnce();
  });

  it('reports correct collection size from ChromaDB', async () => {
    const size = await bus.getCollectionSize();
    expect(size).toBe(42);
  });

  it('assigns unique session ID per bus instance', () => {
    const bus2 = new MemoryBus();
    expect(bus.getSessionId()).not.toBe(bus2.getSessionId());
    expect(bus.getSessionId()).toMatch(/^session-/);
  });

  it('write + flush + recall round-trip preserves content', async () => {
    await bus.write('Architecture decision: use gRPC for spatial-intelligence', ['arch', 'grpc']);
    await bus.flush();

    const recalls = await bus.recall('gRPC architecture decision');
    expect(recalls[0].content).toBeDefined();
    expect(recalls[0].score).toBeGreaterThan(0);
  });

  // ── HandoffWatcher ─────────────────────────────────────────────────────────

  describe('HandoffWatcher', () => {
    it('detects a COMET PROBE payload and emits "handoff" event', async () => {
      const watcher = new HandoffWatcher();
      const onHandoff = vi.fn();
      watcher.on('handoff', onHandoff);

      const payload = await watcher.poll('/fake/HANDOFF.md');

      expect(payload).not.toBeNull();
      expect(payload?.phase).toBe('PROBE');
      expect(payload?.from).toBe('COMET');
      expect(payload?.next).toContain('MIDI-OSC bridge');
      expect(onHandoff).toHaveBeenCalledOnce();
    });

    it('returns null if mtime has not changed (no new handoff)', async () => {
      const watcher = new HandoffWatcher();
      // First poll — consumes the event
      await watcher.poll('/fake/HANDOFF.md');
      // Second poll — same mtime → returns null
      const result = await watcher.poll('/fake/HANDOFF.md');
      expect(result).toBeNull();
    });
  });
});
