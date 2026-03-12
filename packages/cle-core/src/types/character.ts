/**
 * @cle/core — Character Context Types
 *
 * The CharacterContext is the identity primitive for any persistent entity
 * across generative flows. Introduced for The Transmission but designed as
 * a universal primitive — any flow that generates narrative, dialogue, or
 * attributed artifacts can carry and evolve CharacterContext objects.
 *
 * Design principle: identity persistence = narrative viability.
 * A system that can remember who said what, from where, with what voice,
 * produces storytelling. One that can't produces isolated outputs.
 */

// ── Core Character Identity ──────────────────────────────────────────────────

export interface CharacterContext {
  /** UUID v4 — stable across all epochs and sessions. Never regenerated. */
  id: string;

  /**
   * The character's transmission callsign or attributed identifier.
   * e.g. "STATION-7 OPERATOR", "ARCHIVIST MELL", "FIELD AGENT CROSS"
   * Must be consistent across all artifact appearances.
   */
  callsign: string;

  /** The faction, group, or institutional affiliation this character belongs to. */
  faction: string;

  /**
   * Behavioral voice descriptor — drives how this character's output reads.
   * These are intentionally qualitative and model-interpretable.
   * e.g. "terse, clipped, military" | "fragmented, emotional, exhausted"
   *      | "clinical, numerical, detached" | "conspiratorial, urgent"
   */
  voiceSignature: string;

  /** Geographic/spatial references this character is associated with. */
  knownLocations: string[];

  /**
   * The character's last known narrative position — updated on every appearance.
   * Written as a brief summary: "Was at Outpost 7 when the signal dropped.
   * Last transmission indicated movement toward the Exclusion Zone."
   */
  narrativeState: string;

  /** World epoch when this character was first introduced. */
  firstAppearance: number;

  /** Total number of artifacts this character has appeared in. */
  appearanceCount: number;

  /** Semantic tags for cross-referencing and character archive filtering. */
  tags: string[];
}

// ── Character Mutation ───────────────────────────────────────────────────────

/**
 * Returned by generative flows after each appearance.
 * The daemon merges these updates back into the authoritative CharacterContext.
 * Only fields that changed should be included.
 */
export type CharacterContextUpdate = Partial<
  Pick<CharacterContext,
    | 'narrativeState'
    | 'knownLocations'
    | 'faction'
    | 'tags'
  >
> & {
  id: string; // Always required to identify which character to update
  appearanceCount?: number; // Daemon increments this; flow may override
};

// ── Character Registry ───────────────────────────────────────────────────────

/** A keyed map of all characters known to the engine. Redis-persisted. */
export type CharacterRegistry = Record<string, CharacterContext>;

// ── Character Selection Hint ─────────────────────────────────────────────────

/**
 * Guidance passed to flow prompts about which characters are "hot" —
 * i.e., recently active and likely to appear in the next artifact.
 */
export interface CharacterSelectionHint {
  /** Characters that MUST appear in this artifact (at least one). */
  prioritize: string[]; // character IDs
  /** Characters that should NOT appear (recently overrepresented). */
  suppress: string[];   // character IDs
  /** Whether the flow may introduce an entirely new character. */
  allowNew: boolean;
}
