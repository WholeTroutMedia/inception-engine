/**
 * @inception/claude-agent — Smart Provider Executor v2
 *
 * Intelligent load balancing across ALL configured providers.
 * Tracks latency + error rates per provider, weights routing dynamically.
 *
 * Provider priority (highest tier plans on Perplexity + Google):
 *   CODING tasks:   Anthropic/Sonnet → Gemini/Flash → Perplexity/Sonar → Ollama
 *   RESEARCH tasks: Perplexity/Sonar-Reasoning → Gemini/Pro → Anthropic/Sonnet → Ollama
 *   FAST tasks:     Gemini/Flash → Perplexity/Sonar → Ollama
 *
 * Constitutional: Article I (Sovereignty), Article IX (Quality), Article XX (Automation)
 */
import type { AgentTask, AgentResult } from './types.js';
export declare function executeClaudeTask(task: AgentTask): Promise<AgentResult>;
