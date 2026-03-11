/**
 * SCRIBE Memory Tool
 *
 * Genkit tool definition for querying AND writing to the SCRIBE memory system.
 * Allows models to autonomously access episodic, semantic, and procedural memory
 * backed by the project-scoped ChromaDB collections.
 *
 * Memory namespacing:
 *   episodic   → project_scribe_episodic   (what happened — events, sessions)
 *   semantic   → project_scribe_semantic   (what things mean — decisions, patterns)
 *   procedural → project_scribe_procedural (how things work — workflows, protocols)
 *
 * Constitutional: Article X (Compound Learning)
 */

import { z } from 'genkit';
import { ai } from '../index.js';
import { chromaRetriever, chromaWrite } from './chromadb-retriever.js';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const MemoryType = z.enum(['episodic', 'semantic', 'procedural', 'all']);

const MemoryQueryInput = z.object({
    query: z.string().describe('The search query for memory retrieval'),
    memoryType: MemoryType
        .default('all')
        .describe('Type of memory to search'),
    limit: z.number().default(5).describe('Maximum number of results'),
    projectId: z.string().optional().describe(
        'Optional project scope — retrieves only from that project\'s SCRIBE collections. ' +
        'Leave unset for global SCRIBE memory.'
    ),
});

const MemoryResult = z.object({
    content: z.string(),
    memoryType: z.string(),
    relevance: z.number(),
    timestamp: z.string(),
    source: z.string().optional(),
});

const MemoryQueryOutput = z.object({
    results: z.array(MemoryResult),
    totalFound: z.number(),
    queryTimeMs: z.number(),
});

const MemoryWriteInput = z.object({
    content: z.string().describe('Memory content to store'),
    memoryType: z.enum(['episodic', 'semantic', 'procedural']).describe('Memory classification'),
    source: z.string().optional().describe('Origin agent or session ID'),
    projectId: z.string().optional().describe('Project scope for this memory entry'),
    tags: z.array(z.string()).default([]).describe('Searchable tags'),
});

const MemoryWriteOutput = z.object({
    written: z.boolean(),
    collection: z.string(),
    id: z.string(),
});

// ---------------------------------------------------------------------------
// Collection naming
// ---------------------------------------------------------------------------

function scribeCollection(memoryType: string, projectId?: string): string {
    const prefix = projectId
        ? `project_${projectId.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}`
        : 'global';
    return `${prefix}_scribe_${memoryType}`;
}

// ---------------------------------------------------------------------------
// Query Tool
// ---------------------------------------------------------------------------

export const scribeMemoryTool = ai.defineTool(
    {
        name: 'scribeMemory',
        description:
            'Query the SCRIBE episodic/semantic/procedural memory system. ' +
            'Use this to recall past decisions, learned patterns, or procedural knowledge.',
        inputSchema: MemoryQueryInput,
        outputSchema: MemoryQueryOutput,
    },
    async (input) => {
        const startTime = Date.now();
        console.log(`[SCRIBE] 🔎 Query: "${input.query.slice(0, 60)}" (type: ${input.memoryType})`);

        const typesToSearch = input.memoryType === 'all'
            ? ['episodic', 'semantic', 'procedural']
            : [input.memoryType];

        const allResults: z.infer<typeof MemoryResult>[] = [];

        for (const mt of typesToSearch) {
            try {
                const collection = scribeCollection(mt, input.projectId);
                const documents = await ai.retrieve({
                    retriever: chromaRetriever,
                    query: input.query,
                    options: {
                        nResults: Math.ceil((input.limit ?? 5) / typesToSearch.length),
                        projectId: collection,
                    },
                });

                for (const doc of documents) {
                    const meta = doc.metadata ?? {};
                    allResults.push({
                        content: doc.content[0]?.text ?? '',
                        memoryType: mt,
                        relevance: typeof meta['distance'] === 'number' ? 1 - (meta['distance'] as number) : 0.5,
                        timestamp: typeof meta['ingested_at'] === 'string' ? meta['ingested_at'] as string : new Date().toISOString(),
                        source: typeof meta['source'] === 'string' ? meta['source'] as string : undefined,
                    });
                }
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                console.warn(`[SCRIBE] Could not query ${mt} memory: ${msg}`);
            }
        }

        // Sort by relevance descending
        allResults.sort((a, b) => b.relevance - a.relevance);
        const trimmed = allResults.slice(0, input.limit ?? 5);

        console.log(`[SCRIBE] ✅ Found ${trimmed.length} memories in ${Date.now() - startTime}ms`);
        return {
            results: trimmed,
            totalFound: allResults.length,
            queryTimeMs: Date.now() - startTime,
        };
    }
);

// ---------------------------------------------------------------------------
// Write Tool (SCRIBE commit)
// ---------------------------------------------------------------------------

export const scribeWriteTool = ai.defineTool(
    {
        name: 'scribeWrite',
        description:
            'Write a new entry to the SCRIBE memory system. ' +
            'Use this to commit learned patterns, decisions, or session events for future recall.',
        inputSchema: MemoryWriteInput,
        outputSchema: MemoryWriteOutput,
    },
    async (input) => {
        const collection = scribeCollection(input.memoryType, input.projectId);
        const id = `scribe_${input.memoryType}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const metadata = {
            memoryType: input.memoryType,
            source: input.source ?? 'unknown',
            projectId: input.projectId ?? 'global',
            tags: input.tags.join(','),
            ingested_at: new Date().toISOString(),
        };

        try {
            await chromaWrite({
                texts: [input.content],
                metadatas: [metadata],
                ids: [id],
                projectId: collection, // write directly to named scribe collection
            });
            console.log(`[SCRIBE] 📝 Committed ${input.memoryType} memory → "${collection}"`);
            return { written: true, collection, id };
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`[SCRIBE] Write failed: ${msg}`);
            return { written: false, collection, id };
        }
    }
);
