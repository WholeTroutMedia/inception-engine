/**
 * @module arbitrage/ModelArbitrage
 * @description Provider registry with cost-per-token config, health scoring, and multi-provider support
 * Closes #87 (partial)
 */
import { z } from 'zod';

// -- Provider Types --

export const ProviderIdSchema = z.enum(['claude', 'openai', 'gemini', 'ollama']);
export type ProviderId = z.infer<typeof ProviderIdSchema>;

export const ModelTierSchema = z.enum(['frontier', 'efficient', 'fast']);
export type ModelTier = z.infer<typeof ModelTierSchema>;

export const ProviderConfigSchema = z.object({
  id: ProviderIdSchema,
  displayName: z.string(),
  baseUrl: z.string().url(),
  apiKeyEnv: z.string(),
  models: z.record(z.string(), z.object({
    tier: ModelTierSchema,
    contextWindow: z.number().int().positive(),
    costPerInputToken: z.number().nonnegative(),
    costPerOutputToken: z.number().nonnegative(),
    maxOutputTokens: z.number().int().positive(),
    supportsVision: z.boolean().default(false),
    supportsTools: z.boolean().default(true),
  })),
  rateLimit: z.object({
    requestsPerMinute: z.number().int().positive().default(60),
    tokensPerMinute: z.number().int().positive().default(100000),
  }).optional(),
  enabled: z.boolean().default(true),
});
export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;

export interface ProviderHealth {
  providerId: ProviderId;
  isHealthy: boolean;
  latencyMs: number;
  errorRate: number;
  lastCheck: number;
  consecutiveFailures: number;
  totalRequests: number;
  totalErrors: number;
}

export interface CostRecord {
  providerId: ProviderId;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  timestamp: number;
  agentId: string;
}

export interface ArbitrageStats {
  totalRequests: number;
  totalCostUsd: number;
  costByProvider: Record<string, number>;
  requestsByProvider: Record<string, number>;
  avgLatencyByProvider: Record<string, number>;
  healthScores: Record<string, number>;
}

// -- ModelArbitrage Engine --

export class ModelArbitrage {
  private providers: Map<ProviderId, ProviderConfig> = new Map();
  private health: Map<ProviderId, ProviderHealth> = new Map();
  private costLog: CostRecord[] = [];
  private stats: ArbitrageStats = {
    totalRequests: 0,
    totalCostUsd: 0,
    costByProvider: {},
    requestsByProvider: {},
    avgLatencyByProvider: {},
    healthScores: {},
  };

  constructor(configs?: ProviderConfig[]) {
    if (configs) {
      for (const config of configs) {
        this.registerProvider(config);
      }
    }
  }

  registerProvider(config: ProviderConfig): void {
    const validated = ProviderConfigSchema.parse(config);
    this.providers.set(validated.id, validated);
    this.health.set(validated.id, {
      providerId: validated.id,
      isHealthy: true,
      latencyMs: 0,
      errorRate: 0,
      lastCheck: Date.now(),
      consecutiveFailures: 0,
      totalRequests: 0,
      totalErrors: 0,
    });
  }

  unregisterProvider(id: ProviderId): boolean {
    this.health.delete(id);
    return this.providers.delete(id);
  }

  getProvider(id: ProviderId): ProviderConfig | undefined {
    return this.providers.get(id);
  }

  listProviders(): ProviderConfig[] {
    return Array.from(this.providers.values());
  }

  listHealthyProviders(): ProviderConfig[] {
    return this.listProviders().filter(p => {
      const h = this.health.get(p.id);
      return p.enabled && h?.isHealthy;
    });
  }

  // -- Health Scoring --

