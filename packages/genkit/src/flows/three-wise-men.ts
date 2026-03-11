import { z } from 'genkit';
import { ai } from '../index.js';

/**
 * THREE WISE MEN — Dialectic Validation Engine
 *
 * Represents the Past (Balthazar - Precedent), Present (Melchior - Practicality), 
 * and Future (Caspar - Extensibility). Used by ATHENA for profound architectural choices.
 */

export const WiseMenInputSchema = z.object({
    dilemma: z.string().describe('The core architectural or systemic dilemma'),
});

export const WiseMenOutputSchema = z.object({
    balthazarInsights: z.string().describe('Lessons from the Past / Precedent'),
    melchiorInsights: z.string().describe('Analysis of the Present / Practicality'),
    casparInsights: z.string().describe('Projections of the Future / Extensibility'),
    goldenMean: z.string().describe('The proposed path bridging all three temporal constraints'),
});

export const ThreeWiseMenFlow = ai.defineFlow(
    {
        name: 'ThreeWiseMen',
        inputSchema: WiseMenInputSchema,
        outputSchema: WiseMenOutputSchema,
    },
    async (input) => {
        console.log(`[THREE WISE MEN] 🌟 Evaluating dilemma: ${input.dilemma.slice(0, 80)}`);

        const promptText = `Evaluate the following architectural dilemma:\n\n${input.dilemma}`;

        // Parallel Dialectic Phase
        const [pastReq, presentReq, futureReq] = await Promise.all([
            ai.generate({
                model: 'googleai/gemini-2.5-flash',
                prompt: promptText + `\n\nYou are Balthazar (The Past). Evaluate this dilemma based on history, precedent, technical debt, and established design patterns. What has failed before?`,
                config: { temperature: 0.3 }
            }),
            ai.generate({
                model: 'googleai/gemini-2.5-flash',
                prompt: promptText + `\n\nYou are Melchior (The Present). Evaluate this dilemma based on current resource constraints, immediate business value, execution speed, and pragmatic reality. What gets us shipped today?`,
                config: { temperature: 0.3 }
            }),
            ai.generate({
                model: 'googleai/gemini-2.5-flash',
                prompt: promptText + `\n\nYou are Caspar (The Future). Evaluate this dilemma based on scalability, forward compatibility, maintenance over 10 years, and shifting technological paradigms. How does this survive the next era?`,
                config: { temperature: 0.3 }
            })
        ]);

        const past = pastReq.text;
        const present = presentReq.text;
        const future = futureReq.text;

        // Synthesis Phase
        const synthesisPrompt = `You are resolving a Dialectic between three temporal perspectives regarding the following dilemma:

${input.dilemma}

Balthazar (Past / Precedent):
${past}

Melchior (Present / Practicality):
${present}

Caspar (Future / Extensibility):
${future}

Synthesize these perspectives into "The Golden Mean" — a definitive architectural recommendation that honors the lessons of the past, executes within the constraints of the present, and survives the demands of the future.`;

        const { output } = await ai.generate({
            model: 'googleai/gemini-2.5-flash',
            prompt: synthesisPrompt,
            output: { schema: WiseMenOutputSchema },
            config: { temperature: 0.2 }
        });

        if (!output) throw new Error('Failed to generate The Golden Mean');

        return {
            ...output,
            balthazarInsights: past,
            melchiorInsights: present,
            casparInsights: future
        };
    }
);

