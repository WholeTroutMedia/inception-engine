/**
 * HELIX C: Circuit Breaker for Model Provider Failover
 * Issue: #48 | Package: model-arbitrage
 *
 * Implements exponential backoff circuit breaker for LLM provider failover.
 * Pattern: Claude -> OpenAI -> Gemini -> Ollama (local)
 */

export type ProviderName = 'claude' | 'openai' | 'gemini' | 'ollama';

export interface CircuitBreakerConfig {
  maxFailures: number;        // failures before opening circuit
  resetTimeoutMs: number;     // time before half-open retry
  backoffMultiplier: number;  // exponential backoff factor
  maxBackoffMs: number;       // ceiling for backoff
}

export type CircuitState = 'closed' | 'open' | 'half-open';

interface ProviderCircuit {
  state: CircuitState;
  failures: number;
  lastFailure: number;
  backoffMs: number;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  maxFailures: 3,
  resetTimeoutMs: 30_000,
  backoffMultiplier: 2,
  maxBackoffMs: 120_000,
};

export class CircuitBreaker {
  private circuits: Map<ProviderName, ProviderCircuit> = new Map();
  private config: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  getState(provider: ProviderName): CircuitState {
    const circuit = this.getCircuit(provider);
    if (circuit.state === 'open') {
      const elapsed = Date.now() - circuit.lastFailure;
      if (elapsed >= circuit.backoffMs) {
        circuit.state = 'half-open';
      }
    }
    return circuit.state;
  }

  recordSuccess(provider: ProviderName): void {
    const circuit = this.getCircuit(provider);
    circuit.state = 'closed';
    circuit.failures = 0;
    circuit.backoffMs = this.config.resetTimeoutMs;
  }

  recordFailure(provider: ProviderName): void {
    const circuit = this.getCircuit(provider);
    circuit.failures++;
    circuit.lastFailure = Date.now();

    if (circuit.failures >= this.config.maxFailures) {
      circuit.state = 'open';
      circuit.backoffMs = Math.min(
        circuit.backoffMs * this.config.backoffMultiplier,
        this.config.maxBackoffMs,
      );
    }
  }

  canAttempt(provider: ProviderName): boolean {
    const state = this.getState(provider);
    return state === 'closed' || state === 'half-open';
  }

  getNextAvailable(providers: ProviderName[]): ProviderName | null {
    return providers.find((p) => this.canAttempt(p)) ?? null;
  }

  reset(provider: ProviderName): void {
    this.circuits.delete(provider);
  }

  resetAll(): void {
    this.circuits.clear();
  }

  private getCircuit(provider: ProviderName): ProviderCircuit {
    if (!this.circuits.has(provider)) {
      this.circuits.set(provider, {
        state: 'closed',
        failures: 0,
        lastFailure: 0,
        backoffMs: this.config.resetTimeoutMs,
      });
    }
    return this.circuits.get(provider)!;
  }
}

// --- Cost Tracker ---

export interface CostEntry {
  provider: ProviderName;
  agentId: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  timestamp: number;
}

export interface BudgetConfig {
  maxDailyUsd: number;
  warnThreshold: number; // 0-1, e.g. 0.8 = 80%
}

export class CostTracker {
  private entries: CostEntry[] = [];
  private budgetConfig: BudgetConfig;

  constructor(budget: BudgetConfig = { maxDailyUsd: 50, warnThreshold: 0.8 }) {
    this.budgetConfig = budget;
  }

  record(entry: Omit<CostEntry, 'timestamp'>): void {
    this.entries.push({ ...entry, timestamp: Date.now() });
  }

  getDailySpend(): number {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    return this.entries
      .filter((e) => e.timestamp >= dayStart.getTime())
      .reduce((sum, e) => sum + e.costUsd, 0);
  }

  getAgentSpend(agentId: string): number {
    return this.entries
      .filter((e) => e.agentId === agentId)
      .reduce((sum, e) => sum + e.costUsd, 0);
  }

  getProviderSpend(provider: ProviderName): number {
    return this.entries
      .filter((e) => e.provider === provider)
      .reduce((sum, e) => sum + e.costUsd, 0);
  }

  isOverBudget(): boolean {
    return this.getDailySpend() >= this.budgetConfig.maxDailyUsd;
  }

  isNearBudget(): boolean {
    return (
      this.getDailySpend() >=
      this.budgetConfig.maxDailyUsd * this.budgetConfig.warnThreshold
    );
  }

  getBudgetStatus(): { spend: number; limit: number; percent: number; warning: boolean; blocked: boolean } {
    const spend = this.getDailySpend();
    return {
      spend,
      limit: this.budgetConfig.maxDailyUsd,
      percent: (spend / this.budgetConfig.maxDailyUsd) * 100,
      warning: this.isNearBudget(),
      blocked: this.isOverBudget(),
    };
  }
}
