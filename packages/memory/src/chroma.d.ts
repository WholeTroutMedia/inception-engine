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
import type { MemoryEntry } from './bus.js';
export declare class ChromaMemoryClient {
    private client;
    private embedFn;
    private collections;
    constructor();
    private getCollection;
    persist(entry: MemoryEntry): Promise<void>;
    recall(agentName: string, query: string, nResults?: number, category?: string, tags?: string[]): Promise<MemoryEntry[]>;
    crossAgentRecall(excludeAgent: string, query: string, nResults?: number, category?: string, tags?: string[]): Promise<MemoryEntry[]>;
    isOnline(): Promise<boolean>;
}
export declare const chromaMemory: ChromaMemoryClient;
