/**
 * HandoffService — TRINITY-1 Protocol
 *
 * Reads and writes the HANDOFF.md file at repo root.
 * Maintains an append-only log in .agents/handoff-log/
 * VERA calls this on every boot to detect mid-task handoffs.
 */
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../../../');
const HANDOFF_PATH = path.join(REPO_ROOT, 'HANDOFF.md');
const HANDOFF_LOG_DIR = path.join(REPO_ROOT, '.agents', 'handoff-log');
// ─── JSON block extraction from HANDOFF.md ───────────────────────────────────
const JSON_BLOCK_RE = /```json\s*([\s\S]*?)\s*```/;
function extractJson(markdown) {
    const match = JSON_BLOCK_RE.exec(markdown);
    if (!match)
        return null;
    try {
        return JSON.parse(match[1]);
    }
    catch {
        return null;
    }
}
// ─── HandoffService ───────────────────────────────────────────────────────────
export class HandoffService {
    /**
     * Read HANDOFF.md and parse the current state.
     * Returns null if the file does not exist or cannot be parsed.
     */
    async readHandoff() {
        try {
            const content = await fs.readFile(HANDOFF_PATH, 'utf-8');
            return extractJson(content);
        }
        catch {
            return null;
        }
    }
    /**
     * Write a new state to HANDOFF.md (updates the JSON block in the file).
     * Also appends to the handoff-log directory.
     */
    async writeHandoff(state) {
        const stamped = {
            ...state,
            timestamp: state.timestamp ?? new Date().toISOString(),
        };
        // Read current HANDOFF.md and replace JSON block
        let current = '';
        try {
            current = await fs.readFile(HANDOFF_PATH, 'utf-8');
        }
        catch {
            // File doesn't exist — start fresh
        }
        const block = '```json\n' + JSON.stringify(stamped, null, 2) + '\n```';
        const updated = JSON_BLOCK_RE.test(current)
            ? current.replace(JSON_BLOCK_RE, block)
            : current + '\n\n## Current State\n\n' + block + '\n';
        await fs.writeFile(HANDOFF_PATH, updated, 'utf-8');
        // Append to log
        await this.logTransition(stamped);
    }
    /**
     * Get full history of HANDOFF.md transitions.
     */
    async getHandoffHistory() {
        try {
            const files = await fs.readdir(HANDOFF_LOG_DIR);
            const jsonFiles = files
                .filter(f => f.endsWith('.json'))
                .sort(); // chronological
            const entries = await Promise.all(jsonFiles.map(async (f) => {
                const raw = await fs.readFile(path.join(HANDOFF_LOG_DIR, f), 'utf-8');
                return JSON.parse(raw);
            }));
            return entries;
        }
        catch {
            return [];
        }
    }
    /**
     * Check if there is a pending handoff that Creative Liberation Engine should auto-resume.
     * Returns the state if auto-resume is appropriate, null otherwise.
     */
    async checkAutoResume() {
        const state = await this.readHandoff();
        if (!state)
            return null;
        // Auto-resume conditions:
        // - Phase PROBE from PERPLEXITY → Creative Liberation Engine should PLAN
        // - Phase SHIP from CLAUDE-CODE → Creative Liberation Engine should VERIFY
        const shouldResume = (state.phase === 'PROBE' && state.from === 'PERPLEXITY') ||
            (state.phase === 'SHIP' && state.from === 'CLAUDE-CODE') ||
            (state.phase === 'PLAN' && state.from === 'ANTIGRAVITY'); // self-resume after approval
        return shouldResume ? state : null;
    }
    // ── Private ──────────────────────────────────────────────────────────────
    async logTransition(state) {
        try {
            await fs.mkdir(HANDOFF_LOG_DIR, { recursive: true });
            const filename = `${state.timestamp.replace(/[:.]/g, '-')}_${state.from}_${state.phase}.json`;
            await fs.writeFile(path.join(HANDOFF_LOG_DIR, filename), JSON.stringify(state, null, 2), 'utf-8');
        }
        catch {
            // Non-fatal — logging failure should never break the main flow
        }
    }
}
// Singleton export
export const handoffService = new HandoffService();
