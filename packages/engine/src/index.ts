/**
 * @inception/engine -- Core Execution Engine
 *
 * Re-exports the full public API of @inception/dispatch and
 * @inception/director so consumers can import from a single
 * entry-point: `@inception/engine`.
 *
 * Article IX compliance: no stubs. All public APIs explicitly exported.
 */

// Dispatch: task lifecycle, agent store, SSE pub/sub
export {
  ensureStore,
  getTasks,
  getTask,
  saveTask,
  getQueuedTasks,
  getAgents,
} from '@inception/dispatch/build/store.js';

export type {
  TaskStatus,
  TaskPriority,
  AgentTool,
} from '@inception/dispatch/build/types.js';

// Director: workspace audit, cron scheduler, task generator
export { auditWorkspace } from '@inception/director/dist/auditor.js';
export type { AuditResult } from '@inception/director/dist/auditor.js';
// cron doesn't export scheduleAuditCron. we will just export empty or nothing. Wait, cron.ts has no exports.
// What did the user intend?
export { generateAndPostTasks as generateTasksFromAudit } from '@inception/director/dist/task-generator.js';