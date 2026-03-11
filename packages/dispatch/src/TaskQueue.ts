/**
 * @module dispatch/TaskQueue
 * @description Priority task queue with agent routing for Creative Liberation Engine
 * Closes #75
 */
import { z } from 'zod';

// ── Schemas ──────────────────────────────────────────────
export const TaskPriority = z.enum(['critical', 'high', 'medium', 'low', 'background']);
export type TaskPriority = z.infer<typeof TaskPriority>;

export const TaskStatus = z.enum(['queued', 'assigned', 'running', 'completed', 'failed', 'cancelled']);
export type TaskStatus = z.infer<typeof TaskStatus>;

export const TaskSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  priority: TaskPriority,
  status: TaskStatus.default('queued'),
  payload: z.record(z.string(), z.unknown()),
  assignedAgent: z.string().optional(),
  requiredCapabilities: z.array(z.string()).default([]),
  createdAt: z.string().datetime(),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  ttlMs: z.number().positive().default(30_000),
  retries: z.number().int().min(0).default(0),
  maxRetries: z.number().int().min(0).default(3),
  parentTaskId: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});
export type Task = z.infer<typeof TaskSchema>;

export const AgentCapabilitySchema = z.object({
  agentId: z.string(),
  capabilities: z.array(z.string()),
  currentLoad: z.number().min(0).max(1).default(0),
  maxConcurrent: z.number().int().positive().default(5),
  activeTasks: z.number().int().min(0).default(0),
  status: z.enum(['idle', 'busy', 'overloaded', 'offline']).default('idle'),
});
export type AgentCapability = z.infer<typeof AgentCapabilitySchema>;

// ── Priority Weight Map ──────────────────────────────────
const PRIORITY_WEIGHTS: Record<string, number> = {
  critical: 100,
  high: 75,
  medium: 50,
  low: 25,
  background: 10,
};

// ── TaskQueue ────────────────────────────────────────────
export class TaskQueue {
  private queue: Task[] = [];
  private agents: Map<string, AgentCapability> = new Map();
  private completedTasks: Map<string, Task> = new Map();
  private listeners: Map<string, ((task: Task) => void)[]> = new Map();

  /** Enqueue a validated task */
  enqueue(input: Partial<Task> & Pick<Task, 'id' | 'type' | 'priority' | 'payload' | 'createdAt'>): Task {
    const task = TaskSchema.parse({ ...input, status: 'queued' });
    this.queue.push(task);
    this.sortQueue();
    this.emit('enqueue', task);
    return task;
  }

  /** Dequeue highest-priority task matching agent capabilities */
  dequeue(agentId: string): Task | undefined {
    const agent = this.agents.get(agentId);
    if (!agent || agent.status === 'offline' || agent.status === 'overloaded') return undefined;
    if (agent.activeTasks >= agent.maxConcurrent) return undefined;

    const idx = this.queue.findIndex(
      (t) => t.status === 'queued' && this.agentCanHandle(agent, t)
    );
    if (idx === -1) return undefined;

    const task = this.queue.splice(idx, 1)[0];
    task.status = 'assigned';
    task.assignedAgent = agentId;
    task.startedAt = new Date().toISOString();
    agent.activeTasks++;
    this.updateAgentStatus(agent);
    this.emit('assigned', task);
    return task;
  }

  /** Mark task complete */
  complete(taskId: string, result?: Record<string, unknown>): boolean {
    const task = this.findActiveTask(taskId);
    if (!task) return false;
    task.status = 'completed';
    task.completedAt = new Date().toISOString();
    if (result) task.metadata = { ...task.metadata, result };
    this.releaseAgent(task.assignedAgent!);
    this.completedTasks.set(taskId, task);
    this.emit('completed', task);
    return true;
  }

