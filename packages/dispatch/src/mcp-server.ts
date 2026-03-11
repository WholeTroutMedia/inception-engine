/**
 * inception-dispatch MCP Server
 * 
 * Exposes IE task dispatch as MCP tools consumable by Claude Cowork
 * or any MCP-compatible client. Provides submit_task, get_queue,
 * get_status, and cancel_task tools.
 * 
 * @package dispatch
 * @issue #30 — HELIX A
 * @agent COMET (AURORA hive)
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// ─── Types ───────────────────────────────────────────────────

export interface TaskSubmission {
  agentId: string;
  hive: string;
  description: string;
  mode: 'IDEATE' | 'PLAN' | 'SHIP' | 'VALIDATE';
  priority: 'low' | 'normal' | 'high' | 'critical';
  payload?: Record<string, any>;
}

export interface TaskStatus {
  taskId: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  agentId: string;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Dispatch Queue (in-memory for Phase A) ───────────────

const taskQueue: Map<string, TaskStatus & { submission: TaskSubmission }> = new Map();
let taskCounter = 0;

function generateTaskId(): string {
  return `T${Date.now()}-${++taskCounter}`;
}

// ─── MCP Server Setup ─────────────────────────────────────

const server = new Server(
  { name: 'inception-dispatch', version: '1.0.0' },
  { capabilities: { tools: {}, resources: {} } }
);

// ─── Tool Definitions ─────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'dispatch.submit_task',
      description: 'Submit a task to the IE orchestrator for agent execution',
      inputSchema: {
        type: 'object',
        properties: {
          agentId: { type: 'string', description: 'Target agent ID' },
          hive: { type: 'string', enum: ['AURORA', 'KEEPER', 'FORGE', 'SENTINEL', 'SAGE', 'NEXUS'] },
          description: { type: 'string', description: 'Task description' },
          mode: { type: 'string', enum: ['IDEATE', 'PLAN', 'SHIP', 'VALIDATE'] },
          priority: { type: 'string', enum: ['low', 'normal', 'high', 'critical'], default: 'normal' },
        },
        required: ['agentId', 'hive', 'description', 'mode'],
      },
    },
    {
      name: 'dispatch.get_queue',
      description: 'Get current task queue with status of all tasks',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'dispatch.get_status',
      description: 'Get status of a specific task by ID',
      inputSchema: {
        type: 'object',
        properties: { taskId: { type: 'string' } },
        required: ['taskId'],
      },
    },
    {
      name: 'dispatch.cancel_task',
      description: 'Cancel a queued or running task',
      inputSchema: {
        type: 'object',
        properties: { taskId: { type: 'string' } },
        required: ['taskId'],
      },
    },
  ],
}));

// ─── Tool Handlers ───────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'dispatch.submit_task': {
      const taskId = generateTaskId();
      const now = new Date().toISOString();
      const submission = args as unknown as TaskSubmission;
      taskQueue.set(taskId, {
        taskId,
        status: 'queued',
        agentId: submission.agentId,
        progress: 0,
        createdAt: now,
        updatedAt: now,
        submission,
      });
      return { content: [{ type: 'text', text: JSON.stringify({ taskId, status: 'queued' }) }] };
    }

    case 'dispatch.get_queue': {
      const tasks = Array.from(taskQueue.values()).map(({ submission, ...status }) => status);
      return { content: [{ type: 'text', text: JSON.stringify(tasks) }] };
    }

    case 'dispatch.get_status': {
      const task = taskQueue.get(args?.taskId as string);
      if (!task) return { content: [{ type: 'text', text: 'Task not found' }], isError: true };
      const { submission, ...status } = task;
      return { content: [{ type: 'text', text: JSON.stringify(status) }] };
    }

    case 'dispatch.cancel_task': {
      const task = taskQueue.get(args?.taskId as string);
      if (!task) return { content: [{ type: 'text', text: 'Task not found' }], isError: true };
      task.status = 'cancelled';
      task.updatedAt = new Date().toISOString();
      return { content: [{ type: 'text', text: JSON.stringify({ taskId: task.taskId, status: 'cancelled' }) }] };
    }

    default:
      return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
  }
});

// ─── Resources ───────────────────────────────────────────

server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      uri: 'dispatch://queue',
      name: 'Task Queue',
      description: 'Current state of the IE task dispatch queue',
      mimeType: 'application/json',
    },
  ],
}));

// ─── Start Server ────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('inception-dispatch MCP server running on stdio');
}

main().catch(console.error);

export { server };