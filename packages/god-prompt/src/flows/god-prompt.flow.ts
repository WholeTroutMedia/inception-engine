import { ai } from '@inception/genkit';
import { z } from 'genkit';
import {
    BrandDNA,
    BrandDNASchema,
    buildDNAExtractionPrompt,
    generateCSSVariables,
    generateTailwindConfig,
    generateDesignTokens,
} from '../brand-dna.js';

const GOD_MODEL = 'googleai/gemini-2.5-pro-preview-03-25';


// ─── Output Schemas ───────────────────────────────────────────────────────────

const ImageAssetsSchema = z.object({
    hero_url: z.string(),
    og_image_url: z.string(),
    avatar_url: z.string(),
    social_variants: z.array(z.string()),
    prompt_used: z.string(),
});

const CopyAssetsSchema = z.object({
    taglines: z.array(z.string()),
    hero_headline: z.string(),
    hero_subheadline: z.string(),
    product_descriptions: z.record(z.string()),
    social_captions: z.object({
        instagram: z.string(),
        twitter: z.string(),
        linkedin: z.string(),
        tiktok: z.string(),
    }),
    email_subject_lines: z.array(z.string()),
    press_release_opening: z.string(),
    brand_voice_guide: z.string(),
});

const DesignAssetsSchema = z.object({
    css_variables: z.string(),
    tailwind_config: z.string(),
    design_tokens: z.record(z.string()),
    landing_page_html: z.string(),
    component_library_preview: z.string(),
});

const CreativePackageSchema = z.object({
    package_id: z.string(),
    brand_dna: BrandDNASchema,
    imagery: ImageAssetsSchema.optional(),
    copy: CopyAssetsSchema,
    design: DesignAssetsSchema,
    generated_at: z.string(),
    brief_original: z.string(),
    client_id: z.string(),
});

export type CreativePackage = z.infer<typeof CreativePackageSchema>;

// ─── GOD PROMPT Main Flow ─────────────────────────────────────────────────────

