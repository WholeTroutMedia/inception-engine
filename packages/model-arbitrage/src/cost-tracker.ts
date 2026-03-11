/**
 * Model Arbitrage — Cost Tracker
 * Per-agent token usage tracking, per-provider spend monitoring, budget alerts
 * @package packages/model-arbitrage
 * @issue #32 HELIX C
 */

export interface TokenUsageRecord {
  agentId: string;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  timestamp: number;
  taskId?: string;
}

export interface ProviderSpend {
  provider: string;
  totalTokens: number;
  totalCostUsd: number;
  requestCount: number;
}

export interface AgentSpend {
  agentId: string;
  totalTokens: number;
  totalCostUsd: number;
  requestCount: number;
  providerBreakdown: Record<string, ProviderSpend>;
}

export interface BudgetConfig {
  dailyLimitUsd?: number;
  weeklyLimitUsd?: number;
  monthlyLimitUsd?: number;
  perAgentDailyLimitUsd?: number;
  alertThresholdPercent?: number; // 0-100, default 80
}

export interface BudgetAlert {
  level: 'warning' | 'critical';
  message: string;
  currentSpendUsd: number;
  limitUsd: number;
  percentUsed: number;
  timestamp: number;
}

// Provider cost per 1000 tokens (input/output)
const PROVIDER_COSTS: Record<string, { input: number; output: number }> = {
  'claude': { input: 0.003, output: 0.015 },
  'claude-haiku': { input: 0.00025, output: 0.00125 },
  'openai': { input: 0.001, output: 0.002 },
  'gemini-flash': { input: 0.000075, output: 0.0003 },
  'gemini-pro': { input: 0.00125, output: 0.005 },
  'ollama': { input: 0, output: 0 },
  'vllm': { input: 0, output: 0 },
};

export class CostTracker {
  private records: TokenUsageRecord[] = [];
  private budgetConfig: BudgetConfig;

  constructor(config: BudgetConfig = {}) {
    this.budgetConfig = {
      alertThresholdPercent: 80,
      ...config,
    };
  }

  /**
   * Record a completed LLM call
   */
  record(entry: Omit<TokenUsageRecord, 'estimatedCostUsd' | 'timestamp'>): TokenUsageRecord {
    const estimatedCostUsd = this.estimateCost(
      entry.provider,
      entry.promptTokens,
      entry.completionTokens
    );
    const record: TokenUsageRecord = {
      ...entry,
      estimatedCostUsd,
      timestamp: Date.now(),
    };
    this.records.push(record);
    return record;
  }

  /**
   * Get spend summary per agent
   */
  getAgentSpend(agentId?: string): AgentSpend[] {
    const map = new Map<string, AgentSpend>();

    for (const r of this.records) {
      if (agentId && r.agentId !== agentId) continue;

      if (!map.has(r.agentId)) {
        map.set(r.agentId, {
          agentId: r.agentId,
          totalTokens: 0,
          totalCostUsd: 0,
          requestCount: 0,
          providerBreakdown: {},
        });
      }

      const agent = map.get(r.agentId)!;
      agent.totalTokens += r.totalTokens;
      agent.totalCostUsd += r.estimatedCostUsd;
      agent.requestCount += 1;

      if (!agent.providerBreakdown[r.provider]) {
        agent.providerBreakdown[r.provider] = {
          provider: r.provider,
          totalTokens: 0,
          totalCostUsd: 0,
          requestCount: 0,
        };
      }
      agent.providerBreakdown[r.provider].totalTokens += r.totalTokens;
      agent.providerBreakdown[r.provider].totalCostUsd += r.estimatedCostUsd;
      agent.providerBreakdown[r.provider].requestCount += 1;
    }

    return Array.from(map.values());
  }

  /**
   * Get spend summary per provider
   */
  getProviderSpend(): ProviderSpend[] {
    const map = new Map<string, ProviderSpend>();

    for (const r of this.records) {
      if (!map.has(r.provider)) {
        map.set(r.provider, {
          provider: r.provider,
          totalTokens: 0,
          totalCostUsd: 0,
          requestCount: 0,
        });
      }
      const p = map.get(r.provider)!;
      p.totalTokens += r.totalTokens;
      p.totalCostUsd += r.estimatedCostUsd;
      p.requestCount += 1;
    }

    return Array.from(map.values());
  }

  /**
   * Get total spend in time window
   */
  getTotalSpend(windowMs?: number): number {
    const cutoff = windowMs ? Date.now() - windowMs : 0;
    return this.records
      .filter(r => r.timestamp >= cutoff)
      .reduce((sum, r) => sum + r.estimatedCostUsd, 0);
  }

  /**
   * Check budget and return any alerts
   */
  checkBudget(): BudgetAlert[] {
    const alerts: BudgetAlert[] = [];
    const threshold = (this.budgetConfig.alertThresholdPercent ?? 80) / 100;

    const DAY_MS = 86_400_000;
    const WEEK_MS = 7 * DAY_MS;
    const MONTH_MS = 30 * DAY_MS;

    const checks: Array<{ windowMs: number; limitUsd?: number; label: string }> = [
      { windowMs: DAY_MS, limitUsd: this.budgetConfig.dailyLimitUsd, label: 'daily' },
      { windowMs: WEEK_MS, limitUsd: this.budgetConfig.weeklyLimitUsd, label: 'weekly' },
      { windowMs: MONTH_MS, limitUsd: this.budgetConfig.monthlyLimitUsd, label: 'monthly' },
    ];

    for (const check of checks) {
      if (!check.limitUsd) continue;
      const spend = this.getTotalSpend(check.windowMs);
      const pct = spend / check.limitUsd;

      if (pct >= 1.0) {
        alerts.push({
          level: 'critical',
          message: `${check.label} budget EXCEEDED: $${spend.toFixed(4)} / $${check.limitUsd}`,
          currentSpendUsd: spend,
          limitUsd: check.limitUsd,
          percentUsed: Math.round(pct * 100),
          timestamp: Date.now(),
        });
      } else if (pct >= threshold) {
        alerts.push({
          level: 'warning',
          message: `${check.label} budget at ${Math.round(pct * 100)}%: $${spend.toFixed(4)} / $${check.limitUsd}`,
          currentSpendUsd: spend,
          limitUsd: check.limitUsd,
          percentUsed: Math.round(pct * 100),
          timestamp: Date.now(),
        });
      }
    }

    return alerts;
  }

  private estimateCost(provider: string, promptTokens: number, completionTokens: number): number {
    const rates = PROVIDER_COSTS[provider] ?? { input: 0.001, output: 0.002 };
    return (promptTokens / 1000) * rates.input + (completionTokens / 1000) * rates.output;
  }

  /**
   * Export records for reporting
   */
  exportRecords(windowMs?: number): TokenUsageRecord[] {
    const cutoff = windowMs ? Date.now() - windowMs : 0;
    return this.records.filter(r => r.timestamp >= cutoff);
  }

  /**
   * Reset tracker (for testing)
   */
  reset(): void {
    this.records = [];
  }
}

export const globalCostTracker = new CostTracker();