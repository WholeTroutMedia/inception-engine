/**
 * @cle/core — Engine World State Types
 *
 * The EngineWorldState is the living nervous system of the Creative Liberation Engine.
 * Every significant generative event writes to it. Every flow reads from it.
 * It is the accumulating creative intelligence that makes each generation
 * smarter than the last.
 *
 * This replaces the Transmission-specific TransmissionWorldState as the
 * canonical engine-wide context object. The Transmission daemon reads from
 * EngineWorldState and writes its artifact-specific fields back.
 *
 * Constitutional: Article VII (Knowledge Compounding) — every execution
 * contributes to the shared context of the engine.
 */

// ── World State Event ────────────────────────────────────────────────────────

export type WorldStateEventType =
  | 'generation'      // Any AI output completed
  | 'session_open'    // A new user session began
  | 'session_close'   // A session was completed
  | 'artifact'        // A Transmission artifact was generated
  | 'validation'      // A VALIDATE or kstrigd review completed
  | 'ship'            // Code was committed and pushed
  | 'critique_retry'  // kstrigd critic loop triggered a silent retry
  | 'ifs_fail'        // Intent Fidelity Score fell below threshold
  | 'character_new'   // A new CharacterContext was introduced
  | 'model_route'     // A model routing override was applied;

export interface WorldStateEvent {
  /** The type of event that occurred. */
  type: WorldStateEventType;
  /** A brief, human-readable summary of what happened. */
  summary: string;
  /** Semantic tags to weight the world state's dominant themes. */
  tags: string[];
  /** ISO timestamp of the event. */
  at: string;
  /** Optional session ID that triggered this event. */
  sessionId?: string;
}

// ── Engine World State ───────────────────────────────────────────────────────

export interface EngineWorldState {
  /**
   * Monotonic counter. Increments on every WorldStateEvent commit.
   * The Transmission uses this as its worldEpoch.
   */
  epoch: number;

  /** ISO — when the engine world state was first initialized. */
  startedAt: string;

  /** ISO — last event commit time. */
  lastUpdated: string;

  /**
   * The thematic undercurrent driving recent generative output.
   * Updated via tag frequency analysis on the last 10 events.
   * e.g. "temporal-composition", "character-persistence", "sovereignty"
   */
  dominantIntent: string;

  /**
   * Number of unique sessions that have been opened.
   * Source of truth for the Café Workflow progress metric.
   */
  sessionCount: number;

  /** Number of generative outputs produced this epoch. */
  generationCount: number;

  /** Total kstrigd critic loop retries triggered across all sessions. */
  critiqueRetryCount: number;

  /** Running average Intent Fidelity Score across all scored outputs. */
  averageIFS: number;

  /**
   * The IDs of currently active CharacterContext objects.
   * Characters are "active" if they appeared in the last 5 artifacts.
   */
  activeCharacters: string[];

  /** The last 10 WorldStateEvents, most recent first. */
  recentEvents: WorldStateEvent[];

  /**
   * Transmission-specific fields (populated by the Transmission daemon).
   * Null when no Transmission session is running.
   */
  transmission: {
    epoch: number;
    artifactCount: number;
    signalStrength: number;
    activeFactions: string[];
    hotLocations: string[];
    readerCount: number;
    readerMemory: string[];
  } | null;
}

// ── World State Patch ────────────────────────────────────────────────────────

/**
 * A minimal, partial update to the EngineWorldState.
 * `WorldStateManager.commit()` applies a WorldStateEvent and computes
 * derived field updates automatically — this type represents the
 * result of that computation.
 */
export type EngineWorldStatePatch = Partial<
  Omit<EngineWorldState, 'epoch' | 'startedAt' | 'recentEvents'>
> & {
  eventToAppend: WorldStateEvent;
};
