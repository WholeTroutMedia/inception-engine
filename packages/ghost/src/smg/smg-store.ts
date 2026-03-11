/**
 * GHOST — SMG Store
 *
 * Persistent read/write layer for State Machine Graphs.
 * Stores SMGGraphs as versioned JSON on disk (NAS-mounted volume).
 *
 * Path convention:
 *   /data/comet-memory/web/{domain}/smg.json
 *   /data/comet-memory/android/{package}/smg.json
 *   /data/comet-memory/ios/{bundle_id}/smg.json
 *
 * Versioned: each save creates a timestamped backup.
 * Incremental: merge partial updates (single state or element) without full re-crawl.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { SMGGraph, SMGGraphSchema, SMGState, SMGTransition } from './schema.js';

const BASE_DIR = process.env.COMET_MEMORY_DIR ?? '/data/comet-memory';
const BACKUP_LIMIT = 5; // Keep last N versions

// ─── SMGStore ─────────────────────────────────────────────────────────────────

export class SMGStore {

    /** Compute the storage path for a domain + platform */
    private storePath(domain: string, platform: string): string {
        const safe = domain.replace(/[^a-zA-Z0-9.-]/g, '_');
        return path.join(BASE_DIR, platform, safe);
    }

    /** Load a stored graph. Returns null if not found. */
    async load(domain: string, platform = 'web'): Promise<SMGGraph | null> {
        const dir = this.storePath(domain, platform);
        const file = path.join(dir, 'smg.json');
        try {
            const raw = await fs.readFile(file, 'utf-8');
            return SMGGraphSchema.parse(JSON.parse(raw));
        } catch (err: any) {
            if (err.code === 'ENOENT') return null;
            throw new Error(`[SMGStore] Failed to load ${domain}/${platform}: ${err.message}`);
        }
    }

    /** Save a graph. Creates versioned backup of the previous file. */
    async save(graph: SMGGraph): Promise<void> {
        const dir = this.storePath(graph.domain, graph.platform);
        await fs.mkdir(dir, { recursive: true });
        const file = path.join(dir, 'smg.json');

        // Create versioned backup if file exists
        try {
            await fs.access(file);
            const backupName = `smg.${Date.now()}.json`;
            await fs.copyFile(file, path.join(dir, backupName));
            await this.pruneBackups(dir);
        } catch { /* No existing file — first save */ }

        // Validate and write
        const validated = SMGGraphSchema.parse(graph);
        await fs.writeFile(file, JSON.stringify(validated, null, 2), 'utf-8');
        console.log(`[SMGStore] Saved ${graph.domain}/${graph.platform} v${graph.version} — ${graph.total_states} states, ${graph.total_transitions} transitions`);
    }

    /** Get a specific state from a stored graph. */
    async getState(domain: string, stateId: string, platform = 'web'): Promise<SMGState | null> {
        const graph = await this.load(domain, platform);
        return graph?.states[stateId] ?? null;
    }

    /** Merge a single updated state back into the stored graph (Validator write-back). */
    async updateState(domain: string, state: SMGState, platform = 'web'): Promise<void> {
        const graph = await this.load(domain, platform);
        if (!graph) throw new Error(`[SMGStore] No graph found for ${domain}/${platform} — cannot update state`);

        graph.states[state.id] = state;
        graph.total_states = Object.keys(graph.states).length;
        graph.version += 1;
        graph.metadata['last_partial_update'] = new Date().toISOString();

        await this.save(graph);
    }

    /** Append a new transition (discovered during repair or execution). */
    async appendTransition(domain: string, transition: SMGTransition, platform = 'web'): Promise<void> {
        const graph = await this.load(domain, platform);
        if (!graph) return;

        const existing = graph.transitions.findIndex(t => t.id === transition.id);
        if (existing >= 0) {
            // Update existing — increment frequency, update success_rate
            graph.transitions[existing] = {
                ...graph.transitions[existing],
                frequency: (graph.transitions[existing].frequency ?? 1) + 1,
                last_validated: transition.last_validated,
                success_rate: transition.success_rate,
            };
        } else {
            graph.transitions.push(transition);
        }

        graph.total_transitions = graph.transitions.length;
        graph.version += 1;
        await this.save(graph);
    }

    /** Coverage report for a domain. */
    async getCoverage(domain: string, platform = 'web'): Promise<{
        domain: string;
        platform: string;
        coverage_score: number;
        total_states: number;
        total_transitions: number;
        stale_states: number;
        last_crawled: string | null;
        staleness_score: number;
        exists: boolean;
    }> {
        const graph = await this.load(domain, platform);
        if (!graph) {
            return { domain, platform, coverage_score: 0, total_states: 0, total_transitions: 0, stale_states: 0, last_crawled: null, staleness_score: 1, exists: false };
        }

        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const staleStates = Object.values(graph.states).filter(
            s => new Date(s.last_crawled).getTime() < sevenDaysAgo
        ).length;

        return {
            domain,
            platform,
            coverage_score: graph.coverage_score,
            total_states: graph.total_states,
            total_transitions: graph.total_transitions,
            stale_states: staleStates,
            last_crawled: graph.crawled_at,
            staleness_score: graph.staleness_score,
            exists: true,
        };
    }

    /** List all stored domains for a platform. */
    async listDomains(platform = 'web'): Promise<string[]> {
        const dir = path.join(BASE_DIR, platform);
        try {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            return entries
                .filter(e => e.isDirectory())
                .map(e => e.name.replace(/_/g, '.'));
        } catch {
            return [];
        }
    }

    /** Delete a stored graph (for re-crawl from scratch). */
    async delete(domain: string, platform = 'web'): Promise<void> {
        const dir = this.storePath(domain, platform);
        const file = path.join(dir, 'smg.json');
        try {
            await fs.unlink(file);
            console.log(`[SMGStore] Deleted ${domain}/${platform} SMG`);
        } catch { /* Already gone */ }
    }

    // ── Internals ──────────────────────────────────────────────────────────────

    private async pruneBackups(dir: string): Promise<void> {
        try {
            const files = (await fs.readdir(dir))
                .filter(f => f.startsWith('smg.') && f.endsWith('.json') && f !== 'smg.json')
                .sort();

            while (files.length > BACKUP_LIMIT) {
                const oldest = files.shift()!;
                await fs.unlink(path.join(dir, oldest));
            }
        } catch { /* Best effort */ }
    }
}

export const smgStore = new SMGStore();
