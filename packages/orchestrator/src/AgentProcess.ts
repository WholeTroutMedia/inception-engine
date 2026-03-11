/**
 * @module orchestrator/AgentProcess
 * @description Agent lifecycle management: spawn, suspend, resume, kill
 * Closes #85 (partial)
 */
import { z } from 'zod';
import { EventEmitter } from 'events';

export type ProcessState = 'idle' | 'running' | 'suspended' | 'terminated' | 'error';

export const AgentProcessConfigSchema = z.object({
  agentId: z.string(),
  maxHeartbeatMs: z.number().positive().default(30_000),
  healthCheckIntervalMs: z.number().positive().default(10_000),
  autoRestart: z.boolean().default(false),
  maxRestarts: z.number().int().min(0).default(3),
});
export type AgentProcessConfig = z.infer<typeof AgentProcessConfigSchema>;

export interface HealthStatus {
  agentId: string;
  state: ProcessState;
  uptime: number;
  lastHeartbeat: number;
  restartCount: number;
  activeTaskCount: number;
}

export class AgentProcess extends EventEmitter {
  private state: ProcessState = 'idle';
  private config: AgentProcessConfig;
  private startedAt: number | null = null;
  private lastHeartbeat: number = 0;
  private restartCount: number = 0;
  private activeTaskCount: number = 0;
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: Partial<AgentProcessConfig> & Pick<AgentProcessConfig, 'agentId'>) {
    super();
    this.config = AgentProcessConfigSchema.parse(config);
  }

  spawn(): this {
    if (this.state === 'running') throw new Error(`Agent ${this.config.agentId} already running`);
    if (this.state === 'terminated') throw new Error(`Agent ${this.config.agentId} terminated`);
    this.state = 'running';
    this.startedAt = Date.now();
    this.lastHeartbeat = Date.now();
    this.startHealthCheck();
    this.emit('spawn', { agentId: this.config.agentId, timestamp: Date.now() });
    return this;
  }

  suspend(): this {
    if (this.state !== 'running') throw new Error(`Cannot suspend in state: ${this.state}`);
    this.state = 'suspended';
    this.stopHealthCheck();
    this.emit('suspend', { agentId: this.config.agentId, timestamp: Date.now() });
    return this;
  }

  resume(): this {
    if (this.state !== 'suspended') throw new Error(`Cannot resume in state: ${this.state}`);
    this.state = 'running';
    this.lastHeartbeat = Date.now();
    this.startHealthCheck();
    this.emit('resume', { agentId: this.config.agentId, timestamp: Date.now() });
    return this;
  }

  kill(): this {
    if (this.state === 'terminated') return this;
    const prev = this.state;
    this.state = 'terminated';
    this.stopHealthCheck();
    this.activeTaskCount = 0;
    this.emit('kill', { agentId: this.config.agentId, previousState: prev, timestamp: Date.now() });
    return this;
  }

  heartbeat(): void {
    if (this.state !== 'running') return;
    this.lastHeartbeat = Date.now();
    this.emit('heartbeat', { agentId: this.config.agentId, timestamp: this.lastHeartbeat });
  }

  taskStarted(): void { this.activeTaskCount++; }
  taskCompleted(): void { if (this.activeTaskCount > 0) this.activeTaskCount--; }

  getHealth(): HealthStatus {
    return {
      agentId: this.config.agentId, state: this.state,
      uptime: this.startedAt ? Date.now() - this.startedAt : 0,
      lastHeartbeat: this.lastHeartbeat, restartCount: this.restartCount,
      activeTaskCount: this.activeTaskCount,
    };
  }

  getState(): ProcessState { return this.state; }
  getAgentId(): string { return this.config.agentId; }
  getConfig(): AgentProcessConfig { return { ...this.config }; }

  private startHealthCheck(): void {
    this.stopHealthCheck();
    this.healthCheckTimer = setInterval(() => {
      if (this.state !== 'running') return;
      if (Date.now() - this.lastHeartbeat > this.config.maxHeartbeatMs) this.handleTimeout();
      this.emit('healthCheck', this.getHealth());
    }, this.config.healthCheckIntervalMs);
  }

  private stopHealthCheck(): void {
    if (this.healthCheckTimer) { clearInterval(this.healthCheckTimer); this.healthCheckTimer = null; }
  }

  private handleTimeout(): void {
    this.state = 'error';
    this.stopHealthCheck();
    this.emit('heartbeatTimeout', { agentId: this.config.agentId });
    if (this.config.autoRestart && this.restartCount < this.config.maxRestarts) {
      this.restartCount++;
      this.state = 'idle';
      this.emit('restart', { agentId: this.config.agentId, attempt: this.restartCount });
      this.spawn();
    }
  }
}

export class ProcessManager {
  private processes: Map<string, AgentProcess> = new Map();

  spawn(config: Partial<AgentProcessConfig> & Pick<AgentProcessConfig, 'agentId'>): AgentProcess {
    if (this.processes.has(config.agentId)) throw new Error(`Process ${config.agentId} exists`);
    const proc = new AgentProcess(config);
    proc.spawn();
    this.processes.set(config.agentId, proc);
    return proc;
  }

  get(agentId: string): AgentProcess | undefined { return this.processes.get(agentId); }

  kill(agentId: string): boolean {
    const proc = this.processes.get(agentId);
    if (!proc) return false;
    proc.kill();
    this.processes.delete(agentId);
    return true;
  }

  getHealthAll(): HealthStatus[] { return [...this.processes.values()].map(p => p.getHealth()); }
  getActiveCount(): number { return [...this.processes.values()].filter(p => p.getState() === 'running').length; }

  killAll(): void {
    for (const proc of this.processes.values()) proc.kill();
    this.processes.clear();
  }
}