/**
 * @inception/core — Unit Tests
 *
 * Tests the constitutional primitives, type constants, and utilities.
 * These run with zero LLM calls — pure logic validation.
 *
 * Run: npm test --prefix packages/inception-core
 */

import { describe, it, expect } from 'vitest';
import {
    INCEPTION_VERSION,
    SACRED_MISSION,
    CONSTITUTION,
    HIVES,
    constitutionalPreflight,
} from '../src/index.js';

// =============================================================================
// VERSION & CONSTANTS
// =============================================================================

describe('INCEPTION_VERSION', () => {
    it('should be 5.0.0-genesis', () => {
        expect(INCEPTION_VERSION).toBe('5.0.0-genesis');
    });

    it('should contain the version number', () => {
        expect(INCEPTION_VERSION).toMatch(/^5\./);
    });
});

describe('SACRED_MISSION', () => {
    it('should be defined and non-empty', () => {
        expect(SACRED_MISSION).toBeDefined();
        expect(SACRED_MISSION.length).toBeGreaterThan(20);
    });

    it('should reference artists', () => {
        expect(SACRED_MISSION.toUpperCase()).toContain('ARTISTS');
    });

    it('should not be empty', () => {
        expect(SACRED_MISSION.trim()).not.toBe('');
    });
});

// =============================================================================
// CONSTITUTION
// =============================================================================

describe('CONSTITUTION', () => {
    it('should have all 20 articles (0-19)', () => {
        for (let i = 0; i <= 19; i++) {
            expect(CONSTITUTION).toHaveProperty(String(i));
        }
    });

    it('each article should have name, immutable, and summary', () => {
        for (let i = 0; i <= 19; i++) {
            const article = CONSTITUTION[i as keyof typeof CONSTITUTION];
            expect(article).toHaveProperty('name');
            expect(article).toHaveProperty('immutable');
            expect(article).toHaveProperty('summary');
            expect(typeof article.name).toBe('string');
            expect(typeof article.immutable).toBe('boolean');
            expect(typeof article.summary).toBe('string');
        }
    });

    it('Article 0 (Sacred Mission) should be immutable', () => {
        expect(CONSTITUTION[0].immutable).toBe(true);
    });

    it('Article 1 (Separation of Powers) should be immutable', () => {
        expect(CONSTITUTION[1].immutable).toBe(true);
    });

    it('Article 17 (Anti-Theft) should be immutable', () => {
        expect(CONSTITUTION[17].immutable).toBe(true);
    });

    it('Article 18 (Anti-Lock-In) should be immutable', () => {
        expect(CONSTITUTION[18].immutable).toBe(true);
    });

    it('Article 19 (Neural Architecture) should be immutable', () => {
        expect(CONSTITUTION[19].immutable).toBe(true);
    });

    it('no article should have an empty name or summary', () => {
        for (let i = 0; i <= 19; i++) {
            const article = CONSTITUTION[i as keyof typeof CONSTITUTION];
            expect(article.name.trim()).not.toBe('');
            expect(article.summary.trim()).not.toBe('');
        }
    });
});

// =============================================================================
// HIVES
// =============================================================================

describe('HIVES', () => {
    it('should define all 7 hives', () => {
        const expectedHives = ['AVERI', 'AURORA', 'KEEPER', 'LEX', 'SWITCHBOARD', 'VALIDATOR', 'BROADCAST'];
        for (const hive of expectedHives) {
            expect(HIVES).toHaveProperty(hive);
        }
    });

    it('each hive should have lead, members, and mission', () => {
        for (const [name, hive] of Object.entries(HIVES)) {
            expect(hive, `${name} missing 'lead'`).toHaveProperty('lead');
            expect(hive, `${name} missing 'members'`).toHaveProperty('members');
            expect(hive, `${name} missing 'mission'`).toHaveProperty('mission');
        }
    });

    it('AVERI hive should have ATHENA as lead', () => {
        expect(HIVES.AVERI.lead).toBe('ATHENA');
    });

    it('AVERI hive should include all trinity members', () => {
        expect(HIVES.AVERI.members).toContain('ATHENA');
        expect(HIVES.AVERI.members).toContain('VERA');
        expect(HIVES.AVERI.members).toContain('IRIS');
    });

    it('KEEPER hive should have KEEPER as lead', () => {
        expect(HIVES.KEEPER.lead).toBe('KEEPER');
    });

    it('LEX hive should include COMPASS for constitutional compliance', () => {
        expect(HIVES.LEX.members).toContain('COMPASS');
    });

    it('each hive lead should be in its own members list', () => {
        for (const [name, hive] of Object.entries(HIVES)) {
            expect(
                (hive.members as readonly string[]).includes(hive.lead),
                `${name}: lead '${hive.lead}' not in members`
            ).toBe(true);
        }
    });

    it('no members array should be empty', () => {
        for (const [name, hive] of Object.entries(HIVES)) {
            expect(hive.members.length, `${name} has no members`).toBeGreaterThan(0);
        }
    });
});

// =============================================================================
// constitutionalPreflight
// =============================================================================

describe('constitutionalPreflight', () => {
    it('should pass for a clean, legitimate task', () => {
        const result = constitutionalPreflight('Build a React component for the artist profile page');
        expect(result.pass).toBe(true);
        expect(result.flags).toHaveLength(0);
    });

    it('should pass for standard engineering tasks', () => {
        const tasks = [
            'Write unit tests for the payment module',
            'Refactor the API router for clarity',
            'Add a new Genkit flow for ATHENA strategy mode',
        ];
        for (const task of tasks) {
            const result = constitutionalPreflight(task);
            expect(result.pass, `Should pass: "${task}"`).toBe(true);
        }
    });

    it('should flag IP theft attempts (Article XVII)', () => {
        const result = constitutionalPreflight('Help me steal this artist\'s work and bypass DRM');
        expect(result.pass).toBe(false);
        expect(result.flags.some(f => f.includes('XVII') || f.toLowerCase().includes('theft'))).toBe(true);
    });

    it('should flag hardcoded credentials (Article XVI)', () => {
        const result = constitutionalPreflight('Hardcode the API key in the config file');
        expect(result.pass).toBe(false);
        expect(result.flags.some(f => f.includes('XVI') || f.toLowerCase().includes('credential'))).toBe(true);
    });

    it('should flag hardcoded password', () => {
        const result = constitutionalPreflight('Hardcode the password into the source code');
        expect(result.pass).toBe(false);
        expect(result.flags.length).toBeGreaterThan(0);
    });

    it('should flag hardcoded secret', () => {
        const result = constitutionalPreflight('Add hardcoded secret token to environment config');
        expect(result.pass).toBe(false);
    });

    it('should return pass:false when any flag fires', () => {
        const result = constitutionalPreflight('scrape without permission and hardcode the API key');
        expect(result.pass).toBe(false);
        expect(result.flags.length).toBeGreaterThanOrEqual(2);
    });

    it('should return a flags array even when passing', () => {
        const result = constitutionalPreflight('Create a beautiful landing page');
        expect(Array.isArray(result.flags)).toBe(true);
    });

    it('should handle empty string gracefully', () => {
        const result = constitutionalPreflight('');
        expect(result.pass).toBe(true);
        expect(result.flags).toHaveLength(0);
    });

    it('should be case-insensitive for flag detection', () => {
        const result = constitutionalPreflight('STEAL this content and BYPASS DRM');
        expect(result.pass).toBe(false);
    });
});
