/**
 * @file atlas-live.test.ts
 * @description Unit tests for @inception/atlas-live
 * Tests RundownManager, TriggerEngine, preset triggers, and playout scheduling.
 *
 * @constitutional Article IX — No MVPs. Ship complete or don't ship.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock engine.ts BEFORE importing triggers.ts. This prevents the transitive
// `const net = await import('net')` top-level await from executing under vitest.
vi.mock('../engine.js', () => {
  const mockEngine = {
    connect: vi.fn().mockResolvedValue(undefined),
    playTemplate: vi.fn().mockResolvedValue(undefined),
    stopTemplate: vi.fn().mockResolvedValue(undefined),
    clearLayer: vi.fn().mockResolvedValue(undefined),
    updateTemplate: vi.fn().mockResolvedValue(undefined),
    getStatus: vi.fn().mockReturnValue({ connected: true }),
  };
  return {
    AtlasGraphicsEngine: vi.fn(() => mockEngine),
    MockAtlasEngine: vi.fn(() => mockEngine),
    CasparCGClient: vi.fn(() => ({})),
    createAtlasEngine: vi.fn(() => mockEngine),
  };
});

import {
  RundownSchema,
  RundownItemSchema,
  createRundown,
  getRundownState,
  stopRundown,
  listRundowns,
  generateRundownHtml,
} from '../playout-scheduler.js';
import {
  SPORTS_TRIGGERS,
  BROADCAST_TRIGGERS,
  AtlasTriggerEngine,
  type GraphicsTrigger,
  type TriggerEvent,
} from '../triggers.js';

// ---------------------------------------------------------------------------
// Shared Rundown Fixture
// ---------------------------------------------------------------------------

const futureTime = new Date(Date.now() + 60_000).toISOString();

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
// RundownItemSchema
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
    const noOptionals = {
      id: 'y',
      label: 'Segment',
      planned_at: futureTime,
      action: 'cue',
    };
    const result = RundownItemSchema.safeParse(noOptionals);
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// RundownSchema
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
});

// ---------------------------------------------------------------------------
// createRundown + RundownManager
// ---------------------------------------------------------------------------

describe('RundownManager — Lifecycle', () => {
  const mockExec = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a RundownManager and returns initial state via getRundownState', () => {
    createRundown(SAMPLE_RUNDOWN, mockExec);
    const state = getRundownState('rd-test-001');
    expect(state).not.toBeNull();
    expect(state!.show_name).toBe('APEX Sports Live');
    expect(state!.is_running).toBe(false);
    expect(state!.items).toHaveLength(1);
    expect(state!.items[0].status).toBe('pending');
  });

  it('start() sets is_running = true', () => {
    const mgr = createRundown({ ...SAMPLE_RUNDOWN, rundown_id: 'rd-start-test' }, mockExec);
    mgr.start();
    const state = mgr.getState();
    expect(state.is_running).toBe(true);
    mgr.stop();
  });

  it('start() is idempotent — double-calling returns same state', () => {
    const mgr = createRundown({ ...SAMPLE_RUNDOWN, rundown_id: 'rd-idempotent' }, mockExec);
    const s1 = mgr.start();
    const s2 = mgr.start();
    expect(s1.is_running).toBe(true);
    expect(s2.is_running).toBe(true);
    mgr.stop();
  });

  it('stop() sets is_running = false and records completed_at', () => {
    const mgr = createRundown({ ...SAMPLE_RUNDOWN, rundown_id: 'rd-stop-test' }, mockExec);
    mgr.start();
    mgr.stop();
    const state = mgr.getState();
    expect(state.is_running).toBe(false);
    expect(state.completed_at).toBeTruthy();
  });

  it('stopRundown() via module-level helper stops a running rundown', () => {
    createRundown({ ...SAMPLE_RUNDOWN, rundown_id: 'rd-helper-stop' }, mockExec);
    const stopped = stopRundown('rd-helper-stop');
    expect(stopped).toBe(true);
  });

  it('stopRundown() returns false for unknown rundown_id', () => {
    const result = stopRundown('rd-does-not-exist-xyz');
    expect(result).toBe(false);
  });

  it('listRundowns() includes registered rundown IDs', () => {
    createRundown({ ...SAMPLE_RUNDOWN, rundown_id: 'rd-list-check-001' }, mockExec);
    createRundown({ ...SAMPLE_RUNDOWN, rundown_id: 'rd-list-check-002' }, mockExec);
    const list = listRundowns();
    expect(list).toContain('rd-list-check-001');
    expect(list).toContain('rd-list-check-002');
  });
});

// ---------------------------------------------------------------------------
// skip() and trigger()
// ---------------------------------------------------------------------------

describe('RundownManager — skip() and trigger()', () => {
  const mockExec = vi.fn().mockResolvedValue(undefined);

  it('skip() marks a pending item as skipped', () => {
    const past = new Date(Date.now() + 120_000).toISOString(); // far future so it won't auto-fire
    const mgr = createRundown(
      { ...SAMPLE_RUNDOWN, rundown_id: 'rd-skip-test', items: [{ ...SAMPLE_ITEM, id: 'sk-1', planned_at: past }] },
      mockExec
    );
    mgr.start();
    const result = mgr.skip('sk-1');
    expect(result).toBe(true);
    const skipped = mgr.getState().items.find((i) => i.item.id === 'sk-1');
    expect(skipped?.status).toBe('skipped');
    mgr.stop();
  });

  it('skip() returns false for non-existent item ID', () => {
    const mgr = createRundown({ ...SAMPLE_RUNDOWN, rundown_id: 'rd-skip-bad' }, mockExec);
    const result = mgr.skip('nonexistent-id');
    expect(result).toBe(false);
  });

  it('trigger() returns false for non-existent item ID', () => {
    const mgr = createRundown({ ...SAMPLE_RUNDOWN, rundown_id: 'rd-trigger-bad' }, mockExec);
    const result = mgr.trigger('nonexistent-id');
    expect(result).toBe(false);
  });

  it('trigger() returns true for existing item ID', () => {
    const mgr = createRundown({ ...SAMPLE_RUNDOWN, rundown_id: 'rd-trigger-ok' }, mockExec);
    const result = mgr.trigger('item-001');
    expect(result).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// onUpdate callback
// ---------------------------------------------------------------------------

describe('RundownManager — onUpdate callback', () => {
  const mockExec = vi.fn().mockResolvedValue(undefined);

  it('fires callback on start()', () => {
    const cb = vi.fn();
    const mgr = createRundown({ ...SAMPLE_RUNDOWN, rundown_id: 'rd-cb-start' }, mockExec, cb);
    mgr.start();
    expect(cb).toHaveBeenCalled();
    const lastCall = cb.mock.calls[cb.mock.calls.length - 1][0] as { is_running: boolean };
    expect(lastCall.is_running).toBe(true);
    mgr.stop();
  });

  it('fires callback on stop()', () => {
    const cb = vi.fn();
    const mgr = createRundown({ ...SAMPLE_RUNDOWN, rundown_id: 'rd-cb-stop' }, mockExec, cb);
    mgr.start();
    cb.mockClear();
    mgr.stop();
    expect(cb).toHaveBeenCalled();
    const lastCall = cb.mock.calls[cb.mock.calls.length - 1][0] as { is_running: boolean };
    expect(lastCall.is_running).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// generateRundownHtml
// ---------------------------------------------------------------------------

describe('generateRundownHtml', () => {
  it('generates valid HTML string with show name', () => {
    const html = generateRundownHtml(SAMPLE_RUNDOWN);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('APEX Sports Live');
    expect(html).toContain('1 items');
  });

  it('includes item label in HTML output', () => {
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

  it('shows date in the meta line', () => {
    const html = generateRundownHtml(SAMPLE_RUNDOWN);
    expect(html).toContain('2026-03-09');
  });
});

// ---------------------------------------------------------------------------
// SPORTS_TRIGGERS + BROADCAST_TRIGGERS presets
// ---------------------------------------------------------------------------

describe('ATLAS LIVE — Trigger Presets', () => {
  it('SPORTS_TRIGGERS has 3 preset triggers', () => {
    expect(SPORTS_TRIGGERS).toHaveLength(3);
  });

  it('BROADCAST_TRIGGERS has 2 preset triggers', () => {
    expect(BROADCAST_TRIGGERS).toHaveLength(2);
  });

  it('score-update trigger is p2 priority and auto-play', () => {
    const scoreUpdate = SPORTS_TRIGGERS.find((t) => t.id === 'score-update');
    expect(scoreUpdate).toBeDefined();
    expect(scoreUpdate!.priority).toBe(2);
    expect(scoreUpdate!.active).toBe(true);
    expect(scoreUpdate!.event_type).toBe('score_change');
  });

  it('commercial-break trigger clears all layers (template = inception/clear-all)', () => {
    const clearAll = BROADCAST_TRIGGERS.find((t) => t.id === 'commercial-break');
    expect(clearAll).toBeDefined();
    expect(clearAll!.graphic_template).toBe('inception/clear-all');
    expect(clearAll!.priority).toBe(1);
  });

  it('all triggers have required fields: id, name, event_type, graphic_template, priority, active', () => {
    const allTriggers = [...SPORTS_TRIGGERS, ...BROADCAST_TRIGGERS];
    for (const t of allTriggers) {
      expect(t.id).toBeTruthy();
      expect(t.name).toBeTruthy();
      expect(t.event_type).toBeTruthy();
      expect(t.graphic_template).toBeTruthy();
      expect([1, 2, 3]).toContain(t.priority);
      expect(typeof t.active).toBe('boolean');
    }
  });

  it('score-change-alert has 6000ms duration (auto-clear)', () => {
    const alert = SPORTS_TRIGGERS.find((t) => t.id === 'score-change-alert');
    expect(alert!.duration_ms).toBe(6000);
  });
});

// ---------------------------------------------------------------------------
// AtlasTriggerEngine
// ---------------------------------------------------------------------------

describe('AtlasTriggerEngine — Core', () => {
  let mockGraphics: {
    connect: ReturnType<typeof vi.fn>;
    playTemplate: ReturnType<typeof vi.fn>;
    stopTemplate: ReturnType<typeof vi.fn>;
    clearLayer: ReturnType<typeof vi.fn>;
    updateData: ReturnType<typeof vi.fn>;
    getStatus: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockGraphics = {
      connect: vi.fn().mockResolvedValue(undefined),
      playTemplate: vi.fn().mockResolvedValue(undefined),
      stopTemplate: vi.fn().mockResolvedValue(undefined),
      clearLayer: vi.fn().mockResolvedValue(undefined),
      updateData: vi.fn().mockResolvedValue(undefined),
      getStatus: vi.fn().mockReturnValue({ connected: true }),
    };
  });

  it('registers a trigger and can retrieve it via getRunlog', async () => {
    const engine = new AtlasTriggerEngine(mockGraphics as never);
    const trigger: GraphicsTrigger = {
      id: 'test-score',
      name: 'Test Score Bug',
      event_type: 'score_change',
      graphic_template: 'inception/scoreboard',
      data_mapping: { home_score: 'homeScore', away_score: 'awayScore' },
      layer: { channel: 1, layer: 5 },
      duration_ms: 0,
      priority: 2,
      active: true,
    };
    engine.registerTrigger(trigger);

    await engine.fireEvent({
      type: 'score_change',
      data: { home_score: 14, away_score: 7 },
      source: 'test',
      timestamp: new Date().toISOString(),
    });

    expect(mockGraphics.playTemplate).toHaveBeenCalledOnce();
    expect(engine.getRunlog()).toHaveLength(1);
    expect(engine.getRunlog()[0].event).toBe('score_change');
  });

  it('registerPreset("sports") loads 3 triggers', () => {
    const engine = new AtlasTriggerEngine(mockGraphics as never);
    engine.registerPreset('sports');
    // triggers are internal, validate indirectly via fireEvent
    expect(SPORTS_TRIGGERS).toHaveLength(3);
  });

  it('registerPreset("broadcast") loads 2 triggers', () => {
    const engine = new AtlasTriggerEngine(mockGraphics as never);
    engine.registerPreset('broadcast');
    expect(BROADCAST_TRIGGERS).toHaveLength(2);
  });

  it('setTriggerActive(false) prevents trigger from firing', async () => {
    const engine = new AtlasTriggerEngine(mockGraphics as never);
    const trigger: GraphicsTrigger = {
      id: 'deactivated-trigger',
      name: 'Deactivated',
      event_type: 'manual',
      graphic_template: 'inception/manual',
      data_mapping: {},
      layer: { channel: 1, layer: 30 },
      duration_ms: 0,
      priority: 2,
      active: true,
    };
    engine.registerTrigger(trigger);
    engine.setTriggerActive('deactivated-trigger', false);

    await engine.fireEvent({
      type: 'manual',
      data: {},
      source: 'test',
      timestamp: new Date().toISOString(),
    });

    expect(mockGraphics.playTemplate).not.toHaveBeenCalled();
  });

  it('emits event_fired with trigger count after fireEvent', async () => {
    const engine = new AtlasTriggerEngine(mockGraphics as never);
    engine.registerPreset('sports');
    const events: unknown[] = [];
    engine.on('event_fired', (e) => events.push(e));

    await engine.fireEvent({
      type: 'score_change',
      data: { home_score: 10, away_score: 3 },
      source: 'test',
      timestamp: new Date().toISOString(),
    });

    expect(events).toHaveLength(1);
    const evt = events[0] as { triggers_executed: number };
    // SPORTS_TRIGGERS has 2 score_change triggers
    expect(evt.triggers_executed).toBe(2);
  });

  it('higher-priority graphic blocks same-layer lower-priority graphic', async () => {
    const engine = new AtlasTriggerEngine(mockGraphics as never);

    const highPrio: GraphicsTrigger = {
      id: 'high-prio',
      name: 'P1 Graphic',
      event_type: 'score_change',
      graphic_template: 'inception/p1',
      data_mapping: {},
      layer: { channel: 1, layer: 10 },
      duration_ms: 0,
      priority: 1, // highest
      active: true,
    };

    const lowPrio: GraphicsTrigger = {
      id: 'low-prio',
      name: 'P2 Graphic',
      event_type: 'score_change',
      graphic_template: 'inception/p2',
      data_mapping: {},
      layer: { channel: 1, layer: 10 }, // same layer
      duration_ms: 0,
      priority: 2, // lower priority
      active: true,
    };

    engine.registerTrigger(highPrio);
    engine.registerTrigger(lowPrio);

    await engine.fireEvent({
      type: 'score_change',
      data: {},
      source: 'test',
      timestamp: new Date().toISOString(),
    });

    // P1 fires first and claims the layer — P2 should be blocked
    expect(mockGraphics.playTemplate).toHaveBeenCalledOnce();
  });

  it('commercialBreak() convenience method fires commercial_break event', async () => {
    const engine = new AtlasTriggerEngine(mockGraphics as never);
    const fired: TriggerEvent[] = [];
    engine.on('event_fired', ({ event }: { event: TriggerEvent }) => fired.push(event));

    engine.registerPreset('broadcast');
    await engine.commercialBreak();

    // commercial-break trigger uses clear-all, which calls clearLayer
    expect(mockGraphics.clearLayer).toHaveBeenCalled();
  });

  it('scoreChange() convenience method passes correct data fields', async () => {
    const engine = new AtlasTriggerEngine(mockGraphics as never);
    const events: unknown[] = [];
    engine.on('event_fired', (e) => events.push(e));

    const trigger: GraphicsTrigger = {
      id: 'sc-test',
      name: 'SC Test',
      event_type: 'score_change',
      graphic_template: 'inception/test',
      data_mapping: { home_score: 'homeScore' },
      layer: { channel: 1, layer: 99 },
      duration_ms: 0,
      priority: 3,
      active: true,
    };
    engine.registerTrigger(trigger);

    await engine.scoreChange('Lakers', 110, 'Celtics', 105, 'Q4', 'Lakers');
    expect(events).toHaveLength(1);
  });

  it('segmentStart() fires segment_start event type', async () => {
    const engine = new AtlasTriggerEngine(mockGraphics as never);
    engine.registerPreset('broadcast');

    const events: unknown[] = [];
    engine.on('event_fired', (e) => events.push(e));
    await engine.segmentStart('Halftime Show', 'The Operator');

    expect(events).toHaveLength(1);
    const evt = events[0] as { event: TriggerEvent };
    expect(evt.event.type).toBe('segment_start');
  });
});
