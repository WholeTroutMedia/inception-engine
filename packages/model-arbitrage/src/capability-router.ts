/**
 * Capability-Based Router — Phase C HELIX D
 * Resolves CapabilityProfiles to optimal models via scorecard.
 */
import type { CapabilityProfile, RoutingDecision, ScorecardEntry } from './capability-schema.js';
import { ModelScorecard } from './scorecard.js';
import { randomUUID } from 'crypto';

export class CapabilityRouter {
  private scorecard: ModelScorecard;
  private routingHistory: RoutingDecision[] = [];
  private abTestPercentage = 0; // 0-100
  private challengerModel?: string;

  constructor(scorecard: ModelScorecard) {
    this.scorecard = scorecard;
  }

  /** Route a capability profile to the best available model */
  route(agentId: string, profile: CapabilityProfile): RoutingDecision {
    const candidates = this.scorecard.getActive()
      .map(entry => ({ entry, score: this.scoreMatch(entry, profile) }))
      .filter(c => c.score > 0)
      .sort((a, b) => b.score - a.score);

    // A/B test: route to challenger if configured
    let selected = candidates[0];
    if (this.challengerModel && this.abTestPercentage > 0 && Math.random() * 100 < this.abTestPercentage) {
      const challenger = candidates.find(c => c.entry.model_id === this.challengerModel);
      if (challenger) selected = challenger;
    }

    const decision: RoutingDecision = {
      request_id: randomUUID(),
      agent_id: agentId,
      profile,
      selected_model: selected?.entry.model_id ?? 'fallback',
      selected_provider: selected?.entry.provider ?? 'unknown',
      score_match: selected?.score ?? 0,
      alternatives: candidates.slice(1, 4).map(c => ({ model_id: c.entry.model_id, score: c.score })),
      reasoning: this.explainDecision(selected, candidates.length, profile),
      timestamp: new Date().toISOString(),
    };

    this.routingHistory.push(decision);
    return decision;
  }

  /** Enable A/B testing with a challenger model */
  enableABTest(challengerModelId: string, percentage: number): void {
    this.challengerModel = challengerModelId;
    this.abTestPercentage = Math.max(0, Math.min(100, percentage));
  }

  disableABTest(): void {
    this.challengerModel = undefined;
    this.abTestPercentage = 0;
  }

  /** Get per-agent routing history */
  getAgentHistory(agentId: string): RoutingDecision[] {
    return this.routingHistory.filter(d => d.agent_id === agentId);
  }

  /** Score how well a model matches a capability profile (0-100) */
  private scoreMatch(entry: ScorecardEntry, profile: CapabilityProfile): number {
    let score = 0;
    const tierMap = { frontier: 4, efficient: 3, standard: 2, minimal: 1 };
    const speedMap = { realtime: 4, fast: 3, standard: 2, batch: 1 };
    const ctxMap = { xlarge: 4, large: 3, medium: 2, small: 1 };

    // Reasoning match (30 points)
    const reqR = tierMap[profile.reasoning] ?? 2;
    const hasR = tierMap[entry.capabilities.reasoning] ?? 2;
    score += hasR >= reqR ? 30 : Math.max(0, 30 - (reqR - hasR) * 15);

    // Speed match (20 points)
    const reqS = speedMap[profile.speed] ?? 2;
    const hasS = speedMap[entry.capabilities.speed] ?? 2;
    score += hasS >= reqS ? 20 : Math.max(0, 20 - (reqS - hasS) * 10);

    // Context size (10 points)
    const reqC = ctxMap[profile.context_size] ?? 2;
    const hasC = ctxMap[entry.capabilities.context_size] ?? 2;
    score += hasC >= reqC ? 10 : 0;

    // Modality (15 points)
    const modalityMatch = profile.modality.every(m => entry.capabilities.modality.includes(m));
    score += modalityMatch ? 15 : 0;

    // Privacy (10 points)
    if (profile.privacy === 'local_only' && entry.capabilities.privacy !== 'local_only') score += 0;
    else score += 10;

    // Quality score bonus (15 points)
    score += Math.round((entry.quality_score / 100) * 15);

    // Apply constraints
    if (profile.constraints) {
      if (profile.constraints.max_cost_per_1k_tokens && entry.cost_per_1k_tokens > profile.constraints.max_cost_per_1k_tokens) return 0;
      if (profile.constraints.max_latency_ms && entry.latency_p50 > profile.constraints.max_latency_ms) return 0;
      if (profile.constraints.required_provider && entry.provider !== profile.constraints.required_provider) return 0;
      if (profile.constraints.excluded_providers?.includes(entry.provider)) return 0;
      if (profile.constraints.min_quality_score && entry.quality_score < profile.constraints.min_quality_score) return 0;
    }

    return Math.round(score);
  }

  private explainDecision(selected: { entry: ScorecardEntry; score: number } | undefined, totalCandidates: number, profile: CapabilityProfile): string {
    if (!selected) return 'No matching models found. Using fallback.';
    return `Selected ${selected.entry.model_id} (${selected.entry.provider}) with score ${selected.score}/100. ${totalCandidates} candidates evaluated for ${profile.task_affinity} task.`;
  }
}