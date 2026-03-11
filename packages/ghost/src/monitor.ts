import axios from 'axios';
import { z } from 'zod';

// ─── GHOST — Uptime Monitor & Health Check Dashboard ─────────────────────────
// Monitors HTTP endpoints for availability, response time, and status codes.
// Supports scheduled polling, alert thresholds, and dashboard generation.

export const MonitorTargetSchema = z.object({
    id: z.string(),
    url: z.string().url(),
    name: z.string(),
    expected_status: z.number().default(200),
    timeout_ms: z.number().default(10000),
    keywords: z.array(z.string()).optional().describe('Strings that must appear in the response body'),
    alert_threshold_ms: z.number().default(3000).describe('Response time above this triggers a slow warning'),
});

export const MonitorBatchSchema = z.object({
    targets: z.array(MonitorTargetSchema).min(1).max(50),
    parallel: z.boolean().default(true),
});

export type CheckStatus = 'up' | 'slow' | 'down' | 'keyword-fail';

export interface CheckResult {
    id: string;
    name: string;
    url: string;
    status: CheckStatus;
    http_status: number | null;
    response_time_ms: number;
    error?: string;
    keyword_missing?: string;
    checked_at: string;
}

// ─── Single target check ──────────────────────────────────────────────────────

export async function checkTarget(target: z.infer<typeof MonitorTargetSchema>): Promise<CheckResult> {
    const start = Date.now();
    const checked_at = new Date().toISOString();
    try {
        const res = await axios.get<string>(target.url, {
            timeout: target.timeout_ms,
            validateStatus: () => true,
            responseType: 'text',
            headers: { 'User-Agent': 'GHOSTMonitor/1.0' },
        });
        const elapsed = Date.now() - start;
        const httpStatus = res.status;

        if (httpStatus !== target.expected_status) {
            return { id: target.id, name: target.name, url: target.url, status: 'down', http_status: httpStatus, response_time_ms: elapsed, error: `Expected ${target.expected_status}, got ${httpStatus}`, checked_at };
        }

        if (target.keywords?.length) {
            for (const kw of target.keywords) {
                if (!res.data.includes(kw)) {
                    return { id: target.id, name: target.name, url: target.url, status: 'keyword-fail', http_status: httpStatus, response_time_ms: elapsed, keyword_missing: kw, checked_at };
                }
            }
        }

        const status: CheckStatus = elapsed > target.alert_threshold_ms ? 'slow' : 'up';
        return { id: target.id, name: target.name, url: target.url, status, http_status: httpStatus, response_time_ms: elapsed, checked_at };
    } catch (e: unknown) {
        return { id: target.id, name: target.name, url: target.url, status: 'down', http_status: null, response_time_ms: Date.now() - start, error: (e as Error).message, checked_at };
    }
}

// ─── Batch monitor ────────────────────────────────────────────────────────────

export async function runMonitorBatch(input: z.infer<typeof MonitorBatchSchema>): Promise<{
    results: CheckResult[];
    summary: { total: number; up: number; slow: number; down: number; keyword_fail: number };
    dashboard_html: string;
}> {
    const v = MonitorBatchSchema.parse(input);
    const checks = v.parallel
        ? await Promise.all(v.targets.map(checkTarget))
        : await v.targets.reduce<Promise<CheckResult[]>>(async (acc, t) => { const results = await acc; return [...results, await checkTarget(t)]; }, Promise.resolve([]));

    const summary = checks.reduce((s, c) => {
        s.total++;
        if (c.status === 'up') s.up++;
        else if (c.status === 'slow') s.slow++;
        else if (c.status === 'down') s.down++;
        else if (c.status === 'keyword-fail') s.keyword_fail++;
        return s;
    }, { total: 0, up: 0, slow: 0, down: 0, keyword_fail: 0 });

    const statusColor = (s: CheckStatus) => ({ up: '#28a745', slow: '#ffc107', down: '#dc3545', 'keyword-fail': '#fd7e14' }[s]);
    const statusLabel = (s: CheckStatus) => ({ up: '✅ UP', slow: '🐢 SLOW', down: '🔴 DOWN', 'keyword-fail': '⚠️ CONTENT' }[s]);

    const dashboard_html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Uptime Monitor</title>
<style>body{font-family:-apple-system,sans-serif;background:#0a0a0f;color:#f5f0e8;padding:40px;margin:0}
h1{font-size:32px;font-weight:800;letter-spacing:-1px;margin:0 0 8px}
.sub{color:rgba(245,240,232,0.5);margin-bottom:32px;font-size:14px}
.stats{display:flex;gap:16px;margin-bottom:32px}
.stat{background:rgba(255,255,255,0.05);padding:20px 28px;border-radius:8px;text-align:center}
.stat-val{font-size:36px;font-weight:800}
.stat-label{font-size:11px;letter-spacing:2px;text-transform:uppercase;opacity:0.5;margin-top:4px}
.check{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;background:rgba(255,255,255,0.04);border-radius:8px;margin-bottom:8px}
.check-name{font-weight:600}
.check-url{font-size:12px;opacity:0.4;margin-top:2px}
.check-right{text-align:right}
.check-status{font-size:13px;font-weight:700}
.check-ms{font-size:12px;opacity:0.5}</style></head>
<body>
<h1>GHOST Monitor</h1>
<div class="sub">Last check: ${new Date().toLocaleString()} &bull; ${summary.total} endpoints</div>
<div class="stats">
<div class="stat"><div class="stat-val" style="color:#28a745">${summary.up}</div><div class="stat-label">Up</div></div>
<div class="stat"><div class="stat-val" style="color:#ffc107">${summary.slow}</div><div class="stat-label">Slow</div></div>
<div class="stat"><div class="stat-val" style="color:#dc3545">${summary.down + summary.keyword_fail}</div><div class="stat-label">Issues</div></div>
</div>
${checks.map(c => `<div class="check">
<div><div class="check-name">${c.name}</div><div class="check-url">${c.url}</div></div>
<div class="check-right"><div class="check-status" style="color:${statusColor(c.status)}">${statusLabel(c.status)}</div>
<div class="check-ms">${c.response_time_ms}ms${c.http_status ? ` · ${c.http_status}` : ''}</div></div>
</div>`).join('')}
</body></html>`;

    return { results: checks, summary, dashboard_html };
}

export const MONITOR_TOOLS = [
    { name: 'ghost_check_url', description: 'Check a single URL for uptime, response time, and optional keyword presence.', inputSchema: MonitorTargetSchema, handler: checkTarget, agentPermissions: ['GHOST', 'SENTINEL'], estimatedCost: 'Free' },
    { name: 'ghost_monitor_batch', description: 'Check multiple URLs in parallel and generate an uptime dashboard HTML.', inputSchema: MonitorBatchSchema, handler: runMonitorBatch, agentPermissions: ['GHOST', 'SENTINEL'], estimatedCost: 'Free' },
];
