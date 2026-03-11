/**
 * MemoryFileWatcher — W7 Coding Standards Automation
 *
 * Watches MEMORY.md for file changes and syncs topics to ChromaDB.
 * Enables VERA's persistent memory to be queryable via vector search.
 *
 * On startup: seeds ChromaDB from current MEMORY.md.
 * On save: diffs the new content and upserts changed topics.
 */
export declare class MemoryFileWatcher {
    private watcher;
    private debounceTimer;
    private lastHash;
    /**
     * Start watching MEMORY.md. Seeds ChromaDB on first run.
     */
    start(): Promise<void>;
    /**
     * Stop the file watcher.
     */
    stop(): void;
    /**
     * Manually trigger a sync (useful without the file watcher running).
     */
    syncToChroma(): Promise<void>;
}
export declare const memoryWatcher: MemoryFileWatcher;
