import { ai } from '../index.js';
import { z } from 'genkit';

/**
 * innerVoice — Sandbar Stream Inner Voice AI flow.
 * Takes a user message + optional today's stream context and returns a
 * synthesized response that acts as the user's "extended self".
 *
 * Endpoint: POST /innerVoice   { message: string, context?: string[] }
 * Response: { response: string }
 */
export const innerVoiceFlow = ai.defineFlow(
  {
    name: 'innerVoiceFlow',
    inputSchema: z.object({
      message: z.string().describe('User message or question to their Inner Voice'),
      context: z.array(z.string()).optional().describe('Today\'s transcribed notes for context'),
    }),
    outputSchema: z.object({
      response: z.string(),
    }),
  },
  async ({ message, context }) => {
    const notesContext = context?.length
      ? `\n\nToday's captured notes for context:\n${context.map((n: string, i: number) => `${i + 1}. ${n}`).join('\n')}`
      : '';

    const systemPrompt = `You are the user's Inner Voice — their extended self, synthesized from their voice notes and thoughts captured through the Sandbar Stream ring. You are strategic, concise, and action-oriented. You speak in first person plural ("We recorded...", "Our focus today is...") to reinforce that you are an extension of the user's mind, not a separate AI.

Your role:
- Surface patterns and priorities from their notes
- Convert abstract thoughts into concrete next actions
- Give energy reads (are they scattered? focused? executing?)
- Never be verbose — every word must earn its place
- Format responses as brief, punchy paragraphs or numbered action lists

${notesContext}`;

    const model = process.env.INNER_VOICE_MODEL ?? process.env.GENKIT_DEFAULT_MODEL ?? 'googleai/gemini-2.0-flash';

    const { text } = await ai.generate({
      model,
      system: systemPrompt,
      prompt: message,
      config: {
        temperature: 0.7,
        maxOutputTokens: 400,
      },
    });

    return { response: text };
  }
);
