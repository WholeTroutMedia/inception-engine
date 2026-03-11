/**
 * ChromaDB Memory Provider
 * Replaces/augments the JSONL-based MemoryBus with vector search.
 *
 * Architecture:
 *   - Every agent execution writes to ChromaDB via nomic-embed-text embeddings
 *   - Pre-flight recall uses semantic vector similarity instead of tag matching
 *   - SCRIBE-extracted patterns are stored as metadata on each embedding
 *   - Enables cross-agent learning: BOLT's pattern helps AURORA's next run
 *
 * Constitutional Article VII: "Every execution contributes to knowledge"
 * This is what compound intelligence actually means.
 */
import { ChromaClient } from 'chromadb';
const CHROMA_URL = process.env['CHROMA_URL'] ?? 'http://localhost:8000';
const EMBED_URL = process.env['OLLAMA_URL'] ?? 'http://localhost:11434';
// ─── CHROMA EMBEDDING FUNCTION ───────────────────────────────────────────────
// Uses nomic-embed-text via Ollama — no external API calls for embeddings
class OllamaEmbeddingFunction {
    async generate(texts) {
        const embeddings = [];
        for (const text of texts) {
            const res = await fetch(`${EMBED_URL}/api/embeddings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: 'nomic-embed-text', prompt: text }),
            });
            if (!res.ok)
                throw new Error(`Embedding failed: ${res.statusText}`);
            const data = await res.json();
            embeddings.push(data.embedding);
        }
        return embeddings;
    }
}
// ─── CHROMA MEMORY CLIENT ────────────────────────────────────────────────────
export class ChromaMemoryClient {
    client;
    embedFn;
    collections = new Map();
    constructor() {
        const _chromaUrl = new URL(CHROMA_URL); this.client = new ChromaClient({ host: _chromaUrl.hostname, port: parseInt(_chromaUrl.port || (_chromaUrl.protocol === "https:" ? "443" : "8000"), 10), ssl: _chromaUrl.protocol === "https:" });
        this.embedFn = new OllamaEmbeddingFunction();
    }
    async getCollection(agentName) {
        const key = agentName.toLowerCase();
        if (this.collections.has(key))
            return this.collections.get(key);
        const collection = await this.client.getOrCreateCollection({
            name: `inception_${key}`,
            embeddingFunction: this.embedFn,
            metadata: {
                description: `Memory episodes for ${agentName}`,
                agent: agentName,
                created: new Date().toISOString(),
            },
        });
        this.collections.set(key, collection);
        return collection;
    }
    // ── WRITE: persist a memory episode with vector embedding ──────────────
    async persist(entry) {
        try {
            const collection = await this.getCollection(entry.agentName);
            const document = `Task: ${entry.task}\nOutcome: ${entry.outcome}${entry.pattern ? `\nPattern: ${entry.pattern}` : ''}`;
            await collection.upsert({
                ids: [entry.id],
                documents: [document],
                metadatas: [{
                    agentName: entry.agentName,
                    timestamp: entry.timestamp,
                    task: entry.task.slice(0, 500),
                    outcome: entry.outcome.slice(0, 500),
                    pattern: entry.pattern ?? '',
                    tags: entry.tags.join(','),
                    sessionId: entry.sessionId,
                    success: String(entry.success),
                    durationMs: String(entry.durationMs ?? 0),
                }],
            });
            console.log(`[CHROMA] 💾 ${entry.agentName} → inception_${entry.agentName.toLowerCase()} | ${entry.id.slice(0, 8)}`);
        }
        catch (err) {
            // Non-fatal — JSONL fallback in MemoryBus still runs
            console.warn(`[CHROMA] ⚠️ Persist failed (JSONL fallback active): ${String(err).slice(0, 100)}`);
        }
    }
    // ── READ: semantic similarity search across agent's episodes ───────────
    async recall(agentName, query, nResults = 5, category, tags) {
        try {
            const collection = await this.getCollection(agentName);
            const count = await collection.count();
            if (count === 0)
                return [];
            const conditions = [];
            if (category)
                conditions.push({ tags: { $contains: category } });
            if (tags && tags.length > 0) {
                for (const t of tags)
                    conditions.push({ tags: { $contains: t } });
            }
            let where = undefined;
            if (conditions.length === 1) {
                where = conditions[0];
            }
            else if (conditions.length > 1) {
                where = { $and: conditions };
            }
            const results = await collection.query({
                queryTexts: [query],
                nResults: Math.min(nResults, count),
                ...(where ? { where } : {}),
            });
            return (results.metadatas[0] ?? []).map((meta, i) => ({
                id: String(results.ids[0]?.[i] ?? ''),
                agentName: String(meta?.['agentName'] ?? agentName),
                timestamp: String(meta?.['timestamp'] ?? ''),
                task: String(meta?.['task'] ?? ''),
                outcome: String(meta?.['outcome'] ?? ''),
                pattern: meta?.['pattern'] ? String(meta['pattern']) : undefined,
                tags: String(meta?.['tags'] ?? '').split(',').filter(Boolean),
                sessionId: String(meta?.['sessionId'] ?? ''),
                success: meta?.['success'] === 'true',
                durationMs: Number(meta?.['durationMs'] ?? 0),
            }));
        }
        catch {
            return [];
        }
    }
    // ── CROSS-AGENT RECALL: what did OTHER agents learn about this topic? ──
    // This is the compound intelligence multiplier.
    async crossAgentRecall(excludeAgent, query, nResults = 3, category, tags) {
        const allAgents = [
            'AURORA', 'BOLT', 'COMET', 'VERA', 'IRIS', 'KEEPER',
            'ARCH', 'CODEX', 'LEX', 'COMPASS', 'RELAY', 'SENTINEL',
            'ATLAS', 'OMNIMEDIA',
        ].filter(a => a !== excludeAgent);
        const crossResults = await Promise.allSettled(allAgents.map(agent => this.recall(agent, query, 2, category, tags)));
        return crossResults
            .filter((r) => r.status === 'fulfilled')
            .flatMap(r => r.value)
            .slice(0, nResults);
    }
    // ── HEALTH ──────────────────────────────────────────────────────────────
    async isOnline() {
        try {
            await this.client.heartbeat();
            return true;
        }
        catch {
            return false;
        }
    }
}
// Singleton — shared across all agents in the same process
export const chromaMemory = new ChromaMemoryClient();
