/**
 * Guardrail Gradient System
 * Evaluates token scanner output to trigger hard/soft/nudge/celebration events.
 */
export type GuardrailLevel = 'hard' | 'soft' | 'nudge' | 'celebration';
export declare function evaluateGuardrails(score: number): GuardrailLevel;
//# sourceMappingURL=guardrails.d.ts.map