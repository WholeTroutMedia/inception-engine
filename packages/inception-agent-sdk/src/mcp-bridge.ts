/**
 * Inception Agent SDK — MCP Bridge
 *
 * Wraps InceptionAgentClient with MCP (Model Context Protocol) framing.
 * Any agent using this bridge appears as a standard MCP server to the mesh,
 * enabling tool discovery, capability negotiation, and protocol-compliant
 * task exchange.
 *
 * @package inception-agent-sdk
 */

import { InceptionAgentClient } from './client.js';
import type {
  AgentManifest,
  TaskEnvelope,
  TaskResult,
  DispatchEvent,
} from './types.js';

// ─── MCP Protocol Types ───────────────────────────────────────────────────────

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface McpRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

export interface McpResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: { code: number; message: string };
}

// ─── MCP Bridge ───────────────────────────────────────────────────────────────

/**
 * Bridges the Creative Liberation Engine dispatch protocol to MCP.
 *
 * Provides:
 * - `tools/list` — exposes agent capabilities as MCP tools
 * - `tools/call` — receives MCP tool invocations and routes to the agent
 * - `ping` — standard health probe
 *
 * Usage:
 * ```ts
 * const bridge = new McpBridge(manifest, myAgentHandler);
 * // In your request handler:
 * const response = await bridge.handleMcpRequest(incomingRequest);
 * ```
 */
export class McpBridge {
  private client: InceptionAgentClient;
  private manifest: AgentManifest;
  private taskHandler: ((task: TaskEnvelope) => Promise<TaskResult>) | null = null;

  constructor(manifest: AgentManifest) {
    this.manifest = manifest;
    this.client = new InceptionAgentClient(manifest);
  }

  onTask(handler: (task: TaskEnvelope) => Promise<TaskResult>): void {
    this.taskHandler = handler;
    this.client.onTask(handler);
  }

  /**
   * Handle an incoming MCP JSON-RPC 2.0 request.
   * Returns an MCP-compliant response.
   */
  async handleMcpRequest(request: McpRequest): Promise<McpResponse> {
    switch (request.method) {
      case 'ping':
        return this.respond(request.id, { status: 'pong', agentId: this.manifest.agentId });

      case 'initialize':
        return this.respond(request.id, {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: {
            name: this.manifest.name,
            version: this.manifest.version,
          },
        });

      case 'tools/list':
        return this.respond(request.id, {
          tools: this.buildToolDefinitions(),
        });

      case 'tools/call':
        return this.handleToolCall(request);

      default:
        return this.errorResponse(request.id, -32601, `Method not found: ${request.method}`);
    }
  }

  /**
   * Convert agent capabilities to MCP tool definitions.
   * Each capability becomes a callable MCP tool.
   */
  private buildToolDefinitions(): McpToolDefinition[] {
    return this.manifest.capabilities.map((capability) => ({
      name: capability,
      description: `Execute ${capability} task via ${this.manifest.name}`,
      inputSchema: {
        type: 'object',
        properties: {
          payload: {
            type: 'object',
            description: 'Task-specific payload',
          },
          priority: {
            type: 'number',
            description: 'Task priority 0 (highest) to 9 (lowest)',
            default: 5,
          },
        },
        required: ['payload'],
      },
    }));
  }

  private async handleToolCall(request: McpRequest): Promise<McpResponse> {
    if (!this.taskHandler) {
      return this.errorResponse(request.id, -32000, 'No task handler registered');
    }

    const params = request.params ?? {};
    const toolName = params['name'] as string | undefined;
    const toolArgs = params['arguments'] as Record<string, unknown> | undefined;

    if (!toolName) {
      return this.errorResponse(request.id, -32602, 'Missing tool name');
    }

    if (!this.manifest.capabilities.includes(toolName)) {
      return this.errorResponse(
        request.id,
        -32602,
        `Unknown capability: ${toolName}. Available: ${this.manifest.capabilities.join(', ')}`,
      );
    }

    const envelope: TaskEnvelope = {
      taskId: `mcp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: 'mcp-tool-call',
      capability: toolName,
      payload: toolArgs?.['payload'] ?? toolArgs ?? {},
      priority: typeof toolArgs?.['priority'] === 'number' ? toolArgs['priority'] : 5,
    };

    try {
      const result = await this.taskHandler(envelope);
      return this.respond(request.id, {
        content: [{ type: 'text', text: JSON.stringify(result.output) }],
        isError: result.status === 'failed',
      });
    } catch (err) {
      return this.errorResponse(
        request.id,
        -32000,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  private respond(id: string | number, result: unknown): McpResponse {
    return { jsonrpc: '2.0', id, result };
  }

  private errorResponse(
    id: string | number,
    code: number,
    message: string,
  ): McpResponse {
    return { jsonrpc: '2.0', id, error: { code, message } };
  }

  getClient(): InceptionAgentClient {
    return this.client;
  }
}
