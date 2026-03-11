/**
 * packages/god-prompt/src/flows/demo-app.pipeline.ts
 * Interactive demo app generator — produces a self-contained deployable HTML app
 */
import { ai } from '@inception/genkit';
import { z } from 'genkit';

export interface FeatureItem {
    title: string;
    description: string;
    icon: string;
}

export interface DemoAppInput {
    brand_name: string;
    tagline: string;
    product_description: string;
    key_features: FeatureItem[];
    primary_color: string;
    secondary_color: string;
    accent_color: string;
    cta_text: string;
    cta_url?: string;
    include_chat_widget?: boolean;
}

export interface DemoAppResult {
    html: string;
    demo_steps?: string[];
}

const DemoAppInputSchema = z.object({
    brand_name: z.string(),
    tagline: z.string(),
    product_description: z.string(),
    key_features: z.array(z.object({ title: z.string(), description: z.string(), icon: z.string() })),
    primary_color: z.string(),
    secondary_color: z.string(),
    accent_color: z.string(),
    cta_text: z.string(),
    cta_url: z.string().optional(),
    include_chat_widget: z.boolean().optional(),
});

const DemoAppResultSchema = z.object({
    html: z.string(),
    demo_steps: z.array(z.string()).optional(),
});

export const demoAppFlow = ai.defineFlow(
    {
        name: 'demoApp',
        inputSchema: DemoAppInputSchema,
        outputSchema: DemoAppResultSchema,
    },
    async (input: DemoAppInput): Promise<DemoAppResult> => {
        const { brand_name, tagline, product_description, key_features, primary_color, secondary_color, accent_color, cta_text, cta_url } = input;

        const response = await ai.generate({
            prompt: `Generate a complete interactive demo app HTML page for ${brand_name}.
Tagline: ${tagline}
Product: ${product_description}
Features: ${key_features.map(f => `${f.icon} ${f.title}: ${f.description}`).join(', ')}
Colors: primary=${primary_color}, bg=${secondary_color}, accent=${accent_color}
CTA: "${cta_text}" → ${cta_url ?? '#'}

Create a single-file interactive HTML demo with:
- Animated hero section
- Feature showcase with interactive cards
- Live product demo simulation
- Call-to-action section

Return ONLY the HTML.`,
            config: { temperature: 0.6 },
        });

        const demo_steps = key_features.map(f => `${f.icon} ${f.title}`);
        return { html: response.text, demo_steps };
    }
);
