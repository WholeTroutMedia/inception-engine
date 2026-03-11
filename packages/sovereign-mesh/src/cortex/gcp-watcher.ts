import type { GCPServiceEntity } from '../schema/index.js';

// ─── CORTEX GCP Watcher — Cloud Resource Poller ───────────────────────────────
// Polls GCP Asset API + Cloud Run + Firebase endpoints to build a live picture
// of all cloud resources under the Creative Liberation Engine Community Google account.
// Uses GOOGLE_APPLICATION_CREDENTIALS or gcloud CLI (no SDK required).

const GCP_PROJECT = 'wholtroutmedia';  // Update if project ID differs
const CLOUD_RUN_BASE = `https://run.googleapis.com/v2/projects/${GCP_PROJECT}/locations`;

async function fetchGCPJSON<T>(url: string, token: string): Promise<T | null> {
    try {
        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
            signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) return null;
        return await res.json() as T;
    } catch {
        return null;
    }
}

async function getGCPToken(): Promise<string | null> {
    // Try Application Default Credentials metadata server (GCE/Cloud Run)
    try {
        const res = await fetch(
            'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
            { headers: { 'Metadata-Flavor': 'Google' }, signal: AbortSignal.timeout(2000) }
        );
        if (res.ok) {
            const data = await res.json() as { access_token: string };
            return data.access_token;
        }
    } catch { /* not on GCP */ }

    // Try gcloud CLI
    try {
        const { execSync } = await import('child_process');
        const token = execSync('gcloud auth print-access-token 2>/dev/null', {
            encoding: 'utf8', timeout: 5000
        }).trim();
        if (token) return token;
    } catch { /* gcloud not available */ }

    return null;
}

interface CloudRunService {
    name: string;
    uri?: string;
    conditions?: Array<{ type: string; state: string }>;
    latestReadyRevision?: string;
    traffic?: Array<{ percent: number }>;
}

export async function collectGCPServices(): Promise<GCPServiceEntity[]> {
    const services: GCPServiceEntity[] = [];
    const now = new Date().toISOString();
    const token = await getGCPToken();

    if (token) {
        // Cloud Run services
        const regions = ['us-central1', 'us-east1'];
        for (const region of regions) {
            const data = await fetchGCPJSON<{ services?: CloudRunService[] }>(
                `${CLOUD_RUN_BASE}/${region}/services`,
                token
            );
            for (const svc of data?.services ?? []) {
                const shortName = svc.name.split('/').pop() ?? svc.name;
                const isReady = svc.conditions?.find(c => c.type === 'Ready')?.state === 'CONDITION_SUCCEEDED';
                services.push({
                    id: `gcp-run-${shortName}`,
                    tier: 'gcp' as const,
                    category: 'gcp_service' as const,
                    label: shortName,
                    status: isReady ? 'online' as const : 'degraded' as const,
                    last_seen: now,
                    attention_score: isReady ? 3 : 80,
                    service_type: 'cloud_run',
                    region,
                    url: svc.uri,
                    project_id: GCP_PROJECT,
                    traffic_percent: svc.traffic?.[0]?.percent ?? 100,
                } satisfies GCPServiceEntity);
            }
        }
    }

    // Known GCP services we always track (probe by URL, no auth needed)
    const knownPublicServices: Array<Omit<GCPServiceEntity, 'status' | 'last_seen' | 'attention_score'>> = [
        {
            id: 'gcp-averi-mobile',
            tier: 'gcp',
            category: 'gcp_service',
            label: 'AVERI Mobile (Firebase Hosting)',
            service_type: 'firebase',
            project_id: 'cle-mobile',
            url: 'https://cle-mobile.web.app',
        },
        {
            id: 'gcp-cle-run',
            tier: 'gcp',
            category: 'gcp_service',
            label: 'Creative Liberation Engine (Cloud Run)',
            service_type: 'cloud_run',
            region: 'us-central1',
            project_id: GCP_PROJECT,
            url: 'https://cle-[hash]-uc.a.run.app',
        },
    ];

    for (const svc of knownPublicServices) {
        if (services.find(s => s.id === svc.id)) continue;  // already found via API

        let online = false;
        if (svc.url && !svc.url.includes('[hash]')) {
            try {
                const r = await fetch(svc.url, { method: 'HEAD', signal: AbortSignal.timeout(4000) });
                online = r.ok;
            } catch { /* offline */ }
        }

        services.push({
            ...svc,
            status: online ? 'online' as const : 'unknown' as const,
            last_seen: now,
            attention_score: 5,
        } satisfies GCPServiceEntity);
    }

    return services;
}

// ── Full GCP snapshot ─────────────────────────────────────────────────────────
export async function collectGCPSnapshot() {
    const services = await collectGCPServices();
    return {
        captured_at: new Date().toISOString(),
        tier: 'gcp' as const,
        project_id: GCP_PROJECT,
        online: services.some(s => s.status === 'online'),
        services,
    };
}
