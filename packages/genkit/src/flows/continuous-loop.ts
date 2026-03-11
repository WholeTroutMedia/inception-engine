import { z } from 'genkit';
import { ai } from '../index.js';

// Define a subset of ARKit shapes that we want the LLM to control directly
export const SemanticSomaticSchema = z.object({
  baseFrame: z.object({
    MouthSmileLeft: z.number().min(0).max(1).optional(),
    MouthSmileRight: z.number().min(0).max(1).optional(),
    BrowInnerUp: z.number().min(0).max(1).optional(),
    BrowDownLeft: z.number().min(0).max(1).optional(),
    BrowDownRight: z.number().min(0).max(1).optional(),
    JawOpen: z.number().min(0).max(1).optional(),
    MouthFrownLeft: z.number().min(0).max(1).optional(),
    MouthFrownRight: z.number().min(0).max(1).optional(),
  }).describe('The explicit base facial blendshapes driven by the current semantic intent.'),
  emotionalBaseline: z.object({
    breathingAmplitude: z.number().min(0).max(1).optional(),
    breathingSpeed: z.number().min(0.1).max(3.0).optional(),
    saccadeFrequency: z.number().min(0).max(1).optional()
  }).describe('The modifiers for the underlying Autonomic Engine (breathing and eye darts)')
});

export const ContinuousLoopFlow = ai.defineFlow(
  {
    name: 'ContinuousLoop',
    inputSchema: z.object({
      context: z.string().describe('Recent sensory input or conversation history'),
      currentState: z.string().describe('The current emotional state or activity')
    }),
    outputSchema: SemanticSomaticSchema
  },
  async (input) => {
    // Invoke Gemini to map the context + state into a somatic frame
    const { output } = await ai.generate({
      prompt: `You are the Genesis Compiler for Project Omnimedia MetaHuman Pipeline.
Evaluate the current context and output the appropriate somatic base frame and autonomic emotional baseline.

Context: ${input.context}
Current State: ${input.currentState}

Respond purely with the requested JSON schema.`,
      model: 'gemini-2.5-flash',
      output: { schema: SemanticSomaticSchema },
      config: { temperature: 0.7 }
    });

    if (!output) {
      throw new Error("Failed to generate Continuous Loop output");
    }

    return output;
  }
);
