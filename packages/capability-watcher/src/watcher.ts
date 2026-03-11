/**
 * capability-watcher — File Watcher
 *
 * Uses chokidar to monitor the Creative Liberation Engine instruction layer:
 *   - AGENTS.md (root-level)
 *   - .agents/skills/**
 *   - .agents/workflows/**
 *
 * Debounces rapid file changes (e.g. formatter saves) and accumulates
 * a list of changed files before firing the broadcast.
 */

import chokidar from 'chokidar';
import path from 'path';
import { broadcastCapabilityUpdate } from './broadcaster.js';

export interface WatcherConfig {
    /** Absolute path to the workspace root (brainchild-v5) */
    workspaceRoot: string;
    /** Dispatch server base URL */
    dispatchUrl: string;
    /** Debounce delay in ms before firing broadcast. Default: 800 */
    debounceMs?: number;
    /** Whether to log file changes to stdout. Default: true */
    verbose?: boolean;
}

export interface WatcherHandle {
    close: () => Promise<void>;
}

const WATCH_PATTERNS = [
    'AGENTS.md',
    '.agents/skills/**',
    '.agents/workflows/**',
];

export function startWatcher(config: WatcherConfig): WatcherHandle {
    const {
        workspaceRoot,
        dispatchUrl,
        debounceMs = 800,
        verbose = true,
    } = config;

    const log = (msg: string) => { if (verbose) console.log(`[capability-watcher] ${msg}`); };

    const absolutePatterns = WATCH_PATTERNS.map(p => path.join(workspaceRoot, p));

    const watcher = chokidar.watch(absolutePatterns, {
        ignoreInitial: true,
        persistent: true,
        awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
    });

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const pendingFiles = new Set<string>();

    const flushBroadcast = async () => {
        const changed_files = Array.from(pendingFiles).map(f =>
            path.relative(workspaceRoot, f).replace(/\\/g, '/'),
        );
        pendingFiles.clear();

        log(`Change detected — broadcasting: [${changed_files.join(', ')}]`);

        const result = await broadcastCapabilityUpdate(dispatchUrl, {
            changed_files,
            source: 'watcher',
        });

        if (result.success) {
            log(`✅ Broadcast sent — hash=${result.version?.hash ?? 'unknown'}, clients notified`);
        } else {
            console.error(`[capability-watcher] ❌ Broadcast failed: ${result.error}`);
        }
    };

    const handleChange = (filePath: string) => {
        pendingFiles.add(filePath);
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            flushBroadcast().catch(err => console.error('[capability-watcher] flush error:', err));
        }, debounceMs);
    };

    watcher
        .on('change', handleChange)
        .on('add', handleChange)
        .on('unlink', handleChange)
        .on('error', (err: unknown) => console.error('[capability-watcher] watcher error:', err))
        .on('ready', () => log(`Watching ${WATCH_PATTERNS.join(', ')} in ${workspaceRoot}`));

    return {
        close: async () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            await watcher.close();
            log('Watcher closed.');
        },
    };
}
