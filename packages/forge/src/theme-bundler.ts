/**
 * @inception/forge — ThemeBundler
 *
 * Composes visual LoRAs + Foley audio profiles + spatial audio into ThemeBundles.
 * The NBA Jam example: era='1993', context='basketball', style_preset='retro-arcade',
 * audio_mood='energetic' → produces a full ThemeBundle ready for living-canvas.
 *
 * Integration points:
 *   - @inception/foley-engine: FoleyEngine generates audio layer
 *   - @inception/theme-engine: style preset tokens
 *   - @inception/living-canvas: applies bundle to WebGL stream
 */

import { randomUUID } from 'crypto';
import type {
  BundleConfig,
  FoleyAudioProfile,
  ThemeBundle,
  AssetStatus,
} from './types.js';

// ─── Built-in Style Presets ───────────────────────────────────────────────────

export interface StylePreset {
  id: string;
  name: string;
  description: string;
  /** LoRA checkpoint path (null until trained) */
  lora_checkpoint_path: string | null;
  /** Visual token overrides for theme-engine */
  visual_tokens: Record<string, string>;
  tags: string[];
}

export const BUILT_IN_PRESETS: Record<string, StylePreset> = {
  'retro-arcade': {
    id: 'retro-arcade',
    name: 'Retro Arcade',
    description: 'Pixelated sprites, vibrant primary colors, scanline overlay — NBA Jam era',
    lora_checkpoint_path: null, // Will be populated after training
    visual_tokens: {
      '--color-primary': '#FF2020',
      '--color-secondary': '#FFD700',
      '--font-family': '"Press Start 2P", monospace',
      '--border-radius': '0px',
      '--pixel-scale': '2',
    },
    tags: ['retro', 'arcade', '8bit', '16bit', 'pixel-art'],
  },
  'tactical': {
    id: 'tactical',
    name: 'Tactical HUD',
    description: 'Military-grade data visualization overlay — clean, minimal, functional',
    lora_checkpoint_path: null,
    visual_tokens: {
      '--color-primary': '#00FF41',
      '--color-secondary': '#003B00',
      '--font-family': '"Share Tech Mono", monospace',
    },
    tags: ['tactical', 'hud', 'military', 'minimal'],
  },
  'neon-futurist': {
    id: 'neon-futurist',
    name: 'Neon Futurist',
    description: 'Cyberpunk neon glow, dark backgrounds, electric gradients',
    lora_checkpoint_path: null,
    visual_tokens: {
      '--color-primary': '#FF00FF',
      '--color-secondary': '#00FFFF',
      '--font-family': '"Rajdhani", sans-serif',
    },
    tags: ['neon', 'cyberpunk', 'futurist', 'dark'],
  },
  'baroque': {
    id: 'baroque',
    name: 'Baroque',
    description: 'Rich oil paint textures, gold filigree, dramatic chiaroscuro',
    lora_checkpoint_path: null,
    visual_tokens: {
      '--color-primary': '#C5A028',
      '--color-secondary': '#2C1810',
      '--font-family': '"IM Fell English", serif',
    },
    tags: ['baroque', 'classical', 'historical', 'art'],
  },
};

// ─── Audio Campaign Presets ───────────────────────────────────────────────────

type AudioPreset = Pick<FoleyAudioProfile, 'genre' | 'bpm' | 'instruments'>;

export const AUDIO_PRESETS: Record<FoleyAudioProfile['mood'], AudioPreset> = {
  energetic: { genre: 'electronic-sport', bpm: 140, instruments: ['synth', 'drums', 'bass'] },
  calm:      { genre: 'ambient', bpm: 72, instruments: ['piano', 'strings', 'pad'] },
  dramatic:  { genre: 'orchestral', bpm: 120, instruments: ['strings', 'brass', 'percussion'] },
  ambient:   { genre: 'ambient', bpm: 80, instruments: ['pad', 'texture', 'field-recording'] },
  upbeat:    { genre: 'pop-electronic', bpm: 128, instruments: ['synth', 'guitar', 'drums'] },
  retro:     { genre: 'chiptune', bpm: 120, instruments: ['square-wave', 'triangle-wave', 'noise'] },
};

// ─── ThemeBundler ─────────────────────────────────────────────────────────────

export interface ThemeBundlerConfig {
  /** Default audio duration in seconds */
  default_audio_duration_sec?: number;
  /** Path to store generated bundles */
  storage_path?: string;
  /** Foley engine instance (optional — if not provided, audio profile is assembled but not rendered) */
  foley_engine?: FoleyEngineInterface;
}

