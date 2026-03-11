/**
 * @inception/forge — DeltaDetector
 *
 * The stop-measure brain. Decides when a live session snapshot is "different
 * enough" to warrant creating a new checkpoint — and enforces cost budgets.
 *
 * Design principles:
 * - Delta-gating: only checkpoint on perceptual change above threshold
 * - Cost budgets: max N checkpoints per session prevents runaway storage
 * - Zero-waste: if nothing meaningful changed, nothing gets written
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EntitySnapshot {
  id: string;
  x?: number;
  y?: number;
  z?: number;
  name?: string;
  [key: string]: unknown;
}

export interface DeltaResult {
  score: number;       // 0–1: 0 = identical, 1 = completely different
  significant: boolean;
  reason: string;
}

export interface BudgetStatus {
  session_id: string;
  checkpoint_count: number;
  max_checkpoints: number;
  budget_exhausted: boolean;
}

// ─── DeltaDetector ────────────────────────────────────────────────────────────

export class DeltaDetector {
  private readonly threshold: number;
  private readonly sessionBudgets = new Map<string, number>();
  private lastSnapshots = new Map<string, EntitySnapshot[]>();

  /**
   * @param threshold - 0–1 delta score required to trigger checkpoint (default: 0.15)
   */
  constructor(threshold: number = 0.15) {
    if (threshold < 0 || threshold > 1) {
      throw new RangeError(`DeltaDetector threshold must be 0–1, got ${threshold}`);
    }
    this.threshold = threshold;
  }

  /**
   * Evaluates current snapshot against the last known state for this session.
   * Updates internal state if significant.
   */
  evaluate(
    session_id: string,
    current: EntitySnapshot[]
  ): DeltaResult {
    const previous = this.lastSnapshots.get(session_id) ?? [];

    const result = this.computeDelta(current, previous);

    if (result.significant) {
      this.lastSnapshots.set(session_id, [...current]);
    }

    return result;
  }

  /**
   * Compute a normalized delta score between two entity snapshots.
   *
   * Scoring weights:
   * - Entity count change: 0.4 (adds/removals are high signal)
   * - Centroid movement: 0.4 (significant spatial shift)
   * - Identity change: 0.2 (different entity IDs)
   */
  computeDelta(
    current: EntitySnapshot[],
    previous: EntitySnapshot[]
  ): DeltaResult {
    // Empty → empty: no change
    if (current.length === 0 && previous.length === 0) {
      return { score: 0, significant: false, reason: 'both_empty' };
    }

    // Empty → non-empty or vice versa: maximum delta
    if (current.length === 0 || previous.length === 0) {
      return { score: 1, significant: true, reason: 'entity_count_zeroed' };
    }

    let score = 0;

    // ── Weight 1: Entity count delta (0.4) ────────────────────────────────
    const countDelta = Math.abs(current.length - previous.length) / Math.max(current.length, previous.length);
    score += countDelta * 0.4;

    // ── Weight 2: Centroid spatial movement (0.4) ──────────────────────────
    const centroidCurrent = this.centroid(current);
    const centroidPrevious = this.centroid(previous);
    const maxDim = 1000; // normalize against assumed coordinate space
    const dx = (centroidCurrent.x - centroidPrevious.x) / maxDim;
    const dy = (centroidCurrent.y - centroidPrevious.y) / maxDim;
    const centroidDelta = Math.min(1, Math.sqrt(dx * dx + dy * dy));
    score += centroidDelta * 0.4;

    // ── Weight 3: Identity overlap (0.2) ───────────────────────────────────
    const currentIds = new Set(current.map(e => e.id));
    const previousIds = new Set(previous.map(e => e.id));
    const intersection = [...currentIds].filter(id => previousIds.has(id)).length;
    const union = new Set([...currentIds, ...previousIds]).size;
    const idOverlap = union > 0 ? intersection / union : 1;
    const idDelta = 1 - idOverlap;
    score += idDelta * 0.2;

    // Clamp to [0, 1]
    const finalScore = Math.min(1, Math.max(0, score));
    const significant = finalScore >= this.threshold;

    return {
      score: finalScore,
      significant,
      reason: significant
        ? `delta=${finalScore.toFixed(3)} ≥ threshold=${this.threshold}`
        : `delta=${finalScore.toFixed(3)} < threshold=${this.threshold}`,
    };
  }

  /**
   * Check whether a session can still produce checkpoints within budget.
   */
  canCheckpoint(session_id: string, max_checkpoints: number): boolean {
    const count = this.sessionBudgets.get(session_id) ?? 0;
    return count < max_checkpoints;
  }

  /**
   * Record a checkpoint against the session budget.
   * Returns false if budget is already exhausted.
   */
  recordCheckpoint(session_id: string, max_checkpoints: number): boolean {
    const count = this.sessionBudgets.get(session_id) ?? 0;
    if (count >= max_checkpoints) return false;
    this.sessionBudgets.set(session_id, count + 1);
    return true;
  }

  /**
   * Get current budget status for a session.
   */
  getBudgetStatus(session_id: string, max_checkpoints: number): BudgetStatus {
    const checkpoint_count = this.sessionBudgets.get(session_id) ?? 0;
    return {
      session_id,
      checkpoint_count,
      max_checkpoints,
      budget_exhausted: checkpoint_count >= max_checkpoints,
    };
  }

  /**
   * Reset all state for a session (e.g., on session end).
   */
  resetSession(session_id: string): void {
    this.sessionBudgets.delete(session_id);
    this.lastSnapshots.delete(session_id);
  }

  /**
   * Clear all session state (e.g., on engine shutdown).
   */
  reset(): void {
    this.sessionBudgets.clear();
    this.lastSnapshots.clear();
  }

  // ─── Private Helpers ───────────────────────────────────────────────────────

  private centroid(entities: EntitySnapshot[]): { x: number; y: number } {
    if (entities.length === 0) return { x: 0, y: 0 };
    const sum = entities.reduce(
      (acc, e) => ({ x: acc.x + (e.x ?? 0), y: acc.y + (e.y ?? 0) }),
      { x: 0, y: 0 }
    );
    return { x: sum.x / entities.length, y: sum.y / entities.length };
  }
}
