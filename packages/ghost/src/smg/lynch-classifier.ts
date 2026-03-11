/**
 * GHOST — Lynch Classifier
 *
 * Classifies SMG states using Kevin Lynch's 5 cognitive cartography elements:
 *   path | edge | district | node | landmark
 *
 * Uses heuristic-first classification with optional Genkit enhancement.
 * Falls back gracefully if Genkit is unavailable (offline mode).
 *
 * "The Image of the City" (1960) applied to digital topology.
 */

import type { LynchType } from './schema.js';

interface StateForClassification {
    id: string;
    url_pattern: string;
    url_example: string;
    dom_signature: string;   // Extracted: title + nav links + h1
    inbound_count: number;
    outbound_count: number;
    is_auth_required: boolean;
    elements: Array<{ action: string; label: string; selector: string }>;
}

interface ClassificationResult {
    state_id: string;
    lynch_type: LynchType;
    confidence: number;      // 0.0–1.0
    reasoning: string;
}

// ─── Heuristic Classifier ─────────────────────────────────────────────────────
// Fast, deterministic, no LLM calls required.
// Applied first. Genkit enhancement only runs if GENKIT_URL is set.

function classifyHeuristic(state: StateForClassification): ClassificationResult {
    const { url_pattern, dom_signature, inbound_count, outbound_count, is_auth_required, elements, id } = state;

    // EDGE: auth walls, errors, permission gates
    if (is_auth_required) {
        return { state_id: id, lynch_type: 'edge', confidence: 0.95, reasoning: 'Auth gate detected — boundary between public and authenticated space' };
    }

    const sig = dom_signature.toLowerCase();
    const url = url_pattern.toLowerCase();

    // EDGE: error pages, 404s, access denied
    if (/\b(404|403|error|not.?found|access.?denied|unauthorized)\b/.test(sig) ||
        /\/(404|403|error)\b/.test(url)) {
        return { state_id: id, lynch_type: 'edge', confidence: 0.92, reasoning: 'Error/boundary page — the edge of navigable territory' };
    }

    // LANDMARK: persistent shared elements across all pages (nav, footer, header)
    const isLandmark = elements.some(el =>
        /\b(nav|navigation|header|footer|menu|sidebar|logo|breadcrumb)\b/i.test(el.label) &&
        el.action === 'click'
    );
    // Landmarks appear on nearly every page (very high inbound count)
    if (isLandmark && inbound_count > 10) {
        return { state_id: id, lynch_type: 'landmark', confidence: 0.88, reasoning: 'Persistent navigation element across many states — a spatial anchor' };
    }

    // NODE: high-connectivity hub (homepage, search, feed)
    if (inbound_count >= 5 || outbound_count >= 8) {
        const isHub = /^(\/|\/home|\/search|\/feed|\/index|\/discover|\/explore)/.test(url) ||
            /\b(home|search|index|feed|explore|discover|trending)\b/.test(sig);
        if (isHub || (inbound_count >= 8 && outbound_count >= 5)) {
            return { state_id: id, lynch_type: 'node', confidence: 0.85, reasoning: `High-connectivity hub: ${inbound_count} inbound, ${outbound_count} outbound transitions` };
        }
    }

    // DISTRICT: functional sections with shared URL prefix
    const districtPatterns: { pattern: RegExp; label: string }[] = [
        { pattern: /\/(checkout|cart|order|payment|billing)/, label: 'Commerce district' },
        { pattern: /\/(forum|community|discuss|board|thread|post|comment)/, label: 'Community district' },
        { pattern: /\/(dashboard|account|profile|settings|preferences)/, label: 'Account district' },
        { pattern: /\/(docs|documentation|guide|tutorial|help|support|faq)/, label: 'Documentation district' },
        { pattern: /\/(admin|manage|cms|studio|editor|workspace)/, label: 'Administration district' },
        { pattern: /\/(article|blog|news|story|report|journal)/, label: 'Content district' },
    ];

    for (const { pattern, label } of districtPatterns) {
        if (pattern.test(url)) {
            return { state_id: id, lynch_type: 'district', confidence: 0.82, reasoning: `${label}: URL pattern indicates functional grouping` };
        }
    }

    // Default: PATH — navigable route between meaningful states
    return { state_id: id, lynch_type: 'path', confidence: 0.7, reasoning: 'Default: navigable route connecting states' };
}

