// Creative Liberation Engine Dispatch Server â€” Main Entry Point
// Express HTTP + MCP over SSE transport
// Runs on NAS at 127.0.0.1:5050
// Any MCP-compatible agent connects here â€” no workspace, no config needed

import express from 'express';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { v4 as uuidv4 } from 'uuid';
import {
    ensureStore, getTasks, getTask, saveTask, getQueuedTasks,
    getAgents, getAgent, saveAgent, removeAgent, getProjects, saveSession,
    getSecret, setSecret, listSecrets, deleteSecret
} from './store.js';
import type { Task, Agent, AgentNotification } from './types.js';
import { migrateFromMarkdown } from './migrate.js';
import * as net from 'net';
import { logArchaeonTrainingSample } from './trainingLogger.js';

const PORT = parseInt(process.env.PORT ?? '5050');
const app = express();
app.use(express.json());

// Track active SSE transports per session
const activeTransports = new Map<string, SSEServerTransport>();

// â”€â”€ Blocker Store (in-memory + broadcast) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Blockers are filed by browser/COMET agents and resolved by IDE agents.
// Kept in-memory for speed; also persisted to .agents/dispatch/blockers.md via broadcast.

export type BlockerSeverity = 'P0' | 'P1' | 'P2';
export type BlockerType = 'terminal' | 'password' | 'sudo' | 'human' | 'blocking-deploy';
export type BlockerStatus = 'OPEN' | 'CLAIMED' | 'RESOLVED';

export interface Blocker {
    id: string;
    severity: BlockerSeverity;
    type: BlockerType;
    filed_by: string;          // agent_id that created it
    task_id?: string;          // related dispatch task (optional)
    description: string;       // exactly what is needed
    claimed_by?: string;       // agent_id that claimed it
    resolved_by?: string;
    resolution_note?: string;
    status: BlockerStatus;
    filed_at: string;          // ISO8601
    updated_at: string;
}

const blockerStore = new Map<string, Blocker>();

// â”€â”€ Tool Definitions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const TOOLS = [
    // Task Management
    {
        name: 'list_tasks',
        description: 'List tasks from the dispatch queue. Filterable by project, workstream, priority, status, or assigned agent.',
        inputSchema: {
            type: 'object',
            properties: {
                status: { type: 'string', enum: ['queued', 'active', 'blocked', 'done', 'failed', 'handoff'], description: 'Filter by status (default: queued)' },
                project: { type: 'string', description: 'Filter by project ID (e.g. brainchild-v5)' },
                workstream: { type: 'string', description: 'Filter by workstream (e.g. genkit-flows)' },
                priority: { type: 'string', enum: ['P0', 'P1', 'P2', 'P3'] },
                assigned_to_agent: { type: 'string', description: 'Filter tasks assigned to a specific agent ID' },
                assigned_to_capability: { type: 'string', description: 'Filter tasks assigned to a capability type' },
            },
        },
    },
    {
        name: 'claim_task',
        description: 'Atomically claim a queued task for this agent. Fails if task is already claimed.',
        inputSchema: {
            type: 'object',
            properties: {
                task_id: { type: 'string', description: 'Task ID to claim (e.g. T20260305-001)' },
                agent_id: { type: 'string', description: 'Your agent ID (e.g. cle-window-a)' },
                capabilities: { type: 'array', items: { type: 'string' }, description: 'Your capabilities' },
                tool: { type: 'string', description: 'Tool name (e.g. cle, cursor)' },
            },
            required: ['task_id', 'agent_id'],
        },
    },
    {
        name: 'complete_task',
        description: 'Mark a task as done and optionally attach artifact paths or URLs.',
        inputSchema: {
            type: 'object',
            properties: {
                task_id: { type: 'string' },
                agent_id: { type: 'string' },
                artifacts: { type: 'array', items: { type: 'string' }, description: 'Files or URLs produced' },
                note: { type: 'string', description: 'Completion summary' },
            },
            required: ['task_id', 'agent_id'],
        },
    },
    {
        name: 'force_complete',
        description: 'Force-complete any task regardless of claim status. Use when work was done outside the claim flow (e.g. async agents, pre-claimed work). Requires a handoff note explaining what was done.',
        inputSchema: {
            type: 'object',
            properties: {
                task_id: { type: 'string', description: 'Task ID to force-complete' },
                agent_id: { type: 'string', description: 'Agent ID completing the task' },
                note: { type: 'string', description: 'What was done â€” commit hash, file paths, summary' },
                artifacts: { type: 'array', items: { type: 'string' }, description: 'Produced file paths or URLs' },
            },
            required: ['task_id', 'agent_id', 'note'],
        },
    },
    {
        name: 'add_task',
        description: 'Add a new task to the dispatch queue. Any agent or the user can queue work.',
        inputSchema: {
            type: 'object',
            properties: {
                title: { type: 'string' },
                project: { type: 'string', description: 'Project ID (e.g. brainchild-v5)' },
                workstream: { type: 'string' },
                priority: { type: 'string', enum: ['P0', 'P1', 'P2', 'P3'], default: 'P2' },
                description: { type: 'string' },
                acceptance_criteria: { type: 'array', items: { type: 'string' } },
                assigned_to_agent: { type: 'string', description: 'Assign directly to a specific agent ID' },
                assigned_to_capability: { type: 'string', description: 'Assign to any agent with this capability' },
                parent_task_id: { type: 'string', description: 'Parent task ID for subtasks' },
                created_by: { type: 'string', description: 'Your agent_id or "user"' },
                dependencies: { type: 'array', items: { type: 'string' }, description: 'Task IDs that must complete first' },
            },
            required: ['title', 'project', 'workstream', 'created_by'],
        },
    },
    {
        name: 'handoff_task',
        description: 'Release a task back to the queue with a note for the next agent.',
        inputSchema: {
            type: 'object',
            properties: {
                task_id: { type: 'string' },
                agent_id: { type: 'string' },
                note: { type: 'string', description: 'What the next agent needs to know to continue' },
            },
            required: ['task_id', 'agent_id', 'note'],
        },
    },
    {
        name: 'get_status',
        description: 'Get the full dispatch board â€” all active agents, queued/active tasks, sessions.',
        inputSchema: { type: 'object', properties: {} },
    },
    {
        name: 'list_projects',
        description: 'List all WholeTrout org projects registered in the dispatch server.',
        inputSchema: {
            type: 'object',
            properties: {
                active_only: { type: 'boolean', description: 'Only show active projects (default: true)' },
            },
        },
    },
    // Agent-to-Agent (First-Class)
    {
        name: 'delegate_task',
        description: 'Create a task and assign it directly to a specific agent or capability type. The target agent will receive it as their next pickup.',
        inputSchema: {
            type: 'object',
            properties: {
                title: { type: 'string' },
                project: { type: 'string' },
                workstream: { type: 'string' },
                priority: { type: 'string', enum: ['P0', 'P1', 'P2', 'P3'], default: 'P1' },
                description: { type: 'string' },
                assigned_to_agent: { type: 'string', description: 'Specific agent ID to assign to' },
                assigned_to_capability: { type: 'string', description: 'Any agent with this capability' },
                delegated_by: { type: 'string', description: 'Your agent_id (the delegating agent)' },
                parent_task_id: { type: 'string' },
            },
            required: ['title', 'project', 'workstream', 'delegated_by'],
        },
    },
    {
        name: 'notify_agent',
        description: 'Send a message or signal to a specific connected agent. Use for coordination, reviews, escalations.',
        inputSchema: {
            type: 'object',
            properties: {
                from_agent_id: { type: 'string', description: 'Your agent ID' },
                to_agent_id: { type: 'string', description: 'Target agent ID' },
                message: { type: 'string', description: 'Message or instruction' },
                task_id: { type: 'string', description: 'Related task ID (optional)' },
            },
            required: ['from_agent_id', 'to_agent_id', 'message'],
        },
    },
    {
        name: 'spawn_subtask',
        description: 'Create a child task under a parent. The parent task only completes when all subtasks are done.',
        inputSchema: {
            type: 'object',
            properties: {
                parent_task_id: { type: 'string', description: 'Parent task ID' },
                title: { type: 'string' },
                workstream: { type: 'string' },
                priority: { type: 'string', enum: ['P0', 'P1', 'P2', 'P3'], default: 'P1' },
                description: { type: 'string' },
                assigned_to_capability: { type: 'string' },
                assigned_to_agent: { type: 'string' },
                spawned_by: { type: 'string', description: 'Your agent_id' },
            },
            required: ['parent_task_id', 'title', 'workstream', 'spawned_by'],
        },
    },
    // Vault Operations
    {
        name: 'get_secret',
        description: 'Securely retrieve a decrypted secret/credential from the Vault by its title.',
        inputSchema: {
            type: 'object',
            properties: {
                title: { type: 'string', description: 'Title of the secret (e.g., OPENAI_API_KEY, github-token)' },
            },
            required: ['title']
        }
    },
    {
        name: 'set_secret',
        description: 'Securely encrypt and store a new secret/credential in the Vault.',
        inputSchema: {
            type: 'object',
            properties: {
                title: { type: 'string', description: 'Unique title for the secret' },
                value: { type: 'string', description: 'The plain-text secret to encrypt and store' },
            },
            required: ['title', 'value']
        }
    },
    {
        name: 'list_secrets',
        description: 'List all available secret titles stored in the Vault. Does not reveal their values.',
        inputSchema: { type: 'object', properties: {} }
    }
];

