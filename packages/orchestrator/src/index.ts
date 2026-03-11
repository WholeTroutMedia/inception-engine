/**
 * @module orchestrator/index
 * @description Public barrel for orchestrator package
 */

export { AgentRouter } from './AgentRouter';
export type { RouteContext, MiddlewareFn, RouteHandler, PipelineConfig, PipelineMetrics } from './AgentRouter';
export { RouteContextSchema, PipelineConfigSchema } from './schemas';

export { AgentProcess, ProcessManager } from './AgentProcess';
export type { ProcessState, AgentProcessConfig, HealthStatus } from './AgentProcess';

export { EventBus } from './EventBus';
export type { EventEnvelope, EventBusConfig, EventHandler, Subscription, EventBusStats } from './EventBus';

export { GovernanceGate } from './middleware/GovernanceGate';
export { CapabilityCheck } from './middleware/CapabilityCheck';
export { RateLimiter } from './middleware/RateLimiter';
export type { RateLimiterConfig, AgentRateStatus, RateLimiterStats } from './middleware/RateLimiter';
export { MemoryLogger, getMemoryLog, clearMemoryLog } from './middleware/MemoryLogger';
export type { MemoryLogEntry, MemoryLoggerOptions } from './middleware/MemoryLogger';
