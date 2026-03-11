/**
 * Guardrail Gradient System
 * Evaluates token scanner output to trigger hard/soft/nudge/celebration events.
 */

export type GuardrailLevel = 'hard' | 'soft' | 'nudge' | 'celebration';

export function evaluateGuardrails(score: number): GuardrailLevel {
    if (score >= 90) return 'celebration';
    if (score >= 70) return 'nudge';
    if (score >= 50) return 'soft';
    return 'hard';
}