// â”€â”€ Tool Handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function handleTool(name: string, args: Record<string, unknown>): Promise<string> {
    const now = () => new Date().toISOString();

    switch (name) {

        case 'list_tasks': {
            const status = (args.status as string) ?? 'queued';
            const all = await getTasks();
            let results = all.filter(t => t.status === status);
            if (args.project) results = results.filter(t => t.project === args.project);
            if (args.workstream) results = results.filter(t => t.workstream === args.workstream);
            if (args.priority) results = results.filter(t => t.priority === args.priority);
            if (args.assigned_to_agent) results = results.filter(t => t.assigned_to_agent === args.assigned_to_agent);
            if (args.assigned_to_capability) results = results.filter(t => t.assigned_to_capability === args.assigned_to_capability);
            const priorityOrder: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
            results.sort((a, b) => (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9));
            return JSON.stringify({ count: results.length, tasks: results }, null, 2);
        }

        case 'claim_task': {
            const task = await getTask(args.task_id as string);
            if (!task) return JSON.stringify({ error: `Task ${args.task_id} not found` });
            if (task.status !== 'queued' && task.status !== 'handoff')
                return JSON.stringify({ error: `Task ${args.task_id} is already ${task.status} by ${task.claimed_by}` });
            task.status = 'active';
            task.claimed_by = args.agent_id as string;
            task.claimed_at = now();
            task.updated = now();
            await saveTask(task);
            // Register agent if not already known
            let agent = await getAgent(args.agent_id as string);
            if (!agent) {
                agent = {
                    agent_id: args.agent_id as string,
                    tool: (args.tool as any) ?? 'unknown',
                    capabilities: (args.capabilities as string[]) ?? [],
                    session_id: uuidv4(),
                    connected_at: now(),
                    last_seen: now(),
                    active_task_id: task.id,
                    notifications: [],
                };
            } else {
                agent.active_task_id = task.id;
                agent.last_seen = now();
            }
            await saveAgent(agent);
            return JSON.stringify({ success: true, task, agent_registered: true });
        }

        case 'complete_task': {
            const task = await getTask(args.task_id as string);
            if (!task) return JSON.stringify({ error: `Task ${args.task_id} not found` });
            if (task.claimed_by !== args.agent_id)
                return JSON.stringify({ error: `Task ${args.task_id} is claimed by ${task.claimed_by}, not ${args.agent_id}` });
            task.status = 'done';
            task.completed_at = now();
            task.updated = now();
            if (args.artifacts) task.artifacts = args.artifacts as string[];
            if (args.note) task.handoff_note = args.note as string;
            await saveTask(task);

            // ARCHAEON: Asynchronously capture this resolution as a training triple
            // Note: We don't await this because we don't want to block the dispatch response
            logArchaeonTrainingSample(task, true, 0).catch(err => console.error('[archaeon]', err));

            // Update agent
            const agent = await getAgent(args.agent_id as string);
            if (agent) { agent.active_task_id = null; agent.last_seen = now(); await saveAgent(agent); }
            // If this is a subtask, check if parent can now complete
            let parentStatus = null;
            if (task.parent_task_id) {
                const allTasks = await getTasks();
                const siblings = allTasks.filter(t => t.parent_task_id === task.parent_task_id && t.id !== task.id);
                if (siblings.every(t => t.status === 'done')) parentStatus = 'all subtasks complete â€” parent can now be completed';
            }
            return JSON.stringify({ success: true, task, parent_note: parentStatus });
        }

        case 'force_complete': {
            const task = await getTask(args.task_id as string);
            if (!task) return JSON.stringify({ error: `Task ${args.task_id} not found` });
            if (task.status === 'done') {
                return JSON.stringify({ success: true, already_done: true, task });
            }
            task.status = 'done';
            task.completed_at = now();
            task.updated = now();
            task.handoff_note = args.note as string;
            task.claimed_by = task.claimed_by ?? (args.agent_id as string);
            if (args.artifacts) task.artifacts = args.artifacts as string[];
            await saveTask(task);

            // ARCHAEON: Asynchronously capture this resolution as a training triple
            logArchaeonTrainingSample(task, true, 0).catch(err => console.error('[archaeon]', err));

            // Clear agent's active task if they had it
            const fcAgent = await getAgent(args.agent_id as string);
            if (fcAgent && fcAgent.active_task_id === task.id) {
                fcAgent.active_task_id = null;
                fcAgent.last_seen = now();
                await saveAgent(fcAgent);
            }
            return JSON.stringify({ success: true, task });
        }

        case 'add_task': {
            // Accept `helix` as an alias for `workstream` (REST convenience)
            const workstream = (args.workstream ?? args.helix ?? 'general') as string;
            const newTask: Task = {
                id: `T${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Math.floor(Math.random() * 900) + 100)}`,
                org: 'Creative Liberation Engine Community',
                project: (args.project as string) ?? 'brainchild-v5',
                workstream,
                title: args.title as string,
                description: args.description as string | undefined,
                acceptance_criteria: args.acceptance_criteria as string[] | undefined,
                priority: (args.priority as any) ?? 'P2',
                status: 'queued',
                dependencies: (args.dependencies as string[]) ?? [],
                parent_task_id: (args.parent_task_id as string) ?? null,
                spawned_by: null,
                assigned_to_agent: (args.assigned_to_agent as string) ?? null,
                assigned_to_capability: (args.assigned_to_capability as string) ?? null,
                claimed_by: null, claimed_at: null, completed_at: null,
                handoff_note: null, artifacts: [],
                created: now(), created_by: (args.created_by as string) ?? 'system', updated: now(),
            };
            await saveTask(newTask);
            return JSON.stringify({ success: true, task: newTask });
        }

        case 'handoff_task': {
            const task = await getTask(args.task_id as string);
            if (!task) return JSON.stringify({ error: `Task ${args.task_id} not found` });
            task.status = 'handoff';
            task.claimed_by = null;
            task.claimed_at = null;
            task.handoff_note = args.note as string;
            task.updated = now();
            await saveTask(task);
            const agent = await getAgent(args.agent_id as string);
            if (agent) { agent.active_task_id = null; agent.last_seen = now(); await saveAgent(agent); }
            return JSON.stringify({ success: true, task });
        }

        case 'get_status': {
            const [tasks, agents, projects] = await Promise.all([getTasks(), getAgents(), getProjects()]);
            const queued = tasks.filter(t => t.status === 'queued').length;
            const active = tasks.filter(t => t.status === 'active').length;
            const done = tasks.filter(t => t.status === 'done').length;
            const blocked = tasks.filter(t => t.status === 'blocked').length;
            return JSON.stringify({
                summary: { queued, active, done, blocked, total_agents: agents.length, total_projects: projects.length },
                active_agents: agents.filter(a => a.active_task_id),
                idle_agents: agents.filter(a => !a.active_task_id),
                queued_tasks: tasks.filter(t => t.status === 'queued').slice(0, 10),
                active_tasks: tasks.filter(t => t.status === 'active'),
            }, null, 2);
        }

        case 'list_projects': {
            const projects = await getProjects();
            const filtered = args.active_only !== false ? projects.filter(p => p.active) : projects;
            return JSON.stringify({ count: filtered.length, projects: filtered }, null, 2);
        }

        case 'delegate_task': {
            const delegated: Task = {
                id: `T${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Math.floor(Math.random() * 900) + 100)}`,
                org: 'Creative Liberation Engine Community',
                project: args.project as string,
                workstream: args.workstream as string,
                title: args.title as string,
                description: args.description as string | undefined,
                acceptance_criteria: undefined,
                priority: (args.priority as any) ?? 'P1',
                status: 'queued',
                dependencies: [],
                parent_task_id: (args.parent_task_id as string) ?? null,
                spawned_by: args.delegated_by as string,
                assigned_to_agent: (args.assigned_to_agent as string) ?? null,
                assigned_to_capability: (args.assigned_to_capability as string) ?? null,
                claimed_by: null, claimed_at: null, completed_at: null,
                handoff_note: null, artifacts: [],
                created: now(), created_by: args.delegated_by as string, updated: now(),
            };
            await saveTask(delegated);
            // Notify target agent if they're connected
            if (args.assigned_to_agent) {
                const target = await getAgent(args.assigned_to_agent as string);
                if (target) {
                    const notif: AgentNotification = {
                        from: args.delegated_by as string,
                        message: `Delegated task: ${delegated.title} [${delegated.id}]`,
                        task_id: delegated.id,
                        sent_at: now(),
                        read: false,
                    };
                    target.notifications.push(notif);
                    await saveAgent(target);
                }
            }
            return JSON.stringify({ success: true, task: delegated });
        }

        case 'notify_agent': {
            const target = await getAgent(args.to_agent_id as string);
            if (!target) return JSON.stringify({ error: `Agent ${args.to_agent_id} not found or not connected` });
            const notif: AgentNotification = {
                from: args.from_agent_id as string,
                message: args.message as string,
                task_id: args.task_id as string | undefined,
                sent_at: now(),
                read: false,
            };
            target.notifications.push(notif);
            await saveAgent(target);
            return JSON.stringify({ success: true, notification: notif });
        }

        case 'spawn_subtask': {
            const parent = await getTask(args.parent_task_id as string);
            if (!parent) return JSON.stringify({ error: `Parent task ${args.parent_task_id} not found` });
            const sub: Task = {
                id: `T${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Math.floor(Math.random() * 900) + 100)}`,
                org: parent.org,
                project: parent.project,
                workstream: args.workstream as string,
                title: args.title as string,
                description: args.description as string | undefined,
                acceptance_criteria: undefined,
                priority: (args.priority as any) ?? 'P1',
                status: 'queued',
                dependencies: [],
                parent_task_id: parent.id,
                spawned_by: args.spawned_by as string,
                assigned_to_agent: (args.assigned_to_agent as string) ?? null,
                assigned_to_capability: (args.assigned_to_capability as string) ?? null,
                claimed_by: null, claimed_at: null, completed_at: null,
                handoff_note: null, artifacts: [],
                created: now(), created_by: args.spawned_by as string, updated: now(),
            };
            await saveTask(sub);
            return JSON.stringify({ success: true, subtask: sub, parent_id: parent.id });
        }

        case 'list_secrets': {
            const keys = await listSecrets();
            return JSON.stringify({ count: keys.length, secrets: keys }, null, 2);
        }

        case 'get_secret': {
            try {
                const value = await getSecret(args.title as string);
                if (value === undefined) return JSON.stringify({ error: `Secret not found or decryption failed: ${args.title}` });
                return JSON.stringify({ title: args.title, value });
            } catch (err: any) {
                return JSON.stringify({ error: err.message });
            }
        }

        case 'set_secret': {
            try {
                await setSecret(args.title as string, args.value as string);
                return JSON.stringify({ success: true, title: args.title });
            } catch (err: any) {
                return JSON.stringify({ error: err.message });
            }
        }

        default:
            return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
}

