/**
 * Research Intent Detector
 *
 * Lightweight first-pass classifier: does this query require real-time web data?
 *
 * Two-stage detection for zero-waste cost profile:
 *  Stage 1 — Regex fast-path: obvious temporal/current-state keywords → instant (0ms, $0)
 *  Stage 2 — LLM slow-path:  ambiguous queries → gemini-2.0-flash classify (fast, cheap)
 *
 * Constitutional: Article XX (zero human wait), Article V (Transparency — citations returned)
 */

import { z } from 'genkit';
import { ai } from '../index.js';

// ─── TYPES ───────────────────────────────────────────────────────────────────

export const ResearchIntentSchema = z.object({
    needsResearch: z.boolean().describe('True if query requires real-time or post-training web data'),
    searchQuery: z.string().describe('Optimized search query for Perplexity — empty if needsResearch=false'),
    model: z.enum(['sonar', 'sonar-pro', 'sonar-deep-research'])
        .describe('Recommended Perplexity model tier'),
    confidence: z.number().min(0).max(1).describe('Confidence in the research need (0-1)'),
    reason: z.string().describe('Brief explanation of why research is (or is not) needed'),
    fastPath: z.boolean().describe('True if intent was detected via regex (no LLM cost)'),
});

export type ResearchIntent = z.infer<typeof ResearchIntentSchema>;

// ─── FAST-PATH REGEX ─────────────────────────────────────────────────────────
// Patterns that unambiguously signal real-time data need.
// These fire instantly with zero API cost — ordered from most to least specific.

const RESEARCH_TRIGGERS_HIGH = [
    // Explicit recency signals
    /\b(latest|current|newest|most recent|today|right now|as of|this week|this month|this year)\b/i,
    // Year anchors post-training
    /\b(2025|2026|2027)\b/,
    // Live data categories
    /\b(price|pricing|cost|fee|rate|tariff)\b.*\b(today|current|now|latest)\b/i,
    /\b(current|live|real.?time)\b.*\b(price|rate|stock|crypto|forex)\b/i,
    // News and events
    /\b(news|breaking|announced|released|launched|dropped|revealed)\b/i,
    /\b(who won|who is winning|election|vote|poll|score|standings)\b/i,
    // Version / release queries
    /\b(what version|which version|latest version|new release|changelog|update)\b/i,
    /\b(is .+ available|when does .+ (come out|release|launch|ship))\b/i,
    // API / documentation that changes
    /\b(api docs?|documentation for|how to use .+ api|endpoint for)\b/i,
    // Model / AI specifics that change fast
    /\b(gemini|claude|gpt|llama|mistral|anthropic|openai|deepmind)\b.*\b(pricing|model|version|release|api)\b/i,
];

const RESEARCH_TRIGGERS_LOW = [
    // May need research but less certain
    /\b(what is the|who is the|where is the|how much does|how many)\b/i,
];

const NO_RESEARCH_PATTERNS = [
    // Clearly architectural / historical / conceptual — no live data needed
    /\b(explain|define|describe|how does .+ work|what is the concept|history of|architecture of)\b/i,
    /\b(write me|generate|create|build|implement|refactor|debug)\b/i,
    /\b(creative liberation engine|averi|wtm|brainchild|genkit flow)\b/i,
];

/**
 * Stage 1: Regex fast-path classifier.
 * Returns a ResearchIntent if confident, or null to escalate to LLM.
 */
