/**
 * @inception/claude-agent — Shared Types
 * Mirrors the AgentTask/AgentResult interface used across the Creative Liberation Engine.
 */
export interface AgentTask {
    /** Dispatch task ID (e.g. T20260306-328) */
    id: string;
    /** Human-readable task title used as the Claude prompt */
    title: string;
    /** Optional additional context appended to the prompt */
    context?: string;
    /** Working directory for Claude to operate in (defaults to repo root) */
    cwd?: string;
    /** Tools to allow. Defaults to a safe set: Read, Edit, Bash, Glob, LS */
    tools?: ClaudeTool[];
    /** Max agent turns before stopping (default: 25) */
    maxTurns?: number;
    /** Associated workstream from the Dispatch server */
    workstream?: string;
    /** Priority from Dispatch server */
    priority?: 'P1' | 'P2' | 'P3';
}
export type ClaudeTool = 'Read' | 'Edit' | 'Bash' | 'Glob' | 'LS' | 'MultiEdit' | 'Write' | 'NotebookRead' | 'NotebookEdit' | 'WebFetch' | 'WebSearch' | 'Task';
export interface AgentMessage {
    type: 'text' | 'tool_use' | 'tool_result' | 'system' | 'result';
    content?: string;
    toolName?: string;
    result?: string;
    subtype?: string;
    isError?: boolean;
    durationMs?: number;
    numTurns?: number;
}
export interface AgentResult {
    taskId: string;
    success: boolean;
    result: string;
    numTurns: number;
    durationMs: number;
    messages: AgentMessage[];
    error?: string;
}
