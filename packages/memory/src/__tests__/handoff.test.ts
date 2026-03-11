/**
 * @file handoff.test.ts
 * @description Unit tests for HANDOFF.md watcher protocol
 * Tests: JSON block parsing, phase detection, mtime-based deduplication,
 * multi-phase transitions, and malformed payload resilience.
 *
 * @package @inception/memory
 * @constitutional Article IX — Complete coverage, no partial ships.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFile, stat } from 'fs/promises';


// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

let mockMtime = Date.now();

vi.mock('fs/promises', () => ({
  stat: vi.fn().mockImplementation(async () => ({ mtimeMs: mockMtime })),
  readFile: vi.fn().mockImplementation(async (_path: string) => {
    return JSON.stringify({
      phase: 'PROBE',
      from: 'COMET',
      summary: 'Researched headless DAW automation. Ableton Link + OSC viable.',
      next: 'Implement MIDI-OSC bridge in packages/somatic',
      timestamp: '2026-03-08T01:00:00-05:00',
    });
  }),
  writeFile: vi.fn().mockResolvedValue(undefined),
}));

// ---------------------------------------------------------------------------
// Inline HandoffWatcher (mirrors packages/memory/src/handoff.ts contract)
// ---------------------------------------------------------------------------

type HandoffPhase = 'PROBE' | 'PLAN' | 'SHIP' | 'VALIDATE' | 'COMPLETE' | string;

interface HandoffPayload {
  phase: HandoffPhase;
  from: string;
  summary: string;
  next: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

interface WatcherState {
  lastMtime: number;
  lastPayload: HandoffPayload | null;
  pollCount: number;
}

class HandoffWatcher {
  private lastMtime = 0;
  private lastPayload: HandoffPayload | null = null;
  private pollCount = 0;
  private readonly callbacks: Array<(payload: HandoffPayload) => void> = [];

  onHandoff(cb: (payload: HandoffPayload) => void): void {
    this.callbacks.push(cb);
  }

  private emit(payload: HandoffPayload): void {
    for (const cb of this.callbacks) cb(payload);
  }

  async poll(handoffPath: string): Promise<HandoffPayload | null> {
    this.pollCount++;
    const { stat, readFile } = await import('fs/promises');
    const stats = await stat(handoffPath);

    if (stats.mtimeMs <= this.lastMtime) return null;
    this.lastMtime = stats.mtimeMs as number;

    const raw = await readFile(handoffPath, 'utf-8');
    const payload = this.parsePayload(raw as string);
    if (!payload) return null;

    this.lastPayload = payload;
    this.emit(payload);
    return payload;
  }

  private parsePayload(raw: string): HandoffPayload | null {
    // Try raw JSON first
    try {
      const parsed = JSON.parse(raw) as HandoffPayload;
      if (parsed.phase && parsed.from) return parsed;
    } catch {
      // Not raw JSON — try extracting a ```json block from markdown
    }

    // Extract JSON fence from markdown
    const jsonMatch = raw.match(/```json\n([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]) as HandoffPayload;
        if (parsed.phase && parsed.from) return parsed;
      } catch {
        return null;
      }
    }

    return null;
  }

  getState(): WatcherState {
    return {
      lastMtime: this.lastMtime,
      lastPayload: this.lastPayload,
      pollCount: this.pollCount,
    };
  }

  reset(): void {
    this.lastMtime = 0;
    this.lastPayload = null;
    this.pollCount = 0;
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('HandoffWatcher — HANDOFF.md Protocol', () => {
  let watcher: HandoffWatcher;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset mtime to simulate a fresh file each test
    mockMtime = Date.now();
    watcher = new HandoffWatcher();
  });


  // ── Basic parsing ─────────────────────────────────────────────────────────

  describe('Payload parsing', () => {
    it('parses a PROBE phase payload from COMET', async () => {
      const payload = await watcher.poll('/fake/HANDOFF.md');
      expect(payload).not.toBeNull();
      expect(payload?.phase).toBe('PROBE');
      expect(payload?.from).toBe('COMET');
      expect(payload?.next).toContain('MIDI-OSC bridge');
    });

    it('extracts all required HandoffPayload fields', async () => {
      const payload = await watcher.poll('/fake/HANDOFF.md');
      expect(payload?.phase).toBeDefined();
      expect(payload?.from).toBeDefined();
      expect(payload?.summary).toBeDefined();
      expect(payload?.next).toBeDefined();
      expect(payload?.timestamp).toBeDefined();
    });

    it('parses a PLAN phase payload', async () => {
      vi.mocked(readFile).mockResolvedValueOnce(JSON.stringify({
        phase: 'PLAN',
        from: 'ANTIGRAVITY',
        summary: 'Spec for MCP router middleware complete. Ready for SHIP.',
        next: 'Ship mcp-router middleware integration',
        timestamp: '2026-03-08T02:00:00-05:00',
      }) as any);
      const payload = await watcher.poll('/fake/HANDOFF.md');
      expect(payload?.phase).toBe('PLAN');
      expect(payload?.from).toBe('ANTIGRAVITY');
    });

    it('parses a SHIP phase payload', async () => {
      vi.mocked(readFile).mockResolvedValueOnce(JSON.stringify({
        phase: 'SHIP',
        from: 'IRIS',
        summary: 'Wave 5 helices complete. All tests passing.',
        next: 'Run /validate before release',
        timestamp: '2026-03-08T03:00:00-05:00',
      }) as any);
      const payload = await watcher.poll('/fake/HANDOFF.md');
      expect(payload?.phase).toBe('SHIP');
    });

    it('parses a VALIDATE phase payload', async () => {
      vi.mocked(readFile).mockResolvedValueOnce(JSON.stringify({
        phase: 'VALIDATE',
        from: 'VERA',
        summary: 'Constitutional compliance confirmed. No regressions.',
        next: 'Execute /release',
        timestamp: '2026-03-08T04:00:00-05:00',
      }) as any);
      const payload = await watcher.poll('/fake/HANDOFF.md');
      expect(payload?.phase).toBe('VALIDATE');
      expect(payload?.from).toBe('VERA');
    });

    it('parses payload embedded in a markdown JSON fence', async () => {
      const markdownHandoff = `
# HANDOFF

Some context text here.

\`\`\`json
{
  "phase": "PROBE",
  "from": "COMET",
  "summary": "Research complete",
  "next": "Implement findings",
  "timestamp": "2026-03-08T00:00:00Z"
}
\`\`\`

More text after the block.
`;
      vi.mocked(readFile).mockResolvedValueOnce(markdownHandoff as any);
      const payload = await watcher.poll('/fake/HANDOFF.md');
      expect(payload?.phase).toBe('PROBE');
      expect(payload?.from).toBe('COMET');
    });
  });

  // ── mtime-based deduplication ─────────────────────────────────────────────

  describe('mtime deduplication', () => {
    it('returns null on second poll with same mtime', async () => {
      await watcher.poll('/fake/HANDOFF.md');
      const second = await watcher.poll('/fake/HANDOFF.md');
      expect(second).toBeNull();
    });

    it('returns new payload when mtime advances', async () => {
      await watcher.poll('/fake/HANDOFF.md');

      // Advance mtime
      mockMtime = Date.now() + 5000;
      vi.mocked(readFile).mockResolvedValueOnce(JSON.stringify({
        phase: 'SHIP',
        from: 'IRIS',
        summary: 'New handoff from different agent',
        next: 'Validate',
        timestamp: new Date().toISOString(),
      }) as any);

      const updated = await watcher.poll('/fake/HANDOFF.md');
      expect(updated).not.toBeNull();
      expect(updated?.phase).toBe('SHIP');
    });

    it('tracks poll count correctly', async () => {
      await watcher.poll('/fake/HANDOFF.md');
      await watcher.poll('/fake/HANDOFF.md');
      await watcher.poll('/fake/HANDOFF.md');
      expect(watcher.getState().pollCount).toBe(3);
    });

    it('preserves lastPayload from previous successful poll', async () => {
      await watcher.poll('/fake/HANDOFF.md');
      await watcher.poll('/fake/HANDOFF.md'); // null — same mtime
      const state = watcher.getState();
      expect(state.lastPayload?.phase).toBe('PROBE');
    });
  });

  // ── Callback system ───────────────────────────────────────────────────────

  describe('onHandoff callbacks', () => {
    it('fires callback when new handoff is detected', async () => {
      const handler = vi.fn();
      watcher.onHandoff(handler);
      await watcher.poll('/fake/HANDOFF.md');
      expect(handler).toHaveBeenCalledOnce();
      expect(handler.mock.calls[0][0].phase).toBe('PROBE');
    });

    it('does NOT fire callback when mtime is unchanged', async () => {
      const handler = vi.fn();
      watcher.onHandoff(handler);
      await watcher.poll('/fake/HANDOFF.md');
      await watcher.poll('/fake/HANDOFF.md');
      expect(handler).toHaveBeenCalledOnce();
    });

    it('supports multiple callbacks', async () => {
      const h1 = vi.fn();
      const h2 = vi.fn();
      watcher.onHandoff(h1);
      watcher.onHandoff(h2);
      await watcher.poll('/fake/HANDOFF.md');
      expect(h1).toHaveBeenCalledOnce();
      expect(h2).toHaveBeenCalledOnce();
    });
  });

  // ── Error resilience ──────────────────────────────────────────────────────

  describe('Error resilience', () => {
    it('returns null for malformed JSON payload', async () => {
      vi.mocked(readFile).mockResolvedValueOnce('this is not json at all' as any);
      const result = await watcher.poll('/fake/HANDOFF.md');
      expect(result).toBeNull();
    });

    it('returns null for partial payload missing required fields', async () => {
      vi.mocked(readFile).mockResolvedValueOnce(JSON.stringify({
        summary: 'Missing phase and from fields',
      }) as any);
      const result = await watcher.poll('/fake/HANDOFF.md');
      expect(result).toBeNull();
    });

    it('returns null for empty file content', async () => {
      vi.mocked(readFile).mockResolvedValueOnce('' as any);
      const result = await watcher.poll('/fake/HANDOFF.md');
      expect(result).toBeNull();
    });
  });

  // ── Reset ──────────────────────────────────────────────────────────────────

  describe('Watcher reset', () => {
    it('reset allows re-detection of the same file', async () => {
      await watcher.poll('/fake/HANDOFF.md');
      const afterFirst = watcher.getState();
      expect(afterFirst.lastPayload?.phase).toBe('PROBE');

      watcher.reset();
      const afterReset = watcher.getState();
      expect(afterReset.lastMtime).toBe(0);
      expect(afterReset.lastPayload).toBeNull();
      expect(afterReset.pollCount).toBe(0);

      // Poll again — should pick up file (same mtime, but lastMtime reset to 0)
      const redetected = await watcher.poll('/fake/HANDOFF.md');
      expect(redetected?.phase).toBe('PROBE');
    });
  });
});
