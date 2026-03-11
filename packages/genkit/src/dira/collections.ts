/**
 * DIRA-01: ChromaDB Collection Setup for Production Cases
 *
 * Defines collection name and ensures the 'production_cases' collection
 * exists via the memory bus on first write. The collection stores structured
 * ProductionCase records using trigger+resolution as the embedded text.
 *
 * Source: IECR Google Doc Tab 8 — IE DIRAs + TOOLBOX
 */

import type { ProductionCase } from './types.js';
import { encodeForEmbedding, toChromaMetadata, PRODUCTION_CASES_COLLECTION } from './types.js';

// ─────────────────────────────────────────────────────────────────────────────
// COLLECTION CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

export { PRODUCTION_CASES_COLLECTION };

/** Episodic collection for DIRA summaries written by the context pager */
export const DIRA_EPISODIC_COLLECTION = 'dira_episodic' as const;



// ─────────────────────────────────────────────────────────────────────────────
// CHROMADB METADATA EXPORT (re-export for consumers)
// ─────────────────────────────────────────────────────────────────────────────

export { toChromaMetadata, encodeForEmbedding };

// ─────────────────────────────────────────────────────────────────────────────
// QUERY HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds a scribeRecall query optimised for DIRA auto-resolve lookups.
 * Encodes the incoming trigger as a semantic search query.
 */
export function buildAutoResolveQuery(trigger: string, workflow: string): string {
    return `Workflow: ${workflow}\nTrigger: ${trigger}`;
}

/**
 * Minimum similarity score for VERA to auto-apply a stored resolution
 * without human confirmation. Based on the HBR 70% productivity thesis.
 */
export const DIRA_AUTO_RESOLVE_THRESHOLD = 0.85;

/**
 * Maximum number of corpus matches to return in an auto-resolve lookup.
 */
export const DIRA_MAX_RECALL = 5;
