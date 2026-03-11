/**
 * DIRA — Barrel Export
 * packages/genkit/src/dira/index.ts
 */

export * from './types.js';
export * from './collections.js';
export { DIRAAutoResolveFlow } from './auto-resolve.js';
export { instrument } from './instrumentation.js';
export type { RunContext, RunResult } from './instrumentation.js';
export type { AutoResolveInput, AutoResolveOutput } from './auto-resolve.js';

// Creator Productivity Panel metrics — T20260308-533
// Note: DiraPanel React component lives in @inception/console/components/DiraPanel
export { fetchDiraMetrics } from './metrics.js';
export type { DiraMetrics, DailyResolutionPoint, WorkflowStat } from './metrics.js';
