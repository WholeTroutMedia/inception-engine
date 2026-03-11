// packages/design-sandbox/src/guardrails.ts
// T20260306-889: Guardrail gradient system — hard/soft/nudge/celebration

export type GuardrailLevel = 'hard' | 'soft' | 'nudge' | 'celebration';

export interface GuardrailResult {
    level: GuardrailLevel;
    message: string;
    score: number;
    blocked: boolean;
    suggestions?: string[];
}

// ─── Score thresholds ─────────────────────────────────────────────────────────

const THRESHOLDS = {
    celebration: 90,  // score >= 90 → celebrate
    pass: 70,         // score >= 70 → nudge only
    soft: 50,         // score >= 50 → soft warning
    hard: 0,          // score < 50  → hard block
} as const;

// ─── Guardrail evaluator ──────────────────────────────────────────────────────

export function evaluateGuardrail(score: number, context?: string): GuardrailResult {
    if (score >= THRESHOLDS.celebration) {
        return {
            level: 'celebration',
            score,
            blocked: false,
            message: `🎉 Outstanding design quality! Score: ${score}/100`,
            suggestions: [],
        };
    }

    if (score >= THRESHOLDS.pass) {
        return {
            level: 'nudge',
            score,
            blocked: false,
            message: `✅ Design quality meets the bar (${score}/100). A few improvements available.`,
            suggestions: buildSuggestions(score, context),
        };
    }

    if (score >= THRESHOLDS.soft) {
        return {
            level: 'soft',
            score,
            blocked: false,
            message: `⚠️ Design quality needs work (${score}/100). Improvements recommended before export.`,
            suggestions: buildSuggestions(score, context),
        };
    }

    return {
        level: 'hard',
        score,
        blocked: true,
        message: `🚫 Design quality blocked (${score}/100). Score must reach 70+ before production export.`,
        suggestions: buildSuggestions(score, context),
    };
}

function buildSuggestions(score: number, context?: string): string[] {
    const suggestions: string[] = [];

    if (score < 70) {
        suggestions.push('Replace literal color values with semantic tokens');
        suggestions.push('Ensure all text meets WCAG AA contrast ratio (4.5:1 minimum)');
    }
    if (score < 80) {
        suggestions.push('Check spacing is on the 4px grid');
        suggestions.push('Limit type sizes to the 9-size scale');
    }
    if (score < 90) {
        suggestions.push('Verify component tokens do not reference primitive tokens directly');
        suggestions.push('Align shadow depths to the 4-tier shadow scale');
    }
    if (context) {
        suggestions.push(`Context hint: ${context}`);
    }

    return suggestions;
}

// ─── Promotion gate ───────────────────────────────────────────────────────────

export class PromotionGate {
    private readonly threshold: number;

    constructor(threshold = 70) {
        this.threshold = threshold;
    }

    /** Returns true if the design passes and can be promoted to production export. */
    canPromote(score: number): boolean {
        return score >= this.threshold;
    }

    /** Evaluate and return full guardrail result. Throws if blockOnFail = true and score is blocked. */
    evaluate(score: number, context?: string, blockOnFail = false): GuardrailResult {
        const result = evaluateGuardrail(score, context);
        if (blockOnFail && result.blocked) {
            throw new Error(`[PromotionGate] Blocked: ${result.message}`);
        }
        return result;
    }
}

// ─── CSS class helpers (for sandbox UI integration) ───────────────────────────

export function guardrailCssClass(level: GuardrailLevel): string {
    return {
        hard: 'guardrail-hard',
        soft: 'guardrail-soft',
        nudge: 'guardrail-nudge',
        celebration: 'guardrail-celebration',
    }[level];
}

export function guardrailColor(level: GuardrailLevel): string {
    return {
        hard: 'var(--color-error, #ef4444)',
        soft: 'var(--color-warning, #f59e0b)',
        nudge: 'var(--color-primary, #3b82f6)',
        celebration: 'var(--color-success, #22c55e)',
    }[level];
}

// ─── Singleton ────────────────────────────────────────────────────────────────

export const defaultGate = new PromotionGate(70);
