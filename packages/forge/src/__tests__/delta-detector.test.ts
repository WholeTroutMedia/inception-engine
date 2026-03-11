/**
 * @inception/forge — DeltaDetector Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DeltaDetector, type EntitySnapshot } from '../delta-detector.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeEntities = (n: number, baseX = 0): EntitySnapshot[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `e${i}`,
    x: baseX + i * 10,
    y: i * 5,
    name: `Entity ${i}`,
  }));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('DeltaDetector', () => {
  let detector: DeltaDetector;

  beforeEach(() => {
    detector = new DeltaDetector(0.15);
  });

  describe('constructor', () => {
    it('accepts valid threshold', () => {
      expect(() => new DeltaDetector(0)).not.toThrow();
      expect(() => new DeltaDetector(0.5)).not.toThrow();
      expect(() => new DeltaDetector(1)).not.toThrow();
    });

    it('throws on out-of-range threshold', () => {
      expect(() => new DeltaDetector(-0.1)).toThrowError(RangeError);
      expect(() => new DeltaDetector(1.1)).toThrowError(RangeError);
    });
  });

  describe('computeDelta', () => {
    it('returns 0 for identical empty arrays', () => {
      const result = detector.computeDelta([], []);
      expect(result.score).toBe(0);
      expect(result.significant).toBe(false);
      expect(result.reason).toBe('both_empty');
    });

    it('returns 1 when going from entities to empty', () => {
      const result = detector.computeDelta([], makeEntities(3));
      expect(result.score).toBe(1);
      expect(result.significant).toBe(true);
    });

    it('returns 1 when going from empty to entities', () => {
      const result = detector.computeDelta(makeEntities(3), []);
      expect(result.score).toBe(1);
      expect(result.significant).toBe(true);
    });

    it('returns low delta for identical snapshots', () => {
      const entities = makeEntities(5);
      const result = detector.computeDelta(entities, entities);
      expect(result.score).toBeCloseTo(0, 5);
      expect(result.significant).toBe(false);
    });

    it('returns high delta for completely different entity sets', () => {
      const a = makeEntities(3, 0);
      const b = [
        { id: 'x1', x: 900, y: 900 },
        { id: 'x2', x: 950, y: 950 },
      ];
      const result = detector.computeDelta(b, a);
      expect(result.score).toBeGreaterThan(0.3);
    });

    it('detects entity count change', () => {
      const small = makeEntities(2);
      const large = makeEntities(10);
      const result = detector.computeDelta(large, small);
      expect(result.score).toBeGreaterThan(0.15);
    });

    it('detects centroid movement', () => {
      const near = makeEntities(3, 0);
      const far = makeEntities(3, 500);
      const result = detector.computeDelta(far, near);
      expect(result.score).toBeGreaterThan(0.15);
    });

    it('clamps score to [0, 1]', () => {
      const entities = makeEntities(100, 0);
      const others = makeEntities(100, 999);
      const result = detector.computeDelta(others, entities);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
    });
  });

  describe('evaluate', () => {
    it('updates internal state on significant delta', () => {
      const session_id = 'test-session';
      const first = makeEntities(3, 0);
      const second = makeEntities(3, 500); // far away

      const r1 = detector.evaluate(session_id, first);
      expect(r1.significant).toBe(true); // first call: previous is empty

      const r2 = detector.evaluate(session_id, second);
      expect(r2.significant).toBe(true);
    });

    it('does not trigger checkpoint if delta is below threshold', () => {
      const session_id = 'stable-session';
      const entities = makeEntities(5, 0);
      const similar = makeEntities(5, 1); // tiny movement

      detector.evaluate(session_id, entities);
      const r2 = detector.evaluate(session_id, similar);
      expect(r2.significant).toBe(false);
    });

    it('handles multiple concurrent sessions independently', () => {
      const s1 = makeEntities(3, 0);
      const s2 = makeEntities(10, 500);

      detector.evaluate('session-1', s1);
      detector.evaluate('session-2', s2);

      // Large change for session-1, no change for session-2
      const r1 = detector.evaluate('session-1', makeEntities(3, 900));
      const r2 = detector.evaluate('session-2', [...s2]);

      expect(r1.significant).toBe(true);
      expect(r2.significant).toBe(false);
    });
  });

  describe('budget management', () => {
    it('allows checkpoints up to max', () => {
      const session_id = 'budget-test';
      expect(detector.canCheckpoint(session_id, 3)).toBe(true);

      detector.recordCheckpoint(session_id, 3);
      detector.recordCheckpoint(session_id, 3);
      detector.recordCheckpoint(session_id, 3);

      expect(detector.canCheckpoint(session_id, 3)).toBe(false);
    });

    it('returns false from recordCheckpoint when budget exhausted', () => {
      const session_id = 'budget-exhaust';
      detector.recordCheckpoint(session_id, 1);
      const result = detector.recordCheckpoint(session_id, 1);
      expect(result).toBe(false);
    });

    it('getBudgetStatus reflects checkpoint count', () => {
      const session_id = 'status-test';
      detector.recordCheckpoint(session_id, 10);
      detector.recordCheckpoint(session_id, 10);

      const status = detector.getBudgetStatus(session_id, 10);
      expect(status.checkpoint_count).toBe(2);
      expect(status.max_checkpoints).toBe(10);
      expect(status.budget_exhausted).toBe(false);
    });

    it('resetSession clears budget and snapshot state', () => {
      const session_id = 'reset-test';
      detector.evaluate(session_id, makeEntities(5));
      detector.recordCheckpoint(session_id, 5);

      detector.resetSession(session_id);

      const status = detector.getBudgetStatus(session_id, 5);
      expect(status.checkpoint_count).toBe(0);
    });

    it('reset clears all state', () => {
      detector.recordCheckpoint('s1', 10);
      detector.recordCheckpoint('s2', 10);
      detector.reset();

      expect(detector.getBudgetStatus('s1', 10).checkpoint_count).toBe(0);
      expect(detector.getBudgetStatus('s2', 10).checkpoint_count).toBe(0);
    });
  });
});
