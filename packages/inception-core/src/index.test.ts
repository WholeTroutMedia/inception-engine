/**
 * @inception/core — Unit Tests
 * Tests for constitutionalPreflight, CONSTITUTION, and HIVES exports
 */

import { describe, it, expect } from 'vitest';
import {
    constitutionalPreflight,
    CONSTITUTION,
    HIVES,
    INCEPTION_VERSION,
} from '../src/index.js';

// ─── Version ─────────────────────────────────────────────────────────────────

describe('INCEPTION_VERSION', () => {
    it('should be 5.0.0-genesis', () => {
        expect(INCEPTION_VERSION).toBe('5.0.0-genesis');
    });
});

// ─── CONSTITUTION ─────────────────────────────────────────────────────────────

describe('CONSTITUTION', () => {
    it('should have 20 articles (0–19)', () => {
        const keys = Object.keys(CONSTITUTION).map(Number);
        expect(keys).toHaveLength(20);
        expect(keys[0]).toBe(0);
        expect(keys[19]).toBe(19);
    });

    it('should have Article 0 marked immutable (Sacred Mission)', () => {
        expect(CONSTITUTION[0].immutable).toBe(true);
        expect(CONSTITUTION[0].name).toBe('Sacred Mission');
    });

    it('should have Article IX (9) as Error Recovery (not "No MVPs" — that is operational law)', () => {
        expect(CONSTITUTION[9].name).toBe('Error Recovery');
    });

    it('should have immutable articles for core sovereignty articles (1, 5, 17, 18, 19)', () => {
        const immutableArticles = [0, 1, 5, 17, 18, 19];
        for (const idx of immutableArticles) {
            expect(CONSTITUTION[idx as keyof typeof CONSTITUTION].immutable).toBe(true);
        }
    });

    it('every article should have name and summary', () => {
        for (const [key, article] of Object.entries(CONSTITUTION)) {
            expect(article.name, `Article ${key} missing name`).toBeTruthy();
            expect(article.summary, `Article ${key} missing summary`).toBeTruthy();
        }
    });
});

// ─── constitutionalPreflight ──────────────────────────────────────────────────

describe('constitutionalPreflight', () => {
    it('should pass for a clean, legitimate task', () => {
        const result = constitutionalPreflight('Generate a creative brief for a brand identity project');
        expect(result.pass).toBe(true);
        expect(result.flags).toHaveLength(0);
    });

    it('should fail for Article XVII (IP theft patterns)', () => {
        const result = constitutionalPreflight('scrape without permission all images from this website');
        expect(result.pass).toBe(false);
        expect(result.flags.some(f => f.includes('Art.XVII'))).toBe(true);
    });

    it('should fail for Article XVII — crack pattern', () => {
        const result = constitutionalPreflight('crack the DRM on this file');
        expect(result.pass).toBe(false);
        expect(result.flags.some(f => f.includes('Art.XVII'))).toBe(true);
    });

    it('should fail for Article XVI (hardcoded secrets)', () => {
        const result = constitutionalPreflight('hardcode the API key in the source file');
        expect(result.pass).toBe(false);
        expect(result.flags.some(f => f.includes('Art.XVI'))).toBe(true);
    });

    it('should fail for both XVII and XVI when both patterns present', () => {
        const result = constitutionalPreflight('steal content and hardcode the password');
        expect(result.pass).toBe(false);
        expect(result.flags).toHaveLength(2);
    });

    it('should be case-insensitive', () => {
        const result = constitutionalPreflight('STEAL ALL THE IP');
        expect(result.pass).toBe(false);
    });
});

// ─── HIVES ─────────────────────────────────────────────────────────────────────

describe('HIVES', () => {
    it('should define 7 hives', () => {
        expect(Object.keys(HIVES)).toHaveLength(7);
    });

    it('AVERI hive should have ATHENA as lead with 3 members', () => {
        expect(HIVES.AVERI.lead).toBe('ATHENA');
        expect(HIVES.AVERI.members).toHaveLength(3);
        expect(HIVES.AVERI.members).toContain('ATHENA');
        expect(HIVES.AVERI.members).toContain('VERA');
        expect(HIVES.AVERI.members).toContain('IRIS');
    });

    it('LEX hive should handle compliance', () => {
        expect(HIVES.LEX.mission).toMatch(/compliance/i);
        expect(HIVES.LEX.lead).toBe('LEX');
    });

    it('every hive should have lead, members, and mission', () => {
        for (const [name, hive] of Object.entries(HIVES)) {
            expect(hive.lead, `${name} missing lead`).toBeTruthy();
            expect(hive.members.length, `${name} has no members`).toBeGreaterThan(0);
            expect(hive.mission, `${name} missing mission`).toBeTruthy();
        }
    });

    it('hive lead should always be in hive members', () => {
        for (const [name, hive] of Object.entries(HIVES)) {
            expect(
                (hive.members as readonly string[]).includes(hive.lead),
                `${name}: lead ${hive.lead} is not in members list`
            ).toBe(true);
        }
    });
});
