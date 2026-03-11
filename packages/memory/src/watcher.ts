/**
 * MemoryFileWatcher — W7 Coding Standards Automation
 *
 * Watches MEMORY.md for file changes and syncs topics to ChromaDB.
 * Enables VERA's persistent memory to be queryable via vector search.
 *
 * On startup: seeds ChromaDB from current MEMORY.md.
 * On save: diffs the new content and upserts changed topics.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ChromaClient } from 'chromadb';

const CHROMA_URL = process.env['CHROMA_URL'] ?? 'http://localhost:8000';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../../../');
const MEMORY_PATH = path.join(REPO_ROOT, 'MEMORY.md');
const CHROMA_COLLECTION = 'vera-memory';

// ─── Topic parsing ────────────────────────────────────────────────────────────

interface MemoryTopic {
    heading: string;
    content: string;
    id: string; // slug of heading
}

function parseTopics(markdown: string): MemoryTopic[] {
    const sections = markdown.split(/^## /m).slice(1); // skip header
    return sections.map(section => {
        const newline = section.indexOf('\n');
        const heading = section.slice(0, newline).trim();
        const content = section.slice(newline + 1).trim();
        const id = heading.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        return { heading, content, id };
    });
}

// ─── MemoryFileWatcher ────────────────────────────────────────────────────────

export class MemoryFileWatcher {
    private watcher: fs.FSWatcher | null = null;
    private debounceTimer: ReturnType<typeof setTimeout> | null = null;
    private lastHash = '';

    /**
     * Start watching MEMORY.md. Seeds ChromaDB on first run.
     */
    async start(): Promise<void> {
        console.log('[MemoryFileWatcher] Starting — seeding ChromaDB from MEMORY.md');

        // Initial seed
        await this.syncToChroma();

        // Watch for changes
        this.watcher = fs.watch(MEMORY_PATH, () => {
            if (this.debounceTimer) clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(() => this.syncToChroma(), 500);
        });

        console.log('[MemoryFileWatcher] Watching MEMORY.md for changes');
    }

    /**
     * Stop the file watcher.
     */
    stop(): void {
        if (this.debounceTimer) clearTimeout(this.debounceTimer);
        this.watcher?.close();
        this.watcher = null;
        console.log('[MemoryFileWatcher] Stopped');
    }

    /**
     * Manually trigger a sync (useful without the file watcher running).
     */
    async syncToChroma(): Promise<void> {
        try {
            if (!fs.existsSync(MEMORY_PATH)) {
                console.warn('[MemoryFileWatcher] MEMORY.md not found — skipping sync');
                return;
            }

            const content = fs.readFileSync(MEMORY_PATH, 'utf-8');
            const hash = Buffer.from(content).toString('base64').slice(0, 32);

            if (hash === this.lastHash) return; // no change
            this.lastHash = hash;

            const topics = parseTopics(content);
            console.log(`[MemoryFileWatcher] Syncing ${topics.length} topics to ChromaDB`);

            // Get collection directly via ChromaClient
            const client = new ChromaClient({ path: CHROMA_URL });
            const collection = await client.getOrCreateCollection({
                name: CHROMA_COLLECTION,
                metadata: { description: 'VERA persistent memory from MEMORY.md' },
            });

            const validTopics = topics.filter(t => t.content.length > 0);
            if (validTopics.length === 0) return;

            await collection.upsert({
                ids: validTopics.map(t => `vera-memory--${t.id}`),
                documents: validTopics.map(t => `## ${t.heading}\n\n${t.content}`),
                metadatas: validTopics.map(t => ({
                    heading: t.heading,
                    source: 'MEMORY.md',
                    syncedAt: new Date().toISOString(),
                })),
            });

            console.log('[MemoryFileWatcher] Sync complete');
        } catch (err) {
            console.error('[MemoryFileWatcher] Sync failed:', err);
        }
    }
}

// Singleton export
export const memoryWatcher = new MemoryFileWatcher();
