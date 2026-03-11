/**
 * @inception/claude-agent — Public API
 *
 * Re-exports everything needed to use Claude Agent in other packages.
 */

export { executeClaudeTask } from './executor.js';
export type { AgentTask, AgentResult, AgentMessage, ClaudeTool } from './types.js';
