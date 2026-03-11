/**
 * Guardrail Gradient System
 * Evaluates token scanner output to trigger hard/soft/nudge/celebration events.
 */
export function evaluateGuardrails(score) {
    if (score >= 90)
        return 'celebration';
    if (score >= 70)
        return 'nudge';
    if (score >= 50)
        return 'soft';
    return 'hard';
}
//# sourceMappingURL=guardrails.js.map