/**
 * @inception/forge — ThemeBundler Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThemeBundler, BUILT_IN_PRESETS, AUDIO_PRESETS, type FoleyEngineInterface } from '../theme-bundler.js';

// ─── Fake Foley Engine ────────────────────────────────────────────────────────

function makeFakeFoley(masterPath = '/tmp/test.wav'): FoleyEngineInterface {
  return {
    generate: vi.fn().mockResolvedValue({
      master: { path: masterPath, bpm: 120 },
      stems: { drums: '/tmp/drums.wav', bass: '/tmp/bass.wav' },
    }),
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ThemeBundler', () => {
  let bundler: ThemeBundler;

  beforeEach(() => {
    bundler = new ThemeBundler();
  });

  describe('preset registry', () => {
    it('lists all built-in presets', () => {
      const presets = bundler.listPresets();
      expect(presets.length).toBeGreaterThanOrEqual(4);
    });

    it('can retrieve retro-arcade preset', () => {
      const preset = bundler.getPreset('retro-arcade');
      expect(preset).not.toBeNull();
      expect(preset?.name).toBe('Retro Arcade');
      expect(preset?.tags).toContain('retro');
      expect(preset?.tags).toContain('arcade');
    });

    it('returns null for unknown preset', () => {
      const preset = bundler.getPreset('does-not-exist');
      expect(preset).toBeNull();
    });

    it('BUILT_IN_PRESETS covers expected styles', () => {
      expect(BUILT_IN_PRESETS['retro-arcade']).toBeDefined();
      expect(BUILT_IN_PRESETS['tactical']).toBeDefined();
      expect(BUILT_IN_PRESETS['neon-futurist']).toBeDefined();
      expect(BUILT_IN_PRESETS['baroque']).toBeDefined();
    });

    it('AUDIO_PRESETS covers all mood types', () => {
      const moods: Array<keyof typeof AUDIO_PRESETS> = ['energetic', 'calm', 'dramatic', 'ambient', 'upbeat', 'retro'];
      for (const mood of moods) {
        expect(AUDIO_PRESETS[mood]).toBeDefined();
      }
    });
  });

  describe('createBundle()', () => {
    it('creates NBA Jam bundle with correct shape', async () => {
      const bundle = await bundler.createBundle({
        name: 'Retro NBA Jam',
        style_preset: 'retro-arcade',
        audio_mood: 'retro',
        era: '1993',
        context: 'basketball',
        tags: ['nba', 'sports'],
      });

      expect(bundle.bundle_id).toMatch(/^[0-9a-f-]{36}$/);
      expect(bundle.name).toBe('Retro NBA Jam');
      expect(bundle.asset_type).toBe('theme_bundle');
      expect(bundle.style_preset).toBe('retro-arcade');
      expect(bundle.era).toBe('1993');
      expect(bundle.context).toBe('basketball');
      expect(bundle.status).toBe('draft');
      expect(bundle.audio_profile.mood).toBe('retro');
    });

    it('includes preset tags merged with user tags', async () => {
      const bundle = await bundler.createBundle({
        name: 'Test',
        style_preset: 'retro-arcade',
        audio_mood: 'energetic',
        tags: ['custom-tag'],
      });

      expect(bundle.tags).toContain('custom-tag');
      expect(bundle.tags).toContain('retro'); // from preset
    });

    it('uses default duration when not specified', async () => {
      const bundle = await bundler.createBundle({
        name: 'Test Bundle',
        style_preset: 'tactical',
        audio_mood: 'calm',
      });
      expect(bundle.audio_profile.duration_sec).toBe(60); // default
    });

    it('respects custom duration', async () => {
      const bundle = await bundler.createBundle({
        name: 'Short Bundle',
        style_preset: 'tactical',
        audio_mood: 'calm',
        duration_sec: 30,
      });
      expect(bundle.audio_profile.duration_sec).toBe(30);
    });

    it('falls back to tactical for unknown preset', async () => {
      const bundle = await bundler.createBundle({
        name: 'Fallback Test',
        style_preset: 'unknown-preset-xyz',
        audio_mood: 'calm',
      });
      // Should not throw; fallback is silent
      expect(bundle).toBeDefined();
    });

    it('integrates with FoleyEngine when provided', async () => {
      const fakeFoley = makeFakeFoley('/nas/audio/nba-jam.wav');
      const bundlerWithFoley = new ThemeBundler({ foley_engine: fakeFoley });

      const bundle = await bundlerWithFoley.createBundle({
        name: 'NBA Jam With Audio',
        style_preset: 'retro-arcade',
        audio_mood: 'retro',
      });

      expect(fakeFoley.generate).toHaveBeenCalledOnce();
      expect(bundle.audio_profile.master_path).toBe('/nas/audio/nba-jam.wav');
      expect(bundle.audio_profile.beat_bpm).toBe(120);
    });

    it('creates bundle even if FoleyEngine fails', async () => {
      const brokenFoley: FoleyEngineInterface = {
        generate: vi.fn().mockRejectedValue(new Error('Audio generation failed')),
      };
      const bundlerWithFoley = new ThemeBundler({ foley_engine: brokenFoley });

      // Should not throw — warning only
      const bundle = await bundlerWithFoley.createBundle({
        name: 'Resilient Bundle',
        style_preset: 'neon-futurist',
        audio_mood: 'energetic',
      });

      expect(bundle.name).toBe('Resilient Bundle');
      expect(bundle.audio_profile.master_path).toBeUndefined();
    });
  });

  describe('getBundle()', () => {
    it('retrieves a created bundle', async () => {
      const created = await bundler.createBundle({
        name: 'Retrievable',
        style_preset: 'baroque',
        audio_mood: 'dramatic',
      });

      const retrieved = bundler.getBundle(created.bundle_id);
      expect(retrieved?.bundle_id).toBe(created.bundle_id);
    });

    it('returns null for unknown bundle_id', () => {
      expect(bundler.getBundle('ghost-id')).toBeNull();
    });
  });

  describe('buildApplyConfig()', () => {
    it('returns living-canvas apply config', async () => {
      const bundle = await bundler.createBundle({
        name: 'Tactical HUD',
        style_preset: 'tactical',
        audio_mood: 'calm',
      });

      const cfg = bundler.buildApplyConfig(bundle);
      expect(cfg.bundle_id).toBe(bundle.bundle_id);
      expect(cfg.visual_tokens).toBeTruthy();
      expect(Object.keys(cfg.visual_tokens).length).toBeGreaterThan(0);
    });
  });
});
