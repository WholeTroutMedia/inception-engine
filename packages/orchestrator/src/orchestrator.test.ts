/**
 * @inception/orchestrator — Vitest Test Suite
 * Wave 31 Helix C
 * Covers: AgentRouter pipeline, EventBus pub/sub/wildcard/replay
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { AgentRouter } from './AgentRouter.js';
import { EventBus } from './EventBus.js';
import type { RouteContext, MiddlewareFn } from './types.js';

// ── AgentRouter ────────────────────────────────────────────────────────────────

describe('AgentRouter', () => {
  let router: AgentRouter;

  beforeEach(() => {
    router = new AgentRouter({ name: 'test-router', timeoutMs: 5000 });
  });

  it('constructs with default config', () => {
    const r = new AgentRouter();
    expect(r).toBeInstanceOf(AgentRouter);
    expect(r.getConfig().name).toBe('default');
  });

  it('constructs with custom name', () => {
    expect(router.getConfig().name).toBe('test-router');
  });

  it('middleware count starts at 0', () => {
    expect(router.getMiddlewareCount()).toBe(0);
  });

  it('registers middleware with .use()', () => {
    const mw: MiddlewareFn = async (ctx, next) => next();
    router.use(mw);
    expect(router.getMiddlewareCount()).toBe(1);
  });

  it('supports chaining .use() calls', () => {
    const mw: MiddlewareFn = async (ctx, next) => next();
    router.use(mw).use(mw).use(mw);
    expect(router.getMiddlewareCount()).toBe(3);
  });

  it('registers a handler and routes a task', async () => {
    const handlerFn = vi.fn(async (ctx: RouteContext) => ({ ...ctx, dispatched: true }));
    router.register('test-task', handlerFn);

    const result = await router.route({
      agentId: 'agent-01',
      taskType: 'test-task',
      payload: { data: 'hello' },
    });

    expect(handlerFn).toHaveBeenCalledOnce();
    expect(result.dispatched).toBe(true);
    expect(result.taskType).toBe('test-task');
    expect(result.agentId).toBe('agent-01');
  });

  it('uses wildcard handler when no specific handler matches', async () => {
    const wildcard = vi.fn(async (ctx: RouteContext) => ({ ...ctx, dispatched: true }));
    router.register('*', wildcard);

    const result = await router.route({
      agentId: 'agent-02',
      taskType: 'unknown-task',
      payload: {},
    });

    expect(wildcard).toHaveBeenCalledOnce();
    expect(result.dispatched).toBe(true);
  });

  it('returns error when no handler is registered', async () => {
    const result = await router.route({
      agentId: 'agent-03',
      taskType: 'unregistered',
      payload: {},
    });

    expect(result.dispatched).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('No handler registered');
  });

  it('runs middleware in order', async () => {
    const order: number[] = [];
    const mw1: MiddlewareFn = async (ctx, next) => { order.push(1); return next(); };
    const mw2: MiddlewareFn = async (ctx, next) => { order.push(2); return next(); };
    const mw3: MiddlewareFn = async (ctx, next) => { order.push(3); return next(); };

    router.use(mw1).use(mw2).use(mw3);
    router.register('*', async (ctx) => ({ ...ctx, dispatched: true }));

    await router.route({ agentId: 'a', taskType: 'any', payload: {} });
    expect(order).toEqual([1, 2, 3]);
  });

  it('middleware can modify context', async () => {
    const mw: MiddlewareFn = async (ctx, next) => {
      ctx.metadata = { ...ctx.metadata, enriched: true };
      return next();
    };
    router.use(mw);
    router.register('*', async (ctx) => ({ ...ctx, dispatched: true }));

    const result = await router.route({ agentId: 'a', taskType: 'any', payload: {} });
    expect(result.metadata?.['enriched']).toBe(true);
  });

  it('auto-generates taskId if not provided', async () => {
    router.register('*', async (ctx) => ({ ...ctx, dispatched: true }));
    const result = await router.route({ agentId: 'a', taskType: 'any', payload: {} });
    expect(result.taskId).toBeDefined();
    expect(typeof result.taskId).toBe('string');
    expect(result.taskId.length).toBeGreaterThan(0);
  });

  it('preserves provided taskId', async () => {
    router.register('*', async (ctx) => ({ ...ctx, dispatched: true }));
    const result = await router.route({ taskId: 'my-custom-id', agentId: 'a', taskType: 'any', payload: {} });
    expect(result.taskId).toBe('my-custom-id');
  });

  it('getRouteLog returns route history', async () => {
    router.register('*', async (ctx) => ({ ...ctx, dispatched: true }));
    await router.route({ agentId: 'a', taskType: 'type1', payload: {} });
    await router.route({ agentId: 'b', taskType: 'type2', payload: {} });
    expect(router.getRouteLog()).toHaveLength(2);
  });

  it('clearLog empties route history', async () => {
    router.register('*', async (ctx) => ({ ...ctx, dispatched: true }));
    await router.route({ agentId: 'a', taskType: 'any', payload: {} });
    router.clearLog();
    expect(router.getRouteLog()).toHaveLength(0);
  });

  it('createDefaultPipeline builds a router with middleware', () => {
    const pipeline = AgentRouter.createDefaultPipeline();
    expect(pipeline).toBeInstanceOf(AgentRouter);
    expect(pipeline.getMiddlewareCount()).toBeGreaterThan(0);
  });
});

// ── EventBus ──────────────────────────────────────────────────────────────────

describe('EventBus', () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
  });

  it('constructs with default config', () => {
    expect(bus).toBeInstanceOf(EventBus);
    expect(bus.getConfig().enableReplay).toBe(true);
    expect(bus.getConfig().enableWildcards).toBe(true);
  });

  it('maintains zero stats initially', () => {
    const stats = bus.getStats();
    expect(stats.totalPublished).toBe(0);
    expect(stats.totalDelivered).toBe(0);
    expect(stats.activeSubscriptions).toBe(0);
  });

  it('emits and delivers to subscriber', async () => {
    const handler = vi.fn();
    bus.on('test.topic', handler);
    await bus.emit('test.topic', { data: 'value' }, 'agent-01');
    expect(handler).toHaveBeenCalledOnce();
  });

  it('event envelope contains expected fields', async () => {
    const handler = vi.fn();
    bus.on('check.fields', handler);
    await bus.emit('check.fields', { x: 1 }, 'source-agent', { meta: true });
    const event = handler.mock.calls[0]![0];
    expect(event).toHaveProperty('eventId');
    expect(event).toHaveProperty('topic', 'check.fields');
    expect(event).toHaveProperty('payload', { x: 1 });
    expect(event).toHaveProperty('source', 'source-agent');
    expect(event).toHaveProperty('timestamp');
    expect(event.metadata).toHaveProperty('meta', true);
  });

  it('.once() fires only the first time', async () => {
    const handler = vi.fn();
    bus.once('once.topic', handler);
    await bus.emit('once.topic', {}, 'agent-X');
    await bus.emit('once.topic', {}, 'agent-X');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('.off() unsubscribes', async () => {
    const handler = vi.fn();
    const id = bus.on('off.topic', handler);
    bus.off(id);
    await bus.emit('off.topic', {}, 'agent-X');
    expect(handler).not.toHaveBeenCalled();
  });

  it('increments totalPublished stat', async () => {
    await bus.emit('stats.topic', {}, 'agent-Y');
    await bus.emit('stats.topic', {}, 'agent-Y');
    expect(bus.getStats().totalPublished).toBe(2);
  });

  it('increments totalDelivered stat', async () => {
    bus.on('deliver.topic', vi.fn());
    await bus.emit('deliver.topic', {}, 'agent-Z');
    expect(bus.getStats().totalDelivered).toBe(1);
  });

  it('supports wildcard * subscription', async () => {
    const handler = vi.fn();
    bus.on('*', handler);
    await bus.emit('any.topic.at.all', {}, 'wildcard-agent');
    expect(handler).toHaveBeenCalled();
  });

  it('supports segment wildcard (a.*.c)', async () => {
    const handler = vi.fn();
    bus.on('agent.*.status', handler);
    await bus.emit('agent.iris.status', {}, 'system');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('supports double wildcard (a.**)', async () => {
    const handler = vi.fn();
    bus.on('agent.**', handler);
    await bus.emit('agent.vera.task.done', {}, 'system');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('replay delivers buffered events to new handler', async () => {
    await bus.emit('replay.topic', { x: 1 }, 'src');
    await bus.emit('replay.topic', { x: 2 }, 'src');

    const handler = vi.fn();
    const count = bus.replay('replay.topic', handler);
    expect(count).toBe(2);
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('clearReplayBuffer empties buffer', async () => {
    await bus.emit('buffer.topic', {}, 'src');
    bus.clearReplayBuffer();
    expect(bus.getReplayBuffer()).toHaveLength(0);
  });

  it('removeAllListeners clears all subscriptions', async () => {
    bus.on('topic.a', vi.fn());
    bus.on('topic.b', vi.fn());
    bus.removeAllListeners();
    expect(bus.getStats().activeSubscriptions).toBe(0);
  });

  it('listenerCount returns correct count', () => {
    bus.on('count.topic', vi.fn());
    bus.on('count.topic', vi.fn());
    expect(bus.listenerCount('count.topic')).toBe(2);
  });

  it('getTopics returns registered topics', () => {
    bus.on('topic.x', vi.fn());
    bus.on('topic.y', vi.fn());
    const topics = bus.getTopics();
    expect(topics).toContain('topic.x');
    expect(topics).toContain('topic.y');
  });
});
