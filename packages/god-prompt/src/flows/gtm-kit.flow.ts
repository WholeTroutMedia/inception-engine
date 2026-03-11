import { z } from 'zod';
import { ai } from '@inception/genkit';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve, join } from 'path';

// ─── GOD PROMPT — GTM Kit Orchestrator ───────────────────────────────────────
// The master automation flow. One brief in → full Go-To-Market kit out.
//
// Generates in parallel:
//   ✦ Brand DNA extraction
//   ✦ Landing page HTML (production-ready)
//   ✦ Pitch deck (investor slide deck HTML)
//   ✦ Proposal document (scoped, priced, signable)
//   ✦ Brand guidelines (colors, type, values, do/don't)
//   ✦ Interactive demo app (self-contained, deployable)
//   ✦ Social content pack (6 platforms × 3 posts each)
//   ✦ Demo video assets (script + slates; full render if playwright/ffmpeg present)
//   ✦ Email sequence (5-email nurture drip)
//   ✦ Press release
//
// Returns a manifest with all file paths + inline content.

const MODEL = 'googleai/gemini-2.5-pro-preview-03-25';
const FAST_MODEL = 'googleai/gemini-2.0-flash';

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const GtmBriefSchema = z.object({
    // ── Core brief (minimum required) ────────────────────────────────────────
    one_sentence_brief: z.string().describe('One sentence: who, what, for whom, why now'),
    founder_name: z.string().optional(),
    agency_name: z.string().default('Whole Trout Media'),

    // ── Optional overrides (auto-generated if omitted) ────────────────────
    brand_name: z.string().optional(),
    tagline: z.string().optional(),
    accent_color: z.string().optional(),
    product_url: z.string().url().optional().describe('Live URL — enables screen recording for demo video'),
    target_raise: z.string().optional().describe('e.g. "$2M Seed"'),
    price_point: z.string().optional().describe('e.g. "$99/mo" or "Enterprise"'),

    // ── Output config ─────────────────────────────────────────────────────
    output_dir: z.string().describe('Absolute path to write all output files'),
    skip_demo_video: z.boolean().default(false),
    skip_demo_app: z.boolean().default(false),
    elevenlabs_voice_id: z.string().optional(),
});

export const GtmBriefOutputSchema = z.object({
    brand_dna: z.record(z.unknown()),
    manifest: z.array(z.object({
        asset: z.string(),
        file_path: z.string().optional(),
        inline_available: z.boolean(),
        status: z.enum(['generated', 'skipped', 'failed']),
        note: z.string().optional(),
    })),
    total_assets: z.number(),
    output_dir: z.string(),
    generated_at: z.string(),
});

export type GtmBrief = z.infer<typeof GtmBriefSchema>;

// ─── Brand DNA Extractor ─────────────────────────────────────────────────────

async function extractBrandDna(brief: string): Promise<Record<string, unknown>> {
    const prompt = `Extract complete brand DNA from this brief:

"${brief}"

Return ONLY valid JSON with no prose:
{
  "brand_name": "...",
  "tagline": "...",
  "product_category": "...",
  "target_audience": "...",
  "core_problem": "...",
  "core_solution": "...",
  "key_features": ["...", "...", "..."],
  "price_positioning": "...",
  "tone_of_voice": ["...", "...", "..."],
  "primary_color": "#hex",
  "secondary_color": "#hex",
  "accent_color": "#hex",
  "primary_font": "...",
  "tagline_alternatives": ["...", "...", "..."],
  "competitive_differentiator": "...",
  "one_liner_pitch": "..."
}`;

    const response = await ai.generate({ model: MODEL, prompt, config: { temperature: 0.6 } });
    const text = response.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(text) as Record<string, unknown>;
}

// ─── Individual Asset Generators ─────────────────────────────────────────────

async function generateEmailSequence(dna: Record<string, unknown>): Promise<string> {
    const prompt = `Write a 5-email SaaS nurture drip sequence for:

Brand: ${dna.brand_name}
Product: ${dna.core_solution}
Audience: ${dna.target_audience}
Tone: ${JSON.stringify(dna.tone_of_voice)}

Emails:
1. Welcome / First value hit (Day 0)
2. Teach the core concept (Day 2)
3. Feature spotlight + social proof (Day 4)
4. Objection handling (Day 7)
5. Urgency + CTA (Day 10)

Return each email as:
---EMAIL [N]---
Subject: ...
Preview: ...
Body:
...

No fluff. Write like a YC founder, not a marketer.`;

    const response = await ai.generate({ model: FAST_MODEL, prompt, config: { temperature: 0.75 } });
    return response.text;
}

