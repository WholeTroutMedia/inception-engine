/**
 * Model Arbitrage — Task Classifier
 * Scores task complexity and sensitivity to route to optimal provider
 * @package packages/model-arbitrage
 * @issue #32 HELIX B
 */

export type TaskComplexity = 'lightweight' | 'standard' | 'strategic';
export type PrivacySensitivity = 'public' | 'internal' | 'sensitive';

export interface TaskClassification {
  complexity: TaskComplexity;
  sensitivity: PrivacySensitivity;
  estimatedTokens: number;
  requiresLocalModel: boolean;
  suggestedProvider: string;
}

export interface ClassifierOptions {
  localModelThreshold?: PrivacySensitivity;
  tokenBudget?: number;
}

const DEFAULT_OPTIONS: Required<ClassifierOptions> = {
  localModelThreshold: 'sensitive',
  tokenBudget: 8000,
};

/**
 * Classify a task request to determine optimal routing
 */
export function classifyTask(
  prompt: string,
  context?: Record<string, unknown>,
  options: ClassifierOptions = {}
): TaskClassification {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const complexity = scoreComplexity(prompt, context);
  const sensitivity = scoreSensitivity(prompt, context);
  const estimatedTokens = estimateTokens(prompt);
  const requiresLocalModel = sensitivity === opts.localModelThreshold;

  return {
    complexity,
    sensitivity,
    estimatedTokens,
    requiresLocalModel,
    suggestedProvider: resolveSuggestedProvider(complexity, sensitivity, requiresLocalModel),
  };
}

function scoreComplexity(
  prompt: string,
  _context?: Record<string, unknown>
): TaskComplexity {
  const length = prompt.length;
  const strategicKeywords = /architect|design|plan|strategy|optimize|refactor|reason|analyz/i;
  const lightKeywords = /summarize|list|convert|format|translate|lookup|fetch/i;

  if (strategicKeywords.test(prompt) || length > 2000) return 'strategic';
  if (lightKeywords.test(prompt) || length < 200) return 'lightweight';
  return 'standard';
}

function scoreSensitivity(
  prompt: string,
  _context?: Record<string, unknown>
): PrivacySensitivity {
  const sensitivePatterns = /password|secret|private key|api.?key|credential|ssn|personal|confidential/i;
  const internalPatterns = /internal|proprietary|unreleased|draft|wip/i;

  if (sensitivePatterns.test(prompt)) return 'sensitive';
  if (internalPatterns.test(prompt)) return 'internal';
  return 'public';
}

function estimateTokens(text: string): number {
  // Rough approximation: 1 token ~ 4 chars
  return Math.ceil(text.length / 4);
}

function resolveSuggestedProvider(
  complexity: TaskComplexity,
  sensitivity: PrivacySensitivity,
  requiresLocal: boolean
): string {
  if (requiresLocal || sensitivity === 'sensitive') return 'ollama';
  if (complexity === 'strategic') return 'claude';
  if (complexity === 'lightweight') return 'gemini-flash';
  return 'openai';
}

/**
 * Routing policy configuration per agent or hive
 */
export interface RoutingPolicy {
  agentId: string;
  preferredProvider?: string;
  maxTokenBudget?: number;
  allowCloudForSensitive?: boolean;
}

export const DEFAULT_ROUTING_POLICIES: RoutingPolicy[] = [
  { agentId: '*', maxTokenBudget: 8000, allowCloudForSensitive: false },
];