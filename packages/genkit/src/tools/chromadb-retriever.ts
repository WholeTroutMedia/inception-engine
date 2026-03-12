/**
 * ChromaDB RAG Retriever â€” Project-Scoped
 *
 * Genkit retriever for semantic search against ChromaDB.
 * Supports BOTH global `cle_memory` collection AND
 * project-scoped collections (project_{projectId}) for
 * the CONTINUITY ENGINE â€” production-specific model training.
 *
 * Constitutional: Article X (Compound Learning), Article XX (Zero Day GTM)
 */

import { z } from 'genkit';
import { ai } from '../index.js';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const CHROMADB_URL = process.env.CHROMADB_URL || 'http://127.0.0.1:8000';
const GLOBAL_COLLECTION = process.env.CHROMADB_COLLECTION || 'cle_memory';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Resolve collection name: project-scoped if projectId provided, else global */
function resolveCollection(projectId?: string): string {
    if (projectId && projectId.trim()) {
        // Sanitize: lowercase, alphanumeric + underscore only
        const safe = projectId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
        return `project_${safe}`;
    }
    return GLOBAL_COLLECTION;
}

/** Ensure a collection exists, create it if not */
async function ensureCollection(name: string): Promise<string | null> {
    // Try GET first
    const getRes = await fetch(`${CHROMADB_URL}/api/v2/collections/${name}`);
    if (getRes.ok) {
        const col = (await getRes.json()) as { id?: string };
        return col.id ?? name;
    }

    // Create if missing
    const createRes = await fetch(`${CHROMADB_URL}/api/v2/collections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name,
            metadata: {
                created_by: 'creative_liberation_engine',
                created_at: new Date().toISOString(),
                collection_type: name.startsWith('project_') ? 'project_scoped' : 'global',
            },
        }),
    });

    if (!createRes.ok) {
        console.warn(`[CHROMADB] Failed to create collection "${name}": ${createRes.status}`);
        return null;
    }

    const created = (await createRes.json()) as { id?: string };
    console.log(`[CHROMADB] Created collection "${name}" (id: ${created.id})`);
    return created.id ?? name;
}

// ---------------------------------------------------------------------------
// Retriever
// ---------------------------------------------------------------------------

export const chromaRetriever = ai.defineRetriever(
    {
        name: 'cle/chromadb',
        configSchema: z.object({
            nResults: z.number().default(10).describe('Number of results to retrieve'),
            projectId: z.string().optional().describe(
                'Project scope for retrieval. If set, searches project_{projectId} collection only. ' +
                'Prevents cross-project memory leakage. Leave unset for global IE memory.'
            ),
            whereFilter: z.record(z.unknown()).optional().describe('Optional ChromaDB where metadata filter'),
        }),
    },
    async (query, config) => {
        const nResults = config?.nResults ?? 10;
        const queryText = typeof query === 'string' ? query : query.text;
        const collectionName = resolveCollection(config?.projectId);

        try {
            const collectionId = await ensureCollection(collectionName);
            if (!collectionId) {
                console.warn(`[CHROMADB] Collection "${collectionName}" unavailable`);
                return { documents: [] };
            }

            const body: Record<string, unknown> = {
                query_texts: [queryText],
                n_results: nResults,
                include: ['documents', 'metadatas', 'distances', 'ids'],
            };

            if (config?.whereFilter) {
                body.where = config.whereFilter;
            }

            const queryRes = await fetch(
                `${CHROMADB_URL}/api/v2/collections/${collectionId}/query`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                }
            );

            if (!queryRes.ok) {
                console.warn(`[CHROMADB] Query failed on "${collectionName}": ${queryRes.status}`);
                return { documents: [] };
            }

            const results = (await queryRes.json()) as { documents?: string[][]; ids?: string[][]; distances?: number[][]; metadatas?: Record<string, unknown>[][]; };

            const documents = (results.documents?.[0] || []).map(
                (doc: string, i: number) => ({
                    content: [{ text: doc }],
                    metadata: {
                        id: results.ids?.[0]?.[i],
                        distance: results.distances?.[0]?.[i],
                        collection: collectionName,
                        projectId: config?.projectId ?? 'global',
                        ...(results.metadatas?.[0]?.[i] || {}),
                    },
                })
            );

            console.log(
                `[CHROMADB] ðŸ“– ${documents.length} docs from "${collectionName}" for: "${queryText?.slice(0, 50)}..."`
            );
            return { documents };
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error);
            console.warn(`[CHROMADB] Connection failed: ${msg}`);
            return { documents: [] };
        }
    }
);

// ---------------------------------------------------------------------------
// Writer (for CONTINUITY ENGINE ingestion)
// ---------------------------------------------------------------------------

export interface ChromaWriteInput {
    texts: string[];
    metadatas?: Record<string, unknown>[];
    ids?: string[];
    projectId?: string;
}

/** Write documents into a project-scoped or global ChromaDB collection */
export async function chromaWrite(input: ChromaWriteInput): Promise<{ written: number; collection: string }> {
    const collectionName = resolveCollection(input.projectId);

    try {
        const collectionId = await ensureCollection(collectionName);
        if (!collectionId) {
            throw new Error(`Cannot write: collection "${collectionName}" unavailable`);
        }

        const ids = input.ids ?? input.texts.map((_, i) => `${collectionName}_${Date.now()}_${i}`);
        const metadatas = input.metadatas ?? input.texts.map(() => ({
            source: 'continuity_engine',
            ingested_at: new Date().toISOString(),
            projectId: input.projectId ?? 'global',
        }));

        const addRes = await fetch(`${CHROMADB_URL}/api/v2/collections/${collectionId}/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ documents: input.texts, ids, metadatas }),
        });

        if (!addRes.ok) {
            const errText = await addRes.text();
            throw new Error(`ChromaDB add failed: ${addRes.status} â€” ${errText}`);
        }

        console.log(`[CHROMADB] âœ… Wrote ${input.texts.length} docs to "${collectionName}"`);
        return { written: input.texts.length, collection: collectionName };
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error(`[CHROMADB] Write error: ${msg}`);
        throw error;
    }
}
