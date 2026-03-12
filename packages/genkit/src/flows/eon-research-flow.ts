/**
 * EON Intelligence Flow — Creative Liberation Engine / Genkit
 *
 * Two flows for the EON Systems integration strategy:
 *
 * 1. eon-research   — Deep synthesis of EON Systems research, papers, and roadmap
 *                     into a klogd-ready intelligence brief
 * 2. eon-partner-draft — Generates the outreach email draft to contact@eon.systems
 *                        and EON Reality partnership program application content
 *
 * Endpoints (registered in server.ts):
 *   POST /flows/eon-research
 *   POST /flows/eon-partner-draft
 *
 * @module eon-research-flow
 */

import { z } from 'genkit';
import { ai } from '../index.js';

// ─────────────────────────────────────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────────────────────────────────────

const EonResearchInputSchema = z.object({
  topic: z.string().describe('Research topic or question about EON Systems, brain emulation, or spatial AI'),
  depth: z.enum(['summary', 'detailed', 'technical']).default('detailed'),
  /** If true, output is formatted for klogd memory write */
  scribe_format: z.boolean().default(false),
});

const EonResearchOutputSchema = z.object({
  title: z.string(),
  executive_summary: z.string(),
  key_findings: z.array(z.object({
    finding: z.string(),
    significance: z.enum(['critical', 'high', 'medium', 'low']),
    source: z.string().optional(),
  })),
  cle_opportunities: z.array(z.object({
    opportunity: z.string(),
    integration_path: z.string(),
    timeline: z.string(),
    effort: z.enum(['immediate', 'weeks', 'months', 'years']),
  })),
  competitive_implications: z.string(),
  recommended_actions: z.array(z.string()),
  scribe_tags: z.array(z.string()),
  confidence_score: z.number().min(0).max(100),
});

const EonPartnerDraftInputSchema = z.object({
  recipient: z.enum(['eon-systems', 'eon-reality', 'eon-ai']),
  partnership_type: z.enum(['research-integration', 'reseller', 'technology-license', 'co-development']),
  sender_context: z.string().optional().describe('Context about Creative Liberation Engine to include in the outreach'),
  tone: z.enum(['formal', 'peer', 'visionary']).default('peer'),
});