// â”€â”€ MCP Server Factory â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function createMcpServer(): Server {
    const server = new Server(
        { name: 'inception-dispatch', version: '1.0.0' },
        { capabilities: { tools: {} } }
    );

    server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));
    server.setRequestHandler(CallToolRequestSchema, async (req) => {
        const result = await handleTool(req.params.name, (req.params.arguments ?? {}) as Record<string, unknown>);
        return { content: [{ type: 'text', text: result }] };
    });

    return server;
}

// â”€â”€ Express Routes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// MCP over SSE â€” one transport per client session
app.get('/sse', async (req, res) => {
    const sessionId = uuidv4();
    const transport = new SSEServerTransport('/messages', res);
    activeTransports.set(sessionId, transport);

    const mcpServer = createMcpServer();
    await mcpServer.connect(transport);

    req.on('close', () => {
        activeTransports.delete(sessionId);
        console.log(`[dispatch] Agent disconnected â€” session ${sessionId}`);
    });

    console.log(`[dispatch] Agent connected via SSE â€” session ${sessionId}`);
});

app.post('/messages', async (req, res) => {
    // Route message to correct SSE transport
    const sessionId = req.query.sessionId as string;
    const transport = activeTransports.get(sessionId);
    if (!transport) { res.status(404).json({ error: 'Session not found' }); return; }
    await transport.handlePostMessage(req, res);
});

