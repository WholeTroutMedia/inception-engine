/**
 * GHOST — SMG Schema
 *
 * State Machine Graph (SMG) — the cognitive map of a GUI environment.
 * Inspired by hippocampal place-cell topology research (O'Keefe, 1971)
 * and Kevin Lynch's environmental cartography (The Image of the City, 1960).
 *
 * Every site, app, or native experience GHOST crawls becomes a persistent
 * SMGGraph: a navigable, human-readable, agent-executable world model.
 */

import { z } from 'zod';

// ─── Lynch Classification ─────────────────────────────────────────────────────
// Matches Kevin Lynch's 5 elements of cognitive cartography.
// Applied to digital environments: district = functional section,
// landmark = persistent nav element, node = high-connectivity hub.

export const LynchTypeSchema = z.enum([
    'path',       // A navigation flow between pages — the routes users travel
    'edge',       // A boundary: auth wall, paywall, 404, permission gate
    'district',   // A functional section: checkout, forum, dashboard, profile
    'node',       // A high-connectivity hub: homepage, search, feed index
    'landmark',   // A persistent anchor: nav bar, login button, site header
]);
export type LynchType = z.infer<typeof LynchTypeSchema>;

// ─── SMG Element ──────────────────────────────────────────────────────────────
// A single interactive element within a page state.
// Selectors ARE the wires of the world model.

export const SMGElementSchema = z.object({
    id: z.string(),                   // Stable hash: sha1(stateId + selector)
    selector: z.string(),             // Playwright CSS/ARIA: 'button[aria-label="Submit"]'
    aria_selector: z.string().optional(), // ARIA role-based fallback
    text_content: z.string().optional(), // Visible text for human readability
    action: z.enum(['click', 'fill', 'navigate', 'read', 'scroll', 'hover']),
    label: z.string(),                // Human-readable: "Submit comment button"
    transition_to: z.string().nullable(), // SMGState.id after action, null if unmapped
    input_required: z.boolean().default(false), // Does this element need typed input?
    input_placeholder: z.string().optional(),    // Hint for what to type
    validated_at: z.string(),         // ISO — when selector was last confirmed working
    staleness_score: z.number().min(0).max(1).default(0), // 0 = fresh, 1 = likely broken
});
export type SMGElement = z.infer<typeof SMGElementSchema>;

// ─── SMG State (Place Field) ──────────────────────────────────────────────────
// A single node in the cognitive map. Analogous to a hippocampal place field:
// the agent "knows it's here" when the visual_hash and url_pattern match.

export const SMGStateSchema = z.object({
    id: z.string(),                   // Stable hash: sha1(domain + url_pattern)
    label: z.string(),                // "Reddit front page — feed of posts"
    url_pattern: z.string(),          // Regex or template: /r/{subreddit}/
    url_example: z.string(),          // Actual URL captured during crawl
    lynch_type: LynchTypeSchema,
    visual_hash: z.string(),          // Perceptual hash for staleness detection
    dom_signature: z.string(),        // Lightweight DOM fingerprint (title + h1 + nav)
    elements: z.array(SMGElementSchema),
    inbound_count: z.number().default(0),  // # transitions leading INTO this state
    outbound_count: z.number().default(0), // # transitions leading OUT of this state
    last_crawled: z.string(),         // ISO timestamp
    crawl_depth: z.number(),          // BFS depth from root
    is_auth_required: z.boolean().default(false),
    metadata: z.record(z.unknown()).default({}), // Arbitrary per-state data
});
export type SMGState = z.infer<typeof SMGStateSchema>;

// ─── SMG Transition (Synaptic Connection) ─────────────────────────────────────
// The edge between two place fields. Records both the action that caused it
// and the observed result — the basis of predictive coding in the validator.

export const SMGTransitionSchema = z.object({
    id: z.string(),
    from_state: z.string(),           // SMGState.id
    to_state: z.string(),             // SMGState.id (or '__unknown__' if unmapped)
    element_id: z.string(),           // SMGElement.id that triggered this
    action: z.string(),               // 'click', 'fill', 'navigate'
    input_value: z.string().optional(), // For 'fill' actions
    frequency: z.number().default(1),  // Times this transition has been observed
    last_validated: z.string(),
    success_rate: z.number().min(0).max(1).default(1.0),
});
export type SMGTransition = z.infer<typeof SMGTransitionSchema>;

// ─── SMG Graph ────────────────────────────────────────────────────────────────
// The complete world model for one domain/app.
// This is the hippocampus — the persistent spatial memory.

export const SMGGraphSchema = z.object({
    id: z.string(),                   // sha1(domain + platform)
    domain: z.string(),               // 'reddit.com' or 'com.reddit.frontpage'
    platform: z.enum(['web', 'android', 'ios', 'visionos']),
    version: z.number().default(1),   // Increments on each full re-crawl
    crawled_at: z.string(),
    coverage_score: z.number().min(0).max(1), // % of reachable states mapped
    total_states: z.number(),
    total_transitions: z.number(),
    crawl_depth_max: z.number(),
    states: z.record(SMGStateSchema),       // keyed by SMGState.id
    transitions: z.array(SMGTransitionSchema),
    entry_state_id: z.string(),             // Starting point (homepage / launch activity)
    landmark_ids: z.array(z.string()),      // SMGState.ids with lynch_type = 'landmark'
    district_clusters: z.record(z.array(z.string())), // district_label → [stateId, ...]
    staleness_score: z.number().min(0).max(1).default(0), // Graph-wide staleness
    metadata: z.record(z.unknown()).default({}),
});
export type SMGGraph = z.infer<typeof SMGGraphSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

import { createHash } from 'crypto';

export function stateId(domain: string, urlPattern: string): string {
    return createHash('sha1').update(`${domain}::${urlPattern}`).digest('hex').slice(0, 16);
}

export function elementId(stateId: string, selector: string): string {
    return createHash('sha1').update(`${stateId}::${selector}`).digest('hex').slice(0, 16);
}

export function graphId(domain: string, platform: string): string {
    return createHash('sha1').update(`${domain}::${platform}`).digest('hex').slice(0, 16);
}

export function transitionId(fromState: string, elementId: string): string {
    return createHash('sha1').update(`${fromState}::${elementId}::${Date.now()}`).digest('hex').slice(0, 16);
}
