/**
 * @inception/agent-sdk — Public API
 *
 * Register any agent into the Creative Liberation Engine mesh from any cloud.
 */

// Types
export type {
  CloudProvider,
  AgentManifest,
  TaskEnvelope,
  TaskResult,
  RegistrationResponse,
  HeartbeatPayload,
  DispatchEvent,
  AgentWorkerConfig,
} from './types.js';

// Core client
export { InceptionAgentClient } from './client.js';
export type { ClientOptions, TaskHandler, ErrorHandler } from './client.js';

// Worker base class
export { AgentWorker } from './worker.js';

// MCP bridge
export { McpBridge } from './mcp-bridge.js';
export type { McpToolDefinition, McpRequest, McpResponse } from './mcp-bridge.js';