async function generatePressRelease(dna: Record<string, unknown>, founder?: string): Promise<string> {
    const prompt = `Write a professional press release for the launch of ${dna.brand_name}.

Product: ${dna.core_solution}
Audience: ${dna.target_audience}
Key features: ${JSON.stringify(dna.key_features)}
Differentiator: ${dna.competitive_differentiator}
${founder ? `Founder quote from: ${founder}` : ''}

Format:
FOR IMMEDIATE RELEASE
[Headline]
[Subheadline]
[City, Date] — [Lede paragraph]
[Body: 3 paragraphs]
[Quote from founder]
[Boilerplate]
[Media contact]

Write tight AP style. Avoid puffery.`;

    const response = await ai.generate({ model: FAST_MODEL, prompt, config: { temperature: 0.5 } });
    return response.text;
}

async function generateSocialPack(dna: Record<string, unknown>): Promise<string> {
    const prompt = `Create a social media content pack for ${dna.brand_name} launch.

Brief: ${dna.one_liner_pitch}
Tone: ${JSON.stringify(dna.tone_of_voice)}

Write 3 posts each for: Instagram, LinkedIn, Twitter/X, TikTok (script), YouTube (description), Email subject lines (5).

Format each section as:
=== PLATFORM ===
Post 1: [content + hashtags if relevant]
Post 2: [content]
Post 3: [content]

Be platform-native. TikTok = hook in first 2 words. LinkedIn = insight-first. X = punchy.`;

    const response = await ai.generate({ model: FAST_MODEL, prompt, config: { temperature: 0.85 } });
    return response.text;
}

// ─── Main GTM Orchestrator Flow ───────────────────────────────────────────────

