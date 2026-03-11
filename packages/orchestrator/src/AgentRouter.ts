/**
 * @module orchestrator/AgentRouter
 * @description Routes tasks through governance → capability → rate-limit → memory pipeline
 * Closes #81, #85
 */
import { RouteContextSchema, PipelineConfigSchema } from './schemas';
import type { RouteContext, MiddlewareFn, RouteHandler } from './types';
import { GovernanceGate } from './middleware/GovernanceGate';
import { CapabilityCheck } from './middleware/CapabilityCheck';
import { RateLimiter } from './middleware/RateLimiter';
import { MemoryLogger } from './middleware/MemoryLogger';

export { RouteContextSchema, PipelineConfigSchema } from './schemas';
export type { RouteContext, MiddlewareFn, RouteHandler } from './types';
export { GovernanceGate } from './middleware/GovernanceGate';
export { CapabilityCheck } from './middleware/CapabilityCheck';
export { RateLimiter } from './middleware/RateLimiter';
export type { RateLimiterConfig, AgentRateStatus, RateLimiterStats } from './middleware/RateLimiter';
export { MemoryLogger, getMemoryLog, clearMemoryLog } from './middleware/MemoryLogger';
export type { MemoryLogEntry, MemoryLoggerOptions } from './middleware/MemoryLogger';
export type { PipelineConfig, PipelineMetrics } from './schemas';

// ── AgentRouter ─────────────────────────────────────────
export class AgentRouter {
  private middlewareStack: MiddlewareFn[] = [];
  private handlers: Map<string, RouteHandler> = new Map();
  private config: ReturnType<typeof PipelineConfigSchema.parse>;
  private routeLog: RouteContext[] = [];

  constructor(config?: { name: string; timeoutMs?: number; [key: string]: unknown }) {
    this.config = PipelineConfigSchema.parse({ name: 'default', ...config });
  }

  /** Add middleware to the pipeline */
  use(fn: MiddlewareFn): this {
    this.middlewareStack.push(fn);
    return this;
  }

  /** Register a handler for a task type ('*' = wildcard) */
  register(taskType: string, handler: RouteHandler): this {
    this.handlers.set(taskType, handler);
    return this;
  }

  /** Route a task through the full middleware pipeline */
  async route(input: Partial<RouteContext> & Pick<RouteContext, 'agentId' | 'taskType' | 'payload'>): Promise<RouteContext> {
    const ctx: RouteContext = {
      taskId: (input.taskId as string) ?? this.generateId(),
      taskType: input.taskType,
      agentId: input.agentId,
      payload: input.payload,
      capabilities: input.capabilities,
      metadata: input.metadata ?? {},
      timestamp: input.timestamp ?? Date.now(),
      governanceApproved: false,
      dispatched: false,
      memoryLogged: false,
      blocked: false,
      errors: [],
    };

    // Build middleware chain that terminates with handler dispatch
    const chain = this.buildChain(ctx);

    try {
      const result = await Promise.race([
        chain(),
        this.timeout(this.config.timeoutMs),
      ]) as RouteContext;

      this.routeLog.push(result);
      return result;
    } catch (error) {
      ctx.errors.push(error instanceof Error ? error.message : String(error));
      this.routeLog.push(ctx);
      return ctx;
    }
  }

  /** Get pipeline config */
  getConfig() { return { ...this.config }; }

  /** Get route history */
  getRouteLog(): RouteContext[] { return [...this.routeLog]; }

  /** Get middleware count */
  getMiddlewareCount(): number { return this.middlewareStack.length; }

  /** Clear route log */
  clearLog(): void { this.routeLog = []; }

  /** Build a default pipeline with standard middleware */
  static createDefaultPipeline(agentCapabilities?: Map<string, string[]>): AgentRouter {
    const router = new AgentRouter({ name: 'inception-default' });
    router.use(GovernanceGate());
    if (agentCapabilities) {
      router.use(CapabilityCheck({ required: [] }));
    }
    router.use(new RateLimiter({ maxRequests: 120, windowMs: 60_000 }).middleware());
    router.use(MemoryLogger());
    return router;
  }

  // ── Private ─────────────────────────────────────────
  private buildChain(ctx: RouteContext): () => Promise<RouteContext> {
    let index = 0;
    const mw = this.middlewareStack;
    const dispatch = async (): Promise<RouteContext> => {
      if (index >= mw.length) {
        // Dispatch to handler
        const handler = this.handlers.get(ctx.taskType) ?? this.handlers.get('*');
        if (!handler) {
          ctx.errors.push(`No handler registered for task type: '${ctx.taskType}'`);
          return ctx;
        }
        const result = await handler(ctx);
        // Merge handler result into ctx
        Object.assign(ctx, result);
        ctx.dispatched = ctx.errors.length === 0;
        return ctx;
      }
      const current = mw[index++];
      return current(ctx, dispatch);
    };
    return dispatch;
  }

  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Pipeline timeout after ${ms}ms`)), ms)
    );
  }

  private generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}