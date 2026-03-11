/**
 * @inception/forge — SessionWatcher Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'events';
import { DeltaDetector } from '../delta-detector.js';
import { SessionWatcher, type LiveAnimateEmitter } from '../session-watcher.js';
import type { EntitySnapshot } from '../delta-detector.js';

// ─── Fake LiveAnimateEngine ───────────────────────────────────────────────────

class FakeLiveEngine extends EventEmitter implements LiveAnimateEmitter {
  emitSnapshot(entities: EntitySnapshot[]): void {
    this.emit('snapshot', entities);
  }
}

const makeEntities = (n: number, x = 0): EntitySnapshot[] =>
  Array.from({ length: n }, (_, i) => ({ id: `e${i}`, x: x + i, y: i }));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SessionWatcher', () => {
  let engine: FakeLiveEngine;
  let detector: DeltaDetector;
  let watcher: SessionWatcher;

  beforeEach(() => {
    engine = new FakeLiveEngine();
    detector = new DeltaDetector(0.15);
    watcher = new SessionWatcher(engine, detector, {
      session_id: 'test-session',
      creator_id: 'creator:test',
      max_checkpoints: 10,
    });
  });

  describe('lifecycle', () => {
    it('starts in non-running state', () => {
      expect(watcher.isRunning).toBe(false);
    });

    it('is running after start()', () => {
      watcher.start();
      expect(watcher.isRunning).toBe(true);
    });

    it('is not running after stop()', () => {
      watcher.start();
      watcher.stop();
      expect(watcher.isRunning).toBe(false);
    });

    it('start() is idempotent', () => {
      watcher.start();
      watcher.start(); // second call should be no-op
      expect(watcher.isRunning).toBe(true);
    });

    it('emits session_end on stop()', () => {
      const handler = vi.fn();
      watcher.on('session_end', handler);
      watcher.start();
      watcher.stop();
      expect(handler).toHaveBeenCalledOnce();
      expect(handler.mock.calls[0]?.[0]).toMatchObject({
        session_id: 'test-session',
        total_checkpoints: 0,
      });
    });
  });

  describe('checkpoint emission', () => {
    it('emits checkpoint on first snapshot (delta from empty)', () => {
      const checkpoints: unknown[] = [];
      watcher.on('checkpoint', (cp) => checkpoints.push(cp));
      watcher.start();

      engine.emitSnapshot(makeEntities(3));
      expect(checkpoints).toHaveLength(1);
    });

    it('checkpoint event has correct shape', () => {
      const checkpoints: unknown[] = [];
      watcher.on('checkpoint', (cp) => checkpoints.push(cp));
      watcher.start();

      engine.emitSnapshot(makeEntities(5));
      const cp = checkpoints[0] as Record<string, unknown>;

      expect(cp).toMatchObject({
        session_id: 'test-session',
        creator_id: 'creator:test',
        checkpoint_index: 1,
      });
      expect(typeof cp['delta_score']).toBe('number');
      expect(typeof cp['timestamp']).toBe('string');
    });

    it('does not emit checkpoint for identical repeated snapshots', () => {
      const checkpoints: unknown[] = [];
      watcher.on('checkpoint', (cp) => checkpoints.push(cp));
      watcher.start();

      const entities = makeEntities(3);
      engine.emitSnapshot(entities); // first — emits (delta from empty)
      engine.emitSnapshot(entities); // identical — should NOT emit
      engine.emitSnapshot(entities); // identical — should NOT emit

      expect(checkpoints).toHaveLength(1);
    });

    it('emits checkpoint on significant spatial movement', () => {
      const checkpoints: unknown[] = [];
      watcher.on('checkpoint', (cp) => checkpoints.push(cp));
      watcher.start();

      engine.emitSnapshot(makeEntities(3, 0));   // first
      engine.emitSnapshot(makeEntities(3, 500)); // far movement → significant

      expect(checkpoints.length).toBeGreaterThanOrEqual(2);
    });

    it('increments checkpoint_index sequentially', () => {
      const indices: number[] = [];
      watcher.on('checkpoint', (cp) => indices.push((cp as { checkpoint_index: number }).checkpoint_index));
      watcher.start();

      engine.emitSnapshot(makeEntities(3, 0));
      engine.emitSnapshot(makeEntities(3, 500));
      engine.emitSnapshot(makeEntities(10, 0));

      expect(indices).toEqual(expect.arrayContaining([1]));
      if (indices.length > 1) {
        expect(indices[1]).toBe(2);
      }
    });
  });

  describe('budget enforcement', () => {
    it('emits budget_exhausted and stops after max checkpoints', () => {
      const budgetHandler = vi.fn();
      watcher = new SessionWatcher(engine, detector, {
        session_id: 'budget-test',
        creator_id: 'creator:test',
        max_checkpoints: 2,
      });
      watcher.on('budget_exhausted', budgetHandler);
      watcher.start();

      // Fire 4 very different snapshots
      engine.emitSnapshot(makeEntities(1, 0));
      engine.emitSnapshot(makeEntities(5, 500));
      engine.emitSnapshot(makeEntities(2, 0));
      engine.emitSnapshot(makeEntities(8, 800));

      expect(budgetHandler).toHaveBeenCalled();
    });
  });

  describe('stats', () => {
    it('stats reflect session state', () => {
      watcher.start();
      const stats = watcher.stats;
      expect(stats.session_id).toBe('test-session');
      expect(stats.running).toBe(true);
      expect(stats.max_checkpoints).toBe(10);
    });
  });
});
