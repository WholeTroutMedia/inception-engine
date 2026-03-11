/**
 * Capability Profile Schema — Phase C HELIX A
 * Replaces hardcoded model strings with declarative capability requirements.
 */

export type ReasoningTier = 'frontier' | 'efficient' | 'standard' | 'minimal';
export type SpeedTier = 'realtime' | 'fast' | 'standard' | 'batch';
export type ContextSize = 'xlarge' | 'large' | 'medium' | 'small';
export type Modality = 'text' | 'image' | 'audio' | 'video' | 'code' | 'emergent';
export type PrivacyLevel = 'local_only' | 'cloud_ok' | 'any';
export type BudgetTier = 'premium' | 'standard' | 'economy' | 'free' | 'research';
export type TaskAffinity = 'reasoning' | 'creative' | 'factual' | 'code' | 'conversational' | 'analytical' | 'multimodal' | 'general' | 'bio-emulation' | 'sensorimotor' | 'behavioral';
export type ProviderStatus = 'active' | 'benchmarking' | 'deprecated' | 'unavailable' | 'pending';

export interface CapabilityProfile {
  reasoning: ReasoningTier;
  speed: SpeedTier;
  context_size: ContextSize;
  modality: Modality[];
  privacy: PrivacyLevel;
  budget_tier: BudgetTier;
  task_affinity: TaskAffinity;
  constraints?: {
    max_latency_ms?: number;
    max_cost_per_1k_tokens?: number;
    required_provider?: string;
    excluded_providers?: string[];
    min_quality_score?: number;
  };
}

export interface ScorecardEntry {
  model_id: string;
  provider: string;
  capabilities: { reasoning: ReasoningTier; speed: SpeedTier; context_size: ContextSize; modality: Modality[]; privacy: PrivacyLevel };
  cost_per_1k_tokens: number;
  latency_p50: number;
  latency_p99: number;
  quality_score: number;
  quality_dimensions: { reasoning_accuracy: number; creative_quality: number; instruction_following: number; code_generation: number; factual_accuracy: number; speed_score: number };
  last_benchmarked: string;
  status: ProviderStatus;
  uptime_30d: number;
  /** Bio-fidelity score (0-100) — only set for bio-emulation providers. Measures behavioral accuracy vs biological reference. */
  bio_fidelity?: number;
  /** Marks forward-declared providers not yet active. Routes to fallback when true and API key absent. */
  is_experimental?: boolean;
  /** Indicates a sovereign local provider — zero cost, sovereign policy compliant. */
  is_local?: boolean;
}

export interface RoutingDecision {
  request_id: string;
  agent_id: string;
  profile: CapabilityProfile;
  selected_model: string;
  selected_provider: string;
  score_match: number;
  alternatives: Array<{ model_id: string; score: number }>;
  reasoning: string;
  timestamp: string;
}

export interface BenchmarkResult {
  model_id: string;
  provider: string;
  eval_suite_version: string;
  dimensions: ScorecardEntry['quality_dimensions'];
  composite_score: number;
  cost_total: number;
  duration_ms: number;
  sample_count: number;
  timestamp: string;
}

const VALID_REASONING: ReasoningTier[] = ['frontier', 'efficient', 'standard', 'minimal'];
const VALID_SPEED: SpeedTier[] = ['realtime', 'fast', 'standard', 'batch'];
const VALID_CONTEXT: ContextSize[] = ['xlarge', 'large', 'medium', 'small'];
const VALID_MODALITY: Modality[] = ['text', 'image', 'audio', 'video', 'code', 'emergent'];
const VALID_PRIVACY: PrivacyLevel[] = ['local_only', 'cloud_ok', 'any'];
const VALID_BUDGET: BudgetTier[] = ['premium', 'standard', 'economy', 'free', 'research'];

export function validateProfile(p: unknown): p is CapabilityProfile {
  if (!p || typeof p !== 'object') return false;
  const o = p as Record<string, unknown>;
  return VALID_REASONING.includes(o.reasoning as ReasoningTier) && VALID_SPEED.includes(o.speed as SpeedTier) && VALID_CONTEXT.includes(o.context_size as ContextSize) && Array.isArray(o.modality) && o.modality.every((m: unknown) => VALID_MODALITY.includes(m as Modality)) && VALID_PRIVACY.includes(o.privacy as PrivacyLevel) && VALID_BUDGET.includes(o.budget_tier as BudgetTier);
}

export const PRESET_PROFILES: Record<string, CapabilityProfile> = {
  ATHENA: { reasoning: 'frontier', speed: 'standard', context_size: 'large', modality: ['text'], privacy: 'cloud_ok', budget_tier: 'premium', task_affinity: 'reasoning' },
  VERA: { reasoning: 'efficient', speed: 'fast', context_size: 'medium', modality: ['text'], privacy: 'cloud_ok', budget_tier: 'standard', task_affinity: 'analytical' },
  IRIS: { reasoning: 'frontier', speed: 'standard', context_size: 'large', modality: ['text', 'image', 'audio'], privacy: 'cloud_ok', budget_tier: 'premium', task_affinity: 'creative' },
  /** Bio-emulation profile — routes to Eon Systems when available, falls back to local inference. */
  EON_BIO: { reasoning: 'standard', speed: 'batch', context_size: 'small', modality: ['emergent'], privacy: 'cloud_ok', budget_tier: 'research', task_affinity: 'bio-emulation', constraints: { required_provider: 'eon-bio' } },
};

export const CAPABILITY_SCHEMA_VERSION = '1.1.0'; // bio-emulation support