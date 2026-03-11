/**
 * Creative Liberation Engine — Smart Model Router
 *
 * Routes each request to the right capability tier.
 * Zero hardcoded model strings — all names live in model-registry.ts
 * and are driven by env vars. Rotate models by updating .env only.
 *
 * Constitutional: Article XX (zero wait), Article I (local-first sovereignty)
 */


import {
    type ModelTier,
    type CloudTier,
    type LocalTier,
    resolveModel,
    isLocalTier,
} from '../config/model-registry.js';

export { resolveModel, isLocalTier };
export type { ModelTier, CloudTier, LocalTier };

// ─── ROUTING DECISION ────────────────────────────────────────────────────────

export interface RoutingDecision {
    tier: ModelTier;
    model: string;            // resolved model string — for logging/passing to genkit
    locality: 'local' | 'cloud';
    reason: string;
    complexityScore: number;
    modeSuggestion: string;
}

// ─── ROUTING LOGIC ────────────────────────────────────────────────────────────
//
// Routing table — edit the LOGIC here, never the model strings.
// Threshold adjustments → change numbers.
// Model upgrades       → change env vars in .env.

function selectTier(complexityScore: number, modeSuggestion: string, capabilities: string[]): ModelTier {
    const needsCode = capabilities.includes('code');

    // Code tasks: local coder is free and purpose-built — use until complexity demands cloud
    if (needsCode && complexityScore < 8) {
        return 'local:code';
    }

    // Low complexity: fully local — zero cloud spend
    if (complexityScore <= 3) {
        return 'local:fast';
    }

    // Medium: pick cheapest cloud tier that fits the mode
    if (complexityScore <= 6) {
        const heavyMode = modeSuggestion === 'SHIP' || modeSuggestion === 'PLAN';
        return heavyMode ? 'cloud:fast' : 'cloud:cheap';
    }

    // High complexity: full power
    return 'cloud:max';
}

// ─── SMART ROUTER ────────────────────────────────────────────────────────────

/**
 * Classify a request and return the optimal model tier + resolved model string.
 * Classification itself uses the local:fast tier — never burns cloud credits on meta-work.
 */
export async function smartRoute(userRequest: string): Promise<RoutingDecision> {
    try {
        const { classifyTaskFlow } = await import('../flows/classify-task.js');
        const classification = await classifyTaskFlow({ userRequest });
        const { complexityScore, modeSuggestion, requiredCapabilities } = classification;

        const tier = selectTier(complexityScore, modeSuggestion, requiredCapabilities ?? []);
        const model = resolveModel(tier);

        return {
            tier,
            model,
            locality: isLocalTier(tier) ? 'local' : 'cloud',
            reason: `score:${complexityScore} mode:${modeSuggestion} → ${tier}`,
            complexityScore,
            modeSuggestion,
        };
    } catch (err) {
        // Constitutional fallback: never block work
        console.warn('[SMART-ROUTER] Classification failed, falling back to cloud:max:', err);
        return {
            tier: 'cloud:max',
            model: resolveModel('cloud:max'),
            locality: 'cloud',
            reason: 'classification-failed → constitutional fallback',
            complexityScore: 7,
            modeSuggestion: 'SHIP',
        };
    }
}

// ─── LOGGING ─────────────────────────────────────────────────────────────────

export function logRouting(d: RoutingDecision, prefix = '[ROUTER]'): void {
    const icon = d.locality === 'local' ? '🦙' : '☁️ ';
    console.log(`${prefix} ${icon} ${d.tier} → ${d.model} | ${d.reason}`);
}
