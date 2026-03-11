import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentRouter } from '../src/AgentRouter';
import { GovernanceGate } from '../src/middleware/GovernanceGate';
import { RateLimiter } from '../src/middleware/RateLimiter';
import { CapabilityCheck } from '../src/middleware/CapabilityCheck';
import { MemoryLogger } from '../src/middleware/MemoryLogger';
import { RouteContextSchema, PipelineConfigSchema } from '../src/schemas';
import type { RouteContext, MiddlewareFn } from '../src/types';

const makeCtx = (overrides: Partial<RouteContext> = {}): RouteContext => ({
  taskId: '123e4567-e89b-12d3-a456-426614174000',
  agentId: 'agent-1',
  taskType: 'code',
  payload: { prompt: 'hello' },
  metadata: {},
  governanceApproved: false,
  dispatched: false,
  memoryLogged: false,
  blocked: false,
  errors: [],
  capabilities: new Map([['agent-1', ['code']]]),
  timestamp: Date.now(),
  ...overrides,
});

describe('AgentRouter', () => {
  let router: AgentRouter;

  beforeEach(() => {
    router = new AgentRouter({ name: 'test-router' });
  });

  describe('basic routing', () => {
    it('should route to a registered handler', async () => {
      const handler = vi.fn().mockResolvedValue({ status: 'ok' });
      router.register('code', handler);
      const result = await router.route(makeCtx());
      expect(handler).toHaveBeenCalledOnce();
      expect(result.status).toBe('ok');
    });

    it('should return error for unregistered task type', async () => {
      const result = await router.route(makeCtx({ taskType: 'unknown' }));
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should support wildcard handlers', async () => {
      const handler = vi.fn().mockResolvedValue({ status: 'ok' });
      router.register('*', handler);
      const result = await router.route(makeCtx({ taskType: 'anything' }));
      expect(handler).toHaveBeenCalled();
      expect(result.status).toBe('ok');
    });
  });

  describe('middleware chain', () => {
    it('should execute middleware in order', async () => {
      const order: string[] = [];
      const mw = (name: string): MiddlewareFn => async (ctx, next) => {
        order.push(`${name}:before`);
        const result = await next();
        order.push(`${name}:after`);
        return result;
      };
      router.use(mw('first'));
      router.use(mw('second'));
      router.register('code', vi.fn().mockResolvedValue({ status: 'ok' }));
      await router.route(makeCtx());
      expect(order).toEqual(['first:before', 'second:before', 'second:after', 'first:after']);
    });

    it('should short-circuit on governance block', async () => {
      const logFn = vi.fn();
      router.use(GovernanceGate());
      router.use(MemoryLogger({ sink: logFn }));
      const result = await router.route(makeCtx({ taskType: 'harm' }));
      expect(logFn).not.toHaveBeenCalled();
      expect(result.blocked).toBe(true);
    });
  });

  describe('rate limiter', () => {
    it('should enforce rate limits', async () => {
      const limiter = new RateLimiter({ maxRequests: 2, windowMs: 1000 });
      router.use(limiter.middleware());
      router.register('code', vi.fn().mockResolvedValue({ status: 'ok' }));
      await router.route(makeCtx());
      await router.route(makeCtx());
      const result = await router.route(makeCtx());
      expect(result.errors.some(e => e.startsWith('rate_limit_exceeded'))).toBe(true);
    });
  });

  describe('capability check', () => {
    it('should block agents without required capability', async () => {
      router.use(CapabilityCheck({ required: ['admin'] }));
      router.register('code', vi.fn().mockResolvedValue({ status: 'ok' }));
      const result = await router.route(makeCtx());
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should allow agents with matching capability', async () => {
      router.use(CapabilityCheck({ required: ['code'] }));
      router.register('code', vi.fn().mockResolvedValue({ status: 'ok' }));
      const result = await router.route(makeCtx());
      expect(result.status).toBe('ok');
    });
  });

  describe('timeout', () => {
    it('should timeout slow middleware', async () => {
      const slow = new AgentRouter({ name: 'slow', timeoutMs: 50 });
      slow.use(async (ctx, next) => {
        await new Promise((r) => setTimeout(r, 200));
        return next();
      });
      slow.register('code', vi.fn().mockResolvedValue({ status: 'ok' }));
      const result = await slow.route(makeCtx());
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('timeout');
    });
  });

  describe('createDefaultPipeline', () => {
    it('should create pipeline with standard middleware', () => {
      const pipeline = AgentRouter.createDefaultPipeline();
      expect(pipeline.getMiddlewareCount()).toBeGreaterThanOrEqual(1);
    });

    it('should include capability check when caps provided', () => {
      const caps = new Map([['a', ['code']]]);
      const pipeline = AgentRouter.createDefaultPipeline(caps);
      expect(pipeline.getMiddlewareCount()).toBeGreaterThanOrEqual(2);
    });
  });

  describe('schema validation', () => {
    it('should validate RouteContextSchema', () => {
      const result = RouteContextSchema.safeParse(makeCtx());
      expect(result.success).toBe(true);
    });

    it('should validate PipelineConfigSchema defaults', () => {
      const result = PipelineConfigSchema.safeParse({ name: 'test' });
      expect(result.success).toBe(true);
    });
  });
});