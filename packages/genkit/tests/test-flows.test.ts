/**
 * Task Classification Flow Tests
 *
 * Verifies the classify-task flow schema and fallback behavior.
 * Note: Full LLM classification requires live API keys.
 */

import { describe, it, expect } from 'vitest';
import { TaskClassificationSchema } from '../src/flows/classify-task.js';

describe('TaskClassification Schema', () => {
    it('should validate a correct classification object', () => {
        const validClassification = {
            primaryObjective: 'Build a new feature',
            requiredCapabilities: ['code', 'design'],
            complexityScore: 5,
            modeSuggestion: 'SHIP' as const,
            requiresBrowser: false,
            estimatedCredits: 2,
            suggestedAgents: ['BOLT', 'AURORA'],
            reasoning: 'This is a standard feature build requiring code and design.',
        };

        const result = TaskClassificationSchema.safeParse(validClassification);
        expect(result.success).toBe(true);
    });

    it('should reject invalid complexity score (out of range)', () => {
        const invalidClassification = {
            primaryObjective: 'Test',
            requiredCapabilities: ['code'],
            complexityScore: 15, // Invalid: max is 10
            modeSuggestion: 'SHIP',
            requiresBrowser: false,
            estimatedCredits: 1,
            suggestedAgents: ['BOLT'],
            reasoning: 'Test',
        };

        const result = TaskClassificationSchema.safeParse(invalidClassification);
        expect(result.success).toBe(false);
    });

    it('should reject invalid mode suggestion', () => {
        const invalidClassification = {
            primaryObjective: 'Test',
            requiredCapabilities: ['code'],
            complexityScore: 3,
            modeSuggestion: 'INVALID_MODE', // Invalid
            requiresBrowser: false,
            estimatedCredits: 1,
            suggestedAgents: ['BOLT'],
            reasoning: 'Test',
        };

        const result = TaskClassificationSchema.safeParse(invalidClassification);
        expect(result.success).toBe(false);
    });

    it('should accept all valid operational modes', () => {
        const modes = ['IDEATE', 'PLAN', 'SHIP', 'VALIDATE'] as const;

        for (const mode of modes) {
            const classification = {
                primaryObjective: `Test ${mode}`,
                requiredCapabilities: ['code'],
                complexityScore: 3,
                modeSuggestion: mode,
                requiresBrowser: false,
                estimatedCredits: 1,
                suggestedAgents: ['BOLT'],
                reasoning: `Testing ${mode} mode`,
            };

            const result = TaskClassificationSchema.safeParse(classification);
            expect(result.success).toBe(true);
        }
    });
});

// =============================================================================
// ATHENA Schema Tests
// =============================================================================

import { AthenaInputSchema, AthenaOutputSchema } from '../src/flows/athena.js';

describe('AthenaInputSchema', () => {
    it('should validate valid strategy mode input', () => {
        const result = AthenaInputSchema.safeParse({
            mode: 'strategy',
            topic: 'Build a new AI-powered search interface',
            depth: 'deep',
        });
        expect(result.success).toBe(true);
    });

    it('should validate valid spec mode input with all optional fields', () => {
        const result = AthenaInputSchema.safeParse({
            mode: 'spec',
            topic: 'Implement the AVERI API gateway',
            context: 'We are using Express + Genkit on port 4100',
            keeperContext: 'Past KIs: genkit-flows, zero-day',
            depth: 'exhaustive',
            sessionId: 'test_session_123',
        });
        expect(result.success).toBe(true);
    });

    it('should reject invalid mode', () => {
        const result = AthenaInputSchema.safeParse({
            mode: 'brainstorm', // invalid
            topic: 'test',
        });
        expect(result.success).toBe(false);
    });

    it('should reject invalid depth value', () => {
        const result = AthenaInputSchema.safeParse({
            mode: 'strategy',
            topic: 'test',
            depth: 'medium', // invalid
        });
        expect(result.success).toBe(false);
    });

    it('should default depth to deep when omitted', () => {
        const result = AthenaInputSchema.safeParse({
            mode: 'strategy',
            topic: 'test topic',
        });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.depth).toBe('deep');
        }
    });
});

describe('AthenaOutputSchema', () => {
    it('should validate a complete ATHENA output', () => {
        const result = AthenaOutputSchema.safeParse({
            directive: 'Build the AVERI gateway as a constitutional middleware layer',
            rationale: 'Centralizing constitutional review at the gateway ensures all agents comply',
            options: [
                {
                    title: 'Middleware Approach',
                    description: 'Inject COMPASS review as Express middleware',
                    tradeoffs: 'Adds 50ms latency but ensures constitutional compliance',
                    recommendation: 'preferred',
                },
            ],
            suggestedAgents: ['BOLT', 'COMPASS'],
            nextMode: 'SHIP',
            constitutionalFlags: ['Article IX: Ship Complete'],
            athenaSignature: 'ATHENA',
        });
        expect(result.success).toBe(true);
    });

    it('should reject invalid nextMode', () => {
        const result = AthenaOutputSchema.safeParse({
            directive: 'test',
            rationale: 'test',
            nextMode: 'EXECUTE', // invalid — not in enum
            athenaSignature: 'ATHENA',
        });
        expect(result.success).toBe(false);
    });

    it('should reject wrong athenaSignature', () => {
        const result = AthenaOutputSchema.safeParse({
            directive: 'test',
            rationale: 'test',
            nextMode: 'SHIP',
            athenaSignature: 'VERA', // must be literal 'ATHENA'
        });
        expect(result.success).toBe(false);
    });

    it('should default empty arrays for options, suggestedAgents, constitutionalFlags', () => {
        const result = AthenaOutputSchema.safeParse({
            directive: 'test directive',
            rationale: 'test rationale',
            nextMode: 'PLAN',
        });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.options).toEqual([]);
            expect(result.data.suggestedAgents).toEqual([]);
            expect(result.data.constitutionalFlags).toEqual([]);
            expect(result.data.athenaSignature).toBe('ATHENA');
        }
    });
});
