/**
 * @cle/core — Session Bracket Types
 *
 * A SessionBracket defines the start state and desired end state of an AVERI
 * session. The AI fills the middle. This is constraint-driven generation applied
 * at the session level — instead of open-ended prompting, we bracket intent.
 *
 * Inspired by temporal bracketing in video generation: set keyframe A and
 * keyframe B, let the model interpolate intelligently. Applied here to the
 * full creative production workflow: raw capture → approved plan.
 *
 * Constitutional: Article XX (Zero wait — bracket pre-defines the terminal
 * condition so the agent never drifts indefinitely).
 */

// ── State Descriptors ────────────────────────────────────────────────────────

export type StartStateType = 'capture' | 'brief' | 'transcript' | 'ideation';
export type EndStateType   = 'plan' | 'spec' | 'brief' | 'design_contract' | 'handoff';

export interface BracketStartState {
  /** What kind of raw material this session is starting from. */
  type: StartStateType;
  /** The raw content — transcript text, brief paragraph, capture summary, etc. */
  content: string;
  /** ISO timestamp of when the start state was captured. */
  capturedAt: string;
}

export interface BracketEndState {
  /** What the session must produce to be considered complete. */
  type: EndStateType;
  /**
   * Human-readable description of the target output.
   * e.g. "A PLAN-ready spec with tasks, packages, and validation criteria."
   */
  targetDescription: string;
  /**
   * Optional JSON Schema name to validate the end state against.
   * If provided, the bracket is only marked 'closed' when the output matches.
   */
  targetSchema?: string;
}

// ── Session Bracket ──────────────────────────────────────────────────────────

export interface SessionBracket {
  /** UUID v4 — stable for the lifetime of this session. */
  sessionId: string;

  /** Where the session began. */
  startState: BracketStartState;

  /** Where the session must arrive. */
  endState: BracketEndState;

  /**
   * The intermediate steps taken by the agent to move from start to end.
   * Auto-populated on each generation turn. Each entry is a brief summary
   * of what was produced in that turn.
   * e.g. ["Clarified scope to 3 features", "Outlined 4 implementation files"]
   */
  intermediateSteps: string[];

  /** Session lifecycle state. */
  status: 'open' | 'filling' | 'closed' | 'abandoned';

  /** ISO — when this bracket was opened. */
  createdAt: string;

  /** ISO — when this bracket was last updated. */
  updatedAt: string;

  /**
   * ISO — when the session was closed (end state reached or abandoned).
   * Undefined while status is 'open' or 'filling'.
   */
  closedAt?: string;
}

// ── Bracket Progress Event ───────────────────────────────────────────────────

/**
 * Emitted by the AVERI chat flow on each generation turn when a bracket is active.
 * Used to update the bracket's intermediateSteps and status in Redis.
 */
export interface BracketProgressEvent {
  sessionId: string;
  stepSummary: string;
  endStateReached: boolean;
  updatedAt: string;
}
