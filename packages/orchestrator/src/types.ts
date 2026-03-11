/**
 * @module orchestrator/types
 * @description Shared TypeScript types for the orchestrator pipeline
 */
import type { RouteContext } from './schemas';
export type { RouteContext };

export type MiddlewareFn = (
  ctx: RouteContext,
  next: () => Promise<RouteContext>
) => Promise<RouteContext>;

export type RouteHandler = (ctx: RouteContext) => Promise<Record<string, unknown>>;