  /** Mark task failed with optional retry */
  fail(taskId: string, error?: string): boolean {
    const task = this.findActiveTask(taskId);
    if (!task) return false;
    this.releaseAgent(task.assignedAgent!);
    if (task.retries < task.maxRetries) {
      task.retries++;
      task.status = 'queued';
      task.assignedAgent = undefined;
      task.startedAt = undefined;
      task.metadata = { ...task.metadata, lastError: error };
      this.queue.push(task);
      this.sortQueue();
      this.emit('retry', task);
    } else {
      task.status = 'failed';
      task.completedAt = new Date().toISOString();
      task.metadata = { ...task.metadata, lastError: error };
      this.completedTasks.set(taskId, task);
      this.emit('failed', task);
    }
    return true;
  }

  /** Register an agent with capabilities */
  registerAgent(input: AgentCapability): void {
    const agent = AgentCapabilitySchema.parse(input);
    this.agents.set(agent.agentId, agent);
  }

  /** Unregister agent, requeue its tasks */
  unregisterAgent(agentId: string): Task[] {
    const requeued: Task[] = [];
    this.agents.delete(agentId);
    // Find all tasks assigned to this agent and requeue
    const assigned = [...this.queue, ...Array.from(this.completedTasks.values())]
      .filter((t) => t.assignedAgent === agentId && t.status === 'assigned');
    for (const task of assigned) {
      task.status = 'queued';
      task.assignedAgent = undefined;
      task.startedAt = undefined;
      if (!this.queue.includes(task)) this.queue.push(task);
      requeued.push(task);
    }
    this.sortQueue();
    return requeued;
  }

  /** Get queue snapshot */
  getQueue(): readonly Task[] { return [...this.queue]; }
  getQueueLength(): number { return this.queue.length; }
  getAgent(id: string): AgentCapability | undefined { return this.agents.get(id); }
  getAgents(): AgentCapability[] { return Array.from(this.agents.values()); }
  getCompleted(id: string): Task | undefined { return this.completedTasks.get(id); }

  /** Event subscription */
  on(event: string, fn: (task: Task) => void): void {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event)!.push(fn);
  }

  /** Cancel a queued task */
  cancel(taskId: string): boolean {
    const idx = this.queue.findIndex((t) => t.id === taskId);
    if (idx === -1) return false;
    const task = this.queue.splice(idx, 1)[0];
    task.status = 'cancelled';
    task.completedAt = new Date().toISOString();
    this.completedTasks.set(taskId, task);
    this.emit('cancelled', task);
    return true;
  }

  /** Drain expired tasks */
  drainExpired(): Task[] {
    const now = Date.now();
    const expired: Task[] = [];
    this.queue = this.queue.filter((t) => {
      const age = now - new Date(t.createdAt).getTime();
      if (age > t.ttlMs && t.status === 'queued') {
        t.status = 'failed';
        t.metadata = { ...t.metadata, reason: 'ttl_expired' };
        this.completedTasks.set(t.id, t);
        expired.push(t);
        return false;
      }
      return true;
    });
    return expired;
  }

  // ── Private ──────────────────────────────────────────
  private sortQueue(): void {
    this.queue.sort((a, b) => (PRIORITY_WEIGHTS[b.priority] ?? 0) - (PRIORITY_WEIGHTS[a.priority] ?? 0));
  }

  private agentCanHandle(agent: AgentCapability, task: Task): boolean {
    if (task.requiredCapabilities.length === 0) return true;
    return task.requiredCapabilities.every((c) => agent.capabilities.includes(c));
  }

  private findActiveTask(taskId: string): Task | undefined {
    return this.queue.find((t) => t.id === taskId && (t.status === 'assigned' || t.status === 'running'));
  }

  private releaseAgent(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.activeTasks = Math.max(0, agent.activeTasks - 1);
      this.updateAgentStatus(agent);
    }
  }

  private updateAgentStatus(agent: AgentCapability): void {
    const ratio = agent.activeTasks / agent.maxConcurrent;
    if (ratio === 0) agent.status = 'idle';
    else if (ratio < 0.8) agent.status = 'busy';
    else agent.status = 'overloaded';
    agent.currentLoad = ratio;
  }

  private emit(event: string, task: Task): void {
    const fns = this.listeners.get(event);
    if (fns) fns.forEach((fn) => fn(task));
  }
}