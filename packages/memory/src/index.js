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
// Core MemoryBus — the primary interface for all agents
export { MemoryBus, memoryBus, MemoryEntrySchema, MemoryQuerySchema, MemoryWriteSchema, } from './bus.js';
// ChromaDB client — direct access for advanced use cases
export { ChromaMemoryClient, chromaMemory, } from './chroma.js';
// TRINITY-1 Protocol — HandoffService (W1)
export { HandoffService, handoffService, } from './handoff.js';
// MemoryFileWatcher — VERA ChromaDB sync (W7)
export { MemoryFileWatcher, memoryWatcher, } from './watcher.js';
