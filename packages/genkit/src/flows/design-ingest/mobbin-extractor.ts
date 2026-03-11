import { z } from 'genkit';
import { ai } from '../../index.js';

export const MobbinExtractorInputSchema = z.object({
  category: z.string().describe('Mobbin category (e.g., onboarding, checkout, settings)'),
  appId: z.string().optional().describe('Specific iOS/Android app ID on Mobbin if known'),
});

export const MobbinExtractorOutputSchema = z.object({
  success: z.boolean(),
  extractedPatterns: z.array(z.any()).optional(),
  error: z.string().optional(),
});

export const mobbinExtractorFlow = ai.defineFlow(
  {
    name: 'mobbinExtractorFlow',
    inputSchema: MobbinExtractorInputSchema,
    outputSchema: MobbinExtractorOutputSchema,
  },
  async (input: z.infer<typeof MobbinExtractorInputSchema>) => {
    console.log(`[MobbinExtractor] Fetching structured UI data for category: ${input.category}`);
    
    try {
      // In a real implementation, this would call the MobbinAPI gateway via MCP:
      // const response = await mcpRouter.call('mobbin-api', 'getScreens', { category: input.category });
      
      console.log(`[MobbinExtractor] Mocking Mobbin API taxonomy pull...`);
      const mockStructure = {
        patternId: `mobbin-${input.category}-01`,
        layoutType: 'vstack',
        primitives: ['Header', 'HeroImage', 'ButtonGroup', 'FooterText'],
        tokens: { padding: '24px', gap: '16px' }
      };
      
      console.log(`[MobbinExtractor] Found pattern, generating YAML "Helix Descriptor"...`);
      
      return {
        success: true,
        extractedPatterns: [mockStructure],
      };
    } catch (err: any) {
      console.error(`[MobbinExtractor] Failed:`, err);
      return { success: false, error: err.message };
    }
  }
);