export function classifyResearchIntentFast(query: string): ResearchIntent | null {
    // Check negative signals first — if it's clearly a build/explain task, skip research
    for (const pat of NO_RESEARCH_PATTERNS) {
        if (pat.test(query)) {
            const r: ResearchIntent = {
                needsResearch: false,
                searchQuery: '',
                model: 'sonar',
                confidence: 0.9,
                reason: 'Query matches non-research pattern (conceptual/generative task)',
                fastPath: true,
            };
            return r;
        }
    }

    // High-confidence research triggers
    for (const pat of RESEARCH_TRIGGERS_HIGH) {
        if (pat.test(query)) {
            // Deep research for complex, multi-source queries
            const needsDeep = /\b(comprehensive|deep dive|full analysis|everything about|in depth)\b/i.test(query);
            const r: ResearchIntent = {
                needsResearch: true,
                searchQuery: query,
                model: needsDeep ? 'sonar-deep-research' : 'sonar-pro',
                confidence: 0.92,
                reason: 'Matched high-confidence temporal/live-data keyword pattern',
                fastPath: true,
            };
            return r;
        }
    }

    // Low-confidence triggers — escalate to LLM
    for (const pat of RESEARCH_TRIGGERS_LOW) {
        if (pat.test(query)) {
            return null; // LLM decides
        }
    }

    // No triggers at all → skip research
    const r: ResearchIntent = {
        needsResearch: false,
        searchQuery: '',
        model: 'sonar',
        confidence: 0.85,
        reason: 'No temporal or live-data signals detected',
        fastPath: true,
    };
    return r;
}

// ─── GENKIT FLOW ─────────────────────────────────────────────────────────────

export const detectResearchIntentFlow = ai.defineFlow(
    {
        name: 'detectResearchIntent',
        inputSchema: z.object({
            query: z.string().describe('User query to evaluate for research need'),
        }),
        outputSchema: ResearchIntentSchema,
    },
    async (input): Promise<ResearchIntent> => {
        // Stage 1 — Free regex fast-path
        const fastResult = classifyResearchIntentFast(input.query);
        if (fastResult !== null) {
            return fastResult;
        }

        // Stage 2 — LLM slow-path for ambiguous queries (flash = cheap + fast)
        try {
            const { output } = await ai.generate({
                model: 'googleai/gemini-2.5-flash',
                prompt: `You are a research intent classifier for an AI assistant.

Determine if the following user query requires fetching REAL-TIME or POST-TRAINING-CUTOFF web data to answer accurately.

Examples that NEED research:
- "What is the current price of GPT-4 API?" → YES (live pricing)
- "Who won the 2025 Super Bowl?" → YES (post-training event)
- "What are the latest Claude model release notes?" → YES (constantly changing)

Examples that do NOT need research:
- "Explain how transformers work" → NO (timeless concept)
- "Write a TypeScript function that sorts an array" → NO (generative task)
- "Describe the Creative Liberation Engine architecture" → NO (system-internal)

User query: "${input.query}"

Respond with JSON only. optimizedSearchQuery should be a clean search engine query derived from the user's message.`,
                output: {
                    schema: z.object({
                        needsResearch: z.boolean(),
                        optimizedSearchQuery: z.string(),
                        model: z.enum(['sonar', 'sonar-pro', 'sonar-deep-research']),
                        confidence: z.number(),
                        reason: z.string(),
                    }),
                },
            });

            if (!output) throw new Error('LLM output null');

            // Narrow the model string to the literal union required by the schema
            const VALID_MODELS = ['sonar', 'sonar-pro', 'sonar-deep-research'] as const;
            type ValidModel = typeof VALID_MODELS[number];
            const model: ValidModel = VALID_MODELS.includes(output.model as ValidModel)
                ? (output.model as ValidModel)
                : 'sonar-pro';

            return {
                needsResearch: output.needsResearch,
                searchQuery: output.optimizedSearchQuery,
                model,
                confidence: output.confidence,
                reason: output.reason,
                fastPath: false,
            };
        } catch (err) {
            // Constitutional fallback: never block a response over classification failure
            console.warn('[RESEARCH-INTENT] LLM classification failed, defaulting to no-research:', err);
            return {
                needsResearch: false,
                searchQuery: '',
                model: 'sonar',
                confidence: 0.5,
                reason: 'Classification failed — degraded to LLM-only mode',
                fastPath: false,
            };
        }
    }
);

