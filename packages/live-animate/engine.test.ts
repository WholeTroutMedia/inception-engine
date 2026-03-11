/**
 * @inception/live-animate — vitest test suite
 *
 * Tests the core engine, tracker, adapters, and vision layer.
 * Run: pnpm --filter @inception/live-animate test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PlayerTracker } from './src/tracker/player-tracker.js';
import { makeEvent, InceptionEventSchema } from './src/types/inception-event.js';
import { LiveAnimateEngine } from './src/engine.js';
import { OmnibusAdapter } from './src/omnibus/adapter.js';
import type { InceptionEvent } from './src/types/inception-event.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeSportsEvent(overrides: {
    entityId?: string;
    entityName?: string;
    groupId?: string;
    x?: number;
    y?: number;
} = {}): InceptionEvent {
    return makeEvent({
        vertical: 'sports',
        type: 'nba.position',
        source: 'test',
        eventTime: new Date().toISOString(),
        entityId: overrides.entityId ?? 'player-1',
        entityName: overrides.entityName ?? 'LeBron',
        groupId: overrides.groupId ?? 'home',
        normalizedPosition: { x: overrides.x ?? 0.5, y: overrides.y ?? 0.5 },
        confidence: 0.9,
        payload: { action: 'running' },
    });
}

/** Minimal mock adapter — extends OmnibusAdapter abstract class */
class MockAdapter extends OmnibusAdapter {
    public didConnect = false;
    public didDisconnect = false;

    constructor() {
        super({ vertical: 'sports', maxFps: 60, autoReconnect: false });
    }

    protected async connect() { this.didConnect = true; }
    protected async disconnect() { this.didDisconnect = true; }

    /** Fire a test event directly into the engine listeners */
    fire(e: InceptionEvent) { this.emit('event', e); }
    fireError(err: Error)    { this.emit('error', err); }
}

// ─── InceptionEvent Schema ────────────────────────────────────────────────────

describe('InceptionEvent schema', () => {
    it('validates a well-formed sports event', () => {
        const result = InceptionEventSchema.safeParse(makeSportsEvent());
        expect(result.success).toBe(true);
    });

    it('rejects event without required fields', () => {
        const result = InceptionEventSchema.safeParse({ vertical: 'sports' });
        expect(result.success).toBe(false);
    });

    it('makeEvent auto-generates id and ingestedAt', () => {
        const e = makeSportsEvent();
        expect(e.id).toMatch(/^test-/);
        expect(e.ingestedAt).toBeTruthy();
    });

    it('rejects normalizedPosition with out-of-range values', () => {
        const e = makeSportsEvent({ x: 1.5, y: -0.1 });
        const result = InceptionEventSchema.safeParse(e);
        expect(result.success).toBe(false);
    });
});

// ─── PlayerTracker ────────────────────────────────────────────────────────────

describe('PlayerTracker', () => {
    let tracker: PlayerTracker;

    beforeEach(() => {
        tracker = new PlayerTracker({ staleThresholdMs: 5000, smoothing: 1 });
        tracker.start();
    });

    afterEach(() => {
        tracker.stop();
    });

    it('ingests an event and creates a tracked entity', () => {
        tracker.ingest(makeSportsEvent({ entityId: 'p1' }));
        expect(tracker.getEntityCount()).toBe(1);
    });

    it('updates existing entity position on second event', () => {
        tracker.ingest(makeSportsEvent({ entityId: 'p1', x: 0.3, y: 0.5 }));
        tracker.ingest(makeSportsEvent({ entityId: 'p1', x: 0.6, y: 0.7 }));
        expect(tracker.getEntityCount()).toBe(1);
        const [entity] = tracker.getSnapshot();
        // smoothingFactor: 0 → no smoothing → raw position applied directly
        expect(entity!.position.x).toBeCloseTo(0.6);
        expect(entity!.position.y).toBeCloseTo(0.7);
    });

    it('tracks multiple distinct entities', () => {
        tracker.ingest(makeSportsEvent({ entityId: 'p1' }));
        tracker.ingest(makeSportsEvent({ entityId: 'p2' }));
        tracker.ingest(makeSportsEvent({ entityId: 'p3' }));
        expect(tracker.getEntityCount()).toBe(3);
    });

    it('getSnapshot returns all tracked entities', () => {
        tracker.ingest(makeSportsEvent({ entityId: 'a' }));
        tracker.ingest(makeSportsEvent({ entityId: 'b' }));
        const snap = tracker.getSnapshot();
        expect(snap.length).toBe(2);
        expect(snap.map(e => e.id)).toContain('a');
        expect(snap.map(e => e.id)).toContain('b');
    });

    it('emits "enter" on new entity', () => {
        const enterHandler = vi.fn();
        tracker.on('enter', enterHandler);
        tracker.ingest(makeSportsEvent({ entityId: 'newguy' }));
        expect(enterHandler).toHaveBeenCalledOnce();
    });

    it('emits "update" on subsequent events for same entity', () => {
        const updateHandler = vi.fn();
        tracker.on('update', updateHandler);
        tracker.ingest(makeSportsEvent({ entityId: 'p1' })); // enter
        tracker.ingest(makeSportsEvent({ entityId: 'p1' })); // update
        expect(updateHandler).toHaveBeenCalledOnce();
    });
});

// ─── LiveAnimateEngine ────────────────────────────────────────────────────────

describe('LiveAnimateEngine', () => {
    let adapter: MockAdapter;
    let engine: LiveAnimateEngine;

    beforeEach(() => {
        adapter = new MockAdapter();
        engine = new LiveAnimateEngine({ adapter, snapshotRateMs: 50 });
    });

    afterEach(async () => {
        await engine.stop();
    });

    it('starts the adapter on engine.start()', async () => {
        await engine.start();
        expect(adapter.didConnect).toBe(true);
    });

    it('stops the adapter on engine.stop()', async () => {
        await engine.start();
        await engine.stop();
        expect(adapter.didDisconnect).toBe(true);
    });

    it('forwards adapter events to tracker', async () => {
        await engine.start();
        adapter.fire(makeSportsEvent({ entityId: 'lbj' }));
        expect(engine.getEntityCount()).toBe(1);
    });

    it('emits snapshot events at regular interval', async () => {
        await engine.start();
        adapter.fire(makeSportsEvent({ entityId: 'p1' }));

        const snapshots: unknown[] = [];
        engine.on('snapshot', (s: unknown) => snapshots.push(s));

        await new Promise(r => setTimeout(r, 200));
        expect(snapshots.length).toBeGreaterThan(1);
    });

    it('getStats returns adapter + entity + event counts', async () => {
        await engine.start();
        adapter.fire(makeSportsEvent());
        const stats = engine.getStats();
        expect(stats.entities).toBe(1);
        expect(stats.events).toBe(1);
        expect(stats.adapter).toBeTruthy();
    });

    it('relayToWebSocket sends snapshot JSON to the socket', async () => {
        await engine.start();
        adapter.fire(makeSportsEvent());

        const messages: string[] = [];
        engine.relayToWebSocket({ send: (data: string) => messages.push(data) });

        await new Promise(r => setTimeout(r, 150));
        expect(messages.length).toBeGreaterThan(0);

        const parsed = JSON.parse(messages[0]!) as { type: string; entities: unknown[] };
        expect(parsed.type).toBe('snapshot');
        expect(Array.isArray(parsed.entities)).toBe(true);
    });

    it('does not double-start if already running', async () => {
        await engine.start();
        await engine.start(); // noop
        expect(adapter.didConnect).toBe(true);
    });
});
