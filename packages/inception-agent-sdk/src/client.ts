/**
 * Inception Agent SDK — Client
 *
 * Handles registration, heartbeat, and task reception for any agent
 * that wants to join the Creative Liberation Engine mesh.
 *
 * Works from: Node.js, Cloudflare Workers, AWS Lambda, Fly.io — anywhere fetch() is available.
 *
 * @package inception-agent-sdk
 */

import type {
  AgentManifest,
  TaskEnvelope,
  TaskResult,
  RegistrationResponse,
  HeartbeatPayload,
  DispatchEvent,
} from './types.js';

// ─── Client Options ───────────────────────────────────────────────────────────

export interface ClientOptions {
  /** Override fetch implementation for environments with custom fetch */
  fetchImpl?: typeof fetch;
  /** Request timeout in milliseconds (default: 10000) */
  timeoutMs?: number;
  /** Enable verbose debug logging (default: false) */
  debug?: boolean;
}

// ─── Event Handlers ───────────────────────────────────────────────────────────

export type TaskHandler = (task: TaskEnvelope) => Promise<TaskResult>;
export type ErrorHandler = (error: Error) => void;

// ─── Inception Agent Client ───────────────────────────────────────────────────

/**
 * The primary interface between an agent and the Creative Liberation Engine mesh.
 *
 * Usage:
 * ```ts
 * const client = new InceptionAgentClient(manifest);
 * await client.register();
 * client.onTask(async (task) => {
 *   const result = await myAgent.process(task);
 *   return result;
 * });
 * ```
 */
export class InceptionAgentClient {
  private manifest: AgentManifest;
  private options: Required<ClientOptions>;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private taskHandlers: TaskHandler[] = [];
  private errorHandlers: ErrorHandler[] = [];
  private startedAt: number = Date.now();
  private registered: boolean = false;

  constructor(manifest: AgentManifest, options: ClientOptions = {}) {
    this.manifest = manifest;
    this.options = {
      fetchImpl: options.fetchImpl ?? fetch,
      timeoutMs: options.timeoutMs ?? 10_000,
      debug: options.debug ?? false,
    };
  }

  // ─── Registration ────────────────────────────────────────────────────────────

  /**
   * Register this agent with the Creative Liberation Engine dispatch.
   * Must be called before any tasks can be received.
   */
  async register(): Promise<RegistrationResponse> {
    const response = await this.post<RegistrationResponse>(
      `${this.manifest.dispatchEndpoint}/api/agents/register`,
      {
        agent_id: this.manifest.agentId,
        name: this.manifest.name,
        version: this.manifest.version,
        capabilities: this.manifest.capabilities,
        cloud_provider: this.manifest.cloudProvider,
        endpoint: this.manifest.endpoint,
        metadata: this.manifest.metadata ?? {},
      },
    );

    this.registered = true;
    this.log(`✅ Registered as ${this.manifest.agentId} with dispatch`);
    return response;
  }

  // ─── Heartbeat ────────────────────────────────────────────────────────────────

  /**
   * Start sending periodic heartbeats to keep the agent alive in the mesh.
   */
  startHeartbeat(intervalMs: number = 30_000): void {
    if (this.heartbeatTimer) return;

    this.heartbeatTimer = setInterval(async () => {
      await this.sendHeartbeat('idle');
    }, intervalMs);

    this.log(`💓 Heartbeat started (every ${intervalMs}ms)`);
  }

  async sendHeartbeat(
    status: HeartbeatPayload['status'] = 'idle',
    currentTaskId?: string,
  ): Promise<void> {
    const payload: HeartbeatPayload = {
      agentId: this.manifest.agentId,
      status,
      currentTaskId,
      uptimeMs: Date.now() - this.startedAt,
      cloudProvider: this.manifest.cloudProvider,
      endpoint: this.manifest.endpoint,
    };

    try {
      await this.post<{ ok: boolean }>(
        `${this.manifest.dispatchEndpoint}/api/agents/heartbeat`,
        payload,
      );
    } catch (err) {
      // Heartbeat is fire-and-forget — log but never throw
      this.log(`⚠️ Heartbeat failed: ${String(err)}`);
    }
  }

  stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // ─── Task Subscription ────────────────────────────────────────────────────────

  /**
   * Register a handler for incoming tasks.
   * The handler is called whenever dispatch sends a task to this agent.
   */
  onTask(handler: TaskHandler): void {
    this.taskHandlers.push(handler);
  }

  onError(handler: ErrorHandler): void {
    this.errorHandlers.push(handler);
  }

  /**
   * Poll the dispatch server for pending tasks (for environments without SSE).
   */
  async poll(): Promise<void> {
    const tasks = await this.get<TaskEnvelope[]>(
      `${this.manifest.dispatchEndpoint}/api/agents/${encodeURIComponent(this.manifest.agentId)}/tasks/pending`,
    );

    for (const task of tasks) {
      await this.dispatchTask(task);
    }
  }

  /**
   * Handle an inbound task webhook payload delivered from dispatch.
   * Call this from your HTTP server route handler.
   */
  async handleWebhook(envelope: TaskEnvelope): Promise<TaskResult> {
    return this.dispatchTask(envelope);
  }

  // ─── Task Completion ──────────────────────────────────────────────────────────

  async complete(result: TaskResult): Promise<void> {
    await this.post<{ ok: boolean }>(
      `${this.manifest.dispatchEndpoint}/api/tasks/${result.taskId}/complete`,
      result,
    );
    this.log(`✅ Task ${result.taskId} completed (${result.status})`);
  }

  async fail(taskId: string, error: Error): Promise<void> {
    const result: TaskResult = {
      taskId,
      agentId: this.manifest.agentId,
      status: 'failed',
      output: null,
      durationMs: 0,
      error: error.message,
    };
    await this.complete(result);
  }

  // ─── Internal ────────────────────────────────────────────────────────────────

  private async dispatchTask(task: TaskEnvelope): Promise<TaskResult> {
    const startTime = Date.now();

    await this.sendHeartbeat('busy', task.taskId);

    let result: TaskResult;

    try {
      if (this.taskHandlers.length === 0) {
        throw new Error('No task handler registered. Call onTask() before receiving tasks.');
      }

      // Use the first registered handler
      const handler = this.taskHandlers[0];
      if (!handler) throw new Error('Task handler is undefined');

      result = await handler(task);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.errorHandlers.forEach((h) => h(error));
      result = {
        taskId: task.taskId,
        agentId: this.manifest.agentId,
        status: 'failed',
        output: null,
        durationMs: Date.now() - startTime,
        error: error.message,
      };
    }

    await this.sendHeartbeat('idle');
    return result;
  }

  private async post<T>(url: string, body: unknown): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.options.timeoutMs);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.manifest.apiKey) {
        headers['X-IE-API-Key'] = this.manifest.apiKey;
      }

      const res = await this.options.fetchImpl(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      }

      return await res.json() as T;
    } finally {
      clearTimeout(timer);
    }
  }

  private async get<T>(url: string): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.options.timeoutMs);

    try {
      const headers: Record<string, string> = {};

      if (this.manifest.apiKey) {
        headers['X-IE-API-Key'] = this.manifest.apiKey;
      }

      const res = await this.options.fetchImpl(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      }

      return await res.json() as T;
    } finally {
      clearTimeout(timer);
    }
  }

  private log(message: string): void {
    if (this.options.debug) {
      console.log(`[inception-agent][${this.manifest.agentId}] ${message}`);
    }
  }

  get isRegistered(): boolean {
    return this.registered;
  }
}
