/**
 * MemoryBus — Unified Agent Memory Interface (v2)
 * Pillar 3: Live Compound Intelligence
 *
 * Hierarchical CLS-inspired memory taxonomy:
 *   operational/  → PROCEDURAL  (sessions, agents, projects)
 *   cognitive/    → SEMANTIC    (decisions, patterns, learnings)
 *   contextual/   → EPISODIC    (users, events)
 *
 * Every write uses the universal envelope:
 *   { id, ts, surface, trace_id, agent, level, payload }
 *
 * Fan-out: Local JSONL (always) → ChromaDB (when online) → Git sync queue
 *
 * Constitutional: Article VII (Knowledge Compounding) — every execution
 * must contribute to the system's knowledge base.
 */
import { z } from 'genkit';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import 'dotenv/config';
import { ChromaMemoryClient } from './chroma.js';
// ─────────────────────────────────────────────────────────────────────────────
// MEMORY ROOT — points to inception-memory repo on disk
// ─────────────────────────────────────────────────────────────────────────────
const MEMORY_ROOT = process.env.MEMORY_DIR
    || `d:\\Google Creative Liberation Engine\\Infusion Engine Brainchild\\brainchild-v5\\ecosystem\\inception-memory`;
// ── Surface path resolver ──────────────────────────────────────────────────
const SURFACE_PATHS = {
    'operational.sessions': ['operational', 'sessions'],
    'operational.agents': ['operational', 'agents'],
    'operational.projects': ['operational', 'projects'],
    'cognitive.decisions': ['cognitive', 'decisions'],
    'cognitive.patterns': ['cognitive', 'patterns'],
    'cognitive.learnings': ['cognitive', 'learnings'],
    'contextual.users': ['contextual', 'users'],
    'contextual.events': ['contextual', 'events'],
    'sync_logs': ['sync_logs'],
};
function getSurfacePath(surface, subKey) {
    const parts = SURFACE_PATHS[surface];
    if (!parts)
        throw new Error(`Unknown memory surface: ${surface}`);
    const dir = subKey
        ? path.join(MEMORY_ROOT, ...parts, subKey)
        : path.join(MEMORY_ROOT, ...parts);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
}
function todayFile(dir) {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    return path.join(dir, `${today}.jsonl`);
}
function makeEnvelope(surface, agent, payload, level = 'INFO', traceId) {
    return {
        id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        ts: new Date().toISOString(),
        surface,
        trace_id: traceId ?? `trace_${Date.now()}`,
        agent,
        level,
        payload,
    };
}
// ─────────────────────────────────────────────────────────────────────────────
// JSONL HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function appendJsonl(filepath, record) {
    fs.appendFileSync(filepath, JSON.stringify(record) + '\n', 'utf8');
}
function readJsonl(filepath) {
    if (!fs.existsSync(filepath))
        return [];
    return fs.readFileSync(filepath, 'utf8')
        .split('\n')
        .filter(Boolean)
        .map(line => {
        try {
            return JSON.parse(line);
        }
        catch {
            return null;
        }
    })
        .filter((x) => x !== null);
}
// ─────────────────────────────────────────────────────────────────────────────
// GIT SYNC QUEUE — batched commits to inception-memory repo
// ─────────────────────────────────────────────────────────────────────────────
class GitSyncQueue {
    pendingCount = 0;
    flushTimer = null;
    flushIntervalMs;
    constructor(flushIntervalMs = 15 * 60 * 1000) {
        this.flushIntervalMs = flushIntervalMs;
    }
    start() {
        if (this.flushTimer)
            return;
        this.flushTimer = setInterval(() => this.flush('scheduled'), this.flushIntervalMs);
        // Don't hold the process open
        this.flushTimer.unref?.();
        console.log(`[MEMORY BUS] Git sync queue started (every ${this.flushIntervalMs / 60000}min)`);
    }
    mark() {
        this.pendingCount++;
    }
    async flush(reason = 'manual') {
        if (this.pendingCount === 0)
            return;
        const count = this.pendingCount;
        this.pendingCount = 0;
        try {
            execSync(`git -C "${MEMORY_ROOT}" add -A && git -C "${MEMORY_ROOT}" commit -m "[VERA][${reason}] ${count} memory entries — ${new Date().toISOString()}" --allow-empty && git -C "${MEMORY_ROOT}" push --all`, { stdio: 'pipe', timeout: 30000 });
            console.log(`[MEMORY BUS] ✓ Git sync: ${count} entries committed (${reason})`);
        }
        catch (err) {
            // Non-fatal — local JSONL is always safe
            console.warn(`[MEMORY BUS] Git sync warn (${reason}): ${String(err).slice(0, 120)}`);
        }
    }
    stop() {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = null;
        }
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// LEGACY SCHEMAS (kept for backwards compat with existing flows)
// ─────────────────────────────────────────────────────────────────────────────
export const MemoryEntrySchema = z.object({
    id: z.string(),
    timestamp: z.string(),
    agentName: z.string(),
    task: z.string(),
    outcome: z.string(),
    pattern: z.string().optional().describe('Extracted "The Why" — reusable principle'),
    tags: z.array(z.string()).default([]),
    sessionId: z.string(),
    durationMs: z.number().optional(),
    success: z.boolean(),
});
export const MemoryQuerySchema = z.object({
    query: z.string().describe('Natural language query for similar past tasks'),
    agentName: z.string().optional().describe('Filter by agent'),
    limit: z.number().default(5),
    successOnly: z.boolean().default(false),
    category: z.string().optional().describe('Filter by MemoryCategory'),
    tags: z.array(z.string()).optional().describe('Filter by specific tags (union)'),
});
export const MemoryWriteSchema = z.object({
    agentName: z.string(),
    task: z.string(),
    outcome: z.string(),
    tags: z.array(z.string()).default([]),
    sessionId: z.string(),
    durationMs: z.number().optional(),
    success: z.boolean().default(true),
    metadata: z.record(z.unknown()).optional(),
});
// ─────────────────────────────────────────────────────────────────────────────
// MEMORY BUS CLASS
// ─────────────────────────────────────────────────────────────────────────────
export class MemoryBus {
    sessionId;
    chroma;
    chromaOnline = null;
    gitSync;
    patternExtractor;
    constructor(sessionId) {
        this.sessionId = sessionId ?? `session_${Date.now()}`;
        this.chroma = new ChromaMemoryClient();
        this.gitSync = new GitSyncQueue();
        this.gitSync.start();
        this._attachSignalHandlers();
    }
    // ── Inject pattern extractor (breaks circular dependency with genkit) ──
    setPatternExtractor(extractor) {
        this.patternExtractor = extractor;
    }
    // ── Signal handlers — auto-flush on any clean shutdown ──────────────────
    _attachSignalHandlers() {
        const shutdown = async (signal) => {
            console.log(`\n[MEMORY BUS] ${signal} received — finalizing session...`);
            await this.scribeSessionSummary();
            await this.gitSync.flush(signal);
            this.gitSync.stop();
            process.exit(0);
        };
        process.once('SIGTERM', () => shutdown('SIGTERM'));
        process.once('SIGINT', () => shutdown('SIGINT'));
        process.once('SIGUSR2', () => shutdown('SIGUSR2')); // nodemon restart
    }
    // ── Surface write — the universal write interface ─────────────────────────
    writeToSurface(surface, agent, payload, options = {}) {
        const envelope = makeEnvelope(surface, agent, payload, options.level, options.traceId);
        try {
            const dir = getSurfacePath(surface, options.subKey);
            appendJsonl(todayFile(dir), envelope);
            this.gitSync.mark();
        }
        catch (err) {
            console.error(`[MEMORY BUS] Write failed for surface "${surface}": ${err}`);
        }
        return envelope;
    }
    // ── ChromaDB availability check ─────────────────────────────────────────
    async isChromaAvailable() {
        if (this.chromaOnline === null) {
            this.chromaOnline = await this.chroma.isOnline();
            console.log(this.chromaOnline
                ? '[MEMORY BUS] ChromaDB online — vector search active'
                : '[MEMORY BUS] ChromaDB offline — JSONL keyword fallback active');
        }
        return this.chromaOnline;
    }
    // ── recall — pre-flight context retrieval ──────────────────────────────
    async recall(query) {
        // Primary: ChromaDB vector search
        if (await this.isChromaAvailable()) {
            try {
                let results;
                if (query.agentName) {
                    results = await this.chroma.recall(query.agentName, query.query, query.limit, query.category, query.tags);
                }
                else {
                    results = await this.chroma.crossAgentRecall('', query.query, query.limit, query.category, query.tags);
                }
                if (results.length > 0) {
                    console.log(`[MEMORY BUS] ⚡ ChromaDB recalled ${results.length} episodes`);
                    return results;
                }
            }
            catch (err) {
                console.warn(`[MEMORY BUS] ChromaDB recall error: ${String(err).slice(0, 80)}`);
                this.chromaOnline = null;
            }
        }
        // Fallback: JSONL keyword matching from operational/agents/
        const agentsDir = getSurfacePath('operational.agents', query.agentName);
        const episodeFile = todayFile(agentsDir);
        const episodes = readJsonl(episodeFile);
        const queryLower = query.query.toLowerCase();
        let matches = episodes
            .filter(ep => {
            if (query.successOnly && ep.payload?.success === false)
                return false;
            const text = JSON.stringify(ep.payload).toLowerCase();
            return queryLower.split(/\s+/).some(w => w.length > 3 && text.includes(w));
        })
            .map(ep => ep.payload);
        matches = matches.reverse().slice(0, query.limit);
        if (matches.length > 0) {
            console.log(`[MEMORY BUS] JSONL recalled ${matches.length} episodes`);
        }
        return matches;
    }
    // ── commit — post-flight storage with SCRIBE pattern extraction ──────────
    async commit(write) {
        const pattern = write.success && this.patternExtractor
            ? await this.patternExtractor(write.task, write.outcome)
            : undefined;
        const entry = {
            id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            timestamp: new Date().toISOString(),
            pattern,
            ...write,
        };
        // Write to operational.agents surface
        this.writeToSurface('operational.agents', write.agentName, entry, { subKey: write.agentName, traceId: write.sessionId });
        // Write pattern to cognitive.patterns surface
        if (pattern) {
            this.writeToSurface('cognitive.patterns', 'VERA.SCRIBE', { id: entry.id, pattern, tags: write.tags, sourceAgent: write.agentName }, { traceId: write.sessionId });
        }
        // ChromaDB persist (non-blocking)
        if (await this.isChromaAvailable()) {
            this.chroma.persist(entry).catch(err => {
                console.warn(`[MEMORY BUS] ChromaDB persist warn: ${String(err).slice(0, 80)}`);
                this.chromaOnline = null;
            });
        }
        console.log(`[MEMORY BUS] Committed: ${write.agentName} — "${write.task.slice(0, 60)}"`);
        if (pattern)
            console.log(`[MEMORY BUS] Pattern extracted: "${pattern.slice(0, 80)}"`);
        return entry;
    }
    // ── withMemory — wrap any agent execution with preflight + postflight ───
    async withMemory(agentName, task, tags, fn) {
        const startMs = Date.now();
        const context = await this.recall({ query: task, agentName, limit: 3, successOnly: false });
        let result;
        let success = true;
        let outcome = 'Success';
        try {
            result = await fn(context);
        }
        catch (e) {
            success = false;
            outcome = `Failed: ${e}`;
            throw e;
        }
        finally {
            await this.commit({
                agentName,
                task,
                outcome,
                tags,
                sessionId: this.sessionId,
                durationMs: Date.now() - startMs,
                success,
            });
        }
        return result;
    }
    // ── scribeSessionSummary — VERA's end-of-session report ────────────────
    async scribeSessionSummary() {
        // Collect today's agent entries for this session
        const agentsDir = getSurfacePath('operational.agents');
        let episodes = [];
        try {
            const agentDirs = fs.readdirSync(agentsDir, { withFileTypes: true })
                .filter(d => d.isDirectory())
                .map(d => path.join(agentsDir, d.name));
            for (const dir of agentDirs) {
                const f = todayFile(dir);
                if (fs.existsSync(f)) {
                    episodes.push(...readJsonl(f));
                }
            }
        }
        catch { /* no agents logged yet */ }
        const sessionEps = episodes.filter(ep => ep.trace_id === this.sessionId);
        const successEps = sessionEps.filter(ep => ep.payload?.success !== false);
        const agentsActive = [...new Set(sessionEps.map(ep => ep.agent))];
        const summary = {
            sessionId: this.sessionId,
            ts: new Date().toISOString(),
            episodeCount: sessionEps.length,
            successRate: sessionEps.length > 0 ? successEps.length / sessionEps.length : 1,
            agentsActive,
            event: 'session_summary',
        };
        // Write to operational.sessions
        this.writeToSurface('operational.sessions', 'VERA.SCRIBE', summary, { traceId: this.sessionId });
        console.log(`[SCRIBE] Session ${this.sessionId}: ${sessionEps.length} episodes, ${(summary.successRate * 100).toFixed(0)}% success`);
        return JSON.stringify(summary, null, 2);
    }
    // ── logBoot — called on system boot ─────────────────────────────────────
    logBoot(system, version, bootDurationMs, meta = {}) {
        this.writeToSurface('operational.sessions', 'VERA', { event: 'boot', system, version, bootDurationMs, ...meta }, { level: 'INFO', traceId: this.sessionId });
        this.writeToSurface('contextual.events', 'VERA', { event: 'system_boot', system, version }, { level: 'INFO', traceId: this.sessionId });
        console.log(`[MEMORY BUS] Boot logged: ${system} v${version} (${bootDurationMs}ms)`);
    }
    // ── logShutdown — called on clean shutdown ───────────────────────────────
    logShutdown(system, reason = 'clean') {
        this.writeToSurface('operational.sessions', 'VERA', { event: 'shutdown', system, reason, ts: new Date().toISOString() }, { level: 'INFO', traceId: this.sessionId });
    }
    // ── logDecision — ATHENA strategic decisions ─────────────────────────────
    logDecision(agent, decision, rationale, tags = []) {
        this.writeToSurface('cognitive.decisions', agent, { decision, rationale, tags }, { traceId: this.sessionId });
    }
    // ── logUserInteraction — human ↔ AVERI exchanges ─────────────────────────
    logUserInteraction(userId, summary, mode) {
        this.writeToSurface('contextual.users', 'AVERI', { userId, summary, mode, sessionId: this.sessionId }, { traceId: this.sessionId });
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// SINGLETON
// ─────────────────────────────────────────────────────────────────────────────
export const memoryBus = new MemoryBus();
