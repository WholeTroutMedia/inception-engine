import {
    cheapestCapableTier,
    getCapableTiers,
    type Capability,
    type FabricTask,
} from './capability-registry.js';
import type { Tier } from '../schema/index.js';

// ─── Sovereign Fabric Router ──────────────────────────────────────────────────
// Routes any FabricTask to the optimal compute tier based on:
//   1. Required capabilities (hard constraint — must have ALL)
//   2. Preferred capabilities (soft — tie-breaker)
//   3. Tier cost model (cheap sovereign hardware wins over cloud when equal)
//   4. Tier availability (online tiers only)
//
// This is the core of Sovereign Fabric — tasks don't know where they run.
// You describe what you need, the router finds the best surface.

export interface RoutingDecision {
    task: FabricTask;
    selected_tier: Tier;
    all_capable_tiers: Tier[];
    reason: string;
    cost_estimate_cents?: number;
}

export interface RoutingError {
    task: FabricTask;
    error: 'no_capable_tier' | 'all_capable_offline';
    required: Capability[];
    capable_tiers: Tier[];
    online_tiers: Tier[];
}

// ── Tier availability oracle ───────────────────────────────────────────────────
// In production: reads from SAR store (Redis). Here: checks SAR HTTP API.
const SAR_BASE = 'http://localhost:5051';

async function getOnlineTiers(): Promise<Set<Tier>> {
    try {
        const res = await fetch(`${SAR_BASE}/api/sar/snapshot`, { signal: AbortSignal.timeout(3000) });
        if (!res.ok) throw new Error('SAR offline');
        const snap = await res.json() as {
            workstation: { devices: unknown[] };
            nas: { online: boolean };
            gcp: { online: boolean };
        };
        const online = new Set<Tier>();
        // Workstation = always online if SAR server is responding (it runs on workstation)
        online.add('workstation');
        if (snap.nas.online) online.add('nas');
        if (snap.gcp.online) online.add('gcp');
        return online;
    } catch {
        // SAR offline — assume workstation is online (we're running locally)
        return new Set<Tier>(['workstation']);
    }
}

// ── The Router ────────────────────────────────────────────────────────────────
export class FabricRouter {
    private onlineTiers: Set<Tier> = new Set(['workstation', 'nas', 'gcp']);
    private lastAvailabilityCheck = 0;
    private readonly AVAILABILITY_TTL = 30_000;  // recheck every 30s

    async refreshAvailability(): Promise<void> {
        const now = Date.now();
        if (now - this.lastAvailabilityCheck < this.AVAILABILITY_TTL) return;
        this.onlineTiers = await getOnlineTiers();
        this.lastAvailabilityCheck = now;
    }

    async route(task: FabricTask): Promise<RoutingDecision | RoutingError> {
        await this.refreshAvailability();

        const capable = getCapableTiers(task.requires);

        if (capable.length === 0) {
            return {
                task,
                error: 'no_capable_tier',
                required: task.requires,
                capable_tiers: [],
                online_tiers: [...this.onlineTiers],
            };
        }

        // Filter to online tiers
        const onlineCapable = capable.filter(t => this.onlineTiers.has(t));

        if (onlineCapable.length === 0) {
            return {
                task,
                error: 'all_capable_offline',
                required: task.requires,
                capable_tiers: capable,
                online_tiers: [...this.onlineTiers],
            };
        }

        // Score candidates: prefer tiers that also satisfy "prefers" requirements
        const scored = onlineCapable.map(tier => {
            const prefScore = (task.prefers ?? []).filter(cap =>
                getCapableTiers([cap]).includes(tier)
            ).length;
            return { tier, prefScore };
        });

        // Sort: most preferences satisfied first, then cheapest cost
        const COST: Record<Tier, number> = { workstation: 1, nas: 2, gcp: 10, mobile: 99 };
        scored.sort((a, b) =>
            b.prefScore !== a.prefScore
                ? b.prefScore - a.prefScore
                : COST[a.tier] - COST[b.tier]
        );

        const winner = scored[0];
        const cheapest = cheapestCapableTier(task.requires) ?? winner.tier;

        return {
            task,
            selected_tier: winner.tier,
            all_capable_tiers: capable,
            reason: buildReason(task, winner.tier, onlineCapable, cheapest),
            cost_estimate_cents: winner.tier === 'gcp' ? estimateGCPCost(task) : 0,
        };
    }

    // ── Batch routing ────────────────────────────────────────────────────────
    async routeBatch(tasks: FabricTask[]): Promise<Array<RoutingDecision | RoutingError>> {
        await this.refreshAvailability();
        return Promise.all(tasks.map(t => this.route(t)));
    }

    // ── Force tier availability (for testing / override) ─────────────────────
    setOnlineTiers(tiers: Tier[]): void {
        this.onlineTiers = new Set(tiers);
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function buildReason(
    task: FabricTask,
    selected: Tier,
    allOnline: Tier[],
    cheapest: Tier
): string {
    if (allOnline.length === 1) {
        return `Only ${selected} is both capable and online for ${task.label}`;
    }
    if (selected === cheapest) {
        return `${selected} is the cheapest capable tier — sovereign hardware wins over cloud`;
    }
    return `${selected} best satisfies ${task.label}'s preferred capabilities`;
}

function estimateGCPCost(task: FabricTask): number {
    // Very rough Cloud Run estimate: 0.00002400/vCPU-s, 0.00000250/GB-s
    // Assume 1 vCPU, 512MB, 5s average execution
    if (task.requires.includes('genkit_flow')) return 2;  // ~$0.02 per flow run
    if (task.requires.includes('serverless_scale')) return 5;
    return 1;  // minimum Cloud Run invocation cost (fractions of a cent)
}

// ── Singleton export ──────────────────────────────────────────────────────────
export const fabricRouter = new FabricRouter();
