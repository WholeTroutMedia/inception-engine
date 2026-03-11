/**
 * @module arbitrage/RoutingStrategy
 * @description Task-to-model routing with capability matching, latency preference, cost optimization
 * Closes #87 (partial)
 */
import { z } from 'zod';
import type { ProviderId, ModelTier, ModelArbitrage } from './ModelArbitrage';

// -- Routing Types --

export const RoutingModeSchema = z.enum(['cost', 'latency', 'quality', 'balanced']);
export type RoutingMode = z.infer<typeof RoutingModeSchema>;

export const TaskCapabilitySchema = z.object({
  requiresVision: z.boolean().default(false),
  requiresTools: z.boolean().default(false),
  minContextWindow: z.number().int().positive().default(4096),
  preferredTier: ModelTierSchema.optional(),
  maxCostPerToken: z.number().nonnegative().optional(),
  maxLatencyMs: z.number().positive().optional(),
});

const ModelTierSchema = z.enum(['frontier', 'efficient', 'fast']);

export type TaskCapability = z.infer<typeof TaskCapabilitySchema>;

export interface RoutingRequest {
  taskId: string;
  agentId: string;
  capability: TaskCapability;
  mode: RoutingMode;
  excludeProviders?: ProviderId[];
  preferredProvider?: ProviderId;
}

export interface RoutingDecision {
  providerId: ProviderId;
  modelId: string;
  reason: string;
  score: number;
  estimatedCost: number;
  estimatedLatencyMs: number;
  fallbacks: Array<{ providerId: ProviderId; modelId: string }>;
}

export interface RoutingRule {
  id: string;
  name: string;
  condition: (req: RoutingRequest) => boolean;
  action: (req: RoutingRequest, candidates: CandidateModel[]) => CandidateModel[];
  priority: number;
}

export interface CandidateModel {
  providerId: ProviderId;
  modelId: string;
  tier: ModelTier;
  contextWindow: number;
  costPerInputToken: number;
  costPerOutputToken: number;
  supportsVision: boolean;
  supportsTools: boolean;
  healthScore: number;
  latencyMs: number;
}

// -- RoutingStrategy Engine --

export class RoutingStrategy {
  private rules: RoutingRule[] = [];
  private routingHistory: Array<{ request: RoutingRequest; decision: RoutingDecision; timestamp: number }> = [];
  private arbitrage: ModelArbitrage;

  constructor(arbitrage: ModelArbitrage) {
    this.arbitrage = arbitrage;
  }

  addRule(rule: RoutingRule): void {
    this.rules.push(rule);
    this.rules.sort((a, b) => b.priority - a.priority);
  }

  removeRule(ruleId: string): boolean {
    const idx = this.rules.findIndex(r => r.id === ruleId);
    if (idx === -1) return false;
    this.rules.splice(idx, 1);
    return true;
  }

  route(request: RoutingRequest): RoutingDecision | null {
    let candidates = this.buildCandidateList(request);
    if (candidates.length === 0) return null;

    // Apply rules in priority order
    for (const rule of this.rules) {
      if (rule.condition(request)) {
        candidates = rule.action(request, candidates);
      }
    }

    if (candidates.length === 0) return null;

    // Score and rank candidates
    const scored = candidates.map(c => ({
      ...c,
      score: this.scoreCandidate(c, request),
    })).sort((a, b) => b.score - a.score);

    const best = scored[0];
    const fallbacks = scored.slice(1, 4).map(c => ({
      providerId: c.providerId,
      modelId: c.modelId,
    }));

    const decision: RoutingDecision = {
      providerId: best.providerId,
      modelId: best.modelId,
      reason: this.explainDecision(best, request),
      score: best.score,
      estimatedCost: (best.costPerInputToken + best.costPerOutputToken) / 2,
      estimatedLatencyMs: best.latencyMs,
      fallbacks,
    };

    this.routingHistory.push({ request, decision, timestamp: Date.now() });
    return decision;
  }

  private buildCandidateList(request: RoutingRequest): CandidateModel[] {
    const candidates: CandidateModel[] = [];
    const providers = this.arbitrage.listHealthyProviders();

    for (const provider of providers) {
      if (request.excludeProviders?.includes(provider.id)) continue;

      for (const [modelId, model] of Object.entries(provider.models)) {
        // Capability filtering
        if (request.capability.requiresVision && !model.supportsVision) continue;
        if (request.capability.requiresTools && !model.supportsTools) continue;
        if (model.contextWindow < request.capability.minContextWindow) continue;
        if (request.capability.preferredTier && model.tier !== request.capability.preferredTier) continue;
        if (request.capability.maxCostPerToken) {
          const avg = (model.costPerInputToken + model.costPerOutputToken) / 2;
          if (avg > request.capability.maxCostPerToken) continue;
        }

        const health = this.arbitrage.getHealth(provider.id);
        if (request.capability.maxLatencyMs && health && health.latencyMs > request.capability.maxLatencyMs) continue;

        candidates.push({
          providerId: provider.id,
          modelId,
          tier: model.tier,
          contextWindow: model.contextWindow,
          costPerInputToken: model.costPerInputToken,
          costPerOutputToken: model.costPerOutputToken,
          supportsVision: model.supportsVision ?? false,
          supportsTools: model.supportsTools ?? true,
          healthScore: health ? this.arbitrage.computeHealthScore(health) : 0,
          latencyMs: health?.latencyMs ?? 9999,
        });
      }
    }

    return candidates;
  }

  private scoreCandidate(candidate: CandidateModel, request: RoutingRequest): number {
    const weights = this.getModeWeights(request.mode);
    const avgCost = (candidate.costPerInputToken + candidate.costPerOutputToken) / 2;
    const costScore = Math.max(0, 1 - (avgCost / 0.01));
    const latencyScore = Math.max(0, 1 - (candidate.latencyMs / 5000));
    const qualityScore = candidate.tier === 'frontier' ? 1.0 : candidate.tier === 'efficient' ? 0.6 : 0.3;
    const preferenceBonus = request.preferredProvider === candidate.providerId ? 0.1 : 0;

    return (
      (costScore * weights.cost) +
      (latencyScore * weights.latency) +
      (qualityScore * weights.quality) +
      (candidate.healthScore * weights.health) +
      preferenceBonus
    );
  }

  private getModeWeights(mode: RoutingMode): { cost: number; latency: number; quality: number; health: number } {
    switch (mode) {
      case 'cost': return { cost: 0.5, latency: 0.1, quality: 0.2, health: 0.2 };
      case 'latency': return { cost: 0.1, latency: 0.5, quality: 0.2, health: 0.2 };
      case 'quality': return { cost: 0.1, latency: 0.1, quality: 0.5, health: 0.3 };
      case 'balanced': return { cost: 0.25, latency: 0.25, quality: 0.25, health: 0.25 };
    }
  }

  private explainDecision(candidate: CandidateModel & { score: number }, request: RoutingRequest): string {
    return `Selected ${candidate.providerId}/${candidate.modelId} (tier=${candidate.tier}, score=${candidate.score.toFixed(3)}, mode=${request.mode})`;
  }

  getRoutingHistory(limit?: number): typeof this.routingHistory {
    if (limit) return this.routingHistory.slice(-limit);
    return [...this.routingHistory];
  }

  clearHistory(): void {
    this.routingHistory = [];
  }
}