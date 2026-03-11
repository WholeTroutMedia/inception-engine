import { z } from 'zod';

// ─── Brand DNA Schema ─────────────────────────────────────────────────────────
// The core data structure that ensures cross-modal creative consistency.
// Generated once per brief, stored in ChromaDB via KEEPER, reused forever.

export const AudienceProfileSchema = z.object({
    primary: z.string().describe('Primary audience description'),
    age_range: z.string().optional(),
    psychographics: z.array(z.string()),
    pain_points: z.array(z.string()),
    aspirations: z.array(z.string()),
    where_they_are: z.array(z.string()).describe('Platform/channel presence'),
});

export const ColorPaletteSchema = z.object({
    primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be hex color'),
    secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    neutral: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    dark: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    light: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    rationale: z.string().describe('Why these colors for this brand'),
});

export const TypographySchema = z.object({
    display: z.string().describe('Google Font name for headlines'),
    body: z.string().describe('Google Font name for body text'),
    mono: z.string().optional().describe('Google Font name for code/data'),
    scale: z.object({
        display: z.string().default('4rem'),
        h1: z.string().default('3rem'),
        h2: z.string().default('2rem'),
        h3: z.string().default('1.5rem'),
        body: z.string().default('1rem'),
        small: z.string().default('0.875rem'),
    }).optional(),
});

export const BrandDNASchema = z.object({
    // Identity
    brand_id: z.string().describe('Unique ID, stored in ChromaDB'),
    client_id: z.string().describe('Client this brand belongs to'),
    created_at: z.string().datetime(),
    version: z.number().default(1),

    // Naming
    name: z.string().describe('Brand name'),
    tagline: z.string().describe('Primary tagline'),
    tagline_alternatives: z.array(z.string()).optional(),

    // Personality
    personality: z.array(z.string()).describe('3-5 personality traits'),
    tone: z.string().describe('Voice tone: bold/warm/technical/playful etc'),
    vocabulary: z.array(z.string()).describe('Words this brand uses'),
    avoid: z.array(z.string()).describe('Words/concepts this brand never uses'),

    // Audience
    audience: AudienceProfileSchema,

    // Visual System
    palette: ColorPaletteSchema,
    typography: TypographySchema,
    imagery_style: z.string().describe('Visual style descriptor for AI image gen'),
    motion_style: z.string().describe('Animation/video style descriptor'),
    photography_subjects: z.array(z.string()).optional(),
    negative_prompts: z.array(z.string()).describe('What to always exclude from imagery'),

    // References
    mood_references: z.array(z.string()).describe('Reference brands, films, artists for aesthetic inspiration'),
    competitive_space: z.array(z.string()).describe('Competitors — for negative space definition'),

    // Business Context
    value_proposition: z.string(),
    category: z.string().describe('Industry/product category'),
    price_positioning: z.enum(['budget', 'mid-market', 'premium', 'luxury']),

    // Technical
    design_tokens: z.record(z.string()).optional().describe('CSS custom properties'),
});

export type BrandDNA = z.infer<typeof BrandDNASchema>;
export type AudienceProfile = z.infer<typeof AudienceProfileSchema>;
export type ColorPalette = z.infer<typeof ColorPaletteSchema>;

// ─── Brand DNA Prompts ────────────────────────────────────────────────────────

export function buildDNAExtractionPrompt(brief: string): string {
    return `You are IRIS, the creative director of the Creative Liberation Engine.
  
A new creative brief has arrived. Extract a complete BrandDNA from this brief.
Be opinionated, specific, and decisive. Do not generate generic answers.
Every field should feel earned and specific to this brand.

BRIEF:
${brief}

Return ONLY valid JSON matching the BrandDNA schema. No explanation, no markdown.
The imagery_style should be a rich, specific, evocative description suitable for use as an AI image generation style prompt.
The palette colors should be actual hex values, not color names.
The typography should reference real Google Fonts.`;
}

// ─── CSS Token Generator ──────────────────────────────────────────────────────

export function generateDesignTokens(dna: BrandDNA): Record<string, string> {
    const tokens: Record<string, string> = {
        '--color-primary': dna.palette.primary,
        '--color-secondary': dna.palette.secondary,
        '--color-accent': dna.palette.accent,
        '--color-neutral': dna.palette.neutral,
        '--color-dark': dna.palette.dark,
        '--color-light': dna.palette.light,
        '--font-display': `'${dna.typography.display}', sans-serif`,
        '--font-body': `'${dna.typography.body}', sans-serif`,
        '--brand-name': `'${dna.name}'`,
        '--brand-tagline': `'${dna.tagline}'`,
    };

    if (dna.typography.mono) {
        tokens['--font-mono'] = `'${dna.typography.mono}', monospace`;
    }

    if (dna.typography.scale) {
        const { scale } = dna.typography;
        Object.entries(scale).forEach(([key, val]) => {
            tokens[`--size-${key}`] = val;
        });
    }

    return tokens;
}

export function generateCSSVariables(dna: BrandDNA): string {
    const tokens = generateDesignTokens(dna);
    const vars = Object.entries(tokens)
        .map(([k, v]) => `  ${k}: ${v};`)
        .join('\n');
    return `:root {\n${vars}\n}\n\n@import url('https://fonts.googleapis.com/css2?family=${encodeURIComponent(dna.typography.display)}:wght@400;600;700;900&family=${encodeURIComponent(dna.typography.body)}:wght@400;500;600&display=swap');`;
}

export function generateTailwindConfig(dna: BrandDNA): string {
    return `// tailwind.config.js — generated by GOD PROMPT for ${dna.name}
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '${dna.palette.primary}',
        secondary: '${dna.palette.secondary}',
        accent: '${dna.palette.accent}',
        neutral: '${dna.palette.neutral}',
        dark: '${dna.palette.dark}',
        light: '${dna.palette.light}',
      },
      fontFamily: {
        display: ['${dna.typography.display}', 'sans-serif'],
        body: ['${dna.typography.body}', 'sans-serif'],
        ${dna.typography.mono ? `mono: ['${dna.typography.mono}', 'monospace'],` : ''}
      },
    },
  },
};`;
}
