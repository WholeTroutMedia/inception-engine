/**
 * AURORA Visual Logic Scorer
 *
 * The IE equivalent of InterPositive's "visual logic and editorial consistency" model.
 * Evaluates generated UI components, design assets, or code against a project's
 * established Visual DNA — enforcing aesthetic consistency the way a film's
 * DIT enforces color continuity across dailies.
 *
 * Two modes:
 *   score    — grade a new asset against the project's Visual DNA
 *   drift    — detect when the project's aesthetic is drifting from its baseline
 *
 * Constitutional: Article IX (Ship complete), Article X (Compound Learning)
 * AURORA principle: plans + enforces. BOLT implements. The scorer is AURORA's QA gate.
 */

import { z } from 'genkit';
import { ai } from '../index.js';
import { chromaRetriever } from '../tools/chromadb-retriever.js';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const VisualRuleViolation = z.object({
    rule: z.string().describe('Which visual rule was violated'),
    severity: z.enum(['critical', 'warning', 'info']),
    found: z.string().describe('What was found in the asset'),
    expected: z.string().describe('What was expected per the project DNA'),
    suggestion: z.string().describe('How to fix this violation'),
});

export const AuroraVisualScorerInputSchema = z.object({
    mode: z.enum(['score', 'drift']),
    projectId: z.string().describe('Project to score against — retrieves Visual DNA from project collection'),
    asset: z.object({
        content: z.string().describe('The CSS, component code, design spec, or description to evaluate'),
        assetType: z.enum(['css', 'component', 'design_spec', 'color_palette', 'typography', 'animation', 'full_page']),
        filename: z.string().optional(),
    }),
    strictMode: z.boolean().default(false).describe(
        'If true, any critical violation causes consistencyScore < 50. Used before shipping.'
    ),
});

export const AuroraVisualScorerOutputSchema = z.object({
    consistencyScore: z.number().min(0).max(100).describe(
        '0 = completely inconsistent with project DNA. 100 = perfect alignment.'
    ),
    grade: z.enum(['A', 'B', 'C', 'D', 'F']).describe('Letter grade for quick scanning'),
    violations: z.array(VisualRuleViolation).default([]),
    strengths: z.array(z.string()).default([]).describe('What this asset does right'),
    driftAlert: z.boolean().default(false).describe(
        'True if this asset represents a meaningful aesthetic drift from project baseline'
    ),
    driftDescription: z.string().optional().describe('What aspect of the visual language is drifting'),
    fixedAsset: z.string().optional().describe(
        'Auto-corrected version of the asset (CSS/code only, if fixable)'
    ),
    auroraSignature: z.literal('AURORA_VISUAL_SCORER').default('AURORA_VISUAL_SCORER'),
});

type AuroraVisualScorerOutput = z.infer<typeof AuroraVisualScorerOutputSchema>;

// ---------------------------------------------------------------------------
// Grade helper
// ---------------------------------------------------------------------------

function scoreToGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 75) return 'B';
    if (score >= 60) return 'C';
    if (score >= 45) return 'D';
    return 'F';
}

// ---------------------------------------------------------------------------
// Flow
// ---------------------------------------------------------------------------

export const AuroraVisualScorerFlow = ai.defineFlow(
    {
        name: 'AuroraVisualScorer',
        inputSchema: AuroraVisualScorerInputSchema,
        outputSchema: AuroraVisualScorerOutputSchema,
    },
    async (input): Promise<AuroraVisualScorerOutput> => {
        console.log(
            `[AURORA-SCORER] 🎨 ${input.mode.toUpperCase()} — project: "${input.projectId}" | asset: ${input.asset.assetType}`
        );

        // 1. Retrieve project Visual DNA from the project-scoped collection
        let projectDNAContext = 'No project Visual DNA found — evaluating against blank creative baseline.';
        try {
            const dnaResults = await ai.retrieve({
                retriever: chromaRetriever,
                query: 'visual design tokens palette typography color brand',
                options: {
                    nResults: 8,
                    projectId: input.projectId,
                    whereFilter: { assetType: { '$in': ['design_token', 'brand_doc', 'image_description'] } },
                },
            });

            if (dnaResults.length > 0) {
                projectDNAContext = dnaResults
                    .map(d => d.content.map(p => ('text' in p ? p.text : '')).join(' '))
                    .filter(Boolean)
                    .join('\n\n');
                console.log(`[AURORA-SCORER] 📖 Loaded ${dnaResults.length} DNA chunks for project "${input.projectId}"`);
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            console.warn(`[AURORA-SCORER] DNA retrieval failed: ${msg} — using IE defaults`);
        }

        // 2. IE default Visual DNA
        const IE_DEFAULTS = `
IE Design System — Blank Canvas (always valid as fallback):
- Maintain high contrast, proper spatial hierarchy, and clean typography.
- No pre-defined palette constraints. Evaluate based on internal consistency of the asset.
- Motion: 200-400ms ease-out transitions, no abrupt/instant state changes
- Density: high-information panels with subtle borders (1px, low-opacity)
- Never: pure #000000 or #ffffff backgrounds, hard shadows
`;

        const systemPrompt = `You are AURORA — Visual Logic Enforcer for the Creative Liberation Engine.
Your job is to grade creative assets for consistency with a project's established Visual DNA.
You are the DIT of the digital world — you enforce aesthetic consistency like a film's color pipeline.

Project Visual DNA (from project "${input.projectId}" memory):
${projectDNAContext}

${IE_DEFAULTS}

Scoring rules:
- Start at 100, subtract points per violation
- Critical violation: -20 to -30 points (wrong brand color, wrong font family)
- Warning violation: -5 to -15 points (inconsistent spacing, wrong weight)
- Info: -1 to -5 points (minor suggestion)
- strictMode: ${input.strictMode} — if true, any critical violation caps score at 49
- In drift mode: compare the asset to the project's historical visual language, identify trajectory

Be precise, technical, and actionable. This is a quality gate before shipping.`;

        const { output } = await ai.generate({
            model: 'googleai/gemini-2.5-flash',
            system: systemPrompt,
            prompt: `MODE: ${input.mode}
ASSET TYPE: ${input.asset.assetType}
${input.asset.filename ? `FILE: ${input.asset.filename}` : ''}

ASSET TO EVALUATE:
\`\`\`
${input.asset.content.slice(0, 4000)}
\`\`\`

${input.mode === 'score' ? 'Score this asset against the project Visual DNA. Identify violations and strengths. If it\'s CSS or component code and has fixable critical violations, provide a fixedAsset.' : 'Detect aesthetic drift. Is this asset pulling the project\'s visual language in a new direction? Is that drift intentional (evolution) or accidental (inconsistency)?'}`,
            output: { schema: AuroraVisualScorerOutputSchema },
            config: { temperature: 0.1 },
        });

        const result = output ?? {
            consistencyScore: 0,
            grade: 'F' as const,
            violations: [],
            strengths: [],
            driftAlert: false,
            auroraSignature: 'AURORA_VISUAL_SCORER' as const,
        };

        // Apply strict mode cap
        if (input.strictMode && result.violations.some(v => v.severity === 'critical')) {
            result.consistencyScore = Math.min(result.consistencyScore, 49);
        }

        result.grade = scoreToGrade(result.consistencyScore);

        console.log(
            `[AURORA-SCORER] ✅ Score: ${result.consistencyScore}/100 (${result.grade}) | ` +
            `${result.violations.length} violations | drift: ${result.driftAlert}`
        );

        return { ...result, auroraSignature: 'AURORA_VISUAL_SCORER' };
    }
);