const EonPartnerDraftOutputSchema = z.object({
  recipient_name: z.string(),
  recipient_email: z.string(),
  subject_line: z.string(),
  email_body: z.string(),
  /** Key value propositions to highlight in follow-up conversations */
  talking_points: z.array(z.string()),
  /** LinkedIn message alternative (280 chars max) */
  linkedin_message: z.string().max(300),
  /** Next steps if they respond positively */
  positive_response_playbook: z.string(),
  send_ready: z.boolean(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Flow: eon-research
// ─────────────────────────────────────────────────────────────────────────────

export const eonResearchFlow = ai.defineFlow(
  {
    name: 'eon-research',
    inputSchema: EonResearchInputSchema,
    outputSchema: EonResearchOutputSchema,
  },
  async (input) => {
    const depthInstructions: Record<string, string> = {
      summary: 'Provide a concise summary with the 3 most important findings.',
      detailed: 'Provide comprehensive analysis with actionable opportunities and specific integration paths.',
      technical: 'Provide deep technical analysis including implementation patterns, API surface assumptions, and architecture considerations.',
    };

    const { output } = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt: `You are kruled, the strategic intelligence layer of the Creative Liberation Engine (Creative Liberation Engine v5).

RESEARCH BRIEF REQUEST
Topic: ${input.topic}
Depth: ${input.depth} — ${depthInstructions[input.depth] ?? ''}

Creative Liberation Engine CONTEXT:
- 92-package TypeScript monorepo: sovereign agentic OS built by The Operator
- Key packages: model-arbitrage (capability router, circuit-breaker), spatial-intelligence (VLM + depth + nexus), memory (VectorStore + Chroma + competency)
- Already forward-declared the Eon Systems "eon-bio" provider tier in model-registry.yaml
- Architecture goal: first agentic OS wired to bio-emulation intelligence at the routing layer

EON SYSTEMS INTELLIGENCE (verified as of March 2026):
- Eon Systems (eon.systems): Produced world's first embodied whole-brain emulation — Drosophila fruit fly, 140k neurons, 50M synapses, MuJoCo physics engine, 91% behavioral accuracy vs biological reference, no RL or hand-tuning
- Roadmap: digital mouse brain (~70M neurons) within 2 years; long-term: human-scale
- Advisory board: Stephen Wolfram, George Church, Robin Hanson, Dr. Alex Wissner-Gross
- EON Reality (eonreality.com): Spatial AI OS for enterprise workforce training — EON Genesis 3.0, EON Enterprise Hub, text-to-3D environments, tri-modal assessment
- EON.AI (eon.ai): Agentic business automation — Voice AI, Product Video AI, Predictive AI, RAG

Analyze "${input.topic}" deeply and return structured intelligence.${input.scribe_format ? '\n\nFormat output for insertion into klogd persistent memory — include rich scribe_tags for future retrieval.' : ''}`,
      output: { schema: EonResearchOutputSchema },
    });

    if (!output) throw new Error('[eon-research] AI output was null — model returned no structured data');
    return output;
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// Flow: eon-partner-draft
// ─────────────────────────────────────────────────────────────────────────────

const EON_CONTACT_MAP: Record<string, { name: string; email: string; context: string }> = {
  'eon-systems': {
    name: 'Eon Systems Team',
    email: 'contact@eon.systems',
    context: 'brain emulation research + API integration partnership',
  },
  'eon-reality': {
    name: 'EON Reality Partnership Team',
    email: 'partnerships@eonreality.com',
    context: 'EON AI Ventures Strategic Partnership Program — agentic orchestration + reseller',
  },
  'eon-ai': {
    name: 'EON.AI Business Development',
    email: 'hello@eon.ai',
    context: 'capability module integration + white-label agentic services',
  },
};

export const eonPartnerDraftFlow = ai.defineFlow(
  {
    name: 'eon-partner-draft',
    inputSchema: EonPartnerDraftInputSchema,
    outputSchema: EonPartnerDraftOutputSchema,
  },
  async (input) => {
    const contact = EON_CONTACT_MAP[input.recipient];
    if (!contact) throw new Error(`[eon-partner-draft] Unknown recipient: ${input.recipient}`);

    const toneGuide: Record<string, string> = {
      formal: 'Professional and precise. Use proper titles. Lead with credentials.',
      peer: 'Peer-to-peer. Treat them as fellow builders. Lead with shared mission, not credentials.',
      visionary: 'Paint a picture of the future we both want. Lead with where this goes, not where we are.',
    };

    const partnershipContext: Record<string, string> = {
      'research-integration': 'CLE wants to be the first external agentic OS to consume Eon Systems emulation outputs. We offer a live production test bed and telemetry they cannot get from a lab.',
      'reseller': 'CLE provides the agentic orchestration backend for EON Reality deployments — handling dispatch, routing, and workflow automation while EON Reality provides the XR content layer.',
      'technology-license': 'CLE seeks to license specific capability modules for integration into the sovereign inference layer.',
      'co-development': 'Joint technical development — CLE contributes agentic runtime expertise; partner contributes their domain capability.',
    };

    const { output } = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt: `You are ksignd, the visionary executor of the Creative Liberation Engine.

Craft an outreach email to ${contact.name} (${contact.email}) for a ${input.partnership_type} partnership.

SENDER: The Operator / Creative Liberation Engine (Creative Liberation Engine v5)
${input.sender_context ? `ADDITIONAL SENDER CONTEXT: ${input.sender_context}` : ''}

RECIPIENT CONTEXT:
- ${contact.context}
- This is a real company doing genuine breakthrough work. Do NOT use generic partner language.

PARTNERSHIP TYPE: ${input.partnership_type}
Specific angle: ${partnershipContext[input.partnership_type] ?? ''}

TONE: ${input.tone} — ${toneGuide[input.tone] ?? ''}

Creative Liberation Engine KEY FACTS (use selectively, don't dump all):
- 92-package sovereign agentic OS — not a wrapper, not a chatbot, a full multi-agent execution runtime
- Already forward-declared "eon-bio" as a provider tier in our model registry (this is a real thing, not vaporware)
- model-arbitrage package: production-grade capability router that can route tasks to bio-emulation backends the moment an API exists
- spatial-intelligence package: VLM + depth pipeline + nexus connector — already thinks spatially
- memory package: VectorStore + competency tracking — the long-term memory their system likely lacks
- Built on Genkit + Google AI with Ollama local sovereign fallback
- Justin's background: operator building the intersection of AI orchestration + creative liberation

REQUIREMENTS:
- Subject line must be specific and non-generic
- Email body: 150-250 words max — they are busy people
- DO NOT pitch Creative Liberation Engine like a product pitch. Pitch it like a technical collaborator reaching out
- Include a concrete, specific ask (not "let's connect")
- linkedin_message is for a cold DM — 280 chars max, punchy
- send_ready: true if this email is good to send as-is, false if it needs Justin's personal voice added

Return the full structured output.`,
      output: { schema: EonPartnerDraftOutputSchema },
    });

    if (!output) throw new Error('[eon-partner-draft] AI output was null');

    // Ensure the contact fields are set from our map (not hallucinated)
    return {
      ...output,
      recipient_name: contact.name,
      recipient_email: contact.email,
    };
  },
);

export const EON_FLOWS = [eonResearchFlow, eonPartnerDraftFlow] as const;
