/**
 * Creative Liberation Engine — Dynamic Model Registry
 *
 * NEVER hardcode model version strings anywhere in the codebase.
 * Always import from here. Model names live in .env only.
 *
 * Capability tiers — update .env when providers release new models,
 * zero code changes required.
 *
 * Constitutional: Article I (Sovereignty), Article XX (Zero friction)
 */

// ─── CAPABILITY TIERS ────────────────────────────────────────────────────────
// These are the only identifiers the rest of the codebase should ever use.

export type CloudTier = 'cloud:max' | 'cloud:fast' | 'cloud:cheap' | 'cloud:vision' | 'cloud:code';
export type LocalTier = 'local:fast' | 'local:code' | 'local:large' | 'local:embed' | 'local:vision';
export type WebTier = 'web:research' | 'web:research:deep';
export type ModelTier = CloudTier | LocalTier | WebTier;

// ─── REGISTRY ────────────────────────────────────────────────────────────────
// Each tier reads from an env var. If the env var is not set, falls back
// to a sensible provider-canonical default.
//
// HOW TO UPDATE: change the env var in .env — never touch this file.

function env(key: string, fallback: string): string {
    return process.env[key] ?? fallback;
}

export const MODEL_REGISTRY: Record<ModelTier, string> = {
    // ── CLOUD TIERS ──────────────────────────────────────────────────────────
    // Sources verified live from ai.google.dev/gemini-api/docs/models
    // and platform.claude.com/docs/about-claude/models on 2026-03-08.
    // Update .env vars below to rotate — zero code changes required.
    //
    // Google canonical alias pattern: gemini-{family}-latest
    // These are hot-swapped by Google with 2-week email notice — stable for production.

    'cloud:max':    env('MODEL_CLOUD_MAX',    'gemini-pro-latest'),        // Stable, production-ready
    'cloud:fast':   env('MODEL_CLOUD_FAST',   'gemini-flash-latest'),     // Frontier-class, fraction of the cost
    'cloud:cheap':  env('MODEL_CLOUD_CHEAP',  'gemini-flash-latest'),      // Stable workhorse, best value
    'cloud:vision': env('MODEL_CLOUD_VISION', 'gemini-flash-latest'),      // Multimodal, stable
    'cloud:code':   env('MODEL_CLOUD_CODE',   'gemini-flash-latest'),      // Cloud code fallback

    // ── LOCAL TIERS ───────────────────────────────────────────────────────────
    // Ollama resolves :latest to whatever's pulled on the machine.
    // Specific quantization tags only if VRAM budget requires — set via env var.

    'local:fast':   env('MODEL_LOCAL_FAST',   'gemma3:latest'),
    'local:code':   env('MODEL_LOCAL_CODE',   'qwen2.5-coder:latest'),
    'local:large':  env('MODEL_LOCAL_LARGE',  'llama3.3:latest'),
    'local:embed':  env('MODEL_LOCAL_EMBED',  'nomic-embed-text'),
    'local:vision': env('MODEL_LOCAL_VISION', 'llava:latest'),

    // ── WEB RESEARCH TIERS (Perplexity Sonar) ────────────────────────────────
    // sonar-pro: fastest + cited real-time answers. Best for production chat.
    // sonar-deep-research: multi-source synthesis. 10× cost. Use only for P0 research tasks.
    // Override: set MODEL_WEB_RESEARCH or MODEL_WEB_RESEARCH_DEEP in .env
    'web:research':      env('MODEL_WEB_RESEARCH',       'sonar-pro'),
    'web:research:deep': env('MODEL_WEB_RESEARCH_DEEP',  'sonar-deep-research'),
} as const;

// Anthropic models (for flows using the anthropic plugin directly):
// claude-opus-4-6    — most intelligent, agents + coding, 1M context (Feb 2026)
// claude-sonnet-4-6  — balanced speed + intelligence
// claude-haiku-4-5   — fastest
// Source: platform.claude.com/docs/about-claude/models
// Never use claude-* without verifying current.
export const CLAUDE_MODELS = {
    max:   env('MODEL_CLAUDE_MAX',   'claude-opus-latest'),
    fast:  env('MODEL_CLAUDE_FAST',  'claude-sonnet-latest'),
    cheap: env('MODEL_CLAUDE_CHEAP', 'claude-haiku-latest'),
} as const;


// ─── ACCESSOR ────────────────────────────────────────────────────────────────

/**
 * Get the resolved model string for a capability tier.
 * This is the ONLY function the rest of the codebase should call.
 *
 * @example
 *   const model = resolveModel('cloud:max');  // → reads MODEL_CLOUD_MAX or fallback
 *   const local = resolveModel('local:code'); // → reads MODEL_LOCAL_CODE or fallback
 */
export function resolveModel(tier: ModelTier): string {
    return MODEL_REGISTRY[tier];
}

/**
 * Check if a tier is a local (Ollama) model.
 */
export function isLocalTier(tier: ModelTier): tier is LocalTier {
    return tier.startsWith('local:');
}

/**
 * Check if a tier is a web research (Perplexity) tier.
 */
export function isWebTier(tier: ModelTier): tier is WebTier {
    return tier.startsWith('web:');
}

/**
 * Log the full registry at boot so you always know what's active.
 * Call once from server.ts startup.
 */
export function logModelRegistry(): void {
    console.log('[MODEL-REGISTRY] Active model tiers:');
    for (const [tier, model] of Object.entries(MODEL_REGISTRY)) {
        const source = process.env[`MODEL_${tier.replace(':', '_').toUpperCase()}`]
            ? '(env)'
            : '(default)';
        const icon = tier.startsWith('local:') ? '🦙' : '☁️ ';
        console.log(`  ${icon}  ${tier.padEnd(18)} → ${model} ${source}`);
    }
}
