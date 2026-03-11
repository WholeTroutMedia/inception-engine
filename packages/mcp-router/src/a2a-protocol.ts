/**
 * Agent-to-Agent (A2A) Protocol â€” Creative Liberation Engine v5
 * Task: T20260308-506 â€” A2A Protocol Implementation
 *
 * Implements the Google A2A specification for inter-agent communication.
 * Agents expose a /.well-known/agent.json card and communicate via
 * JSON-RPC 2.0 over SSE or HTTP streaming.
 *
 * Key concepts:
 *   AgentCard       â€” Describes an agent's capabilities (/.well-known/agent.json)
 *   Task            â€” A unit of work passed between agents
 *   Message         â€” A single turn in a task conversation
 *   Artifact        â€” A produced output (file, data, code)
 *   A2AClient       â€” Sends tasks to remote agents
 *   A2AServer       â€” Receives tasks from remote agents
 *
 * Reference: https://google.github.io/A2A/
 */

// â”€â”€â”€ A2A Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type A2ATaskStatus = 'submitted' | 'working' | 'input-required' | 'completed' | 'canceled' | 'failed' | 'unknown';

export interface A2AAgentCapabilities {
  streaming?: boolean;
  pushNotifications?: boolean;
  stateTransitionHistory?: boolean;
}

export interface A2AAgentSkill {
  id: string;
  name: string;
  description: string;
  tags?: string[];
  examples?: string[];
  inputModes?: string[];
  outputModes?: string[];
}

export interface A2AAgentCard {
  name: string;
  description: string;
  url: string;
  version: string;
  iconUrl?: string;
  documentationUrl?: string;
  capabilities: A2AAgentCapabilities;
  defaultInputModes: string[];
  defaultOutputModes: string[];
  skills: A2AAgentSkill[];
  authentication?: {
    schemes: string[];
  };
}

export interface A2ATextPart {
  type: 'text';
  text: string;
  mimeType?: string;
}

export interface A2AFilePart {
  type: 'file';
  file: {
    name?: string;
    mimeType: string;
    uri?: string;
    bytes?: string; // base64
  };
}

export interface A2ADataPart {
  type: 'data';
  data: unknown;
  mimeType?: string;
}

export type A2APart = A2ATextPart | A2AFilePart | A2ADataPart;

export interface A2AMessage {
  role: 'user' | 'agent';
  parts: A2APart[];
  metadata?: Record<string, unknown>;
}

export interface A2AArtifact {
  name?: string;
  description?: string;
  index: number;
  parts: A2APart[];
  metadata?: Record<string, unknown>;
  lastChunk?: boolean;
  append?: boolean;
}

export interface A2ATaskState {
  status: {
    state: A2ATaskStatus;
    message?: A2AMessage;
    timestamp?: string;
  };
  artifacts?: A2AArtifact[];
  history?: A2AMessage[];
  metadata?: Record<string, unknown>;
}

export interface A2ATask {
  id: string;
  sessionId?: string;
  message: A2AMessage;
  metadata?: Record<string, unknown>;
}

export interface A2AStreamEvent {
  type: 'status' | 'artifact';
  taskId: string;
  data: A2ATaskState['status'] | A2AArtifact;
}

// â”€â”€â”€ JSON-RPC â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface A2AJsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: 'tasks/send' | 'tasks/sendSubscribe' | 'tasks/get' | 'tasks/cancel' | 'tasks/resubscribe' | 'tasks/pushNotification/set' | 'tasks/pushNotification/get';
  params: unknown;
}

export interface A2AJsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

// A2A error codes
export const A2A_ERRORS = {
  TASK_NOT_FOUND: -32001,
  TASK_NOT_CANCELABLE: -32002,
  PUSH_NOTIFICATION_NOT_SUPPORTED: -32003,
  UNSUPPORTED_OPERATION: -32004,
  CONTENT_TYPE_NOT_SUPPORTED: -32005,
  AGENT_NOT_FOUND: -32006,
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
} as const;

// â”€â”€â”€ A2A Client â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface A2AClientOptions {
  /** Base URL of the remote agent */
  agentUrl: string;
  /** API key or Bearer token for authentication */
  apiKey?: string;
  /** Timeout for non-streaming requests in ms (default: 30s) */
  timeoutMs?: number;
}

/**
 * A2AClient â€” sends tasks to a remote A2A-compatible agent.
 *
 * Usage:
 *   const client = new A2AClient({ agentUrl: 'https://agent.example.com' });
 *   const card = await client.getAgentCard();
 *   const state = await client.sendTask({ message: { role: 'user', parts: [{ type: 'text', text: 'Hello' }] } });
 */
export class A2AClient {
  private readonly agentUrl: string;
  private readonly apiKey?: string;
  private readonly timeoutMs: number;
  private _card: A2AAgentCard | null = null;

