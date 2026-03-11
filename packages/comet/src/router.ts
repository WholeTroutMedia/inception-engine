/**
 * COMET — CometRouter
 *
 * The first decision point in every COMET task execution.
 * Routes between two execution paths:
 *
 *   PROGRAMMATIC — SMG HIT (coverage >= 0.4)
 *     High accuracy. Deterministic. Sub-second planning.
 *     Uses the stored world model to synthesize a typed action plan.
 *
 *   REACTIVE — SMG MISS (no coverage or < 0.4)
 *     Falls through to the Python Creative Liberation Engine BrowserAgent.
 *     Simultaneously fires a background crawl to build the SMG for next time.
 *     First-time-on-any-domain always lands here.
 *
 * The goal: every domain visited eventually gets a world model.
 * Every repeated task gets faster and more reliable.
 * This is how COMET learns.
 */

import type { CometExecuteRequest } from './types.js';
import type { SMGGraph } from './types.js';

const GHOST_URL = process.env.GHOST_URL ?? 'http://ghost:6000';
const INCEPTION_URL = process.env.INCEPTION_URL ?? 'http://creative-liberation-engine:8000';
const SMG_COVERAGE_THRESHOLD = parseFloat(process.env.COMET_SMG_THRESHOLD ?? '0.4');

export type RouteDecision = 'programmatic' | 'reactive';

export interface RouterResult {
    decision: RouteDecision;
    smg: SMGGraph | null;
    coverage_score: number;
    domain: string;
    platform: string;
    reason: string;
}

// ─── CometRouter ─────────────────────────────────────────────────────────────

export class CometRouter {
    /**
     * Route a task to programmatic or reactive execution.
     * Also fires background crawl if SMG is missing or stale.
     */
    async route(request: CometExecuteRequest): Promise<RouterResult> {
        const platform = request.platform ?? 'web';
        const domain = this.extractDomain(request);

        if (!domain) {
            return { decision: 'reactive', smg: null, coverage_score: 0, domain: '', platform, reason: 'Could not extract domain from request' };
        }

        // Force override
        if (request.mode === 'programmatic') {
            const smg = await this.fetchSMG(domain, platform);
            return { decision: 'programmatic', smg, coverage_score: smg?.coverage_score ?? 0, domain, platform, reason: 'Forced programmatic mode' };
        }
        if (request.mode === 'reactive') {
            return { decision: 'reactive', smg: null, coverage_score: 0, domain, platform, reason: 'Forced reactive mode' };
        }

        // Auto-route: check SMG coverage
        const smg = await this.fetchSMG(domain, platform);

        if (!smg) {
            // No SMG — fire background crawl and go reactive
            void this.triggerBackgroundCrawl(request, domain, platform);
            return { decision: 'reactive', smg: null, coverage_score: 0, domain, platform, reason: `No SMG found for ${domain}. Background crawl started — try again after mapping completes.` };
        }

        if (smg.coverage_score < SMG_COVERAGE_THRESHOLD) {
            // Low coverage — reactive with background crawl update
            void this.triggerBackgroundCrawl(request, domain, platform);
            return { decision: 'reactive', smg, coverage_score: smg.coverage_score, domain, platform, reason: `SMG coverage ${(smg.coverage_score * 100).toFixed(0)}% is below threshold ${SMG_COVERAGE_THRESHOLD * 100}%. Using reactive mode.` };
        }

        if (smg.staleness_score > 0.7) {
            // Very stale — trigger refresh crawl but still use programmatic (stale is better than nothing)
            void this.triggerBackgroundCrawl(request, domain, platform);
            return { decision: 'programmatic', smg, coverage_score: smg.coverage_score, domain, platform, reason: `SMG is stale (${(smg.staleness_score * 100).toFixed(0)}% staleness). Using programmatic with background refresh.` };
        }

        return {
            decision: 'programmatic',
            smg,
            coverage_score: smg.coverage_score,
            domain,
            platform,
            reason: `SMG HIT: ${domain}/${platform} — ${smg.total_states} states, ${(smg.coverage_score * 100).toFixed(0)}% coverage`,
        };
    }

    // ── Private ──────────────────────────────────────────────────────────────

    private extractDomain(request: CometExecuteRequest): string {
        if (request.platform === 'android') return request.package ?? '';
        if (request.platform === 'ios') return request.bundle_id ?? '';
        if (request.url) {
            try { return new URL(request.url).hostname; } catch { return ''; }
        }
        return '';
    }

    private async fetchSMG(domain: string, platform: string): Promise<SMGGraph | null> {
        try {
            const res = await fetch(`${GHOST_URL}/smg/${encodeURIComponent(domain)}?platform=${platform}`, {
                signal: AbortSignal.timeout(5000),
            });
            if (!res.ok) return null;
            return await res.json() as SMGGraph;
        } catch {
            return null;
        }
    }

    private async triggerBackgroundCrawl(request: CometExecuteRequest, domain: string, platform: string): Promise<void> {
        try {
            if (platform === 'web') {
                const url = request.url ?? `https://${domain}`;
                await fetch(`${GHOST_URL}/crawl`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url, max_depth: 2, async: true }),
                    signal: AbortSignal.timeout(3000),
                });
                console.log(`[COMET/ROUTER] Background crawl triggered for ${domain}`);
            } else if (platform === 'android' && request.package) {
                await fetch(`${GHOST_URL}/crawl/android`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ package: request.package, activity: `${request.package}/.MainActivity`, device_id: request.device_id }),
                    signal: AbortSignal.timeout(3000),
                });
            } else if (platform === 'ios' && request.bundle_id) {
                await fetch(`${GHOST_URL}/crawl/ios`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ bundle_id: request.bundle_id }),
                    signal: AbortSignal.timeout(3000),
                });
            }
        } catch {
            // Best-effort — crawl failures should never block execution
        }
    }

    /** Fall through to Python Creative Liberation Engine BrowserAgent */
    async executeReactive(request: CometExecuteRequest): Promise<Record<string, unknown>> {
        const response = await fetch(`${INCEPTION_URL}/task`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                task: `Navigate to ${request.url} and: ${request.instruction}`,
                mode: 'ship',
                agent: 'comet',
                context: { url: request.url, instruction: request.instruction },
            }),
            signal: AbortSignal.timeout(120000), // 2 min for reactive execution
        });

        if (!response.ok) {
            throw new Error(`Reactive execution failed: ${response.status} ${await response.text()}`);
        }

        return await response.json();
    }
}