// REST API â€” plain HTTP for non-MCP clients
app.get('/api/status', async (_, res) => { res.json(JSON.parse(await handleTool('get_status', {}))) });
app.get('/api/tasks', async (req, res) => { res.json(JSON.parse(await handleTool('list_tasks', req.query as any))) });
app.get('/api/projects', async (_, res) => { res.json(JSON.parse(await handleTool('list_projects', {}))) });
// NOTE: POST /api/tasks is defined below with SSE broadcast

// REST API â€” Agent-to-Agent Dispatch Stub (Wave 17)
app.all('/api/a2a/dispatch', async (req, res) => {
    // Stub to prevent 404s during A2A orchestration
    console.log(`[A2A] Dispatch stub hit: ${req.method} /api/a2a/dispatch`);
    res.json({ success: true, message: 'A2A dispatch stub reached' });
});

// REST API â€” Vault
app.get('/api/vault', async (_, res) => { res.json(JSON.parse(await handleTool('list_secrets', {}))) });
app.post('/api/vault', async (req, res) => { res.json(JSON.parse(await handleTool('set_secret', req.body))) });
app.delete('/api/vault/:id', async (req, res) => {
    const success = await deleteSecret(req.params.id);
    if (!success) { res.status(404).json({ error: `Secret ${req.params.id} not found` }); return; }
    res.json({ success: true });
});

// REST API â€” Peripheral Sovereign Identity (PSI)
app.get('/api/psi/profile', async (req, res) => {
    const deviceClass = req.query.class as string;
    
    // In a full implementation, we would query the database for the user's active Aura for this class.
    // For now, we return a hardcoded default Aura to get the daemon MVP working.
    res.json({
        id: `default-${deviceClass ?? 'unknown'}-1`,
        name: `Default Navigation Aura (${deviceClass})`,
        device_class: deviceClass ?? 'unknown',
        owner: 'system',
        updated_at: new Date().toISOString(),
        mappings: [
            {
                capability: 'side_button_1',
                action: { type: 'os', value: 'browser_back' }
            },
            {
                capability: 'side_button_2',
                action: { type: 'os', value: 'browser_forward' }
            }
        ]
    });
});