  constructor(opts: A2AClientOptions) {
    this.agentUrl = opts.agentUrl.replace(/\/$/, '');
    this.apiKey = opts.apiKey;
    this.timeoutMs = opts.timeoutMs ?? 30_000;
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.apiKey) h['Authorization'] = `Bearer ${this.apiKey}`;
    return h;
  }

  /** Fetch and cache the remote agent's capability card */
  async getAgentCard(): Promise<A2AAgentCard> {
    if (this._card) return this._card;
    const res = await fetch(`${this.agentUrl}/.well-known/agent.json`, {
      headers: this.headers(),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!res.ok) throw new A2AError(A2A_ERRORS.AGENT_NOT_FOUND, `Failed to fetch agent card: ${res.status}`);
    this._card = (await res.json()) as A2AAgentCard;
    return this._card;
  }

  /** Send a task and wait for completion (non-streaming) */
  async sendTask(task: Omit<A2ATask, 'id'>): Promise<A2ATaskState> {
    const id = generateTaskId();
    const payload: A2AJsonRpcRequest = {
      jsonrpc: '2.0',
      id: id,
      method: 'tasks/send',
      params: { id, ...task },
    };
    const res = await fetch(this.agentUrl, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    const body = (await res.json()) as A2AJsonRpcResponse;
    if (body.error) throw new A2AError(body.error.code, body.error.message, body.error.data);
    return body.result as A2ATaskState;
  }

  /**
   * Send a task and stream status/artifact events via SSE.
   * Yields A2AStreamEvent objects as they arrive.
   */
  async *sendTaskStream(task: Omit<A2ATask, 'id'>): AsyncGenerator<A2AStreamEvent> {
    const id = generateTaskId();
    const payload: A2AJsonRpcRequest = {
      jsonrpc: '2.0',
      id,
      method: 'tasks/sendSubscribe',
      params: { id, ...task },
    };
    const res = await fetch(this.agentUrl, {
      method: 'POST',
      headers: { ...this.headers(), Accept: 'text/event-stream' },
      body: JSON.stringify(payload),
    });
    if (!res.ok || !res.body) throw new A2AError(A2A_ERRORS.UNSUPPORTED_OPERATION, `Stream failed: ${res.status}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      let eventType = '';
      for (const line of lines) {
        if (line.startsWith('event:')) {
          eventType = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          const data = JSON.parse(line.slice(5).trim()) as A2AJsonRpcResponse;
          if (data.error) throw new A2AError(data.error.code, data.error.message);
          if (data.result) {
            yield {
              type: eventType as 'status' | 'artifact',
              taskId: id,
              data: data.result as A2ATaskState['status'] | A2AArtifact,
            };
          }
        }
      }
    }
  }

  /** Get current state of an existing task */
  async getTask(taskId: string): Promise<A2ATaskState> {
    const payload: A2AJsonRpcRequest = {
      jsonrpc: '2.0',
      id: generateTaskId(),
      method: 'tasks/get',
      params: { id: taskId },
    };
    const res = await fetch(this.agentUrl, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    const body = (await res.json()) as A2AJsonRpcResponse;
    if (body.error) throw new A2AError(body.error.code, body.error.message);
    return body.result as A2ATaskState;
  }

  /** Cancel a running task */
  async cancelTask(taskId: string): Promise<A2ATaskState> {
    const payload: A2AJsonRpcRequest = {
      jsonrpc: '2.0',
      id: generateTaskId(),
      method: 'tasks/cancel',
      params: { id: taskId },
    };
    const res = await fetch(this.agentUrl, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    const body = (await res.json()) as A2AJsonRpcResponse;
    if (body.error) throw new A2AError(body.error.code, body.error.message);
    return body.result as A2ATaskState;
  }
}

// â”€â”€â”€ A2A Server Handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type A2ATaskHandler = (task: A2ATask, signal: AbortSignal) => Promise<A2ATaskState> | AsyncGenerator<A2AStreamEvent>;

export interface A2AServerOptions {
  card: A2AAgentCard;
  handler: A2ATaskHandler;
}

/**
 * A2AServer â€” processes incoming A2A JSON-RPC requests.
 *
 * Integrate with any HTTP framework:
 *   // Express example
 *   app.post('/a2a', (req, res) => a2aServer.handleRequest(req.body, res));
 *   app.get('/.well-known/agent.json', (_, res) => res.json(a2aServer.getCard()));
 */
export class A2AServer {
  private tasks = new Map<string, A2ATaskState>();
  private readonly card: A2AAgentCard;
  private readonly handler: A2ATaskHandler;

  constructor(opts: A2AServerOptions) {
    this.card = opts.card;
    this.handler = opts.handler;
  }

  getCard(): A2AAgentCard {
    return this.card;
  }

  async handleJsonRpc(request: A2AJsonRpcRequest, signal = new AbortController().signal): Promise<A2AJsonRpcResponse> {
    try {
      switch (request.method) {
        case 'tasks/send': {
          const task = request.params as A2ATask;
          const result = await (this.handler(task, signal) as Promise<A2ATaskState>);
          this.tasks.set(task.id, result);
          return { jsonrpc: '2.0', id: request.id, result };
        }
        case 'tasks/get': {
          const { id } = request.params as { id: string };
          const state = this.tasks.get(id);
          if (!state) return jsonRpcError(request.id, A2A_ERRORS.TASK_NOT_FOUND, `Task not found: ${id}`);
          return { jsonrpc: '2.0', id: request.id, result: state };
        }
        case 'tasks/cancel': {
          const { id } = request.params as { id: string };
          const state = this.tasks.get(id);
          if (!state) return jsonRpcError(request.id, A2A_ERRORS.TASK_NOT_FOUND, `Task not found: ${id}`);
          const canceled: A2ATaskState = { ...state, status: { state: 'canceled', timestamp: new Date().toISOString() } };
          this.tasks.set(id, canceled);
          return { jsonrpc: '2.0', id: request.id, result: canceled };
        }
        default:
          return jsonRpcError(request.id, A2A_ERRORS.METHOD_NOT_FOUND, `Method not found: ${request.method}`);
      }
    } catch (err) {
      const msg = err instanceof A2AError ? err.message : 'Internal error';
      const code = err instanceof A2AError ? err.code : A2A_ERRORS.INTERNAL_ERROR;
      return jsonRpcError(request.id, code, msg);
    }
  }
}

// â”€â”€â”€ Creative Liberation Engine A2A Agent Cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** Pre-built agent card for the ALFRED photography assistant */
export const ALFRED_AGENT_CARD: A2AAgentCard = {
  name: 'ALFRED',
  description: 'AI butler for The Operator Photography â€” gallery curation, print recommendations, booking assistance',
  url: process.env['NEXT_PUBLIC_SITE_URL'] ? `${process.env['NEXT_PUBLIC_SITE_URL']}/api/a2a` : 'https://justinalharoni.com/api/a2a',
  version: '1.0.0',
  capabilities: { streaming: true },
  defaultInputModes: ['text/plain'],
  defaultOutputModes: ['text/plain'],
  skills: [
    { id: 'gallery-curation', name: 'Gallery Curation', description: 'Recommend images for client galleries based on creative DNA and selection criteria', tags: ['photography', 'ai', 'curation'] },
    { id: 'print-recommendations', name: 'Print Recommendations', description: 'Suggest print sizes, paper types, and framing options', tags: ['ecommerce', 'photography'] },
    { id: 'booking-assistant', name: 'Booking Assistant', description: 'Help clients schedule sessions, explain pricing, collect intake info', tags: ['crm', 'booking'] },
    { id: 'style-analysis', name: 'Style Analysis', description: 'Analyze a photographer\'s creative DNA and describe their aesthetic', tags: ['ai', 'creative-dna'] },
  ],
};

/** Pre-built agent card for the Creative Liberation Engine orchestrator */
export const INCEPTION_ORCHESTRATOR_CARD: A2AAgentCard = {
  name: 'Creative Liberation Engine Orchestrator',
  description: 'AVERI-powered multi-agent orchestration system',
  url: process.env['DISPATCH_SERVER'] ?? 'http://127.0.0.1:5050/a2a',
  version: '5.0.0',
  capabilities: { streaming: true, pushNotifications: true, stateTransitionHistory: true },
  defaultInputModes: ['text/plain', 'application/json'],
  defaultOutputModes: ['text/plain', 'application/json'],
  skills: [
    { id: 'task-dispatch', name: 'Task Dispatch', description: 'Dispatch tasks to specialized agents in the Creative Liberation Engine mesh', tags: ['orchestration'] },
    { id: 'agent-spawn', name: 'Agent Spawn', description: 'Spawn new agent instances for parallel workstreams', tags: ['orchestration'] },
    { id: 'code-execution', name: 'Code Execution', description: 'Write and execute code across the Creative Liberation Engine ecosystem', tags: ['development'] },
  ],
};

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export class A2AError extends Error {
  constructor(
    public readonly code: number,
    message: string,
    public readonly data?: unknown
  ) {
    super(message);
    this.name = 'A2AError';
  }
}

function generateTaskId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function jsonRpcError(id: string | number, code: number, message: string): A2AJsonRpcResponse {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

// Polyfill-safe process access
declare const process: { env: Record<string, string | undefined> };
