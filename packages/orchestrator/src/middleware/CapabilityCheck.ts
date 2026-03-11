/**
 * @module orchestrator/middleware/CapabilityCheck
 * @description Validates agent capabilities against required task capabilities
 */
import type { MiddlewareFn } from '../types';

interface CapabilityCheckOptions {
  required: string[];
}

export function CapabilityCheck(options: CapabilityCheckOptions): MiddlewareFn {
  return async (ctx, next) => {
    const agentCaps = ctx.capabilities instanceof Map
      ? (ctx.capabilities as Map<string, string[]>).get(ctx.agentId) ?? []
      : [];
    const missing = options.required.filter((c) => !agentCaps.includes(c));
    if (missing.length > 0) {
      ctx.errors.push(`CapabilityCheck: agent missing capabilities [${missing.join(', ')}]`);
      return ctx;
    }
    return next();
  };
}
