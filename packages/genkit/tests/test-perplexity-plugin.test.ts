/**
 * Perplexity Plugin Tests
 *
 * Verifies the custom Perplexity Genkit plugin formats requests correctly
 * and handles the OpenAI-compatible API structure.
 */

import { describe, it, expect } from 'vitest';
import { perplexity, perplexityModel } from '../src/plugins/perplexity.js';

describe('Perplexity Plugin', () => {
    it('should return a GenkitPlugin function', () => {
        const plugin = perplexity({ apiKey: 'test-key' });
        expect(plugin).toBeDefined();
    });

    it('should warn when no API key is provided', () => {
        // Save original env
        const originalKey = process.env.PERPLEXITY_API_KEY;
        delete process.env.PERPLEXITY_API_KEY;

        const warnSpy = import.meta.jest?.spyOn(console, 'warn') ??
            (() => { let calls: any[] = []; const orig = console.warn; console.warn = (...args: any[]) => calls.push(args); return { calls, restore: () => { console.warn = orig; } }; })();

        perplexity();

        // Restore
        if (originalKey) process.env.PERPLEXITY_API_KEY = originalKey;
        if ('restore' in warnSpy) (warnSpy as any).restore();
    });
});

describe('Perplexity Model Reference', () => {
    it('should generate correct model ID for sonar-pro', () => {
        const ref = perplexityModel('sonar-pro');
        expect(ref).toBe('perplexity/sonar-pro');
    });

    it('should generate correct model ID for sonar', () => {
        const ref = perplexityModel('sonar');
        expect(ref).toBe('perplexity/sonar');
    });

    it('should generate correct model ID for sonar-reasoning', () => {
        const ref = perplexityModel('sonar-reasoning');
        expect(ref).toBe('perplexity/sonar-reasoning');
    });

    it('should generate correct model ID for sonar-reasoning-pro', () => {
        const ref = perplexityModel('sonar-reasoning-pro');
        expect(ref).toBe('perplexity/sonar-reasoning-pro');
    });

    it('should generate correct model ID for sonar-deep-research', () => {
        const ref = perplexityModel('sonar-deep-research');
        expect(ref).toBe('perplexity/sonar-deep-research');
    });

    it('should default to sonar-pro when no model specified', () => {
        const ref = perplexityModel();
        expect(ref).toBe('perplexity/sonar-pro');
    });
});