/** Minimal FoleyEngine interface to avoid hard dependency in tests */
export interface FoleyEngineInterface {
  generate(brief: {
    title: string;
    mood: string;
    genre: string;
    bpm?: number;
    durationSec: number;
    instruments?: string[];
  }): Promise<{ master: { path: string; bpm?: number }; stems: Record<string, string> | null }>;
}

export class ThemeBundler {
  private readonly config: Required<Pick<ThemeBundlerConfig, 'default_audio_duration_sec'>>;
  private readonly foley?: FoleyEngineInterface;
  private readonly bundles = new Map<string, ThemeBundle>();

  constructor(config: ThemeBundlerConfig = {}) {
    this.config = {
      default_audio_duration_sec: config.default_audio_duration_sec ?? 60,
    };
    this.foley = config.foley_engine;
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  /**
   * Create a ThemeBundle from config. If FoleyEngine is provided, audio is rendered.
   * Otherwise the audio profile is assembled for deferred rendering.
   */
  async createBundle(config: BundleConfig): Promise<ThemeBundle> {
    const bundle_id = randomUUID();
    const preset = this.resolvePreset(config.style_preset);
    const audioProfile = this.buildAudioProfile(config);

    // If foley engine available, render audio now
    if (this.foley) {
      try {
        const result = await this.foley.generate({
          title: config.name,
          mood: audioProfile.mood,
          genre: audioProfile.genre,
          bpm: audioProfile.bpm,
          durationSec: audioProfile.duration_sec,
          instruments: audioProfile.instruments,
        });
        audioProfile.master_path = result.master.path;
        audioProfile.beat_bpm = result.master.bpm;
        audioProfile.stems = result.stems ?? undefined;
      } catch (err) {
        console.warn(`[forge:theme-bundler] ⚠️ Audio render failed (bundle still created):`, err);
      }
    }

    const bundle: ThemeBundle = {
      bundle_id,
      name: config.name,
      description: config.description,
      asset_type: 'theme_bundle',
      visual_lora_path: preset.lora_checkpoint_path ?? undefined,
      style_preset: config.style_preset,
      audio_profile: audioProfile,
      context: config.context,
      era: config.era,
      tags: [...(config.tags ?? []), ...preset.tags],
      created_at: new Date().toISOString(),
      status: 'draft' as AssetStatus,
    };

    this.bundles.set(bundle_id, bundle);

    console.log(`[forge:theme-bundler] 🎨 Bundle created: "${bundle.name}" (${bundle_id})`);
    return bundle;
  }

  /**
   * Get a preset by ID. Returns null if not found.
   */
  getPreset(id: string): StylePreset | null {
    return BUILT_IN_PRESETS[id] ?? null;
  }

  /**
   * Get all available presets.
   */
  listPresets(): StylePreset[] {
    return Object.values(BUILT_IN_PRESETS);
  }

  /**
   * Get a previously created bundle by ID.
   */
  getBundle(bundle_id: string): ThemeBundle | null {
    return this.bundles.get(bundle_id) ?? null;
  }

  /**
   * Build the living-canvas apply config for a bundle.
   * Returns a config object that living-canvas can consume to apply the theme.
   */
  buildApplyConfig(bundle: ThemeBundle): LivingCanvasApplyConfig {
    const preset = this.resolvePreset(bundle.style_preset);
    return {
      bundle_id: bundle.bundle_id,
      lora_path: bundle.visual_lora_path,
      visual_tokens: preset.visual_tokens,
      audio: bundle.audio_profile.master_path
        ? { master_path: bundle.audio_profile.master_path, bpm: bundle.audio_profile.beat_bpm }
        : undefined,
      era: bundle.era,
      context: bundle.context,
    };
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  private resolvePreset(preset_id: string): StylePreset {
    const preset = BUILT_IN_PRESETS[preset_id];
    if (!preset) {
      // Gracefully fallback to tactical HUD for unknown presets
      console.warn(`[forge:theme-bundler] Unknown preset "${preset_id}", falling back to tactical`);
      return BUILT_IN_PRESETS['tactical']!;
    }
    return preset;
  }

  private buildAudioProfile(config: BundleConfig): FoleyAudioProfile {
    const preset = AUDIO_PRESETS[config.audio_mood] ?? AUDIO_PRESETS.energetic;
    return {
      mood: config.audio_mood,
      genre: config.audio_genre ?? preset.genre,
      bpm: preset.bpm,
      duration_sec: config.duration_sec ?? this.config.default_audio_duration_sec,
      instruments: preset.instruments,
      era: config.era,
    };
  }
}

// ─── Living Canvas Apply Config ───────────────────────────────────────────────

export interface LivingCanvasApplyConfig {
  bundle_id: string;
  lora_path?: string;
  visual_tokens: Record<string, string>;
  audio?: {
    master_path: string;
    bpm?: number;
  };
  era?: string;
  context?: string;
}
