/**
 * Inception Agent SDK — AgentWorker Base Class
 *
 * Extend this class to build any agent. Override `handle()` with your
 * business logic. The base class manages the full lifecycle:
 * registration → heartbeat → task receipt → result reporting.
 *
 * @package inception-agent-sdk
 */

import { InceptionAgentClient } from './client.js';
import type {
  AgentManifest,
  AgentWorkerConfig,
  TaskEnvelope,
  TaskResult,
} from './types.js';

/**
 * Abstract base class for all Creative Liberation Engine agents.
 *
 * Quickstart:
 * ```ts
 * class MyImageAgent extends AgentWorker {
 *   async handle(task: TaskEnvelope): Promise<TaskResult> {
 *     const imageUrl = await generateImage(task.payload);
 *     return {
 *       taskId: task.taskId,
 *       agentId: this.manifest.agentId,
 *       status: 'completed',
 *       output: { imageUrl },
 *       durationMs: Date.now() - start,
 *     };
 *   }
 * }
 *
 * const agent = new MyImageAgent(manifest);
 * await agent.run();
 * ```
 */
export abstract class AgentWorker {
  protected client: InceptionAgentClient;
  protected manifest: AgentManifest;
  protected config: Required<Omit<AgentWorkerConfig, 'manifest'>>;
  private running: boolean = false;
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  constructor(workerConfig: AgentWorkerConfig) {
    this.manifest = workerConfig.manifest;
    this.config = {
      heartbeatIntervalMs: workerConfig.heartbeatIntervalMs ?? 30_000,
      pollIntervalMs: workerConfig.pollIntervalMs ?? 5_000,
      preferStreaming: workerConfig.preferStreaming ?? true,
    };
    this.client = new InceptionAgentClient(this.manifest, {
      debug: process.env['IE_DEBUG'] === 'true',
    });
  }

  /**
   * Override with your task processing logic.
   * Must return a TaskResult — never throw (catch internally and return failed status).
   */
  abstract handle(task: TaskEnvelope): Promise<TaskResult>;

  /**
   * Start the agent: register, begin heartbeat, and begin receiving tasks.
   * For long-running servers (Node.js, Fly.io).
   */
  async run(): Promise<void> {
    if (this.running) return;
    this.running = true;

    // Register with dispatch
    await this.client.register();

    // Wire task handler
    this.client.onTask(async (task) => {
      const result = await this.handle(task);
      await this.client.complete(result);
      return result;
    });

    // Start heartbeat
    this.client.startHeartbeat(this.config.heartbeatIntervalMs);

    // Poll for tasks if streaming not preferred
    if (!this.config.preferStreaming) {
      this.startPolling();
    }

    console.log(
      `[AgentWorker] ${this.manifest.agentId} running on ${this.manifest.cloudProvider} — awaiting tasks`,
    );
  }

  /**
   * Handle a single task and return result.
   * For serverless environments (Cloudflare Workers, AWS Lambda) where
   * there's no persistent process — call this from your request handler.
   */
  async handleOnce(task: TaskEnvelope): Promise<TaskResult> {
    if (!this.client.isRegistered) {
      await this.client.register();
    }
    const result = await this.handle(task);
    await this.client.complete(result);
    return result;
  }

  /**
   * Handle an inbound webhook payload from dispatch.
   * Returns the raw HTTP response body.
   */
  async handleWebhook(
    body: TaskEnvelope,
  ): Promise<{ ok: boolean; taskId: string; status: string }> {
    const result = await this.client.handleWebhook(body);
    return { ok: result.status !== 'failed', taskId: result.taskId, status: result.status };
  }

  async stop(): Promise<void> {
    this.running = false;
    this.client.stopHeartbeat();
    this.stopPolling();
  }

  private startPolling(): void {
    this.pollTimer = setInterval(async () => {
      await this.client.poll();
    }, this.config.pollIntervalMs);
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }
}
