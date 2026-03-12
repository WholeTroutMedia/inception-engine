/**
 * @cle/core — LLM Provider Types
 *
 * Type definitions for LLM providers, model config, and provider
 * health monitoring. Zero runtime dependencies.
 *
 * Constitutional: Article I (Sovereignty) — always prefer self-hosted
 * providers; Article X (Resource Stewardship) — monitor token usage.
 */

// ─── Provider Registry ────────────────────────────────────────────────────────

/** Supported LLM providers */
export type LLMProvider =
    | 'gemini'       // Google AI / Vertex
    | 'anthropic'    // Claude
    | 'openai'       // GPT
    | 'perplexity'   // Sonar (search-augmented)
    | 'ollama'       // Local / sovereign
    | 'grok'         // xAI
    | 'custom';      // Self-hosted GGUF / other

/** Provider status for health monitoring */
export type ProviderStatus = 'online' | 'degraded' | 'offline' | 'rate_limited';

// ─── Model Config ─────────────────────────────────────────────────────────────

/** Configuration for a specific model invocation */
export interface ModelConfig {
    /** Provider to use */
    provider: LLMProvider;
    /** Model name/ID as used by the provider */
    modelId: string;
    /** Sampling temperature (0 = deterministic, 1 = creative) */
    temperature?: number;
    /** Maximum output tokens */
    maxTokens?: number;
    /** Top-p nucleus sampling */
    topP?: number;
    /** Stop sequences */
    stopSequences?: string[];
    /** Whether to stream the response */
    stream?: boolean;
}

/** Runtime model alias — short names used in AGENT_ROSTER */
export type ModelAlias =
    | 'gemini-3-pro-preview'
    | 'gemini-2.5-pro'
    | 'gemini-2.5-flash'
    | 'gemini-2.0-flash'
    | 'gemini-1.5-pro'
    | 'veo-3.1-generate-preview'
    | 'claude-3-7-sonnet'
    | 'claude-3-5-haiku'
    | 'gpt-4o'
    | 'gpt-4o-mini'
    | 'sonar-pro'
    | 'sonar'
    | 'ollama/llama3'
    | 'ollama/mistral';

// ─── Provider Health ──────────────────────────────────────────────────────────

/** Real-time health metrics for a provider */
export interface ProviderHealth {
    provider: LLMProvider;
    status: ProviderStatus;
    /** Latency of the last successful request in milliseconds */
    latencyMs?: number;
    /** Tokens used in the current billing period */
    tokensUsedPeriod?: number;
    /** Unix timestamp of last check */
    lastCheckedAt: number;
    /** Error message if status is not 'online' */
    errorMessage?: string;
}

/** Aggregated health snapshot of all configured providers */
export interface ProviderHealthSnapshot {
    providers: ProviderHealth[];
    /** Number of providers currently online */
    onlineCount: number;
    /** ISO timestamp when snapshot was taken */
    snapshotAt: string;
    /** The recommended primary provider based on current health */
    recommended: LLMProvider;
}

// ─── Fallback Chain ───────────────────────────────────────────────────────────

/** A fallback chain entry — provider + optional override config */
export interface FallbackEntry {
    provider: LLMProvider;
    modelId: string;
    priority: number;
    /** Min confidence/availability before falling back */
    threshold?: number;
}

/** A complete fallback chain for a flow or task type */
export interface FallbackChain {
    name: string;
    entries: FallbackEntry[];
}
