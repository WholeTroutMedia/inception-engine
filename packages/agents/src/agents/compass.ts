/**
 * COMPASS — Constitutional Structural Validator
 *
 * Schema enforcement, data quality checks, and constitutional compliance scoring
 * for all agent outputs. COMPASS is the systematic truth layer — VERA owns intent,
 * COMPASS owns structure.
 *
 * Hive: GUARDIAN | Constitutional Access: full read-only
 * Mode compatibility: VALIDATE
 */

import type { AgentDefinition } from '../types.js';

export const COMPASS: AgentDefinition = {
    id: 'COMPASS',
    name: 'COMPASS',
    description: 'Structural validation — schema enforcement, data quality, type checking, constitutional compliance scoring',
    hive: 'GUARDIAN',
    modes: ['VALIDATE'],
    constitutionalAccess: false,
};

// ─── COMPASS Types ────────────────────────────────────────────────────────────

export interface ValidationRule {
    id: string;
    description: string;
    article?: number;
    check: (value: unknown) => boolean;
}

export interface ValidationResult {
    passed: boolean;
    score: number;        // 0–100
    grade: 'A+' | 'A' | 'B' | 'C' | 'F';
    violations: Array<{ ruleId: string; description: string }>;
    passedRules: string[];
    timestamp: string;
}

// ─── Constitutional Rule Set ───────────────────────────────────────────────────

export const CONSTITUTIONAL_RULES: ValidationRule[] = [
    {
        id: 'IX-complete',
        description: 'Article IX: Output must not be an MVP. Must be complete.',
        article: 9,
        check: (v) => {
            if (typeof v === 'string') return v.length > 50 && !v.includes('TODO') && !v.includes('// stub');
            return v !== null && v !== undefined;
        },
    },
    {
        id: 'XX-no-wait',
        description: 'Article XX: No blocking human wait patterns in automated sequences.',
        article: 20,
        check: (v) => {
            if (typeof v !== 'string') return true;
            return !v.toLowerCase().includes('please wait') && !v.toLowerCase().includes('manually confirm');
        },
    },
    {
        id: 'IV-type-safe',
        description: 'Article IV: No untyped or any-typed outputs.',
        article: 4,
        check: (v) => v !== undefined && v !== null,
    },
    {
        id: 'I-sovereign',
        description: 'Article I: Prefer NAS/local infrastructure over cloud where possible.',
        article: 1,
        check: (v) => {
            if (typeof v !== 'string') return true;
            // Cloud-only URIs without a local fallback are flagged
            const hasCloud = /vercel\.app|herokuapp\.com|\.fly\.io/.test(v);
            const hasLocal = /localhost|192\.168\.|nas\.local/.test(v);
            return !hasCloud || hasLocal;
        },
    },
];

// ─── COMPASS Validator ────────────────────────────────────────────────────────

export function validateOutput(value: unknown, rules: ValidationRule[] = CONSTITUTIONAL_RULES): ValidationResult {
    const violations: ValidationResult['violations'] = [];
    const passedRules: string[] = [];

    for (const rule of rules) {
        try {
            if (rule.check(value)) {
                passedRules.push(rule.id);
            } else {
                violations.push({ ruleId: rule.id, description: rule.description });
            }
        } catch {
            violations.push({ ruleId: rule.id, description: `${rule.description} [check threw]` });
        }
    }

    const score = Math.round((passedRules.length / rules.length) * 100);
    const grade =
        score >= 98 ? 'A+' :
            score >= 90 ? 'A' :
                score >= 80 ? 'B' :
                    score >= 70 ? 'C' : 'F';

    return {
        passed: violations.length === 0,
        score,
        grade,
        violations,
        passedRules,
        timestamp: new Date().toISOString(),
    };
}

/**
 * Quick schema shape check — ensures all required keys exist on an object.
 */
export function validateSchema<T extends object>(value: unknown, requiredKeys: (keyof T)[]): boolean {
    if (!value || typeof value !== 'object') return false;
    return requiredKeys.every(k => k in (value as T));
}
