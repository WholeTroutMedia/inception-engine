/**
 * @module orchestrator/middleware/GovernanceGate
 * @description Constitutional governance gate — blocks prohibited task types
 */
import type { MiddlewareFn } from '../types';

export function GovernanceGate(rules?: string[]): MiddlewareFn {
  const blockedTypes = rules ?? ['self-destruct', 'harm', 'exfiltrate'];
  return async (ctx, next) => {
    if (blockedTypes.includes(ctx.taskType)) {
      ctx.errors.push(`GovernanceGate: blocked task type '${ctx.taskType}'`);
      ctx.governanceApproved = false;
      ctx.blocked = true;
      return ctx;
    }
    ctx.governanceApproved = true;
    ctx.metadata = { ...ctx.metadata, governancePassedAt: new Date().toISOString() };
    return next();
  };
}
