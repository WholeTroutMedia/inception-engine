// Creative Liberation Engine Dispatch Server — Type Definitions
// All WholeTrout org task coordination primitives

export type TaskStatus = 'queued' | 'active' | 'blocked' | 'done' | 'failed' | 'handoff';
export type TaskPriority = 'P0' | 'P1' | 'P2' | 'P3';
export type AgentTool = 'cle' | 'cursor' | 'claude-desktop' | 'script' | 'cron' | 'unknown';

export interface Task {
    id: string;                          // T20260305-001
    org: string;                         // Creative Liberation Engine Community
    project: string;                     // brainchild-v5
    workstream: string;                  // genkit-flows
    title: string;
    description?: string;
    acceptance_criteria?: string[];
    priority: TaskPriority;
    status: TaskStatus;
    dependencies: string[];              // task IDs this task depends on
    parent_task_id: string | null;       // for subtask hierarchies
    spawned_by: string | null;           // agent_id that created this
    assigned_to_agent: string | null;    // specific agent_id target
    assigned_to_capability: string | null; // capability type target (e.g. "typescript")
    claimed_by: string | null;           // agent_id that claimed it
    claimed_at: string | null;           // ISO8601
    completed_at: string | null;         // ISO8601
    handoff_note: string | null;
    artifacts: string[];                 // file paths or URLs produced
    created: string;                     // ISO8601
    created_by: string;                  // agent_id or 'user'
    updated: string;                     // ISO8601
}

export type AgentStatus = 'active' | 'idle' | 'stale';

export interface Agent {
    agent_id: string;                    // unique per session, e.g. cle-a
    tool: AgentTool;
    capabilities: string[];              // workstreams/skills this agent can handle
    session_id: string;
    connected_at: string;                // ISO8601
    last_seen: string;                   // ISO8601 — updated on every heartbeat
    active_task_id: string | null;
    notifications: AgentNotification[];  // pending messages from other agents
    // Heartbeat fields (populated by POST /api/agents/heartbeat)
    window?: string;                     // 'A' | 'B' | 'C' ... IDE window letter
    workstream?: string;                 // currently claimed workstream
    status?: AgentStatus;               // computed: active / idle / stale
    current_task?: string;              // human-readable current activity
}

export interface AgentNotification {
    from: string;                        // agent_id sender
    message: string;
    task_id?: string;
    sent_at: string;                     // ISO8601
    read: boolean;
}

export interface Project {
    id: string;                          // e.g. brainchild-v5
    org: string;                         // Creative Liberation Engine Community
    name: string;
    repo_url: string;                    // Forgejo URL
    workstreams: string[];               // defined workstreams for this project
    registered_at: string;               // ISO8601
    active: boolean;
}

export interface DispatchStore {
    tasks: Task[];
    agents: Agent[];
    projects: Project[];
    sessions: SessionLog[];
}

export interface SessionLog {
    session_id: string;
    agent_id: string;
    started_at: string;
    ended_at: string | null;
    tasks_claimed: string[];
    tasks_completed: string[];
}
