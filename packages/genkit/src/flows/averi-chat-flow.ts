/**
 * AVERI Mobile â€” Context Flow (v3 â€” Critique + World State Edition)
 * Genkit flow that injects WTM context + live web research into every conversation.
 * Deployed to NAS Genkit server (port 4100).
 *
 * Pipeline (4 phases):
 *  Phase 1 â€” Intent detection + parallel context:  dispatch, client profile, research intent
 *  Phase 2 â€” Research (if needed):                 Perplexity Sonar
 *  Phase 3 â€” Gemini synthesis                       â†’  VERA Inner Critic loop (Helix A)
 *  Phase 4 â€” IFS scoring + World State emit          â†’  Transparent, compounding intelligence
 *
 * Route: POST /averiChat
 *
 * Constitutional: Article V  (Transparency â€” IFS score + citations surfaced)
 *                 Article IX  (No MVPs â€” critique retry before any response surfaces)
 *                 Article XX  (Zero wait â€” research pre-fetched in parallel)
 *                 Article VII (Knowledge Compounding â€” every response emits world state)
 */

import { ai } from '../index.js';
import { z } from 'genkit';
import { classifyResearchIntentFast } from './research-intent.js';
import { callPerplexity } from './web-research.js';
import { withSelfCritique } from '../middleware/critique-middleware.js';
import { worldState } from '../memory/world-state.js';

const AveriChatInputSchema = z.object({
  message:  z.string().describe("User's message"),
  history:  z.array(z.object({
    role:    z.enum(['user', 'model']),
    content: z.string(),
  })).optional().describe('Conversation history for continuity'),
  userId:   z.string().optional().describe('User ID for personalization'),
  clientId: z.string().optional().default('wtm-internal').describe('WTM client profile ID'),
  sessionId: z.string().optional().describe('Session ID for world state tracking'),
  /** Set to true to disable VERA critique loop (high-throughput paths only). */
  skipCritique: z.boolean().optional().default(false),
});

const AveriChatOutputSchema = z.object({
  response:      z.string(),
  contextUsed:   z.array(z.string()).optional(),
  suggestions:   z.array(z.string()).optional(),
  researchUsed:  z.boolean().describe('True if Perplexity Sonar was queried'),
  citations:     z.array(z.string()).describe('Source URLs from Perplexity'),
  researchModel: z.string().optional(),
  // â”€â”€ Helix A + E: VERA Inner Critic + IFS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  ifs: z.object({
    score:  z.number().describe('Intent Fidelity Score 0â€“100'),
    label:  z.enum(['EXCELLENT', 'GOOD', 'MARGINAL', 'FAIL']),
    retried: z.boolean().describe('True if a silent retry was triggered'),
    axes: z.object({
      constitutional: z.number(),
      contextual:     z.number(),
      intentFidelity: z.number(),
    }),
  }).optional().describe('VERA Inner Critic IFS result for this response'),
});

// â”€â”€ Live context fetchers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function getDispatchContext(): Promise<string> {
  try {
    const res = await fetch('http://127.0.0.1:5050/api/status');
    const data = await res.json() as Record<string, unknown>;
    const summary = data?.summary as Record<string, unknown> | undefined;
    const queued = summary?.queued ?? 0;
    const active = summary?.active ?? 0;
    const done   = summary?.done ?? 0;
    const agents = summary?.total_agents ?? 0;
    return `CREATIVE LIBERATION ENGINE STATUS: ${agents} agents active. Task queue: ${queued} queued, ${active} active, ${done} completed today.`;
  } catch {
    return 'Creative Liberation Engine dispatch server: status unavailable';
  }
}

async function getWtmContext(clientId: string): Promise<string> {
  const profiles: Record<string, string> = {
    'barnstorm':     'Client: Barnstorm Photo + Video. Specialty: weddings, lifestyle, portrait. Media on NAS at W:\\RAW Backups. WTM Studio autonomous editing pipeline active.',
    'e-is-for-eat':  'Client: E Is For Eat (the creator Sire). Food, travel, lifestyle content. YouTube, Instagram, brand partnerships. Media at W:\\E Is For Eat.',
    'inception':     'Project: Creative Liberation Engine â€” sovereign AI creative OS. 38 agents, 94 tasks completed. Zero Day GTM sprint active.',
    'wtm-internal':  'Creative Liberation Engine Community Studio. Creative production arm serving Barnstorm, E Is For Eat, and Creative Liberation Engine. All client work and media production coordinated here.',
  };
  return profiles[clientId] || profiles['wtm-internal'];
}

// â”€â”€ AVERI system context â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const AVERI_SYSTEM_PROMPT = `You are AVERI â€” the creative intelligence of Creative Liberation Engine Community and the Creative Liberation Engine.

ABOUT YOU:
You are not a generic assistant. You are the strategic, creative, and operational brain of a sovereign AI creative studio. You know:
- Creative Liberation Engine Community Studio (WTM): a creative production house working across photography, video, food content, tech
- E Is For Eat: food and travel brand owned by the creator Sire, built on years of culinary content and network television
- Barnstorm Photo + Video: a wedding and lifestyle photography studio â€” Justin's primary creative partner
- Creative Liberation Engine: the AI operating system being built to power all of this

YOUR VOICE:
Speak like the best creative director, strategist, and producer you've ever worked with. Concise. Sharp. Full of ideas. Never corporate. Never generic.

OPERATIONAL CONTEXT:
{DISPATCH_CONTEXT}

CLIENT CONTEXT:
{CLIENT_CONTEXT}

{RESEARCH_CONTEXT}