// REST API â€” DIRA resolution metrics
app.get('/dira/metrics', async (_, res) => {
    try {
        const allTasks = await getTasks();
        const now = Date.now();
        const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

        // Build 7-day date buckets
        const buckets: Record<string, { resolved: number; escalated: number; auto_resolved: number }> = {};
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now - i * 24 * 60 * 60 * 1000);
            buckets[d.toISOString().slice(0, 10)] = { resolved: 0, escalated: 0, auto_resolved: 0 };
        }

        let total_cases = 0, auto_resolved = 0, escalated = 0, total_resolve_ms = 0, resolved_count = 0;
        const workflow_map: Record<string, { count: number; auto: number }> = {};
        const type_map: Record<string, number> = {};

        for (const task of allTasks) {
            // Only count tasks from last 7 days
            const created = new Date(task.created ?? task.updated ?? now).getTime();
            if (now - created > SEVEN_DAYS_MS) continue;

            total_cases++;
            const dateKey = new Date(created).toISOString().slice(0, 10);
            const bucket = buckets[dateKey];

            const isDone = task.status === 'done';
            const isEscalated = task.status === 'blocked' || (task as any).escalated;
            const isAutoResolved = isDone && !!(task as any).auto_resolved;

            if (isDone && bucket)    { bucket.resolved++; }
            if (isEscalated && bucket) { bucket.escalated++; escalated++; }
            if (isAutoResolved)      { auto_resolved++; if (bucket) bucket.auto_resolved++; }

            if (isDone) {
                resolved_count++;
                const created_ms = new Date(task.created ?? task.updated ?? now).getTime();
                const updated_ms = new Date(task.updated ?? now).getTime();
                total_resolve_ms += Math.max(0, updated_ms - created_ms);
            }

            // Workflow stats
            const wf = task.workstream ?? 'unknown';
            if (!workflow_map[wf]) workflow_map[wf] = { count: 0, auto: 0 };
            workflow_map[wf].count++;
            if (isAutoResolved) workflow_map[wf].auto++;

            // Type breakdown using workstream as category
            const tp = task.workstream ?? 'general';
            type_map[tp] = (type_map[tp] ?? 0) + 1;
        }

        const top_workflows = Object.entries(workflow_map)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 5)
            .map(([workflow, s]) => ({
                workflow,
                count: s.count,
                auto_resolved_pct: s.count > 0 ? s.auto / s.count : 0,
            }));

        res.json({
            total_cases,
            auto_resolved,
            escalated,
            avg_resolve_ms: resolved_count > 0 ? Math.round(total_resolve_ms / resolved_count) : 0,
            resolution_rate: total_cases > 0 ? (resolved_count / total_cases) : 0,
            rolling_7d: Object.entries(buckets).map(([date, b]) => ({ date, ...b })),
            top_workflows,
            case_type_breakdown: type_map,
        });
    } catch (err) {
        console.error('[dira/metrics] Error:', err);
        res.status(500).json({ error: String(err) });
    }
});

// â”€â”€ SSE Event Stream (Real-time console) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// Track all browser SSE clients
const sseClients = new Set<{
    res: import('express').Response;
    id: string;
}>();

// â”€â”€ Capability Version State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Tracks the current instruction-layer version (AGENTS.md + skills + workflows).
// Incremented whenever a capability_update broadcast is fired.
// Windows compare this on boot to detect stale context.
interface CapabilityVersion {
    hash: string;
    timestamp: string;
    changed_files: string[];
    source: string;
}
let currentCapabilityVersion: CapabilityVersion = {
    hash: 'boot-' + Date.now().toString(36),
    timestamp: new Date().toISOString(),
    changed_files: [],
    source: 'boot',
};

// Push event to all connected SSE clients
function broadcastEvent(event: string, data: unknown) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of sseClients) {
        try { client.res.write(payload); } catch { sseClients.delete(client); }
    }
}

// GET /api/events â€” SSE stream for live console updates
app.get('/api/events', async (req, res) => {
    const clientId = uuidv4();
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
        'Access-Control-Allow-Origin': '*',
    });

    // Send initial connection event
    res.write(`event: connected\ndata: ${JSON.stringify({ client_id: clientId, timestamp: new Date().toISOString() })}\n\n`);

    // Send full state immediately on connect
    const snap = JSON.parse(await handleTool('get_status', {}));
    res.write(`event: status\ndata: ${JSON.stringify(snap)}\n\n`);

    const client = { res, id: clientId };
    sseClients.add(client);
    console.log(`[dispatch:sse] Client connected â€” ${clientId} (${sseClients.size} total)`);

    // Heartbeat every 20s to keep connection alive through proxies
    const heartbeat = setInterval(() => {
        try { res.write(`:heartbeat\n\n`); } catch { clearInterval(heartbeat); }
    }, 20_000);

    req.on('close', () => {
        clearInterval(heartbeat);
        sseClients.delete(client);
        console.log(`[dispatch:sse] Client disconnected â€” ${clientId} (${sseClients.size} remaining)`);
    });
});

// Patch saveTask + saveAgent to auto-broadcast on every mutation
const _origSaveTask = saveTask;
const _origSaveAgent = saveAgent;
const _origRemoveAgent = removeAgent;

// Wrap with broadcast â€” safe even if broadcast throws
async function broadcastingHandleTool(name: string, args: Record<string, unknown>) {
    const result = await handleTool(name, args);
    // After any mutating tool, push a fresh status snapshot to all SSE clients
    if (['claim_task', 'complete_task', 'add_task', 'handoff_task', 'delegate_task', 'spawn_subtask', 'notify_agent'].includes(name)) {
        try {
            const snap = JSON.parse(await handleTool('get_status', {}));
            broadcastEvent('status', snap);
        } catch { }
    }
    return result;
}

// Override MCP handler to use broadcasting version
function createBroadcastingMcpServer(): Server {
    const server = new Server(
        { name: 'inception-dispatch', version: '1.0.0' },
        { capabilities: { tools: {} } }
    );
    server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));
    server.setRequestHandler(CallToolRequestSchema, async (req) => {
        const result = await broadcastingHandleTool(req.params.name, (req.params.arguments ?? {}) as Record<string, unknown>);
        return { content: [{ type: 'text', text: result }] };
    });
    return server;
}

// Also broadcast after REST mutations
app.post('/api/tasks', async (req, res) => {
    const result = JSON.parse(await handleTool('add_task', req.body));
    res.json(result);
    // Broadcast to SSE clients
    try { const snap = JSON.parse(await handleTool('get_status', {})); broadcastEvent('status', snap); } catch { }
});

app.post('/api/tasks/claim', async (req, res) => {
    const result = JSON.parse(await handleTool('claim_task', req.body));
    if (result.error) {
        res.status(400).json(result);
        return;
    }
    res.json(result);
    // Broadcast
    try { const snap = JSON.parse(await handleTool('get_status', {})); broadcastEvent('status', snap); } catch { }
});