export const gtmKitFlow = ai.defineFlow(
    {
        name: 'gtmKit',
        inputSchema: GtmBriefSchema,
        outputSchema: GtmBriefOutputSchema,
    },
    async (input) => {
        const v = GtmBriefSchema.parse(input);
        const outputDir = resolve(v.output_dir);
        mkdirSync(outputDir, { recursive: true });

        console.log(`\n🚀 GTM KIT — "${v.one_sentence_brief}"\n`);
        const manifest: z.infer<typeof GtmBriefOutputSchema>['manifest'] = [];
        const save = (name: string, content: string, ext = 'html') => {
            const p = join(outputDir, `${name}.${ext}`);
            writeFileSync(p, content, 'utf-8');
            return p;
        };

        // ── Step 1: Brand DNA (everything depends on this) ───────────────────
        console.log('  [1/10] 🧬 Extracting Brand DNA...');
        const dna = await extractBrandDna(v.one_sentence_brief);

        // Apply any overrides
        if (v.brand_name) dna.brand_name = v.brand_name;
        if (v.tagline) dna.tagline = v.tagline;
        if (v.accent_color) dna.primary_color = v.accent_color;
        if (v.price_point) dna.price_positioning = v.price_point;

        save('brand-dna', JSON.stringify(dna, null, 2), 'json');
        console.log(`     ✅ ${dna.brand_name} — "${dna.tagline}"`);

        // ── Steps 2-8: Parallel asset generation ─────────────────────────────
        console.log('  [2-8] ⚡ Generating 7 assets in parallel...');

        const [
            landingHtml,
            emailSequence,
            socialPack,
            pressRelease,
        ] = await Promise.all([
            // Landing page
            ai.generate({
                model: MODEL,
                prompt: `Generate a complete single-file landing page HTML for:
Brand: ${dna.brand_name} | Tagline: ${dna.tagline} | Problem: ${dna.core_problem}
Solution: ${dna.core_solution} | Features: ${JSON.stringify(dna.key_features)} | Audience: ${dna.target_audience}
Colors: Primary ${dna.primary_color}, Dark ${dna.secondary_color}, Light ${dna.accent_color}
Font: ${dna.primary_font}
Price: ${dna.price_positioning}

Requirements:
- Complete single HTML file with embedded CSS and JS
- Google Fonts import for ${dna.primary_font}
- Sections: Hero (huge title + CTA), Problem/Solution, Features (3-column grid), Social Proof (testimonial), Pricing, Footer
- Mobile-first responsive
- Smooth scroll animations (Intersection Observer)
- Premium dark aesthetic with the brand colors above
- NO placeholder text — use real brand copy throughout
Return ONLY the HTML. No explanation.`,
                config: { temperature: 0.5 },
            }).then(r => r.text),

            // Email sequence
            generateEmailSequence(dna),

            // Social content pack
            generateSocialPack(dna),

            // Press release
            generatePressRelease(dna, v.founder_name),
        ]);

        // ── Save parallel results ─────────────────────────────────────────────
        const landingPath = save('landing-page', landingHtml);
        manifest.push({ asset: 'Landing Page', file_path: landingPath, inline_available: false, status: 'generated' });

        const emailPath = save('email-sequence', emailSequence, 'txt');
        manifest.push({ asset: 'Email Sequence (5 emails)', file_path: emailPath, inline_available: true, status: 'generated' });

        const socialPath = save('social-content-pack', socialPack, 'txt');
        manifest.push({ asset: 'Social Content Pack (6 platforms)', file_path: socialPath, inline_available: true, status: 'generated' });

        const pressPath = save('press-release', pressRelease, 'txt');
        manifest.push({ asset: 'Press Release', file_path: pressPath, inline_available: true, status: 'generated' });

        console.log('     ✅ Landing page, email sequence, social pack, press release');

        // ── Step 9: Document pack (pitch deck + proposal + brand guide) ───────
        console.log('  [9/10] 📄 Building document pack...');

        const { generatePitchDeck, generateProposal, generateBrandGuideline } = await import('./document.pipeline.js');

        const pitchHtml = generatePitchDeck({
            brand_name: String(dna.brand_name),
            tagline: String(dna.tagline),
            problem_statement: String(dna.core_problem),
            solution: String(dna.core_solution),
            target_audience: String(dna.target_audience),
            key_features: (dna.key_features as string[]) ?? [],
            call_to_action: v.target_raise ? `Invest in ${dna.brand_name} — ${v.target_raise}` : `Join ${dna.brand_name} today`,
            accent_color: String(dna.primary_color ?? '#b87333'),
            num_slides: 8,
        });

        const proposalHtml = generateProposal({
            client_name: '[Client Name]',
            project_title: `${dna.brand_name} — Launch Engagement`,
            agency_name: v.agency_name,
            executive_summary: String(dna.one_liner_pitch),
            scope_items: [
                { title: 'Brand & Design System', description: 'Full brand identity, design tokens, and component library', deliverables: ['Brand guidelines', 'Design system', 'Component library'], timeline: 'Week 1-2' },
                { title: 'Product Development', description: String(dna.core_solution), deliverables: (dna.key_features as string[] ?? []).slice(0, 3), timeline: 'Week 2-6' },
                { title: 'GTM & Launch', description: 'Full go-to-market execution', deliverables: ['Landing page', 'Demo video', 'Social pack', 'Press outreach'], timeline: 'Week 7-8' },
            ],
            pricing: [
                { line_item: 'Brand & Design', amount: 8000 },
                { line_item: 'Product Development', amount: 24000 },
                { line_item: 'GTM Execution', amount: 8000 },
            ],
            accent_color: String(dna.primary_color ?? '#b87333'),
        });

        const brandGuideHtml = generateBrandGuideline({
            brand_name: String(dna.brand_name),
            tagline: String(dna.tagline),
            mission: String(dna.core_solution),
            values: (dna.tone_of_voice as string[]) ?? ['Bold', 'Clear', 'Human'],
            primary_color: String(dna.primary_color ?? '#b87333'),
            secondary_color: String(dna.secondary_color ?? '#0a0a0f'),
            accent_color: String(dna.accent_color ?? '#f5f0e8'),
            primary_font: String(dna.primary_font ?? 'Inter'),
            secondary_font: 'Georgia',
            tone_of_voice: (dna.tone_of_voice as string[]) ?? ['Bold', 'Clear', 'Human'],
        });

        manifest.push({ asset: 'Pitch Deck', file_path: save('pitch-deck', pitchHtml), inline_available: false, status: 'generated' });
        manifest.push({ asset: 'Proposal', file_path: save('proposal', proposalHtml), inline_available: false, status: 'generated' });
        manifest.push({ asset: 'Brand Guidelines', file_path: save('brand-guidelines', brandGuideHtml), inline_available: false, status: 'generated' });
        console.log('     ✅ Pitch deck, proposal, brand guidelines');

        // ── Step 10: Demo app + video (optional) ─────────────────────────────
        if (!v.skip_demo_app) {
            console.log('  [10/10] 🖥  Building interactive demo app...');
            try {
                const { demoAppFlow } = await import('./demo-app.pipeline.js');
                const demoResult = await demoAppFlow({
                    brand_name: String(dna.brand_name),
                    tagline: String(dna.tagline),
                    product_description: `${dna.core_problem} ${dna.core_solution}`,
                    key_features: (dna.key_features as string[]).map(f => ({ title: f, description: f, icon: '✦' })),
                    primary_color: String(dna.primary_color ?? '#b87333'),
                    secondary_color: String(dna.secondary_color ?? '#0a0a0f'),
                    accent_color: String(dna.accent_color ?? '#f5f0e8'),
                    cta_text: 'Get Started Free',
                    cta_url: v.product_url,
                    include_chat_widget: true,
                });
                manifest.push({ asset: 'Interactive Demo App', file_path: save('demo-app', demoResult.html), inline_available: false, status: 'generated', note: `${demoResult.demo_steps?.length ?? 0} guided steps` });
                console.log('     ✅ Demo app generated');
            } catch (e) {
                manifest.push({ asset: 'Interactive Demo App', inline_available: false, status: 'failed', note: (e as Error).message });
            }
        } else {
            manifest.push({ asset: 'Interactive Demo App', inline_available: false, status: 'skipped' });
        }

        if (!v.skip_demo_video && v.product_url) {
            console.log('  [10/10] 🎬 Building demo video assets...');
            try {
                const { demoVideoFlow } = await import('./demo-video.pipeline.js');
                const videoDir = join(outputDir, 'demo-video');
                const videoResult = await demoVideoFlow({
                    brand_name: String(dna.brand_name),
                    tagline: String(dna.tagline),
                    product_url: v.product_url,
                    key_features: (dna.key_features as string[]).slice(0, 4),
                    accent_color: String(dna.primary_color ?? '#b87333'),
                    output_dir: videoDir,
                    elevenlabs_voice_id: v.elevenlabs_voice_id,
                    duration_seconds: 90,
                });
                manifest.push({ asset: 'Demo Video', file_path: videoResult.video_path, inline_available: false, status: 'generated', note: videoResult.assembly_log });
                console.log(`     ✅ Demo video: ${videoResult.video_path}`);
            } catch (e) {
                manifest.push({ asset: 'Demo Video', inline_available: false, status: 'failed', note: (e as Error).message });
            }
        } else {
            manifest.push({ asset: 'Demo Video', inline_available: false, status: v.product_url ? 'skipped' : 'skipped', note: v.product_url ? 'Skipped by config' : 'No product_url provided' });
        }

        // ── Summary ───────────────────────────────────────────────────────────
        const generated = manifest.filter(m => m.status === 'generated').length;
        console.log(`\n✨ GTM KIT COMPLETE`);
        console.log(`   ${generated}/${manifest.length} assets generated`);
        console.log(`   Output: ${outputDir}\n`);

        return {
            brand_dna: dna,
            manifest,
            total_assets: manifest.length,
            output_dir: outputDir,
            generated_at: new Date().toISOString(),
        };
    }
);

export const GTM_KIT_TOOLS = [
    {
        name: 'godprompt_generate_gtm_kit',
        description: `Master GTM automation. One brief → complete go-to-market kit:
• Landing page HTML (production-ready)
• Pitch deck (investor slides)  
• Proposal (scoped + priced)
• Brand guidelines
• Interactive demo app (deployable)
• Demo video (Playwright + FFmpeg + ElevenLabs)
• Social content pack (6 platforms)
• Email nurture sequence (5 emails)
• Press release
All files written to output_dir.`,
        inputSchema: GtmBriefSchema,
        handler: (input: GtmBrief) => gtmKitFlow(input),
        agentPermissions: ['ORACLE', 'GOD_PROMPT', 'ATLAS', 'BOLT'],
        estimatedCost: '~$0.10-0.30 in LLM tokens + ElevenLabs if voice present',
    },
];
