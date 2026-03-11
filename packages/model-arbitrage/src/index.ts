/**
 * Model Arbitrage Engine
 * 
 * Multi-provider LLM routing engine. Routes agent requests to optimal provider
 * based on task complexity, cost, latency, and privacy requirements.
 * 
 * @package model-arbitrage
 * @issue #32
 * @agent COMET (AURORA hive)
 */

// ─── Types ───────────────────────────────────────────────────

export type ProviderId = 'claude' | 'openai' | 'gemini' | 'ollama' | 'vllm';
export type TaskComplexity = 'trivial' | 'simple' | 'moderate' | 'complex' | 'strategic';
export type PrivacyLevel = 'public' | 'internal' | 'confidential' | 'sovereign';

export interface ProviderConfig {
  id: ProviderId;
  name: string;
  baseUrl: string;
  apiKey?: string;
  models: ModelConfig[];
  isLocal: boolean;
  maxConcurrent: number;
  healthCheckUrl: string;
}

export interface ModelConfig {
  id: string;
  name: string;
  contextWindow: number;
  costPer1kInput: number;
  costPer1kOutput: number;
  avgLatencyMs: number;
  capabilities: string[];
  maxComplexity: TaskComplexity;
}

export interface RoutingRequest {
  agentId: string;
  hive: string;
  taskComplexity: TaskComplexity;
  privacyLevel: PrivacyLevel;
  estimatedTokens: number;
  requiredCapabilities: string[];
  preferLocal?: boolean;
  maxLatencyMs?: number;
  maxCostPerRequest?: number;
}

export interface RoutingDecision {
  provider: ProviderId;
  model: string;
  estimatedCost: number;
  estimatedLatencyMs: number;
  reasoning: string;
  fallbackChain: { provider: ProviderId; model: string }[];
}

export interface CostRecord {
  agentId: string;
  provider: ProviderId;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  latencyMs: number;
  timestamp: string;
}

// ─── Complexity Scores ─────────────────────────────────────

const COMPLEXITY_SCORE: Record<TaskComplexity, number> = {
  trivial: 1, simple: 2, moderate: 3, complex: 4, strategic: 5,
};

// ─── Provider Registry ─────────────────────────────────────

export class ProviderRegistry {
  private providers = new Map<ProviderId, ProviderConfig>();
  private healthStatus = new Map<ProviderId, boolean>();

  register(config: ProviderConfig): void {
    this.providers.set(config.id, config);
    this.healthStatus.set(config.id, true);
  }

  getProvider(id: ProviderId): ProviderConfig | undefined {
    return this.providers.get(id);
  }

  getHealthy(): ProviderConfig[] {
    return Array.from(this.providers.values())
      .filter(p => this.healthStatus.get(p.id) === true);
  }

  getLocal(): ProviderConfig[] {
    return this.getHealthy().filter(p => p.isLocal);
  }

  setHealth(id: ProviderId, healthy: boolean): void {
    this.healthStatus.set(id, healthy);
  }
}

// ─── Task Classifier ──────────────────────────────────────

export class TaskClassifier {
  classify(request: RoutingRequest): RoutingDecision {
    // Sovereign data must stay local
    if (request.privacyLevel === 'sovereign' || request.preferLocal) {
      return this.routeLocal(request);
    }

    // Strategic tasks get the most capable model
    if (request.taskComplexity === 'strategic' || request.taskComplexity === 'complex') {
      return this.routePremium(request);
    }

    // Simple tasks get cheapest/fastest
    return this.routeEconomic(request);
  }

  private routeLocal(request: RoutingRequest): RoutingDecision {
    return {
      provider: 'ollama',
      model: 'llama3.1:70b',
      estimatedCost: 0,
      estimatedLatencyMs: 2000,
      reasoning: `Privacy=${request.privacyLevel}: routed to local Ollama`,
      fallbackChain: [{ provider: 'vllm', model: 'mistral-7b' }],
    };
  }

  private routePremium(request: RoutingRequest): RoutingDecision {
    return {
      provider: 'claude',
      model: 'claude-sonnet-4-20250514',
      estimatedCost: (request.estimatedTokens / 1000) * 0.015,
      estimatedLatencyMs: 1500,
      reasoning: `Complexity=${request.taskComplexity}: routed to Claude Sonnet`,
      fallbackChain: [
        { provider: 'openai', model: 'gpt-4o' },
        { provider: 'gemini', model: 'gemini-2.5-pro' },
      ],
    };
  }

  private routeEconomic(request: RoutingRequest): RoutingDecision {
    return {
      provider: 'gemini',
      model: 'gemini-2.0-flash',
      estimatedCost: (request.estimatedTokens / 1000) * 0.0001,
      estimatedLatencyMs: 500,
      reasoning: `Complexity=${request.taskComplexity}: routed to Gemini Flash (cheapest)`,
      fallbackChain: [
        { provider: 'openai', model: 'gpt-4o-mini' },
        { provider: 'ollama', model: 'llama3.1:8b' },
      ],
    };
  }
}

// ─── Cost Tracker ─────────────────────────────────────────

export class CostTracker {
  private records: CostRecord[] = [];
  private budgets = new Map<string, number>(); // agentId -> budget

  record(entry: CostRecord): void {
    this.records.push(entry);
  }

  setBudget(agentId: string, budget: number): void {
    this.budgets.set(agentId, budget);
  }

  getSpend(agentId: string): number {
    return this.records
      .filter(r => r.agentId === agentId)
      .reduce((sum, r) => sum + r.cost, 0);
  }

  isOverBudget(agentId: string): boolean {
    const budget = this.budgets.get(agentId);
    if (!budget) return false;
    return this.getSpend(agentId) >= budget;
  }

  getProviderSpend(provider: ProviderId): number {
    return this.records
      .filter(r => r.provider === provider)
      .reduce((sum, r) => sum + r.cost, 0);
  }

  getTotalSpend(): number {
    return this.records.reduce((sum, r) => sum + r.cost, 0);
  }
}

// ─── Arbitrage Engine (Main) ───────────────────────────────

export class ArbitrageEngine {
  private registry: ProviderRegistry;
  private classifier: TaskClassifier;
  private costTracker: CostTracker;

  constructor() {
    this.registry = new ProviderRegistry();
    this.classifier = new TaskClassifier();
    this.costTracker = new CostTracker();
  }

  getRegistry(): ProviderRegistry { return this.registry; }
  getCostTracker(): CostTracker { return this.costTracker; }

  route(request: RoutingRequest): RoutingDecision {
    // Check budget
    if (this.costTracker.isOverBudget(request.agentId)) {
      return this.classifier.classify({ ...request, preferLocal: true });
    }
    return this.classifier.classify(request);
  }

  recordUsage(record: CostRecord): void {
    this.costTracker.record(record);
  }
}

export default ArbitrageEngine;

// ---- Phase C: Capability-Based Routing (refs #46) ----
export * from './capability-schema.js';
export { ModelScorecard } from './scorecard.js';
export { BenchmarkRunner } from './benchmark.js';
export { CapabilityRouter } from './capability-router.js';
export { CircuitBreaker } from './circuit-breaker.js';