app.patch('/api/tasks/:id', async (req, res) => {
    const task = await getTask(req.params.id);
    if (!task) { res.status(404).json({ error: `Task ${req.params.id} not found` }); return; }
    const now = new Date().toISOString();
    const allowed: (keyof Task)[] = ['status', 'priority', 'title', 'handoff_note', 'artifacts'];
    for (const key of allowed) { if (req.body[key] !== undefined) (task as any)[key] = req.body[key]; }
    task.updated = now;
    if (req.body.status === 'done' && !task.completed_at) task.completed_at = now;
    await saveTask(task);
    res.json({ success: true, task });
    // Broadcast
    try { const snap = JSON.parse(await handleTool('get_status', {})); broadcastEvent('status', snap); } catch { }
});

// POST /api/tasks/:id/resolve â€” force-complete a task without requiring it to be claimed first.
// Used by Creative Liberation Engine when work is done async or before a formal claim (e.g. stale queue cleanup).
// Body: { agent_id: string, note: string, artifacts?: string[] }
app.post('/api/tasks/:id/resolve', async (req, res) => {
    const { agent_id, note, artifacts } = req.body as {
        agent_id?: string;
        note?: string;
        artifacts?: string[];
    };
    if (!agent_id || !note) {
        res.status(400).json({ error: 'agent_id and note are required' });
        return;
    }
    const result = JSON.parse(
        await handleTool('force_complete', {
            task_id: req.params.id,
            agent_id,
            note,
            ...(artifacts ? { artifacts } : {}),
        })
    );
    if (result.error) {
        res.status(result.error.includes('not found') ? 404 : 400).json(result);
        return;
    }
    res.json(result);
    // Broadcast live status to SSE dashboard
    try { const snap = JSON.parse(await handleTool('get_status', {})); broadcastEvent('status', snap); } catch { }
});

// Health check
app.get('/health', (_, res) => res.json({ status: 'ok', service: 'inception-dispatch', version: '1.0.0', sse_clients: sseClients.size }));

// â”€â”€ Capability Hot-Reload Endpoints â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// POST /api/capabilities/broadcast â€” announce a capability change to all SSE clients.
// Called by the capability-watcher daemon on file changes, or manually by any agent.
// Body: { changed_files?: string[], source?: 'watcher' | 'manual' | 'deploy' }
app.post('/api/capabilities/broadcast', (req, res) => {
    const changed_files: string[] = Array.isArray(req.body?.changed_files) ? req.body.changed_files : [];
    const source: string = typeof req.body?.source === 'string' ? req.body.source : 'manual';
    currentCapabilityVersion = {
        hash: uuidv4().slice(0, 8),
        timestamp: new Date().toISOString(),
        changed_files,
        source,
    };
    broadcastEvent('capability_update', currentCapabilityVersion);
    console.log(`[dispatch:capability] Broadcast fired â€” hash=${currentCapabilityVersion.hash} files=[${changed_files.join(', ')}] source=${source}`);
    res.json({ success: true, version: currentCapabilityVersion, sse_clients_notified: sseClients.size });
});

// GET /api/capabilities/version â€” returns current capability version hash.
// Windows call this on boot to detect whether their loaded context is already stale.
app.get('/api/capabilities/version', (_req, res) => {
    res.json(currentCapabilityVersion);
});

// â”€â”€ Smart Task Pickup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// GET /api/tasks/next â€” returns the highest-priority unclaimed task that matches
// the requesting agent's capability/workstream, skipping tasks already active in
// another agent. This is the backbone of the /auto-loop protocol.
app.get('/api/tasks/next', async (req, res) => {
    const agentId = req.query.agent_id as string | undefined;
    const capability = req.query.agent_capability as string | undefined;

    const all = await getTasks();
    const agents = await getAgents();

    // Workstreams already held by active (non-stale) agents (excluding caller)
    const activeWorkstreams = new Set<string>();
    for (const a of agents) {
        if (a.agent_id === agentId) continue;
        if (computeStatus(a.last_seen) === 'stale') continue;
        if (a.workstream && a.active_task_id) activeWorkstreams.add(a.workstream);
    }

    const priorityOrder: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };

    let candidates = all
        .filter(t => t.status === 'queued' || t.status === 'handoff')
        .filter(t => {
            // Skip tasks assigned to a specific different agent
            if (t.assigned_to_agent && t.assigned_to_agent !== agentId) return false;
            // Skip tasks whose workstream is actively held by another agent
            if (activeWorkstreams.has(t.workstream)) return false;
            // Filter by capability match if provided
            if (capability && t.assigned_to_capability && t.assigned_to_capability !== capability) return false;
            // Prefer tasks matching the agent's capability workstream
            return true;
        })
        .sort((a, b) => {
            const pa = priorityOrder[a.priority] ?? 9;
            const pb = priorityOrder[b.priority] ?? 9;
            if (pa !== pb) return pa - pb;
            // Tiebreak: oldest first
            return new Date(a.created).getTime() - new Date(b.created).getTime();
        });

    if (candidates.length === 0) {
        res.json({ next: null, message: 'Queue empty or no tasks match your capabilities' });
        return;
    }

    res.json({ next: candidates[0], queue_depth: candidates.length });
});

// â”€â”€ Blocker API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// The BLOCKER protocol lets browser/COMET agents signal that they need terminal,
// sudo, or password work done. IDE agents pick these up on boot/heartbeat.

// GET /api/blockers â€” list blockers, filter by status and/or severity
app.get('/api/blockers', (req, res) => {
    let results = Array.from(blockerStore.values());
    const status = req.query.status as string | undefined;
    const severity = req.query.severity as string | undefined;

    if (status) {
        const statuses = status.split(',') as BlockerStatus[];
        results = results.filter(b => statuses.includes(b.status));
    }
    if (severity) {
        const sevs = severity.split(',') as BlockerSeverity[];
        results = results.filter(b => sevs.includes(b.severity));
    }

    // Sort: P0 first, then P1, then by filed_at
    const sevOrder: Record<string, number> = { P0: 0, P1: 1, P2: 2 };
    results.sort((a, b) => (sevOrder[a.severity] ?? 9) - (sevOrder[b.severity] ?? 9));

    res.json({ count: results.length, blockers: results });
});