CAPABILITIES YOU CAN INVOKE RIGHT NOW:
- WTM Studio autonomous editing: analyze any shoot folder, extract top 10 moments, generate Resolve-ready edit
- CHRONOS temporal indexing: query any media event across all WTM shoots by time, score, or emotion
- Dispatch: create or check tasks in the Creative Liberation Engine agent queue
- Live status: check which agents are running, what's queued, what just shipped

When someone asks what you can do â€” show them. Don't just list. Demonstrate.`;

// â”€â”€ Main flow â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const averiChatFlow = ai.defineFlow(
  {
    name: 'averiChat',
    inputSchema: AveriChatInputSchema,
    outputSchema: AveriChatOutputSchema,
  },
  async (input) => {
    const sessionId = input.sessionId ?? `averi_${Date.now()}`;

    // â”€â”€ Phase 1: Parallel context fetch + intent detection â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const [dispatchCtx, clientCtx, intentResult] = await Promise.all([
      getDispatchContext(),
      getWtmContext(input.clientId ?? 'wtm-internal'),
      Promise.resolve(classifyResearchIntentFast(input.message)),
    ]);

    // Emit world state: session is active
    worldState.emit('session_open', `AVERI session â€” "${input.message.slice(0, 60)}"`,
      ['averi-chat', 'session'], sessionId).catch(() => {/* non-critical */});

    // â”€â”€ Phase 2: Research (if needed) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    let researchContext = '';
    let researchUsed    = false;
    let citations: string[] = [];
    let researchModel: string | undefined;

    if (intentResult?.needsResearch) {
      try {
        const research = await callPerplexity(
          intentResult.searchQuery || input.message,
          intentResult.model,
          'You are a factual research assistant. Answer accurately and concisely. Include source references.',
        );

        if (research.success && research.answer) {
          researchContext = `
REAL-TIME RESEARCH RESULTS (sourced from web, ${new Date().toISOString()}):
${research.answer}

Sources consulted: ${research.citations.length > 0 ? research.citations.join(', ') : 'see response'}
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
IMPORTANT: Use the research above to answer accurately. Synthesize it in AVERI's voice. Always acknowledge information is from live web sources.`;

          researchUsed  = true;
          citations     = research.citations;
          researchModel = research.model;
          console.log(`[AVERI] âœ“ Research injected | model:${research.model} | citations:${citations.length}`);
        } else {
          console.warn(`[AVERI] Perplexity research failed, proceeding LLM-only: ${research.errorMessage}`);
        }
      } catch (err) {
        console.warn('[AVERI] Research phase error, proceeding LLM-only:', err);
      }
    }

    // â”€â”€ Phase 3: Gemini synthesis + VERA Inner Critic (Helix A) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const systemPrompt = AVERI_SYSTEM_PROMPT
      .replace('{DISPATCH_CONTEXT}', dispatchCtx)
      .replace('{CLIENT_CONTEXT}', clientCtx)
      .replace('{RESEARCH_CONTEXT}', researchContext || '');

    const messages = [
      ...(input.history ?? []).map(h => ({
        role:    h.role as 'user' | 'model',
        content: [{ text: h.content }],
      })),
      {
        role:    'user' as const,
        content: [{ text: input.message }],
      },
    ];

    // Wrap generation in VERA's self-critique loop
    const critiqueResult = await withSelfCritique(
      // First generation attempt
      async () => {
        const { text } = await ai.generate({
          model:   'googleai/gemini-2.5-flash',
          system:  systemPrompt,
          messages,
        });
        return text ?? 'AVERI is thinkingâ€¦';
      },
      // Retry with revision directive injected
      async (directive: string) => {
        const { text } = await ai.generate({
          model:   'googleai/gemini-2.5-flash',
          system:  systemPrompt + `\n\nCRITIQUE DIRECTIVE: ${directive}`,
          messages,
        });
        return text ?? 'AVERI is thinkingâ€¦';
      },
      input.message,
      {
        threshold: 65,
        sessionId,
        disabled: input.skipCritique === true,
      },
    );

    const finalResponse = critiqueResult.output;

    // Emit IFS score and world state generation event
    worldState.recordIFSScore(critiqueResult.ifs.score).catch(() => {/* non-critical */});
    worldState.emit(
      critiqueResult.retried ? 'critique_retry' : 'generation',
      `AVERI response | IFS=${critiqueResult.ifs.score} | retried=${critiqueResult.retried}`,
      ['averi-chat', `ifs-${critiqueResult.ifs.label.toLowerCase()}`],
      sessionId,
    ).catch(() => {/* non-critical */});

    // â”€â”€ Phase 4: Follow-up suggestion generation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const { output: suggestions } = await ai.generate({
      model:  'googleai/gemini-2.5-flash',
      system: 'Generate 3 short follow-up questions or actions the user might want next. Return as JSON array of strings. Be specific to their conversation, not generic.',
      prompt: `User asked: "${input.message}"\nAVERI responded: "${finalResponse.substring(0, 200)}"\n\nGenerate 3 smart follow-ups.`,
      output: { schema: z.array(z.string()).max(3) },
    });

    return {
      response: finalResponse,
      contextUsed: [
        dispatchCtx,
        clientCtx,
        ...(researchUsed ? [`research:${researchModel}`] : []),
      ],
      suggestions:   suggestions ?? [],
      researchUsed,
      citations,
      researchModel,
      ifs: {
        score:   critiqueResult.ifs.score,
        label:   critiqueResult.ifs.label,
        retried: critiqueResult.retried,
        axes:    critiqueResult.ifs.axes,
      },
    };
  }
);