export const godPromptFlow = ai.defineFlow(
    {
        name: 'godPrompt',
        inputSchema: z.object({
            brief: z.string().describe('The creative brief — can be a single sentence or a paragraph'),
            client_id: z.string().describe('Client identifier for KEEPER memory lookup'),
            skip_images: z.boolean().default(false).describe('Skip image generation (faster, no FAL.ai cost)'),
        }),
        outputSchema: CreativePackageSchema,
    },
    async (input) => {
        const packageId = `gp-${Date.now()}-${input.client_id}`;
        console.log(`\n🎨 GOD PROMPT — Starting creative pipeline for ${input.client_id}`);
        console.log(`   Brief: "${input.brief}"\n`);

        // ── Step 1: Extract Brand DNA ──────────────────────────────────────────
        console.log('  [1/4] Extracting Brand DNA via IRIS...');
        const dna = await (async () => {
            const prompt = buildDNAExtractionPrompt(input.brief);
            const response = await ai.generate({
                model: GOD_MODEL,
                prompt,
                config: { temperature: 0.8 },
                output: { schema: BrandDNASchema },
            });

            const dnaData = response.output as Partial<BrandDNA>;
            return BrandDNASchema.parse({
                ...dnaData,
                brand_id: packageId,
                client_id: input.client_id,
                created_at: new Date().toISOString(),
                version: 1,
            });
        })();

        console.log(`  ✅ Brand DNA extracted: ${dna.name} — "${dna.tagline}"`);

        // ── Step 2: Generate Copy (always fast, no external API needed) ────────
        console.log('  [2/4] Generating copy via LANGUAGE...');
        const copy = await (async () => {
            const copyPrompt = `You are LANGUAGE, the Creative Liberation Engine's copy specialist.

Generate comprehensive brand copy for ${dna.name}.

BRAND DNA:
- Personality: ${dna.personality.join(', ')}
- Tone: ${dna.tone}
- Vocabulary: ${dna.vocabulary.join(', ')}
- Avoid: ${dna.avoid.join(', ')}
- Audience: ${dna.audience.primary}
- Value Prop: ${dna.value_proposition}
- Tagline: ${dna.tagline}

Generate all copy variants. Return ONLY valid JSON.

Schema:
{
  "taglines": ["alt1", "alt2", "alt3"],
  "hero_headline": "...",
  "hero_subheadline": "...",
  "product_descriptions": {"short": "...", "medium": "...", "long": "..."},
  "social_captions": {"instagram": "...", "twitter": "...", "linkedin": "...", "tiktok": "..."},
  "email_subject_lines": ["...", "...", "..."],
  "press_release_opening": "...",
  "brand_voice_guide": "Complete guide to writing for this brand in 3 paragraphs..."
}`;

            const response = await ai.generate({ model: GOD_MODEL, prompt: copyPrompt, config: { temperature: 0.7 } });
            const text = response.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            return CopyAssetsSchema.parse(JSON.parse(text));
        })();

        console.log(`  ✅ Copy generated: "${copy.hero_headline}"`);

        // ── Step 3: Generate Design System ────────────────────────────────────
        console.log('  [3/4] Building design system via AURORA...');
        const design = await (async () => {
            const cssVariables = generateCSSVariables(dna);
            const tailwindConfig = generateTailwindConfig(dna);
            const designTokens = generateDesignTokens(dna);

            // AURORA generates a landing page
            const landingPrompt = `You are AURORA and BOLT of the Creative Liberation Engine.
      
Generate a complete, production-ready HTML landing page for ${dna.name}.

BRAND DNA:
- Name: ${dna.name}
- Tagline: ${dna.tagline}
- Palette: Primary ${dna.palette.primary}, Secondary ${dna.palette.secondary}, Accent ${dna.palette.accent}
- Font Display: ${dna.typography.display}, Body: ${dna.typography.body}
- Personality: ${dna.personality.join(', ')}
- Hero Headline: ${copy.hero_headline}
- Hero Subheadline: ${copy.hero_subheadline}

Requirements:
- Complete single HTML file with embedded CSS
- Use Google Fonts (the fonts specified above)
- Use CSS custom properties from: ${cssVariables.substring(0, 300)}...
- Sections: Hero, Features (3), Social Proof, CTA, Footer
- Mobile-first responsive design
- Smooth animations and micro-interactions
- Premium, ${dna.price_positioning} brand aesthetic
- NO placeholder text — use real brand copy

Return ONLY the HTML. No explanation.`;

            const pageResponse = await ai.generate({ model: GOD_MODEL, prompt: landingPrompt, config: { temperature: 0.5 } });
            const htmlRaw = pageResponse.text;
            const htmlMatch = htmlRaw.match(/<!DOCTYPE html>[\s\S]*<\/html>/i);
            const landingPageHtml = htmlMatch ? htmlMatch[0] : htmlRaw;

            return DesignAssetsSchema.parse({
                css_variables: cssVariables,
                tailwind_config: tailwindConfig,
                design_tokens: designTokens,
                landing_page_html: landingPageHtml,
                component_library_preview: `/* ${dna.name} Component Library — generated by AURORA */\n/* Install: @inception/god-prompt generates this automatically */\n`,
            });
        })();

        console.log(`  ✅ Design system built: ${Object.keys(design.design_tokens).length} tokens`);

        // ── Step 4: Image Generation (if FAL_KEY present) ─────────────────────
        let imagery: z.infer<typeof ImageAssetsSchema> | undefined;

        if (!input.skip_images && process.env.FAL_KEY) {
            console.log('  [4/4] Generating imagery via FAL.ai/Flux...');
            imagery = await (async () => {
                const imagePrompt = `${dna.imagery_style}, ${dna.name} brand hero image, ${dna.personality.join(', ')}, professional product photography, --no ${dna.negative_prompts.join(', ')}`;

                const { fal } = await import('@fal-ai/client');
                fal.config({ credentials: process.env.FAL_KEY });

                const result = await fal.subscribe('fal-ai/flux/dev', {
                    input: {
                        prompt: imagePrompt,
                        image_size: 'landscape_16_9',
                        num_images: 1,
                        num_inference_steps: 28,
                    },
                }) as { images?: Array<{ url: string }> };

                const heroUrl = result.images?.[0]?.url ?? '';
                console.log(`  ✅ Hero image: ${heroUrl}`);

                return ImageAssetsSchema.parse({
                    hero_url: heroUrl,
                    og_image_url: heroUrl,
                    avatar_url: heroUrl,
                    social_variants: [heroUrl],
                    prompt_used: imagePrompt,
                });
            })();
        } else {
            console.log('  [4/4] Skipping image gen (no FAL_KEY or skip_images=true)');
        }

        // ── Package ────────────────────────────────────────────────────────────
        const pkg: CreativePackage = {
            package_id: packageId,
            brand_dna: dna,
            imagery,
            copy,
            design,
            generated_at: new Date().toISOString(),
            brief_original: input.brief,
            client_id: input.client_id,
        };

        console.log(`\n✨ GOD PROMPT COMPLETE — Package ${packageId}`);
        console.log(`   Brand: ${dna.name}`);
        console.log(`   Headline: ${copy.hero_headline}`);
        console.log(`   Tokens: ${Object.keys(design.design_tokens).length}`);
        console.log(`   Imagery: ${imagery ? 'Generated' : 'Skipped'}\n`);

        return pkg;
    }
);