// POST /api/blockers â€” file a new blocker
app.post('/api/blockers', (req, res) => {
    const { id, severity, type, filed_by, task_id, description } = req.body as Partial<Blocker>;
    if (!id || !severity || !type || !filed_by || !description) {
        res.status(400).json({ error: 'id, severity, type, filed_by, and description are required' });
        return;
    }
    if (blockerStore.has(id)) {
        res.status(409).json({ error: `Blocker ${id} already exists` });
        return;
    }
    const now = new Date().toISOString();
    const blocker: Blocker = {
        id, severity, type, filed_by, task_id, description,
        status: 'OPEN', filed_at: now, updated_at: now,
    };
    blockerStore.set(id, blocker);
    broadcastEvent('blocker', { event: 'filed', blocker });
    console.log(`[dispatch:blockers] OPEN ${severity} ${type} â€” ${id} by ${filed_by}`);
    res.json({ success: true, blocker });
});

// POST /api/blockers/:id/claim â€” IDE agent claims a blocker to work on it
app.post('/api/blockers/:id/claim', (req, res) => {
    const blocker = blockerStore.get(req.params.id);
    if (!blocker) { res.status(404).json({ error: `Blocker ${req.params.id} not found` }); return; }
    if (blocker.status !== 'OPEN') {
        res.status(400).json({ error: `Blocker ${req.params.id} is already ${blocker.status}` });
        return;
    }
    const { agent_id } = req.body as { agent_id?: string };
    if (!agent_id) { res.status(400).json({ error: 'agent_id required' }); return; }
    blocker.status = 'CLAIMED';
    blocker.claimed_by = agent_id;
    blocker.updated_at = new Date().toISOString();
    broadcastEvent('blocker', { event: 'claimed', blocker });
    console.log(`[dispatch:blockers] CLAIMED ${blocker.id} by ${agent_id}`);
    res.json({ success: true, blocker });
});

// POST /api/blockers/:id/resolve â€” mark a blocker resolved with a note
app.post('/api/blockers/:id/resolve', (req, res) => {
    const blocker = blockerStore.get(req.params.id);
    if (!blocker) { res.status(404).json({ error: `Blocker ${req.params.id} not found` }); return; }
    const { agent_id, note } = req.body as { agent_id?: string; note?: string };
    if (!agent_id || !note) { res.status(400).json({ error: 'agent_id and note required' }); return; }
    blocker.status = 'RESOLVED';
    blocker.resolved_by = agent_id;
    blocker.resolution_note = note;
    blocker.updated_at = new Date().toISOString();
    broadcastEvent('blocker', { event: 'resolved', blocker });
    console.log(`[dispatch:blockers] RESOLVED ${blocker.id} by ${agent_id}: ${note}`);
    res.json({ success: true, blocker });
});

// Redis proxy health check (since Redis has no native HTTP port for dashboard polling)
app.get('/health/redis', (req, res) => {
    const client = net.createConnection({
        host: process.env.REDIS_HOST || '127.0.0.1', // or localhost if running locally
        port: parseInt(process.env.REDIS_PORT || '6379')
    }, () => {
        client.write('PING\r\n');
    });

    let answered = false;
    client.on('data', (data) => {
        if (data.toString().includes('PONG') || data.toString().includes('NOAUTH')) {
            answered = true;
            client.end();
            res.status(200).json({ status: 'ok', service: 'redis' });
        }
    });

    client.on('error', (err) => {
        if (!answered) {
            answered = true;
            res.status(503).json({ status: 'error', error: err.message });
        }
    });

    setTimeout(() => {
        if (!answered) {
            answered = true;
            client.destroy();
            res.status(504).json({ status: 'timeout' });
        }
    }, 2000);
});

// â”€â”€ Agent REST API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// GET /api/agents â€” list all agents with live stale detection
const STALE_MS = 5 * 60 * 1000;  // 5 minutes
const IDLE_MS = 30 * 1000;      // 30 seconds

function computeStatus(lastSeen: string): 'active' | 'idle' | 'stale' {
    const age = Date.now() - new Date(lastSeen).getTime();
    if (age > STALE_MS) return 'stale';
    if (age > IDLE_MS) return 'idle';
    return 'active';
}

app.get('/api/agents', async (req, res) => {
    const agents = await getAgents();
    const enriched = agents.map(a => ({ ...a, status: computeStatus(a.last_seen) }));

    // ?type= filter: browser-extension | COMET | playwright-headless | cle
    // Agents register their tool type via the heartbeat. This lets /browser-ideate
    // query "give me all active browser-extension agents" without loading the full roster.
    const typeFilter = req.query.type as string | undefined;
    const filtered = typeFilter
        ? enriched.filter(a => (a as any).tool === typeFilter)
        : enriched;

    res.json({
        total: filtered.length,
        active: filtered.filter(a => a.status === 'active'),
        idle: filtered.filter(a => a.status === 'idle'),
        stale: filtered.filter(a => a.status === 'stale'),
    });
});

// GET /api/agents/:id â€” get a specific agent
app.get('/api/agents/:id', async (req, res) => {
    const agent = await getAgent(req.params.id);
    if (!agent) { res.status(404).json({ error: `Agent ${req.params.id} not found` }); return; }
    res.json(agent);
});

// GET /api/agents/:id/tabs â€” return the tab manifest last uploaded by this agent
// Browser extensions push tab_manifest on every heartbeat so this is always fresh.
// Used by /browser-ideate workflow to get the user's real tab list without a round-trip to the extension.
app.get('/api/agents/:id/tabs', async (req, res) => {
    const agent = await getAgent(req.params.id);
    if (!agent) { res.status(404).json({ error: `Agent ${req.params.id} not found` }); return; }
    const manifest = (agent as any).tab_manifest ?? [];
    const status = computeStatus(agent.last_seen);
    res.json({
        agent_id: agent.agent_id,
        browser_family: (agent as any).browser_family ?? 'unknown',
        status,
        tab_count: manifest.length,
        tabs: manifest,
        last_seen: agent.last_seen,
    });
});

// DELETE /api/agents/:id â€” disconnect/remove an agent from the registry
app.delete('/api/agents/:id', async (req, res) => {
    const agent = await getAgent(req.params.id);
    if (!agent) { res.status(404).json({ error: `Agent ${req.params.id} not found` }); return; }
    await removeAgent(req.params.id);
    console.log(`[dispatch] Agent ${req.params.id} removed via REST`);
    res.json({ success: true, removed: req.params.id });
});

