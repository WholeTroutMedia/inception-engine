import { z } from 'zod';
// @ts-ignore
import { ai } from '@inception/genkit';
import { FoleyEngine, type CampaignBrief } from './index.js';

// Definitions
export const CampaignBriefSchema = z.object({
  title: z.string(),
  mood: z.enum(['energetic', 'calm', 'dramatic', 'ambient', 'upbeat']),
  genre: z.string(),
  bpm: z.number().optional(),
  durationSec: z.number(),
  instruments: z.array(z.string()).optional(),
  referenceTrack: z.string().optional()
});

export const FoleyRequestSchema = z.object({
  brief: CampaignBriefSchema,
  options: z.object({
    extractStems: z.boolean().default(false),
    detectBeats: z.boolean().default(false)
  }).optional()
});

export const FoleyResponseSchema = z.object({
  masterUrl: z.string(),
  stemsUrl: z.string().optional(),
  beatGrid: z.any().optional(),
  metadata: z.any()
});

export type FoleyRequest = z.infer<typeof FoleyRequestSchema>;
export type FoleyResponse = z.infer<typeof FoleyResponseSchema>;

/**
 * Genkit Flow for Audio Composition
 */
export const runFoleyPipeline = ai.defineFlow(
  {
    name: 'runFoleyPipeline',
    inputSchema: FoleyRequestSchema,
    outputSchema: FoleyResponseSchema,
  },
  async (request: FoleyRequest) => {
    console.log(`[Foley Pipeline] Starting generation for "${request.brief.title}"`);
    
    // 1. Initialize engine
    const engine = new FoleyEngine();
    
    // 2. Execute generation pipeline
    console.log('[Foley Pipeline] Generating audio via Reaper/MIDI...');
    const result = await engine.generate(request.brief);
    
    // 3. Optional post-processing would be conditionally triggered here based on request.options
    
    // 4. Return result matching schema
    return {
      masterUrl: result.master.path,
      stemsUrl: result.stems ? result.stems.vocals : undefined, // Simplification
      beatGrid: result.beatGrid,
      metadata: result.metadata
    };
  }
);

export async function generateMidiPattern(brief: CampaignBrief): Promise<{ projectPath: string }> {
    // This is a stub for the internal MIDI generation logic 
    console.log('[Foley Pipeline] Internal MIDI Pattern Generation for mood:', brief.mood);
    return { projectPath: `/tmp/foley-${Date.now()}.rpp` };
}
