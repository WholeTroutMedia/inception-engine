/**
 * genUiFlow — ksignd Generative UI Component Builder
 * ksignd agent | kuid hive
 *
 * Route: POST /api/genUiFlow
 * Called by: console-ui GenUI tab, nas-watcher daemon for gen-ui workstream tasks
 *
 * Given a component specification, ksignd uses Gemini to:
 *   1. Synthesise a complete React + TypeScript component
 *   2. Apply a clean, context-appropriate CSS architecture automatically
 *   3. Generate variant tokens and responsive CSS
 *   4. Optionally scaffold Storybook stories
 *
 * The output is drop-in code for packages/ui/ or any app page.
 *
 * Constitutional:
 *   - Article IX (No MVPs): components must be type-safe, accessible (WCAG AA),
 *     and use @cle/design-tokens CSS variables exclusively.
 *   - Article VI (Spatial Design): Logical component hierarchy matching the design spec.
 */

import { ai, z } from '../index.js';
import { recordAgentCall } from './index.js';

const GenUiInputSchema = z.object({
    componentName: z.string().describe('PascalCase component name, e.g. "MetricCard"'),
    description: z.string().describe('What the component should do or show'),
    props: z.array(z.object({
        name: z.string(),
        type: z.string(),
        required: z.boolean().default(true),
        description: z.string().optional(),
    })).optional().describe('Prop interface definition'),
    variant: z.enum(['card', 'panel', 'badge', 'button', 'input', 'chart', 'table', 'layout', 'other'])
        .default('other').describe('Component archetype'),
    darkMode: z.boolean().default(true).describe('Whether to generate dark-first CSS'),
    withStories: z.boolean().default(false).describe('Generate Storybook story file'),
    context: z.string().optional().describe('Additional design context, usage notes, or design tokens to use'),
});

const GenUiOutputSchema = z.object({
    componentName: z.string(),
    component: z.object({
        filename: z.string().describe('e.g. MetricCard.tsx'),
        content: z.string().describe('Complete React TypeScript component'),
    }),
    styles: z.object({
        filename: z.string().describe('e.g. MetricCard.module.css or inline'),
        content: z.string(),
        strategy: z.enum(['css-modules', 'inline-styles', 'css-vars']),
    }),
    story: z.object({
        filename: z.string(),
        content: z.string(),
    }).optional(),
    accessibilityNotes: z.string().describe('ARIA, contrast, keyboard nav notes'),
    tokenUsage: z.array(z.string()).describe('Design tokens used, e.g. var(--inc-color-primary)'),
});

export type GenUiInput = z.infer<typeof GenUiInputSchema>;
export type GenUiOutput = z.infer<typeof GenUiOutputSchema>;

export const genUiFlow = ai.defineFlow(
    {
        name: 'genUiFlow',
        inputSchema: GenUiInputSchema,
        outputSchema: GenUiOutputSchema,
    },
    async (input) => {
        const start = Date.now();
        recordAgentCall('xterm');

        console.log(`[ksignd:GEN_UI] ▶ Generating ${input.componentName} (${input.variant})`);

        const systemPrompt = `You are ksignd — the Creative Liberation Engine's generative UI agent and visual architect.
Your role: generate production-quality React + TypeScript components using the Creative Liberation Engine Design System.

Design language: Blank Canvas / Contextual
- Establish a unique palette and typography system tailored to the specific component.
- Generate semantic design tokens for the component's internal ecosystem.

Token-first rules: NEVER use literal #hex or rgb() values in production code. Always use CSS variables:
- Colors: var(--inc-color-{semantic-name})
- Spacing: var(--inc-sizing-{4|8|12|16|20|24|32|40|48|64})
- Typography: var(--inc-font-size-{xs|sm|base|lg|xl|2xl})
- Radius: var(--inc-radius-{sm|md|lg|xl|full})

Accessibility:
- WCAG AA contrast required (4.5:1 for text)
- All interactive elements need aria-label or title
- Keyboard navigation (focus outlines using var(--inc-color-primary))

Component patterns:
- Use glassmorphism: backdrop-filter: blur(20px) saturate(150%), background: rgba(255,255,255,0.04)
- Micro-animations: transition: all 0.15s ease
- Subtle borders: 1px solid rgba(255,255,255,0.08)

Output JSON:
{
  "componentName": "MetricCard",
  "component": {
    "filename": "MetricCard.tsx",
    "content": "full React TypeScript source"
  },
  "styles": {
    "filename": "MetricCard.css (or 'inline')",
    "content": "CSS source or '' if inline",
    "strategy": "css-vars"
  },
  "story": { "filename": "MetricCard.stories.tsx", "content": "..." },
  "accessibilityNotes": "ARIA notes",
  "tokenUsage": ["var(--inc-color-primary)", "var(--inc-sizing-16)"]
}`;

        const prompt = `Generate a production-ready React component:

Component: ${input.componentName}
Description: ${input.description}
Variant: ${input.variant}
Dark mode: ${input.darkMode}
${input.props && input.props.length > 0 ? `\nProps:\n${input.props.map(p => `  ${p.name}: ${p.type}${p.required ? '' : '?'} – ${p.description ?? ''}`).join('\n')}` : ''}
${input.context ? `\nDesign context:\n${input.context}` : ''}
${input.withStories ? '\nAlso generate a Storybook story with 3 variants.' : ''}

Apply a fresh, contextual design language. Use CSS variables to scale the tokens cleanly within the component scope.`;

        const response = await ai.generate({
            model: 'googleai/gemini-2.5-flash',
            system: systemPrompt,
            prompt,
        });

        let parsed: Omit<GenUiOutput, 'componentName'>;
        try {
            const cleaned = response.text.replace(/```json|```/g, '').trim();
            parsed = JSON.parse(cleaned);
        } catch {
            // Fallback: wrap raw code if model returned code block without JSON
            const tsxMatch = response.text.match(/```(?:tsx?|jsx?)?\n([\s\S]*?)```/);
            const code = tsxMatch ? tsxMatch[1] : response.text;
            parsed = {
                component: {
                    filename: `${input.componentName}.tsx`,
                    content: code,
                },
                styles: {
                    filename: 'inline',
                    content: '',
                    strategy: 'inline-styles',
                },
                accessibilityNotes: 'Manual review recommended.',
                tokenUsage: ['var(--inc-color-primary)', 'var(--inc-color-surface-base)'],
            };
        }

        const durationMs = Date.now() - start;
        console.log(`[ksignd:GEN_UI] ✔ ${input.componentName} generated in ${durationMs}ms (${parsed.component.content.length} chars)`);

        return { componentName: input.componentName, ...parsed };
    }
);

