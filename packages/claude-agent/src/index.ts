/** @cle/claude-agent — Stub. Replace with real Claude Agent SDK integration. */

export type ClaudeTool = 'Read' | 'Edit' | 'Bash' | 'Glob' | 'LS' | 'MultiEdit' | 'Write' | 'WebFetch' | 'WebSearch' | 'Task';

export interface AgentTask {
  id: string;
  title: string;
  context?: string;
  cwd?: string;
  tools?: ClaudeTool[];
  maxTurns?: number;
  workstream?: string;
  priority?: 'P1' | 'P2' | 'P3';
}

export interface AgentResult {
  taskId: string;
  success: boolean;
  result: string;
  numTurns: number;
  durationMs: number;
  error?: string;
}

export async function executeClaudeTask(task: AgentTask): Promise<AgentResult> {
  return {
    taskId: task.id,
    success: false,
    result: 'Claude Agent stub — not implemented',
    numTurns: 0,
    durationMs: 0,
    error: '@cle/claude-agent is a stub. Install the real package to enable Claude tasks.',
  };
}