// ─── Genkit-Enhanced Classifier ───────────────────────────────────────────────
// Sends batch of ambiguous states to Genkit for higher-accuracy classification.
// Only called for states with heuristic confidence < 0.8.

async function classifyWithGenkit(
    states: StateForClassification[],
    genkitUrl: string
): Promise<Map<string, LynchType>> {
    const prompt = `You are classifying website pages using Kevin Lynch's 5 cognitive cartography elements.

Lynch's 5 elements applied to web interfaces:
- "path": A navigable route or transition between pages (most pages are paths)
- "edge": A boundary — login walls, 404 errors, paywalls, access denied screens
- "district": A functional section with distinct identity — checkout flow, help center, admin panel
- "node": A high-connectivity hub — homepage, search page, main feed
- "landmark": A persistent element appearing across many states — main navigation, site header

Classify each page state:
${states.map((s, i) => `
[${i + 1}] State ID: ${s.id}
URL pattern: ${s.url_pattern}
DOM context: ${s.dom_signature.slice(0, 200)}
Inbound transitions: ${s.inbound_count}
Outbound transitions: ${s.outbound_count}
Auth required: ${s.is_auth_required}
`).join('\n')}

Return a JSON array: [{"id": "...", "lynch_type": "path|edge|district|node|landmark", "reasoning": "..."}]
Only return valid JSON. No markdown.`;

    try {
        const response = await fetch(`${genkitUrl}/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'googleai/gemini-2.0-flash',
                prompt,
                output: { format: 'json' },
            }),
            signal: AbortSignal.timeout(15000), // 15s timeout — fail fast
        });

        if (!response.ok) throw new Error(`Genkit responded ${response.status}`);

        const data = await response.json();
        const results: Array<{ id: string; lynch_type: LynchType; reasoning: string }> =
            JSON.parse(data.text ?? data.output ?? '[]');

        const map = new Map<string, LynchType>();
        for (const r of results) {
            if (r.id && r.lynch_type) {
                map.set(r.id, r.lynch_type);
            }
        }
        return map;
    } catch (err) {
        console.warn('[GHOST/LYNCH] Genkit classification failed, using heuristics only:', (err as Error).message);
        return new Map();
    }
}

// ─── LynchClassifier ─────────────────────────────────────────────────────────

export class LynchClassifier {
    private genkitUrl: string | null;
    private confidenceThreshold = 0.8;

    constructor(genkitUrl?: string) {
        this.genkitUrl = genkitUrl ?? process.env.GENKIT_URL ?? null;
    }

    /**
     * Classify a batch of states. Heuristics first, Genkit for ambiguous ones.
     * Returns a map of stateId → LynchType.
     */
    async classify(states: StateForClassification[]): Promise<Map<string, LynchType>> {
        const results = new Map<string, LynchType>();
        const needsLLM: StateForClassification[] = [];

        // Phase 1: Heuristic pass
        for (const state of states) {
            const heuristic = classifyHeuristic(state);
            results.set(state.id, heuristic.lynch_type);

            if (heuristic.confidence < this.confidenceThreshold && this.genkitUrl) {
                needsLLM.push(state);
            }
        }

        // Phase 2: LLM enhancement for ambiguous states
        if (needsLLM.length > 0 && this.genkitUrl) {
            console.log(`[GHOST/LYNCH] Sending ${needsLLM.length} ambiguous states to Genkit for enhanced classification`);
            const llmResults = await classifyWithGenkit(needsLLM, this.genkitUrl);
            for (const [id, type] of llmResults) {
                results.set(id, type);
            }
        }

        // Log summary
        const counts: Record<string, number> = {};
        for (const type of results.values()) {
            counts[type] = (counts[type] ?? 0) + 1;
        }
        console.log(`[GHOST/LYNCH] Classification complete:`, counts);

        return results;
    }
}
