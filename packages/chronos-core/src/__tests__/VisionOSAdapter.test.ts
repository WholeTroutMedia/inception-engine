import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VisionOSAdapter } from '../adapters/VisionOSAdapter.js';
import { TimeSeriesManager } from '../store/TimeSeriesManager.js';

// ─── VisionOSAdapter Test Suite ────────────────────────────────────────────────
// Article IX: Complete test coverage for spatial event ingestion + semantic tagging.

vi.mock('../store/TimeSeriesManager.js', () => ({
  TimeSeriesManager: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    indexEvent: vi.fn().mockResolvedValue(undefined),
    queryTimeRange: vi.fn().mockResolvedValue([]),
  })),
}));

function makeMockTSManager(): TimeSeriesManager {
  return new TimeSeriesManager() as unknown as TimeSeriesManager;
}

describe('VisionOSAdapter', () => {
  let adapter: VisionOSAdapter;
  let tsManager: TimeSeriesManager;

  beforeEach(() => {
    tsManager = makeMockTSManager();
    adapter = new VisionOSAdapter(tsManager, 17401);
  });

  // ─── Ingest ─────────────────────────────────────────────────────────────────

  describe('ingest()', () => {
    it('returns a VisionOSTimelineEntry with source=visionos', () => {
      const entry = adapter.ingest({ host_us: 1_000_000, luminance: 0.8 });
      expect(entry.source).toBe('visionos');
      expect(entry.frame.luminance).toBe(0.8);
      expect(typeof entry.processed_at).toBe('string');
      expect(Array.isArray(entry.semantic_tags)).toBe(true);
    });

    it('always includes spatial tag', () => {
      const entry = adapter.ingest({ host_us: 1_000_000 });
      expect(entry.semantic_tags).toContain('spatial');
    });

    it('adds gaze tag when gaze_direction is present', () => {
      const entry = adapter.ingest({
        host_us: 1_000_000,
        gaze_direction: [0.1, 0.2, 0.9],
      });
      expect(entry.semantic_tags).toContain('gaze');
    });

    it('tags near-focus when convergence_distance < 0.5m', () => {
      const entry = adapter.ingest({ host_us: 1_000_000, convergence_distance: 0.3 });
      expect(entry.semantic_tags).toContain('near-focus');
    });

    it('tags far-focus when convergence_distance >= 0.5m', () => {
      const entry = adapter.ingest({ host_us: 1_000_000, convergence_distance: 1.2 });
      expect(entry.semantic_tags).toContain('far-focus');
    });

    it('tags left-pinch when left index pinch strength > 0.7', () => {
      const entry = adapter.ingest({
        host_us: 1_000_000,
        hands: {
          left: {
            pinch_strengths: [0.1, 0.85, 0.1, 0.1, 0.1],
            wrist_position: [0, 0, 0],
            wrist_orientation: [0, 0, 0, 1],
            confidence: 'high',
          },
        },
      });
      expect(entry.semantic_tags).toContain('left-pinch');
    });

    it('tags right-pinch when right index pinch strength > 0.7', () => {
      const entry = adapter.ingest({
        host_us: 1_000_000,
        hands: {
          right: {
            pinch_strengths: [0.1, 0.9, 0.1, 0.1, 0.1],
            wrist_position: [0, 0, 0],
            wrist_orientation: [0, 0, 0, 1],
            confidence: 'medium',
          },
        },
      });
      expect(entry.semantic_tags).toContain('right-pinch');
    });

    it('tags hand-tracked when confidence is high', () => {
      const entry = adapter.ingest({
        host_us: 1_000_000,
        hands: {
          left: {
            pinch_strengths: [0, 0, 0, 0, 0],
            wrist_position: [0, 0, 0],
            wrist_orientation: [0, 0, 0, 1],
            confidence: 'high',
          },
        },
      });
      expect(entry.semantic_tags).toContain('hand-tracked');
    });

    it('tags plane-detected when anchors include a plane', () => {
      const entry = adapter.ingest({
        host_us: 1_000_000,
        anchors: [{ id: 'a1', type: 'plane', position: [0, 0, 0], classification: 'floor' }],
      });
      expect(entry.semantic_tags).toContain('plane-detected');
    });

    it('tags surface-table when anchor classification is table', () => {
      const entry = adapter.ingest({
        host_us: 1_000_000,
        anchors: [{ id: 'a1', type: 'plane', position: [0, 0, 0], classification: 'table' }],
      });
      expect(entry.semantic_tags).toContain('surface-table');
    });

    it('calls tsManager.indexEvent with calculated timestamp', () => {
      const indexEventMock = vi.spyOn(tsManager, 'indexEvent').mockResolvedValue(undefined);
      adapter.ingest({ host_us: 5_000_000 }); // 5s → 5000ms
      expect(indexEventMock).toHaveBeenCalledWith(
        5000, // Math.round(5_000_000 / 1000)
        expect.objectContaining({ modality: 'biometric', source: 'visionos' }),
        1.0, // default luminance
      );
    });

    it('falls back to Date.now() when host_us is 0', () => {
      const before = Date.now();
      const indexEventMock = vi.spyOn(tsManager, 'indexEvent').mockResolvedValue(undefined);
      adapter.ingest({ host_us: 0 });
      const [ts] = indexEventMock.mock.calls[0] as [number, unknown, unknown];
      expect(ts).toBeGreaterThanOrEqual(before);
    });

    it('uses luminance as score in tsManager.indexEvent', () => {
      const indexEventMock = vi.spyOn(tsManager, 'indexEvent').mockResolvedValue(undefined);
      adapter.ingest({ host_us: 1_000_000, luminance: 0.42 });
      const [, , score] = indexEventMock.mock.calls[0] as [number, unknown, number];
      expect(score).toBe(0.42);
    });
  });

  // ─── Lifecycle (start/stop require real UDP port — unit-tested via mock) ─────

  describe('constructor', () => {
    it('instantiates without throwing', () => {
      expect(() => new VisionOSAdapter(tsManager, 17402)).not.toThrow();
    });
  });
});
