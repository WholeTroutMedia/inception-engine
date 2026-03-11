/**
 * @module orchestrator/middleware/RateLimiter
 * @description Per-agent rate limiter with sliding-window counters, auto-cleanup,
 * stats reporting, and per-agent status inspection.
 *
 * Closes: RateLimiter → add stats() + getStatus() + auto-cleanup
 */
import type { MiddlewareFn } from '../types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface WindowEntry {
  count: number;
  resetAt: number;
}

export interface RateLimiterConfig {
  /** Max requests per agent per window. Default: 60 */
  maxRequests: number;
  /** Window duration in milliseconds. Default: 60_000 (1 min) */
  windowMs: number;
  /**
   * How often to sweep stale counter entries (ms). Default: 5 × windowMs.
   * Pass 0 to disable automatic cleanup.
   */
  cleanupIntervalMs?: number;
}

export interface AgentRateStatus {
  agentId: string;
  count: number;
  maxRequests: number;
  windowMs: number;
  resetAt: number;
  remainingRequests: number;
  limited: boolean;
}

export interface RateLimiterStats {
  trackedAgents: number;
  totalRequestsInWindow: number;
  limitedAgents: number;
  config: RateLimiterConfig;
}

// ── RateLimiter class ─────────────────────────────────────────────────────────

export class RateLimiter {
  private counters = new Map<string, WindowEntry>();
  private config: Required<RateLimiterConfig>;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: RateLimiterConfig = { maxRequests: 60, windowMs: 60_000 }) {
    this.config = {
      cleanupIntervalMs: config.cleanupIntervalMs ?? config.windowMs * 5,
      ...config,
    };

    if (this.config.cleanupIntervalMs > 0) {
      this.cleanupTimer = setInterval(
        () => this._sweepStale(),
        this.config.cleanupIntervalMs
      );
      // Prevent the timer from holding the process open
      if (this.cleanupTimer.unref) this.cleanupTimer.unref();
    }
  }

  // ── Middleware ─────────────────────────────────────────────────────────────

  middleware(): MiddlewareFn {
    return async (ctx, next) => {
      const now = Date.now();
      let entry = this.counters.get(ctx.agentId);

      if (!entry || now > entry.resetAt) {
        entry = { count: 0, resetAt: now + this.config.windowMs };
        this.counters.set(ctx.agentId, entry);
      }

      if (entry.count >= this.config.maxRequests) {
        const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
        ctx.errors.push(
          `rate_limit_exceeded: agent '${ctx.agentId}' exceeded ${this.config.maxRequests} req/${this.config.windowMs}ms. Retry after ${retryAfterSec}s.`
        );
        ctx.metadata = {
          ...ctx.metadata,
          rateLimited: true,
          retryAfterMs: entry.resetAt - now,
        };
        return ctx;
      }

      entry.count++;
      return next();
    };
  }

  // ── Inspection ─────────────────────────────────────────────────────────────

  /**
   * Returns the current rate status for a specific agent.
   * Useful for dashboards and VERA telemetry.
   */
  getStatus(agentId: string): AgentRateStatus {
    const now = Date.now();
    const entry = this.counters.get(agentId);
    const count = entry && now <= entry.resetAt ? entry.count : 0;
    const resetAt = entry ? entry.resetAt : now + this.config.windowMs;

    return {
      agentId,
      count,
      maxRequests: this.config.maxRequests,
      windowMs: this.config.windowMs,
      resetAt,
      remainingRequests: Math.max(0, this.config.maxRequests - count),
      limited: count >= this.config.maxRequests,
    };
  }

  /**
   * Returns aggregate stats across all tracked agents.
   */
  stats(): RateLimiterStats {
    const now = Date.now();
    let totalRequests = 0;
    let limitedAgents = 0;

    Array.from(this.counters.values()).forEach((entry) => {
      if (now <= entry.resetAt) {
        totalRequests += entry.count;
        if (entry.count >= this.config.maxRequests) limitedAgents++;
      }
    });

    return {
      trackedAgents: this.counters.size,
      totalRequestsInWindow: totalRequests,
      limitedAgents,
      config: { ...this.config },
    };
  }

  // ── Mutation ───────────────────────────────────────────────────────────────

  /**
   * Reset counter for a specific agent, or all agents if omitted.
   */
  reset(agentId?: string): void {
    if (agentId) {
      this.counters.delete(agentId);
    } else {
      this.counters.clear();
    }
  }

  /**
   * Stops the auto-cleanup interval. Call when the router is being torn down.
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private _sweepStale(): void {
    const now = Date.now();
    Array.from(this.counters.entries()).forEach(([id, entry]) => {
      if (now > entry.resetAt) this.counters.delete(id);
    });
  }
}
