/**
 * @inception/memory — Public Package Index
 *
 * The Live Memory Bus for the Creative Liberation Engine.
 * Provides compound intelligence across all agents via:
 *   - Vector search (ChromaDB + nomic-embed-text, local Ollama)
 *   - JSONL fallback when ChromaDB is unavailable
 *   - Cross-agent recall (BOLT's learning surfaces in AURORA's next run)
 *   - SCRIBE pattern extraction (auto "The Why" after every execution)
 *
 * Constitutional Article VII: Every execution contributes to knowledge.
 */
export { MemoryBus, memoryBus, MemoryEntrySchema, MemoryQuerySchema, MemoryWriteSchema, } from './bus.js';
export type { PatternExtractor } from './bus.js';
export type { MemoryEntry, MemoryQuery, MemoryWrite, } from './bus.js';
export { ChromaMemoryClient, chromaMemory, } from './chroma.js';
export { HandoffService, handoffService, } from './handoff.js';
export type { HandoffState, HandoffPhase, HandoffSource, } from './handoff.js';
export { MemoryFileWatcher, memoryWatcher, } from './watcher.js';
