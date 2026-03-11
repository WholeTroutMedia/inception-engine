import { z } from 'genkit';
import { ai } from '@inception/genkit';

export const UIComponentSchema = z.object({
  componentName: z.string().describe('PascalCase component name'),
  code: z.string().describe('Full React component code'),
  imports: z.array(z.string()).describe('Required import statements'),
  metadata: z.object({
    framework: z.string().default('react'),
    styling: z.string().default('open-props'),
  }).optional(),
});

export const uiGeneratorFlow = ai.defineFlow({
    name: 'uiGeneratorFlow',
    inputSchema: z.object({
        prompt: z.string(),
        context: z.string().optional()
    }),
    outputSchema: UIComponentSchema,
}, async (input: { prompt: string; context?: string }) => {
    const response = await ai.generate({
        prompt: `You are IRIS-GEN, an expert UI component engineer.
        Generate 3 distinct React component variations based on the following request:
            ${input.prompt}

            Context (if any): ${input.context || 'none'}

            Output only the raw code as a single string. Use Open Props for styling.`,
    });
    return response.output ?? { componentName: 'Unknown', code: response.text, imports: [] };
});