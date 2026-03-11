import type {
    SAREntity,
    DeviceEntity,
    StorageEntity,
    ProcessEntity,
    ContainerEntity,
    AttentionBrief,
    MeshSnapshot,
} from '../schema/index.js';

// ─── NERVE Attention Engine ────────────────────────────────────────────────────
// Scores every entity in the mesh by relevance + recency.
// Higher score = AVERI pays more attention to it.
// Produces a priority-ranked attention brief injected into every AVERI boot.

interface AttentionRule {
    name: string;
    matches: (entity: SAREntity) => boolean;
    baseScore: number;
    reason: (entity: SAREntity) => string;
}

// ── Scoring rules ─────────────────────────────────────────────────────────────
const RULES: AttentionRule[] = [
    {
        name: 'offline_device',
        matches: (e) => e.status === 'offline' && e.category === 'device',
        baseScore: 85,
        reason: (e) => `${e.label} is offline — was it unplugged?`,
    },
    {
        name: 'degraded_service',
        matches: (e) => e.status === 'degraded',
        baseScore: 90,
        reason: (e) => `${e.label} is degraded — check logs`,
    },
    {
        name: 'offline_container',
        matches: (e) => e.status === 'offline' && e.category === 'container',
        baseScore: 95,
        reason: (e) => `🚨 ${e.label} container is DOWN — NAS service outage`,
    },
    {
        name: 'storage_critical',
        matches: (e): e is StorageEntity =>
            e.category === 'storage' &&
            'total_bytes' in e &&
            (e as StorageEntity).total_bytes > 0 &&
            ((e as StorageEntity).free_bytes / (e as StorageEntity).total_bytes) < 0.05,
        baseScore: 95,
        reason: (e) => `⚠️ ${e.label} is CRITICALLY LOW on space (<5% free)`,
    },
    {
        name: 'storage_low',
        matches: (e): e is StorageEntity =>
            e.category === 'storage' &&
            'total_bytes' in e &&
            (e as StorageEntity).total_bytes > 0 &&
            ((e as StorageEntity).free_bytes / (e as StorageEntity).total_bytes) < 0.15,
        baseScore: 70,
        reason: (e) => `${e.label} storage is low (<15% free)`,
    },
    {
        name: 'high_cpu_process',
        matches: (e): e is ProcessEntity =>
            e.category === 'process' && (e as ProcessEntity).cpu_percent > 80,
        baseScore: 60,
        reason: (e) => `${e.label} is consuming ${(e as ProcessEntity).cpu_percent.toFixed(1)}% CPU`,
    },
    {
        name: 'genkit_status',
        matches: (e) => e.id === 'genkit-engine',
        baseScore: 30,
        reason: (e) => `Genkit engine is ${e.status}`,
    },
    {
        name: 'dispatch_status',
        matches: (e) => e.id === 'dispatch-server',
        baseScore: 20,
        reason: (e) => `Dispatch server is ${e.status} · ${(e as ContainerEntity).metadata?.total_agents ?? 0} agents`,
    },
    {
        name: 'new_device',
        matches: (e): e is DeviceEntity =>
            e.category === 'device' && e.status === 'online' &&
            (Date.now() - new Date(e.last_seen).getTime()) < 60_000,  // seen in last 60s
        baseScore: 50,
        reason: (e) => `New device connected: ${e.label}`,
    },
];

// ── Score a single entity ─────────────────────────────────────────────────────
function scoreEntity(entity: SAREntity): { score: number; reasons: string[] } {
    let score = entity.attention_score ?? 0;
    const reasons: string[] = [];

    for (const rule of RULES) {
        if (rule.matches(entity)) {
            score = Math.max(score, rule.baseScore);
            reasons.push(rule.reason(entity));
        }
    }

    return { score: Math.min(100, score), reasons };
}

// ── Build the attention brief ─────────────────────────────────────────────────
export function buildAttentionBrief(snapshot: MeshSnapshot): AttentionBrief {
    const allEntities: SAREntity[] = [
        ...snapshot.workstation.devices,
        ...snapshot.workstation.storage,
        ...snapshot.workstation.processes,
        ...snapshot.workstation.displays,
        ...snapshot.nas.containers,
        ...snapshot.nas.volumes,
        ...snapshot.gcp.services,
    ];

    const scored = allEntities
        .map(entity => {
            const { score, reasons } = scoreEntity(entity);
            return {
                entity,
                score,
                reason: reasons[0] ?? `${entity.label} is ${entity.status}`,
            };
        })
        .filter(s => s.score >= 20)
        .sort((a, b) => b.score - a.score)
        .slice(0, 12);

    const anomalies = scored
        .filter(s => s.score >= 70)
        .map(s => s.reason);

    const digest = buildDigest(snapshot, scored, anomalies);

    return {
        generated_at: new Date().toISOString(),
        top_entities: scored,
        anomalies,
        digest,
        new_since_last_boot: scored
            .filter(s => s.entity.category === 'device' && s.score >= 50)
            .map(s => s.entity.label),
    };
}

// ── Generate human-readable AVERI digest ─────────────────────────────────────
function buildDigest(
    snapshot: MeshSnapshot,
    scored: Array<{ entity: SAREntity; score: number; reason: string }>,
    anomalies: string[]
): string {
    const lines: string[] = [];

    lines.push(`🖥️  WORKSTATION: ${snapshot.workstation.hostname} · ${snapshot.workstation.os}`);
    lines.push(`    ${snapshot.workstation.devices.filter(d => d.status === 'online').length} devices · ${snapshot.workstation.displays.length} displays · uptime ${Math.round(snapshot.workstation.uptime_seconds / 3600)}h`);

    const offlineDevices = snapshot.workstation.devices.filter(d => d.status === 'offline');
    if (offlineDevices.length > 0) {
        lines.push(`    ⚠️  Offline: ${offlineDevices.map(d => d.label).join(', ')}`);
    }

    const nasOnline = snapshot.nas.online;
    const runningContainers = snapshot.nas.containers.filter(c => c.status === 'online');
    lines.push(`🗄️  NAS: ${nasOnline ? '🟢 online' : '🔴 OFFLINE'} · ${runningContainers.length}/${snapshot.nas.containers.length} containers running`);

    if (!nasOnline) {
        lines.push(`    🚨 NAS appears offline — Dispatch, Genkit, Redis all unreachable`);
    }

    const onlineGCP = snapshot.gcp.services.filter(s => s.status === 'online');
    lines.push(`☁️  GCP: ${onlineGCP.length}/${snapshot.gcp.services.length} services online`);

    if (anomalies.length > 0) {
        lines.push(`\n⚡ ATTENTION REQUIRED:`);
        for (const a of anomalies.slice(0, 5)) {
            lines.push(`   · ${a}`);
        }
    } else {
        lines.push(`✅ All systems nominal`);
    }

    return lines.join('\n');
}

// ── Boot injector output ──────────────────────────────────────────────────────
export function formatBootPanel(brief: AttentionBrief): string {
    return [
        '─────────────────────────────────────────',
        '⚡ SOVEREIGN MESH INTELLIGENCE — LIVE SAR',
        '─────────────────────────────────────────',
        brief.digest,
        '─────────────────────────────────────────',
    ].join('\n');
}
