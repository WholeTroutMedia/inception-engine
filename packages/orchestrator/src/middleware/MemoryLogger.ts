/**
 * @module orchestrator/middleware/MemoryLogger
 * @description Production memory logger — captures full route context after pipeline execution.
 * Emits structured log entries for SCRIBE persistence, includes timing, error surfacing,
 * constitutional compliance status, and optional custom log sinks.
 *
 * Closes: orchestrator MemoryLogger stub → production implementation
 */
import type { MiddlewareFn, RouteContext } from '../types';

// ── Log entry schema ─────────────────────────────────────────────────────────

export interface MemoryLogEntry {
  /** Unique route identifier */
  taskId: string;
  /** Agent that executed the task */
  agentId: string;
  /** Task classification */
  taskType: string;
  /** ISO timestamp of log write */
  loggedAt: string;
  /** Pipeline wall-clock duration in milliseconds */
  durationMs: number;
  /** Whether governance gate was passed */
  governanceApproved: boolean;
  /** Whether the pipeline fully dispatched to a handler */
  dispatched: boolean;
  /** Whether the route was blocked by governance or rate-limit */
  blocked: boolean;
  /** Errors surfaced during pipeline execution */
  errors: string[];
  /** Handler result payload (sanitised) */
  result: Record<string, unknown> | undefined;
  /** Freeform metadata merged by middleware */
  metadata: Record<string, unknown>;
}

// ── Options ───────────────────────────────────────────────────────────────────

export interface MemoryLoggerOptions {
  /**
   * Custom sink — receives the structured log entry after every route.
   * Use this to push to SCRIBE, Redis pub/sub, or structured stdout.
   */
  sink?: (entry: MemoryLogEntry) => void | Promise<void>;
  /**
   * Minimum duration (ms) before a route is considered "slow" and emits
   * a warning into the errors field. Default: 5000ms.
   */
  slowThresholdMs?: number;
  /**
   * Tag to include in every entry's metadata — useful for multi-router deployments.
   */
  routerTag?: string;
}

// ── In-memory ring buffer ─────────────────────────────────────────────────────

const MAX_RING = 500;
const _ring: MemoryLogEntry[] = [];

function ringPush(entry: MemoryLogEntry): void {
  if (_ring.length >= MAX_RING) _ring.shift();
  _ring.push(entry);
}

/** Read the last N entries from the in-memory log buffer. */
export function getMemoryLog(limit = 50): MemoryLogEntry[] {
  return _ring.slice(-Math.min(limit, MAX_RING));
}

/** Clear the in-memory log buffer. Useful in tests. */
export function clearMemoryLog(): void {
  _ring.length = 0;
}

// ── Middleware factory ─────────────────────────────────────────────────────────

/**
 * MemoryLogger — production middleware.
 *
 * Must be placed LAST in the pipeline so it captures the fully-mutated context
 * after all other middleware and handlers have run.
 *
 * @example
 * router.use(MemoryLogger({ routerTag: 'inception-default', sink: scribeWrite }));
 */
export function MemoryLogger(options: MemoryLoggerOptions = {}): MiddlewareFn {
  const { sink, slowThresholdMs = 5_000, routerTag } = options;

  return async (ctx: RouteContext, next: () => Promise<RouteContext>): Promise<RouteContext> => {
    const startMs = Date.now();

    // Run the rest of the pipeline first
    const result = await next();

    const durationMs = Date.now() - startMs;
    const loggedAt = new Date().toISOString();

    // Attach log metadata back to the context
    result.memoryLogged = true;
    result.metadata = {
      ...result.metadata,
      memoryLoggedAt: loggedAt,
      pipelineDurationMs: durationMs,
      ...(routerTag ? { routerTag } : {}),
    };

    // Build structured log entry
    const entry: MemoryLogEntry = {
      taskId: result.taskId,
      agentId: result.agentId,
      taskType: result.taskType,
      loggedAt,
      durationMs,
      governanceApproved: result.governanceApproved,
      dispatched: result.dispatched,
      blocked: result.blocked,
      errors: [...result.errors],
      result: result.result,
      metadata: { ...result.metadata },
    };

    // Surface slow routes
    if (durationMs > slowThresholdMs) {
      const slowMsg = `MemoryLogger: slow route (${durationMs}ms > ${slowThresholdMs}ms threshold)`;
      entry.errors.push(slowMsg);
      result.errors.push(slowMsg);
    }

    // Push to ring buffer
    ringPush(entry);

    // Emit to custom sink (fire-and-forget — never block the pipeline)
    if (sink) {
      try {
        const sinkResult = sink(entry);
        if (sinkResult instanceof Promise) {
          sinkResult.catch((err: unknown) => {
            // Sink failures are non-fatal — log to stderr only
            process.stderr.write(
              `[MemoryLogger] sink error: ${err instanceof Error ? err.message : String(err)}\n`
            );
          });
        }
      } catch (err) {
        process.stderr.write(
          `[MemoryLogger] sink threw: ${err instanceof Error ? err.message : String(err)}\n`
        );
      }
    }

    return result;
  };
}