  recordSuccess(providerId: ProviderId, latencyMs: number): void {
    const h = this.health.get(providerId);
    if (!h) return;
    h.totalRequests++;
    h.consecutiveFailures = 0;
    h.latencyMs = (h.latencyMs * 0.8) + (latencyMs * 0.2); // EMA
    h.errorRate = h.totalErrors / h.totalRequests;
    h.lastCheck = Date.now();
    h.isHealthy = true;
    this.stats.totalRequests++;
    this.stats.requestsByProvider[providerId] = (this.stats.requestsByProvider[providerId] || 0) + 1;
    this.stats.avgLatencyByProvider[providerId] = h.latencyMs;
    this.stats.healthScores[providerId] = this.computeHealthScore(h);
  }

  recordFailure(providerId: ProviderId): void {
    const h = this.health.get(providerId);
    if (!h) return;
    h.totalRequests++;
    h.totalErrors++;
    h.consecutiveFailures++;
    h.errorRate = h.totalErrors / h.totalRequests;
    h.lastCheck = Date.now();
    if (h.consecutiveFailures >= 3) {
      h.isHealthy = false;
    }
    this.stats.healthScores[providerId] = this.computeHealthScore(h);
  }

  getHealth(providerId: ProviderId): ProviderHealth | undefined {
    return this.health.get(providerId);
  }

  computeHealthScore(h: ProviderHealth): number {
    if (!h.isHealthy) return 0;
    const errorPenalty = 1 - h.errorRate;
    const latencyScore = Math.max(0, 1 - (h.latencyMs / 10000));
    const freshness = Math.max(0, 1 - ((Date.now() - h.lastCheck) / 300000));
    return (errorPenalty * 0.5) + (latencyScore * 0.3) + (freshness * 0.2);
  }

  // -- Cost Tracking --

  recordCost(record: CostRecord): void {
    this.costLog.push(record);
    this.stats.totalCostUsd += record.costUsd;
    this.stats.costByProvider[record.providerId] =
      (this.stats.costByProvider[record.providerId] || 0) + record.costUsd;
  }

  calculateCost(
    providerId: ProviderId,
    modelId: string,
    inputTokens: number,
    outputTokens: number,
  ): number {
    const provider = this.providers.get(providerId);
    if (!provider) return 0;
    const model = provider.models[modelId];
    if (!model) return 0;
    return (inputTokens * model.costPerInputToken) + (outputTokens * model.costPerOutputToken);
  }

  getCostLog(since?: number): CostRecord[] {
    if (!since) return [...this.costLog];
    return this.costLog.filter(r => r.timestamp >= since);
  }

  getStats(): ArbitrageStats {
    return { ...this.stats };
  }

  // -- Model Discovery --

  findModelsByTier(tier: ModelTier): Array<{ providerId: ProviderId; modelId: string }> {
    const results: Array<{ providerId: ProviderId; modelId: string }> = [];
    for (const [providerId, config] of this.providers) {
      if (!config.enabled) continue;
      for (const [modelId, model] of Object.entries(config.models)) {
        if (model.tier === tier) {
          results.push({ providerId, modelId });
        }
      }
    }
    return results;
  }

  findModelsWithVision(): Array<{ providerId: ProviderId; modelId: string }> {
    const results: Array<{ providerId: ProviderId; modelId: string }> = [];
    for (const [providerId, config] of this.providers) {
      if (!config.enabled) continue;
      for (const [modelId, model] of Object.entries(config.models)) {
        if (model.supportsVision) {
          results.push({ providerId, modelId });
        }
      }
    }
    return results;
  }

  getCheapestModel(tier?: ModelTier): { providerId: ProviderId; modelId: string; costPerToken: number } | null {
    let cheapest: { providerId: ProviderId; modelId: string; costPerToken: number } | null = null;
    for (const [providerId, config] of this.providers) {
      if (!config.enabled) continue;
      const h = this.health.get(providerId);
      if (!h?.isHealthy) continue;
      for (const [modelId, model] of Object.entries(config.models)) {
        if (tier && model.tier !== tier) continue;
        const avgCost = (model.costPerInputToken + model.costPerOutputToken) / 2;
        if (!cheapest || avgCost < cheapest.costPerToken) {
          cheapest = { providerId, modelId, costPerToken: avgCost };
        }
      }
    }
    return cheapest;
  }
}