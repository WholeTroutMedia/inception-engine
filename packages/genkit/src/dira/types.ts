/**
 * DIRA-01: ProductionCase schema + ChromaDB collection definition
 *
 * The DIRA (Disruption, Incident, Resolution, Audit) engine provides
 * autonomous exception resolution for production workflows.
 *
 * Source: IECR Google Doc Tab 8 — IE DIRAs + TOOLBOX
 */

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type ProductionCaseType =
    | 'exception'       // Unhandled error in pipeline
    | 'quality'         // Output quality failure (QA gate rejection)
    | 'distribution'    // Delivery/publish failure (CDN, Synology, etc.)
    | 'curation'        // Content curation issue (missing asset, wrong format)
    | 'performance'     // Latency / timeout in pipeline step
    | 'coordination';   // Agent routing conflict

export type ProductionCaseOutcome =
    | 'auto-resolved'   // VERA matched corpus (>0.85 similarity) and applied resolution
    | 'escalated'       // Required human decision
    | 'skipped'         // Non-critical, deferred
    | 'partial';        // Partially resolved — follow-up needed

export interface ProductionCase {
    /** Unique case ID (format: DIRA-{timestamp}-{random}) */
    id: string;
    /** Exception category */
    type: ProductionCaseType;
    /** Which workflow step generated this case */
    workflow: string;
    /** What triggered the exception (error message, QA report, etc.) */
    trigger: string;
    /** Resolution applied (human or auto) */
    resolution: string;
    /** Time from trigger to resolution (ms) */
    timeToResolve?: number;
    /** Human decision if escalated (e.g., override, retry, skip) */
    humanDecision?: string;
    /** Final outcome */
    outcome: ProductionCaseOutcome;
    /** Whether auto-resolved by VERA (vs human) */
    autoResolved: boolean;
    /** Similarity score of the corpus match (if auto-resolved) */
    matchSimilarity?: number;
    /** Reference case ID that was matched (if auto-resolved) */
    matchedCaseId?: string;
    /** Searchable tags for ChromaDB retrieval */
    tags: string[];
    /** ISO timestamp */
    createdAt: string;
    /** Which agent or service created this case */
    reportedBy: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// FACTORY
// ─────────────────────────────────────────────────────────────────────────────

export function createProductionCase(
    partial: Omit<ProductionCase, 'id' | 'createdAt' | 'autoResolved'>
        & { autoResolved?: boolean }
): ProductionCase {
    return {
        id: `DIRA-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        createdAt: new Date().toISOString(),
        autoResolved: false,
        ...partial,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// CHROMADB COLLECTION DEFINITION
// ─────────────────────────────────────────────────────────────────────────────

export const PRODUCTION_CASES_COLLECTION = 'production_cases' as const;

/**
 * Fields to embed in ChromaDB for semantic similarity search.
 * We embed trigger + resolution so VERA can match new triggers against
 * previously solved ones.
 */
export function encodeForEmbedding(c: ProductionCase): string {
    return [
        `Type: ${c.type}`,
        `Workflow: ${c.workflow}`,
        `Trigger: ${c.trigger}`,
        `Resolution: ${c.resolution}`,
        `Outcome: ${c.outcome}`,
        c.tags.length > 0 ? `Tags: ${c.tags.join(', ')}` : '',
    ].filter(Boolean).join('\n');
}

/**
 * Metadata stored alongside the vector in ChromaDB.
 * (ChromaDB metadata must be flat key-value, no nested objects.)
 */
export function toChromaMetadata(c: ProductionCase): Record<string, string | number | boolean> {
    return {
        id: c.id,
        type: c.type,
        workflow: c.workflow,
        outcome: c.outcome,
        autoResolved: c.autoResolved,
        matchSimilarity: c.matchSimilarity ?? 0,
        timeToResolve: c.timeToResolve ?? 0,
        reportedBy: c.reportedBy,
        createdAt: c.createdAt,
        tags: c.tags.join(','),
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// DIRA → SCRIBE CONTRACT
// ─────────────────────────────────────────────────────────────────────────────

/** Scribe MemoryCategory type (mirrors scribe.ts enum) */
type ScribeCategory = 'decision' | 'pattern' | 'preference' | 'fact' | 'bug-fix' | 'session';
type ScribeImportance = 'low' | 'medium' | 'high' | 'critical';

/** Maps DIRA ProductionCaseType to the appropriate Scribe MemoryCategory */
const DIRA_TYPE_TO_SCRIBE_CATEGORY: Record<ProductionCaseType, ScribeCategory> = {
  exception: 'bug-fix',
  quality: 'pattern',
  distribution: 'decision',
  curation: 'pattern',
  performance: 'fact',
  coordination: 'decision',
};

/** Maps DIRA outcome to Scribe importance level */
function outcomeToImportance(outcome: ProductionCaseOutcome, autoResolved: boolean): ScribeImportance {
  if (outcome === 'escalated') return 'high';
  if (outcome === 'partial') return 'medium';
  if (autoResolved) return 'medium';
  return 'low';
}

/**
 * Unified mapper: ProductionCase → scribeRemember input.
 * This is the single source of truth for how DIRA cases are stored in VERA memory.
 * Use this in auto-resolve.ts instead of inline tag/category construction.
 */
export interface ScribeRememberInput {
  content: string;
  category: ScribeCategory;
  importance: ScribeImportance;
  tags: string[];
  agentName: string;
  skipGate: boolean;
}

export function productionCaseToScribeInput(
  c: ProductionCase,
  opts?: { agentName?: string; skipGate?: boolean }
): ScribeRememberInput {
  return {
    content: [
      `DIRA Case ${c.id}: [${c.type}] ${c.workflow}`,
      `Trigger: ${c.trigger}`,
      `Resolution: ${c.resolution}`,
      `Outcome: ${c.outcome}`,
      c.matchedCaseId ? `Matched: ${c.matchedCaseId}` : '',
      c.matchSimilarity ? `Similarity: ${(c.matchSimilarity * 100).toFixed(1)}%` : '',
    ].filter(Boolean).join('\n'),
    category: DIRA_TYPE_TO_SCRIBE_CATEGORY[c.type],
    importance: outcomeToImportance(c.outcome, c.autoResolved),
    tags: [
      `dira-${c.type}`,
      `dira-${c.outcome}`,
      c.workflow,
      c.autoResolved ? 'auto-resolved' : 'human-required',
      ...c.tags,
    ],
    agentName: opts?.agentName ?? 'VERA-DIRA',
    skipGate: opts?.skipGate ?? true,
  };
}