// POST /api/agents/heartbeat â€” fire-and-forget from every IDE window on every response
// Body: { agent_id, window?, workstream?, current_task?, tool?, capabilities? }
// Creates agent if not exists. Updates last_seen always. Broadcasts SSE heartbeat event.
app.post('/api/agents/heartbeat', async (req, res) => {
    const now = new Date().toISOString();
    const { agent_id, window: win, workstream, current_task, tool, capabilities } = req.body as {
        agent_id: string;
        window?: string;
        workstream?: string;
        current_task?: string;
        tool?: string;
        capabilities?: string[];
    };

    if (!agent_id) { res.status(400).json({ error: 'agent_id required' }); return; }

    // Extra fields carried by browser-extension agents
    const { browser_family, tab_manifest, all_tabs_count } = req.body as {
        browser_family?: string;
        tab_manifest?: Array<{ url: string; title: string; tabId: number }>;
        all_tabs_count?: number;
    };

    let agent = await getAgent(agent_id);
    if (!agent) {
        // Auto-register on first heartbeat
        agent = {
            agent_id,
            tool: (tool as any) ?? 'cle',
            capabilities: capabilities ?? [],
            session_id: uuidv4(),
            connected_at: now,
            last_seen: now,
            active_task_id: null,
            notifications: [],
        } as any;
    } else {
        agent.last_seen = now;
        if (capabilities) agent.capabilities = capabilities;
        if (tool) agent.tool = tool as any;
    }

    // agent is always defined here: either auto-created above or fetched from store
    const definedAgent = agent!;

    // Persist browser-specific fields so GET /api/agents/:id/tabs always has fresh data
    if (browser_family) (definedAgent as any).browser_family = browser_family;
    if (tab_manifest) (definedAgent as any).tab_manifest = tab_manifest;
    if (all_tabs_count !== undefined) (definedAgent as any).all_tabs_count = all_tabs_count;

    // Heartbeat-specific fields
    if (win) definedAgent.window = win;
    if (workstream) definedAgent.workstream = workstream;
    if (current_task !== undefined) definedAgent.current_task = current_task;
    definedAgent.status = 'active'; // freshly seen = active

    await saveAgent(definedAgent);

    // Broadcast live window map to all SSE dashboard clients
    const allAgents = await getAgents();
    const enriched = allAgents.map(a => ({ ...a, status: computeStatus(a.last_seen) }));
    broadcastEvent('heartbeat', {
        agent_id,
        window: win,
        workstream,
        current_task,
        last_seen: now,
        total_agents: enriched.length,
        active: enriched.filter(a => a.status === 'active').length,
        idle: enriched.filter(a => a.status === 'idle').length,
        stale: enriched.filter(a => a.status === 'stale').length,
        windows: enriched.map(a => ({
            agent_id: a.agent_id,
            window: a.window ?? '?',
            workstream: a.workstream ?? 'free',
            status: a.status,
            current_task: a.current_task ?? null,
            last_seen: a.last_seen,
        })),
    });

    res.json({ ok: true, agent_id, last_seen: now });
});


// â”€â”€ Federation REST API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

import {
    registerPeer,
    removePeer,
    getAllPeers,
    getPeerHealthSummaries,
} from './federation/peer-registry.js';
import { startGossip } from './federation/gossip.js';
import { buildMeshHealthSnapshot } from './federation/mesh-health.js';

// POST /api/federation/peer â€” register a new peer IE dispatch
app.post('/api/federation/peer', (req, res) => {
    const { name, endpoint, authToken, capabilities, workstreams } = req.body as {
        name?: string;
        endpoint?: string;
        authToken?: string;
        capabilities?: string[];
        workstreams?: string[];
    };

    if (!name || !endpoint) {
        res.status(400).json({ error: '`name` and `endpoint` are required' });
        return;
    }

    const peer = registerPeer({ name, endpoint, authToken, capabilities, workstreams });
    // Broadcast updated mesh health to all SSE clients immediately
    try { broadcastEvent('mesh_health', buildMeshHealthSnapshot()); } catch { /* ok */ }
    res.json({ success: true, peer });
});

// GET /api/federation/peers â€” list all peers with health summaries
app.get('/api/federation/peers', (_req, res) => {
    const peers = getPeerHealthSummaries();
    res.json({ count: peers.length, peers });
});

// GET /api/federation/peers/full â€” full peer objects (admin use)
app.get('/api/federation/peers/full', (_req, res) => {
    const peers = getAllPeers();
    res.json({ count: peers.length, peers });
});

// GET /api/mesh-health â€” live health snapshot of all federated peers
app.get('/api/mesh-health', (_req, res) => {
    res.json(buildMeshHealthSnapshot());
});

// DELETE /api/federation/peer/:peerId â€” remove a peer
app.delete('/api/federation/peer/:peerId', (req, res) => {
    const existed = removePeer(req.params.peerId);
    if (!existed) {
        res.status(404).json({ error: `Peer ${req.params.peerId} not found` });
        return;
    }
    try { broadcastEvent('mesh_health', buildMeshHealthSnapshot()); } catch { /* ok */ }
    res.json({ success: true, removed: req.params.peerId });
});

// â”€â”€ Boot â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function main() {
    await ensureStore();
    await migrateFromMarkdown();

    // Start federation gossip loop â€” pings peers every 30s and broadcasts mesh_health
    const gossip = startGossip({ intervalMs: 30_000, timeoutMs: 5_000 });
    // Broadcast mesh health to all SSE clients after each gossip cycle
    gossip.onCycleComplete = () => {
        try { broadcastEvent('mesh_health', buildMeshHealthSnapshot()); } catch { /* ok */ }
    };

    app.listen(PORT, '0.0.0.0', () => {
        console.log(`\nâ•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—`);
        console.log(`â•‘  INCEPTION DISPATCH SERVER â€” ONLINE         â•‘`);
        console.log(`â•‘  http://127.0.0.1:${PORT}                â•‘`);
        console.log(`â•‘  MCP: GET /sse  |  REST: GET /api/status    â•‘`);
        console.log(`â•‘  Federation: POST /api/federation/peer      â•‘`);
        console.log(`â•‘  Mesh Health: GET /api/mesh-health  (SSE)   â•‘`);
        console.log(`â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n`);
    });
}

main().catch(err => { console.error('[dispatch] Fatal:', err); process.exit(1); });

