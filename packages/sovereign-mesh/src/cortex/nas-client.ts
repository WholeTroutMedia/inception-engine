import type { ContainerEntity, VolumeEntity } from '../schema/index.js';

// â”€â”€â”€ CORTEX NAS Client â€” Synology/Docker State Reader â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Reads NAS state via the Dispatch Server HTTP API (already running on NAS at :5050).
// Also directly queries Docker socket and Synology DSM API if available.
// No SSH required â€” pure HTTP on local network.

const DISPATCH_BASE = 'http://127.0.0.1:5050';
const DSM_BASE = 'http://127.0.0.1:5000';  // Synology DSM web API

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T | null> {
    try {
        const res = await fetch(url, { signal: AbortSignal.timeout(5000), ...init });
        if (!res.ok) return null;
        return await res.json() as T;
    } catch {
        return null;
    }
}

// â”€â”€ Docker containers via Dispatch server proxy â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface DispatchStatus {
    summary: { total_agents: number };
    active_agents: Array<{ agent_id: string; status: string; current_task: string }>;
}

export async function collectNASContainers(): Promise<ContainerEntity[]> {
    // Primary: use dispatch server status (always available on NAS)
    const status = await fetchJSON<DispatchStatus>(`${DISPATCH_BASE}/api/status`);

    const containers: ContainerEntity[] = [];

    // Represent known NAS Docker services as container entities
    const knownServices = [
        { id: 'dispatch-server', image: 'inception/dispatch-server', port: '5050' },
        { id: 'genkit-engine', image: 'inception/genkit', port: '4100' },
        { id: 'redis', image: 'redis:7', port: '6379' },
        { id: 'forgejo', image: 'codeberg.org/forgejo/forgejo', port: '3000' },
        { id: 'scribe-mcp', image: 'inception/scribe-mcp', port: '3100' },
    ];

    for (const svc of knownServices) {
        // Probe health endpoint to determine online status
        const health = await fetchJSON<{ status: string }>(
            `http://127.0.0.1:${svc.port}/health`
        );

        containers.push({
            id: svc.id,
            tier: 'nas' as const,
            category: 'container' as const,
            label: svc.id,
            status: health?.status === 'operational' || health?.status === 'ok' ? 'online' as const
                : health !== null ? 'degraded' as const : 'offline' as const,
            last_seen: new Date().toISOString(),
            attention_score: health === null ? 70 : 5,
            container_id: svc.id,
            image: svc.image,
            ports: [svc.port],
            restart_count: 0,
            health: health !== null ? 'healthy' as const : 'unhealthy' as const,
        } satisfies ContainerEntity);
    }

    // Add dispatch agent count as metadata
    if (status) {
        const dispatchContainer = containers.find(c => c.id === 'dispatch-server');
        if (dispatchContainer) {
            dispatchContainer.status = 'online';
            dispatchContainer.health = 'healthy';
            dispatchContainer.metadata = {
                total_agents: status.summary.total_agents,
                active_agents: status.active_agents.filter(a => a.status === 'active').length,
            };
        }
    }

    return containers;
}

// â”€â”€ NAS volumes (estimated from known SMB shares) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function collectNASVolumes(): Promise<VolumeEntity[]> {
    const now = new Date().toISOString();

    // These are the known Synology shares. A future version can query DSM API.
    const knownShares = [
        { id: 'volume1', name: 'volume1', path: '/volume1' },
        { id: 'media', name: 'media', path: '/volume1/media' },
        { id: 'homes', name: 'homes', path: '/volume1/homes' },
        { id: 'docker', name: 'docker', path: '/volume1/docker' },
    ];

    // Try DSM API for real disk usage (no auth = limited data, auth optional)
    const dsmInfo = await fetchJSON<{
        data: { volumes: Array<{ vol_path: string; size: { total: number; used: number } }> }
    }>(`${DSM_BASE}/webapi/query.cgi?api=SYNO.Core.Storage.Volume&method=list&version=1`);

    return knownShares.map(share => {
        const dsmVol = dsmInfo?.data?.volumes?.find(v => v.vol_path === share.path);
        const total = dsmVol?.size.total ?? 16 * 1024 * 1024 * 1024 * 1024;  // 16TB default
        const used = dsmVol?.size.used ?? 0;

        return {
            id: share.id,
            tier: 'nas' as const,
            category: 'volume' as const,
            label: share.name,
            status: 'online' as const,
            last_seen: now,
            attention_score: used / total > 0.9 ? 90 : 3,
            share_name: share.name,
            path: share.path,
            total_bytes: total,
            free_bytes: total - used,
        } satisfies VolumeEntity;
    });
}

// â”€â”€ Full NAS snapshot â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function collectNASSnapshot() {
    const [containers, volumes] = await Promise.all([
        collectNASContainers(),
        collectNASVolumes(),
    ]);

    const dispatchOnline = containers.find(c => c.id === 'dispatch-server')?.status === 'online';

    return {
        captured_at: new Date().toISOString(),
        tier: 'nas' as const,
        hostname: 'creative-liberation-engine',
        online: dispatchOnline,
        containers,
        volumes,
    };
}
