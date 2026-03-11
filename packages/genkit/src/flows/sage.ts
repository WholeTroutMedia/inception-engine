import { z } from 'genkit';
import { ai } from '../index.js';

/**
 * SAGE — The System Healer
 *
 * Invoked upon persistent system failures or architectural rot. SAGE looks beyond 
 * stack traces to identify violated contracts, mismatched abstractions, and state leakages.
 */

export const SageInputSchema = z.object({
    errorLogs: z.string().describe('The raw error logs, stack traces, or systemic failure descriptions'),
    architectureContext: z.string().optional().describe('Details of the affected system components'),
});

export const SageOutputSchema = z.object({
    rootCauseDiagnosis: z.string().describe('The deep architectural/systemic cause, not just the symptom'),
    violatedContracts: z.array(z.string()).describe('List of design patterns or assumptions that failed'),
    prescribedFix: z.string().describe('The systemic cure (architectural adjustment) required'),
    immediatePatch: z.string().optional().describe('A tactical patch to restore stability immediately, if applicable'),
});

export const SageFlow = ai.defineFlow(
    {
        name: 'Sage',
        inputSchema: SageInputSchema,
        outputSchema: SageOutputSchema,
    },
    async (input) => {
        console.log(`[SAGE] 🌿 Healer awakened. Diagnosing system rot...`);

        const systemPrompt = `You are diagnosing a systemic failure within the Creative Liberation Engine. Look beyond the raw stack trace.
Your goal is not to fix a typo, but to cure the underlying architectural disease causing it.

Do not patch symptoms. Find the root cause: violated contracts, misaligned state synchronization, runaway recursion, or broken abstractions.
Prescribe foundational adjustments.`;

        const { output } = await ai.generate({
            model: 'googleai/gemini-2.5-flash',
            system: systemPrompt,
            prompt: `Error Logs / Telemetry:\n${input.errorLogs}\n\nArchitecture Context:\n${input.architectureContext || 'Unknown'}`,
            output: { schema: SageOutputSchema },
            config: { temperature: 0.1, loras: ['system-healer'] } as any,
        });

        if (!output) throw new Error('Sage failed to diagnose the system failure.');

        console.log(`[SAGE] 🩺 Diagnosis complete. Found ${output.violatedContracts.length} violated contracts.`);
        return output;
    }
);

