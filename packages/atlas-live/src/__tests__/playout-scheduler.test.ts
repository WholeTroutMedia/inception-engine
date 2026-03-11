/**
 * @file playout-scheduler.test.ts
 * @description Unit tests for ATLAS LIVE RundownManager and playout scheduling.
 * This file ONLY imports from playout-scheduler.ts which has NO engine.ts dependency.
 *
 * @constitutional Article IX — No MVPs. Ship complete or don't ship.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  RundownSchema,
  RundownItemSchema,
  createRundown,
  getRundownState,
  stopRundown,
  listRundowns,
  generateRundownHtml,
} from '../playout-scheduler.js';

// ---------------------------------------------------------------------------
// Shared Rundown Fixture
// ---------------------------------------------------------------------------

const futureTime = new Date(Date.now() + 120_000).toISOString();

const SAMPLE_ITEM = {
  id: 'item-001',
  label: 'Live Open Slate',
  planned_at: futureTime,
  duration_seconds: 10,
  auto_play: true,
  action: 'play' as const,
  template_name: 'inception/slate',
  channel: 1,
  layer: 20,
  on_complete: 'stop' as const,
};

const SAMPLE_RUNDOWN = {
  rundown_id: 'rd-test-001',
  show_name: 'APEX Sports Live',
  date: '2026-03-09',
  timezone: 'America/New_York',
  items: [SAMPLE_ITEM],
};

// ---------------------------------------------------------------------------
// RundownItemSchema — Zod Validation
// ---------------------------------------------------------------------------

describe('RundownItemSchema — Zod Validation', () => {
  it('parses a valid item successfully', () => {
    const result = RundownItemSchema.safeParse(SAMPLE_ITEM);
    expect(result.success).toBe(true);
  });

  it('applies defaults: duration_seconds=10, auto_play=true, on_complete=stop', () => {
    const minimal = {
      id: 'x',
      label: 'Intro',
      planned_at: futureTime,
      action: 'play',
    };
    const result = RundownItemSchema.parse(minimal);
    expect(result.duration_seconds).toBe(10);
    expect(result.auto_play).toBe(true);
    expect(result.on_complete).toBe('stop');
  });

  it('rejects unknown action type', () => {
    const bad = { ...SAMPLE_ITEM, action: 'reboot' };
    const result = RundownItemSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it('rejects duration_seconds below 1', () => {
    const bad = { ...SAMPLE_ITEM, duration_seconds: 0 };
    const result = RundownItemSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it('allows optional fields to be omitted', () => {
    const noOptionals = { id: 'y', label: 'Segment', planned_at: futureTime, action: 'cue' };
    const result = RundownItemSchema.safeParse(noOptionals);
    expect(result.success).toBe(true);
  });

  it('validates all valid action types', () => {
    for (const action of ['play', 'stop', 'update', 'take', 'clear', 'cue'] as const) {
      const result = RundownItemSchema.safeParse({ ...SAMPLE_ITEM, id: `id-${action}`, action });
      expect(result.success, `action "${action}" should be valid`).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// RundownSchema — Zod Validation
// ---------------------------------------------------------------------------

describe('RundownSchema — Zod Validation', () => {
  it('parses a valid rundown', () => {
    const result = RundownSchema.safeParse(SAMPLE_RUNDOWN);
    expect(result.success).toBe(true);
  });

  it('requires at least 1 item', () => {
    const bad = { ...SAMPLE_RUNDOWN, items: [] };
    const result = RundownSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it('defaults timezone to America/New_York', () => {
    const noTZ = { ...SAMPLE_RUNDOWN, timezone: undefined };
    const result = RundownSchema.parse(noTZ);
    expect(result.timezone).toBe('America/New_York');
  });

  it('accepts multiple items', () => {
    const multi = {
      ...SAMPLE_RUNDOWN,
      rundown_id: 'rd-multi',
      items: [
        SAMPLE_ITEM,
        { ...SAMPLE_ITEM, id: 'item-002', label: 'Segment 2', action: 'cue' as const },
      ],
    };
    const result = RundownSchema.safeParse(multi);
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// createRundown + RundownManager — Lifecycle
// ---------------------------------------------------------------------------

describe('RundownManager — Lifecycle', () => {
  const mockExec = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a RundownManager with pending items', () => {
    createRundown({ ...SAMPLE_RUNDOWN, rundown_id: 'rd-create-001' }, mockExec);
    const state = getRundownState('rd-create-001');
    expect(state).not.toBeNull();
    expect(state!.show_name).toBe('APEX Sports Live');
    expect(state!.is_running).toBe(false);
    expect(state!.items[0].status).toBe('pending');
  });

  it('start() sets is_running = true and records started_at', () => {
    const mgr = createRundown({ ...SAMPLE_RUNDOWN, rundown_id: 'rd-start-001' }, mockExec);
    const state = mgr.start();
    expect(state.is_running).toBe(true);
    expect(state.started_at).toBeTruthy();
    mgr.stop();
  });

  it('start() is idempotent — calling twice returns same running state', () => {
    const mgr = createRundown({ ...SAMPLE_RUNDOWN, rundown_id: 'rd-idempotent-001' }, mockExec);
    const s1 = mgr.start();
    const s2 = mgr.start();
    expect(s1.is_running).toBe(true);
    expect(s2.is_running).toBe(true);
    mgr.stop();
  });

  it('stop() sets is_running = false and records completed_at', () => {
    const mgr = createRundown({ ...SAMPLE_RUNDOWN, rundown_id: 'rd-stop-001' }, mockExec);
    mgr.start();
    mgr.stop();
    const state = mgr.getState();
    expect(state.is_running).toBe(false);
    expect(state.completed_at).toBeTruthy();
  });

  it('stopRundown() helper stops and returns true', () => {
    createRundown({ ...SAMPLE_RUNDOWN, rundown_id: 'rd-helper-001' }, mockExec);
    const result = stopRundown('rd-helper-001');
    expect(result).toBe(true);
  });

  it('stopRundown() returns false for unknown id', () => {
    expect(stopRundown('no-such-rundown-xyz123')).toBe(false);
  });

  it('listRundowns() includes newly created rundown IDs', () => {
    createRundown({ ...SAMPLE_RUNDOWN, rundown_id: 'rd-list-001' }, mockExec);
    createRundown({ ...SAMPLE_RUNDOWN, rundown_id: 'rd-list-002' }, mockExec);
    const list = listRundowns();
    expect(list).toContain('rd-list-001');
    expect(list).toContain('rd-list-002');
  });
});

// ---------------------------------------------------------------------------
// skip() and trigger()
// ---------------------------------------------------------------------------

describe('RundownManager — skip() and trigger()', () => {
  const mockExec = vi.fn().mockResolvedValue(undefined);

  it('skip() marks a pending item as SKIPPED', () => {
    const mgr = createRundown(
      { ...SAMPLE_RUNDOWN, rundown_id: 'rd-skip-001', items: [{ ...SAMPLE_ITEM, id: 'sk-1', planned_at: futureTime }] },
      mockExec
    );
    mgr.start();
    const result = mgr.skip('sk-1');
    expect(result).toBe(true);
    expect(mgr.getState().items[0].status).toBe('skipped');
    mgr.stop();
  });

  it('skip() returns false for nonexistent item', () => {
    const mgr = createRundown({ ...SAMPLE_RUNDOWN, rundown_id: 'rd-skip-002' }, mockExec);
    expect(mgr.skip('nonexistent')).toBe(false);
  });

  it('trigger() returns true for an existing item', () => {
    const mgr = createRundown({ ...SAMPLE_RUNDOWN, rundown_id: 'rd-trigger-001' }, mockExec);
    expect(mgr.trigger('item-001')).toBe(true);
  });

  it('trigger() returns false for nonexistent item', () => {
    const mgr = createRundown({ ...SAMPLE_RUNDOWN, rundown_id: 'rd-trigger-002' }, mockExec);
    expect(mgr.trigger('bogus-id')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// onUpdate callback
// ---------------------------------------------------------------------------

describe('RundownManager — onUpdate callback', () => {
  const mockExec = vi.fn().mockResolvedValue(undefined);

  it('fires callback on start()', () => {
    const cb = vi.fn();
    const mgr = createRundown({ ...SAMPLE_RUNDOWN, rundown_id: 'rd-cb-001' }, mockExec, cb);
    mgr.start();
    expect(cb).toHaveBeenCalled();
    const lastState = cb.mock.calls[cb.mock.calls.length - 1][0] as { is_running: boolean };
    expect(lastState.is_running).toBe(true);
    mgr.stop();
  });

  it('fires callback on stop()', () => {
    const cb = vi.fn();
    const mgr = createRundown({ ...SAMPLE_RUNDOWN, rundown_id: 'rd-cb-002' }, mockExec, cb);
    mgr.start();
    cb.mockClear();
    mgr.stop();
    expect(cb).toHaveBeenCalled();
    const lastState = cb.mock.calls[cb.mock.calls.length - 1][0] as { is_running: boolean };
    expect(lastState.is_running).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// generateRundownHtml
// ---------------------------------------------------------------------------

describe('generateRundownHtml', () => {
  it('generates valid HTML with show name', () => {
    const html = generateRundownHtml(SAMPLE_RUNDOWN);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('APEX Sports Live');
  });

  it('shows item count in meta line', () => {
    const html = generateRundownHtml(SAMPLE_RUNDOWN);
    expect(html).toContain('1 items');
  });

  it('includes item label', () => {
    const html = generateRundownHtml(SAMPLE_RUNDOWN);
    expect(html).toContain('Live Open Slate');
  });

  it('shows PLAY action uppercased', () => {
    const html = generateRundownHtml(SAMPLE_RUNDOWN);
    expect(html).toContain('PLAY');
  });

  it('shows AUTO badge for auto_play items', () => {
    const html = generateRundownHtml(SAMPLE_RUNDOWN);
    expect(html).toContain('AUTO');
  });

  it('shows show date in output', () => {
    const html = generateRundownHtml(SAMPLE_RUNDOWN);
    expect(html).toContain('2026-03-09');
  });

  it('generates multi-item rundown HTML', () => {
    const multi = {
      ...SAMPLE_RUNDOWN,
      rundown_id: 'rd-html-multi',
      items: [
        SAMPLE_ITEM,
        { ...SAMPLE_ITEM, id: 'item-002', label: 'Segment B', action: 'take' as const, auto_play: false },
      ],
    };
    const html = generateRundownHtml(multi);
    expect(html).toContain('Segment B');
    expect(html).toContain('TAKE');
    expect(html).toContain('CUE'); // non-auto_play item shows CUE badge
  });
});
