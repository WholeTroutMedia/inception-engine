/**
 * Media Blueprint — W3 Inception Blueprints
 *
 * NBC Nexus / BROADCAST Hive / god-prompt pattern.
 * Full creative production pipeline: brief intake → concept → production breakdown → rights clearance.
 *
 * Integrates with: god-prompt package, atlas-live, genmedia (Kling/Higgsfield)
 */

import type { Blueprint } from '../types.js';

export const mediaBlueprint: Blueprint = {
    id: 'media-v1',
    name: 'Creative Production Intelligence Engine',
    vertical: 'media',
    description:
        'AI-powered creative production pipeline: brief analysis, creative concept generation, production breakdown, and rights clearance. Built for broadcast networks, creative agencies, and content studios.',
    version: '1.0.0',
    tags: ['media', 'broadcast', 'creative', 'production', 'atlas-pattern'],

    domainModel: {
        preferred: 'gemini-2.0-flash', // Flash for broadcast speed requirements
        systemPrompt: `You are ATLAS, the creative director for a world-class broadcast network.
You think in story arcs, visual metaphors, and emotional journeys.
You understand production constraints (budget, schedule, talent availability, rights).
You balance creative ambition with practical deliverability.
Every concept you generate must be: (1) emotionally resonant, (2) technically feasible, (3) brand-consistent.
You always think about the audience first — who are they, what do they feel, what do they remember?`,
        knowledgeBase: 'inception-creative-references',
        temperature: 0.7, // Higher for creative tasks
    },

    agentTeam: ['ATLAS', 'AURORA', 'BOLT', 'LEX', 'IRIS'],

    reasoningTraces: [
        {
            step: 1,
            name: 'Brief Analysis',
            procedure:
                'Parse and decode the creative brief. Extract the core emotional truth, target audience, brand guardrails, and key performance indicators.',
            prompt: `Analyze the creative brief and extract the essential strategic context.
Output: (1) core emotional truth (one sentence), (2) target audience archetype with psychographic detail,
(3) brand guardrails (what we cannot do), (4) success metrics definition,
(5) competitive landscape (how is this category currently being expressed?),
(6) the single most important thing the audience should feel after experiencing this.`,
            tools: ['perplexity-search'],
            outputSchema: 'BriefAnalysis',
            requiredCapabilities: ['read:memory', 'call:external-apis'],
        },
        {
            step: 2,
            name: 'Creative Concept Generation',
            procedure:
                'Generate 3 distinct creative territories — each with a different emotional approach. Include visual language, narrative structure, and signature moment.',
            prompt: `Generate 3 creative territories for this brief. Each must be genuinely distinct.
For each territory: (1) territory name and one-sentence concept, (2) emotional arc (what changes in the audience),
(3) visual language (colors, movement, texture — specific and evocative),
(4) narrative structure (how the story unfolds), (5) the signature moment (what people will remember),
(6) talent/voice direction, (7) music/sound world.
Think like a Cannes-winning director.`,
            tools: ['god-prompt'],
            outputSchema: 'CreativeTerritories',
            requiredCapabilities: ['read:memory', 'execute:genkit'],
        },
        {
            step: 3,
            name: 'Production Breakdown',
            procedure:
                'For the selected creative territory, generate a full production breakdown: shoot days, locations, talent needs, VFX requirements, and timeline.',
            prompt: `Create a production breakdown for the selected creative concept.
Include: (1) shoot schedule (days × location), (2) key talent requirements,
(3) practical vs VFX split (percentage), (4) Kling/Higgsfield AI generation opportunities,
(5) post-production timeline, (6) deliverable formats (broadcast, social cuts, OOH),
(7) rough budget range (low/mid/high scenario), (8) critical path items (what can block everything).`,
            tools: ['atlas-live', 'genmedia'],
            outputSchema: 'ProductionBreakdown',
            requiredCapabilities: ['read:memory', 'execute:genkit'],
        },
        {
            step: 4,
            name: 'Rights & Clearance Check',
            procedure:
                'Identify all IP, music, talent, and location rights needed. Flag any clearance risks that could delay or block production.',
            prompt: `Perform a rights clearance analysis for the production plan.
Identify: (1) music rights needed (sync + master), (2) talent agreements required (SAG/AFTRA, likeness),
(3) location permits, (4) archive footage or stock needs, (5) brand/product clearances,
(6) social media content rights (UGC usage), (7) AI-generated content rights disclosures.
Flag anything rated HIGH RISK (timeline > 30 days to clear) immediately.`,
            tools: ['perplexity-search'],
            outputSchema: 'RightsClearanceReport',
            requiredCapabilities: ['read:memory', 'call:external-apis'],
        },
    ],

    simulationSteps: [
        {
            name: 'Brand Consistency Check',
            description: 'Verify creative concepts align with brand guardrails from brief',
            validationQuery: 'Do any concepts violate brand guardrails?',
            passCriteria: 'All concepts explicitly reference brand guardrails and show compliance',
            failAction: 'warn',
        },
        {
            name: 'Rights Risk Assessment',
            description: 'Ensure no HIGH RISK clearance items are buried in output',
            validationQuery: 'Are high-risk clearance items prominently surfaced?',
            passCriteria: 'HIGH RISK items appear in first section of RightsClearanceReport',
            failAction: 'warn',
        },
    ],

    constitutionalFlags: ['creative-rights-clearance', 'brand-safe'],
};
