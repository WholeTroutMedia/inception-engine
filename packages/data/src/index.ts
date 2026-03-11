/**
 * @inception/data -- Persistence Layer
 *
 * Core schema definitions, types, and database connectivity
 * for the Creative Liberation Engine GENESIS hive.
 *
 * Article IX compliance: all public APIs explicitly exported.
 */

// ─── Task Schema ─────────────────────────────────────────

export type TaskStatus = 'queued' | 'active' | 'done' | 'failed' | 'cancelled';
export type TaskPriority = 'P0' | 'P1' | 'P2' | 'P3';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  workstream: string;
  package: string;
  assignedAgent: string | null;
  parentTaskId: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  metadata: Record<string, unknown>;
}

export type InsertTask = Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'completedAt'>;
export type SelectTask = Task;

// ─── Agent Schema ────────────────────────────────────────

export type AgentStatus = 'idle' | 'active' | 'paused' | 'error' | 'terminated';

export interface Agent {
  id: string;
  name: string;
  workstream: string;
  status: AgentStatus;
  heartbeatAt: string;
  taskCount: number;
  metadata: Record<string, unknown>;
}

export type InsertAgent = Omit<Agent, 'id' | 'heartbeatAt' | 'taskCount'>;
export type SelectAgent = Agent;

// ─── Audit Result Schema ─────────────────────────────────

export type AuditSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface AuditResult {
  id: string;
  title: string;
  description: string;
  severity: AuditSeverity;
  workstream: string;
  package: string;
  category: string;
  scannedAt: string;
  resolvedAt: string | null;
}

export type InsertAuditResult = Omit<AuditResult, 'id' | 'scannedAt' | 'resolvedAt'>;
export type SelectAuditResult = AuditResult;

// ─── Workstream Schema ───────────────────────────────────

export interface Workstream {
  id: string;
  name: string;
  description: string;
  packages: string[];
  activeAgents: number;
  taskCount: number;
}

// ─── Schema Aggregate ────────────────────────────────────

export const schema = {
  version: '1.0.0-genesis',
  tables: ['tasks', 'agents', 'audit_results', 'workstreams'] as const,
} as const;

export default schema;