// ─── Remix Flow ──────────────────────────────────────────────────────────────

export const remixFlow = ai.defineFlow(
    {
        name: 'remix',
        inputSchema: z.object({
            source_content: z.string().describe('Content to remix: text, URL, or description'),
            target_platforms: z.array(z.enum(['instagram', 'tiktok', 'twitter', 'linkedin', 'youtube', 'email', 'billboard'])),
            client_id: z.string(),
            tone_adjustment: z.string().optional().describe('How to adjust the tone for this remix'),
        }),
        outputSchema: z.object({
            remixes: z.record(z.string()),
            platform_count: z.number(),
        }),
    },
    async (input) => {
        console.log(`\n🔄 REMIX — Generating ${input.target_platforms.length} platform variants`);

        const platformSpecs: Record<string, string> = {
            instagram: '150 chars max, emoji allowed, hashtags at end, visual-first storytelling',
            tiktok: 'hook in first 3 words, trending language, call-to-action to stitch/duet',
            twitter: '280 chars max, punchy, shareable, no hashtag spam',
            linkedin: 'professional but authentic, 1-3 short paragraphs, insight-led, optional CTA',
            youtube: 'keyword-rich title (60 chars) + description (first 2 lines above fold)',
            email: 'subject line (50 chars) + preview text (90 chars) + opening paragraph',
            billboard: '7 words max. Make it impossible to ignore.',
        };

        const prompt = `You are LANGUAGE, the Creative Liberation Engine's copy specialist.

Remix the following content for multiple platforms. Each version should be natively optimized.

SOURCE CONTENT:
${input.source_content}

${input.tone_adjustment ? `TONE ADJUSTMENT: ${input.tone_adjustment}` : ''}

PLATFORMS TO GENERATE:
${input.target_platforms.map((p: string) => `- ${p}: ${platformSpecs[p]}`).join('\n')}

Return ONLY valid JSON: { "instagram": "...", "tiktok": "...", ... }
Only include platforms listed above.`;

        const response = await ai.generate({ model: GOD_MODEL, prompt, config: { temperature: 0.8 } });
        const text = response.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const remixes = JSON.parse(text) as Record<string, string>;

        return {
            remixes,
            platform_count: Object.keys(remixes).length,
        };
    }
);
