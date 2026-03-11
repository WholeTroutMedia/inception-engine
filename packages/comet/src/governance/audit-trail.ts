/**
 * COMET — Audit Trail (SCRIBE Integration)
 *
 * Every completed COMET task is recorded permanently.
 * Article V: Transparency — All automated actions must be auditable.
 *
 * Writes to two places:
 *   1. Local JSON log: /data/comet-memory/audit/{date}/{task_id}.json
 *   2. Creative Liberation Engine SCRIBE agent (memory layer) — async, best effort
 *
 * Every task, every plan, every repair, every preflight verdict.
 * The audit trail is the covenant between COMET and the user.
 */

import { promises as fs } from 'fs';
import path from 'path';
import type { MixedActionPlan, ExecutionResult } from '../types.js';
import type { PreflightResult } from './preflight.js';

const AUDIT_DIR = process.env.COMET_AUDIT_DIR ?? '/data/comet-memory/audit';
const INCEPTION_URL = process.env.INCEPTION_URL ?? 'http://creative-liberation-engine:8000';

export interface AuditRecord {
    task_id: string;
    timestamp: string;
    domain: string;
    platform: string;
    instruction: string;
    mode_used: 'programmatic' | 'reactive';
    smg_hit: boolean;

    // Plan summary
    plan_id: string | null;
    plan_node_count: number;
    plan_estimated_pii: boolean;
    plan_estimated_writes: boolean;

    // Preflight
    preflight_verdict: 'APPROVED' | 'REVIEW' | 'BLOCKED' | null;
    preflight_reviewer: string | null;

    // Execution
    execution_status: 'success' | 'partial' | 'failed' | 'blocked' | 'queued' | null;
    nodes_succeeded: number;
    nodes_failed: number;
    nodes_repaired: number;
    smg_updates: number;
    duration_ms: number | null;

    // Constitutional compliance
    constitutional_compliant: boolean;
    flagged_articles: number[];
}

export class AuditTrail {
    /**
     * Record a completed COMET task execution.
     * Fire-and-forget — never blocks execution.
     */
    async record(
        taskId: string,
        instruction: string,
        domain: string,
        platform: string,
        modeUsed: 'programmatic' | 'reactive',
        smgHit: boolean,
        plan: MixedActionPlan | null,
        preflight: PreflightResult | null,
        result: ExecutionResult | null,
    ): Promise<void> {
        const record: AuditRecord = {
            task_id: taskId,
            timestamp: new Date().toISOString(),
            domain,
            platform,
            instruction,
            mode_used: modeUsed,
            smg_hit: smgHit,

            plan_id: plan?.id ?? null,
            plan_node_count: plan?.nodes.length ?? 0,
            plan_estimated_pii: plan?.estimated_reads_pii ?? false,
            plan_estimated_writes: plan?.estimated_writes_data ?? false,

            preflight_verdict: preflight?.verdict ?? null,
            preflight_reviewer: preflight?.reviewer ?? null,

            execution_status: result?.status ?? null,
            nodes_succeeded: result?.node_results.filter(n => n.status === 'success').length ?? 0,
            nodes_failed: result?.node_results.filter(n => n.status === 'failed').length ?? 0,
            nodes_repaired: result?.node_results.filter(n => n.status === 'repaired').length ?? 0,
            smg_updates: result?.smg_updates ?? 0,
            duration_ms: result?.duration_ms ?? null,

            constitutional_compliant: preflight?.verdict !== 'BLOCKED',
            flagged_articles: preflight?.article_violations.map(v => v.article) ?? [],
        };

        // Write locally — always
        void this.writeLocal(record);

        // Write to SCRIBE — best effort
        void this.writeToScribe(record);
    }

    private async writeLocal(record: AuditRecord): Promise<void> {
        try {
            const date = record.timestamp.split('T')[0];
            const dir = path.join(AUDIT_DIR, date);
            await fs.mkdir(dir, { recursive: true });
            await fs.writeFile(
                path.join(dir, `${record.task_id}.json`),
                JSON.stringify(record, null, 2),
                'utf-8',
            );
        } catch (err: any) {
            console.warn(`[COMET/AUDIT] Local write failed: ${err.message}`);
        }
    }

    private async writeToScribe(record: AuditRecord): Promise<void> {
        try {
            await fetch(`${INCEPTION_URL}/task`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    task: `Record COMET audit: task ${record.task_id} — ${record.instruction.slice(0, 80)}`,
                    mode: 'ship',
                    agent: 'scribe',
                    context: { audit_record: record, type: 'comet_task_audit' },
                }),
                signal: AbortSignal.timeout(10000),
            });
        } catch { /* Best effort — local audit is the source of truth */ }
    }

    /** Get recent audit records for a domain */
    async getRecent(domain: string, limit = 20): Promise<AuditRecord[]> {
        try {
            const dates = (await fs.readdir(AUDIT_DIR)).sort().reverse().slice(0, 7);
            const records: AuditRecord[] = [];

            for (const date of dates) {
                const dir = path.join(AUDIT_DIR, date);
                const files = await fs.readdir(dir).catch(() => []);
                for (const file of files) {
                    if (records.length >= limit) break;
                    try {
                        const raw = await fs.readFile(path.join(dir, file), 'utf-8');
                        const rec: AuditRecord = JSON.parse(raw);
                        if (rec.domain === domain) records.push(rec);
                    } catch { /* Skip corrupt records */ }
                }
            }

            return records.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
        } catch {
            return [];
        }
    }
}

export const auditTrail = new AuditTrail();
