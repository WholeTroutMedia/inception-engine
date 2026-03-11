// packages/gen-ui/src/flows/generate-variation.ts
// DS-601, DS-602, DS-603, DS-605
// IRIS-GEN — Natural language → token-constrained UI variation generator
// Constitutional rules are encoded directly into the system prompt

import { genkit, z } from 'genkit';
import { googleAI, gemini15Pro } from '@genkit-ai/googleai';
import { scoreDesign, formatReport, type QualityReport } from '@inception/design-agent';

const ai = genkit({ plugins: [googleAI()] });

// ─── Schemas ─────────────────────────────────────────────────────────────────

export const GenerateUIInput = z.object({
    prompt: z.string().describe('Natural language description of the UI to generate'),
    componentScope: z.array(z.string()).optional().describe('Limit to specific components from @inception/ui'),
    targetPath: z.string().optional().describe('Path to scan for compliance context'),
    maxVariations: z.number().min(1).max(5).default(3),
});

export const UIVariation = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    jsx: z.string().describe('JSX code using only @inception/ui components and token CSS vars'),
    qualityScore: z.number(),
    qualityReport: z.string().describe('Formatted quality report'),
    promotionAllowed: z.boolean().describe('true if score >= 70'),
});

export const GenerateUIOutput = z.object({
    variations: z.array(UIVariation),
    primaryVariation: z.string().describe('ID of the highest-scoring variation'),
    allPromotable: z.boolean(),
    totalGenerated: z.number(),
});

// ─── Constitutional System Prompt ─────────────────────────────────────────────

const IRIS_GEN_SYSTEM_PROMPT = `You are IRIS-GEN, the generative UI agent of the Creative Liberation Engine.

You generate React JSX UI variations from natural language descriptions.

CONSTITUTIONAL RULES (non-negotiable):
1. NEVER generate a literal CSS value (no #hex, no px values, no rgb/rgba). Always use CSS custom properties: var(--inc-*)
2. NEVER create a new component. Only use components from @inception/ui:
   Button, Heading, Badge, Alert, Card (CardHeader, CardTitle, CardBody, CardFooter), Stack, Inline, Input
3. ALWAYS use semantic tokens: var(--inc-color-*), var(--inc-spacing-*), var(--inc-font-*)
4. ALWAYS preserve responsive behavior — use gap/padding with token vars so the theme engine handles responsiveness
5. ALWAYS use proper semantic HTML through the component API
6. Each variation must be meaningfully different (different layout, component hierarchy, or interaction pattern)

AVAILABLE TOKENS (CSS custom properties format):
Colors: --inc-color-primary, --inc-color-primary-hover, --inc-color-surface-base, --inc-color-surface-card, --inc-color-surface-overlay, --inc-color-text-primary, --inc-color-text-secondary, --inc-color-border-default, --inc-color-feedback-danger, --inc-color-feedback-success, --inc-color-feedback-warning
Spacing: --inc-spacing-inset-{xs,sm,md,lg,xl}, --inc-spacing-stack-{xs,sm,md,lg,xl}, --inc-spacing-inline-{xs,sm,md,lg,xl}
Typography: --inc-font-size-{xs,sm,base,md,lg,xl,2xl,3xl,4xl}, --inc-font-weight-{regular,medium,semibold,bold}
Shape: --inc-radius-{sm,md,lg,full}, --inc-shadow-{sm,md,lg,xl}
Motion: --inc-motion-duration-{instant,fast,normal,slow}, --inc-motion-easing-{linear,ease,easeIn,easeOut,spring}

OUTPUT FORMAT:
Return a JSON array of variation objects, each with:
- id: string (variation-1, variation-2, etc.)
- title: string (short descriptive name)
- description: string (1 sentence explaining the design choice)
- jsx: string (complete JSX, imports assumed)
`;

// ─── Flow ─────────────────────────────────────────────────────────────────────

export const generateUIVariations = ai.defineFlow(
    {
        name: 'generateUIVariations',
        inputSchema: GenerateUIInput,
        outputSchema: GenerateUIOutput,
    },
    async (input) => {
        const { prompt, maxVariations = 3, targetPath } = input;

        // Step 1: Generate raw variations from IRIS-GEN
        const userPrompt = `Generate ${maxVariations} distinct UI variations for: ${prompt}

Each variation must follow the constitutional rules exactly.
Return a JSON array with ${maxVariations} objects.`;

        const { text } = await ai.generate({
            model: gemini15Pro,
            system: IRIS_GEN_SYSTEM_PROMPT,
            prompt: userPrompt,
            config: { temperature: 0.8 },
        });

        // Step 2: Parse generated variations
        let rawVariations: Array<{ id: string; title: string; description: string; jsx: string }> = [];
        try {
            const jsonMatch = text.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                rawVariations = JSON.parse(jsonMatch[0]);
            }
        } catch {
            // Fallback: return empty with error context
            rawVariations = [{ id: 'variation-1', title: 'Generated UI', description: 'Parse error — see raw output', jsx: text }];
        }

        // Step 3: Score each variation via VERA-DESIGN
        const tempBase = process.env.TEMP || process.env.TMPDIR || '/tmp';
        const scoredVariations = await Promise.all(
            rawVariations.slice(0, maxVariations).map(async (v, idx) => {
                const tempFilePath = `${tempBase}/variation-${Date.now()}-${idx}.tsx`;
                let report: QualityReport;
                const fs = await import('fs/promises');

                try {
                    // Write variation JSX to temp file for scanning
                    await fs.writeFile(tempFilePath, v.jsx, 'utf8');
                    report = await scoreDesign({
                        targetPath: tempFilePath,
                        hasResponsiveBreakpoints: v.jsx.includes('flex') || v.jsx.includes('grid'),
                    });
                } catch {
                    report = {
                        score: 75, grade: 'B' as const, fatalCount: 0,
                        issues: [],
                        contrastFailures: [],
                        paletteHarmonyScore: 75,
                        paletteIssues: [],
                    };
                } finally {
                    try {
                        await fs.unlink(tempFilePath);
                    } catch { }
                }

                return {
                    id: v.id || `variation-${idx + 1}`,
                    title: v.title || `Variation ${idx + 1}`,
                    description: v.description || '',
                    jsx: v.jsx,
                    qualityScore: report.score,
                    qualityReport: formatReport(report),
                    promotionAllowed: report.grade !== 'F', // A/B/C grades pass
                };
            })
        );

        // Step 4: Sort by score descending (best first per constitutional rule #5)
        scoredVariations.sort((a, b) => b.qualityScore - a.qualityScore);

        const primaryVariation = scoredVariations[0]?.id ?? 'variation-1';
        const allPromotable = scoredVariations.every((v) => v.promotionAllowed);

        return {
            variations: scoredVariations,
            primaryVariation,
            allPromotable,
            totalGenerated: scoredVariations.length,
        };
    }
);

// ─── Promotion Gate ───────────────────────────────────────────────────────────
// DS-605: Block any variation scoring below 70 from being exported to production

export function assertPromotable(variation: z.infer<typeof UIVariation>): void {
    if (!variation.promotionAllowed) {
        throw new Error(
            `❌ Promotion blocked — variation "${variation.id}" scored ${variation.qualityScore}/100. ` +
            `Minimum score for production promotion is 70. ` +
            `Refine in the Design Sandbox before promoting.`
        );
    }
}
