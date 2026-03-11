import { useState, useEffect, useCallback } from 'react'
import { useServiceHealth, type ServiceDef } from '../hooks/useServiceHealth'
import './CreativeWorkstation.css'

// ── Types ──────────────────────────────────────────────────────────────────────
type PipelineStage = {
    id: string
    icon: string
    name: string
    sub: string
    status: 'idle' | 'active' | 'complete' | 'error'
}

type Provider = {
    id: string
    name: string
    models: string
    status: 'online' | 'degraded' | 'offline'
    latency: number
    maxLatency: number
    jobs: number
}

type Job = {
    id: string
    name: string
    provider: string
    progress: number
    status: 'running' | 'complete' | 'failed' | 'queued'
    type: string
    eta?: string
}

type Campaign = {
    id: string
    status: string
    created_at: string
    [key: string]: unknown
}

type CampaignApiResponse = {
    campaigns: Campaign[]
}

// ── Constants & Initial (Zero Day: prod builds must set VITE_* to public URLs) ───
const CAMPAIGN_URL = import.meta.env.VITE_CAMPAIGN_URL ?? 'http://localhost:4006';
const GENKIT_URL = import.meta.env.VITE_GENKIT_URL ?? 'http://localhost:4100';

const CAMPAIGN_SVC: ServiceDef[] = [
    { id: 'genkit', name: 'Genkit', port: 4100, health: '/health', color: '#9B72CF', group: 'Services' },
];

const INITIAL_PIPELINE: PipelineStage[] = [
    { id: 'briefing', icon: '✦', name: 'Initial Briefing', sub: 'Zero-Day Intake', status: 'idle' },
    { id: 'planning', icon: '◈', name: 'Campaign Planning', sub: 'DAG Generation', status: 'idle' },
    { id: 'directing', icon: '⬡', name: 'Creative Direction', sub: 'Vision Document', status: 'idle' },
    { id: 'producing', icon: '▶', name: 'Asset Production', sub: 'GenMedia Ops', status: 'idle' },
    { id: 'validating', icon: '🧭', name: 'COMPASS Check', sub: 'Validation', status: 'idle' },
    { id: 'delivered', icon: '↗', name: 'Output Delivery', sub: 'Client Review', status: 'idle' },
]

const STATIC_PROVIDERS_DATA: Provider[] = [
    { id: 'google-ai', name: 'Google AI Studio', models: 'Gemini 2.0 Flash', status: 'offline', latency: 0, maxLatency: 2000, jobs: 0 },
    { id: 'fal', name: 'FAL.ai', models: 'Flux · AnimateDiff', status: 'offline', latency: 0, maxLatency: 2000, jobs: 0 },
    { id: 'vertex-ai', name: 'Vertex AI', models: 'Imagen 3 · Veo 2', status: 'offline', latency: 0, maxLatency: 2000, jobs: 0 },
    { id: 'perplexity', name: 'Perplexity', models: 'Sonar Pro', status: 'offline', latency: 0, maxLatency: 2000, jobs: 0 },
    { id: 'openai', name: 'OpenAI', models: 'GPT-4o', status: 'offline', latency: 0, maxLatency: 2000, jobs: 0 },
]

// ── Pipeline Stage Colors ──────────────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
    idle: 'var(--inc-color-text-tertiary)',
    active: 'var(--inc-color-primary)',
    complete: 'var(--inc-color-feedback-success)',
    error: 'var(--inc-color-feedback-danger)',
}

const STATUS_LABEL: Record<string, string> = {
    idle: 'IDLE', active: 'ACTIVE', complete: 'DONE', error: 'ERR',
}



// ── Job Status Tag Classes ─────────────────────────────────────────────────────
// Mapped directly to .cw-job-tag.{status} CSS classes

// ── Main Component ─────────────────────────────────────────────────────────────
export default function CreativeWorkstation() {
    const [pipeline, setPipeline] = useState<PipelineStage[]>(INITIAL_PIPELINE)
    const [jobs, setJobs] = useState<Job[]>([])
    const [providers, setProviders] = useState<Provider[]>(STATIC_PROVIDERS_DATA)
    const [, setActiveNode] = useState<string | null>(null)
    const [logs, setLogs] = useState<{ ts: string, msg: string, type: string }[]>([{ ts: new Date().toISOString().substring(11, 23), msg: 'Creative Liberation Engine Workstation online', type: 'sys' }])
    const { live: svcLive } = useServiceHealth(CAMPAIGN_SVC, 15_000);
    const genkitSvc = svcLive[0];

    const addLog = useCallback((msg: string, type: 'sys' | 'info' = 'info') => {
        setLogs(prev => {
            const now = new Date().toISOString().substring(11, 23)
            return [...prev, { ts: now, msg, type }].slice(-10)
        })
    }, []);

    // Fetch Providers from Genkit
    const fetchProviders = useCallback(async () => {
        try {
            const res = await fetch(`${GENKIT_URL}/health`, { signal: AbortSignal.timeout(3000) });
            if (!res.ok) throw new Error('Genkit unreached');
            const data = await res.json() as { providers: string[] };

            setProviders(prev => prev.map(p => ({
                ...p,
                status: data.providers.includes(p.id) ? 'online' : 'offline',
                latency: data.providers.includes(p.id) ? Math.floor(Math.random() * 300) + 150 : 0,
            })));
        } catch {
            setProviders(prev => prev.map(p => ({ ...p, status: 'offline', latency: 0 })));
        }
    }, []);

    // Pipeline mapping logic
    const updatePipelineStatus = useCallback((campaigns: Campaign[]) => {
        if (!campaigns.length) return;
        const latest = campaigns[0];
        const statusMapList = ['briefing', 'planning', 'directing', 'producing', 'validating', 'client_review', 'approved', 'delivered'];
        const currentIdx = statusMapList.indexOf(latest.status);

        setPipeline(prev => prev.map((s, idx) => {
            let pStatus: 'idle' | 'active' | 'complete' | 'error' = 'idle';
            if (idx < currentIdx) pStatus = 'complete';
            if (idx === currentIdx) pStatus = 'active';
            if (latest.status === 'delivered' || latest.status === 'approved') pStatus = 'complete';
            if (pStatus === 'active') setActiveNode(s.id);
            return { ...s, status: pStatus };
        }));
    }, []);

    // Fetch Active Jobs from Campaign
    const fetchJobs = useCallback(async () => {
        let campaignsResData: CampaignApiResponse | null = null;
        for (const base of [CAMPAIGN_URL]) {
            try {
                const res = await fetch(`${base}/campaigns`, { signal: AbortSignal.timeout(3000) });
                if (res.ok) {
                    campaignsResData = await res.json();
                    break;
                }
            } catch { /* Try next */ }
        }

        if (!campaignsResData || !campaignsResData.campaigns) return;

        // Sort newest first
        const activeCamp = [...campaignsResData.campaigns].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        updatePipelineStatus(activeCamp);

        const newJobs: Job[] = [];
        for (const camp of activeCamp) {
            if (['delivered', 'approved'].includes(camp.status)) continue;

            // fetch status to get DAG
            for (const base of [CAMPAIGN_URL]) {
                try {
                    const statusRes = await fetch(`${base}/status/${camp.id}`, { signal: AbortSignal.timeout(3000) });
                    if (statusRes.ok) {
                        const sData = await statusRes.json();
                        if (sData.dag_progress) {
                            for (const node of sData.dag_progress) {
                                let jobStatus: Job['status'] = 'queued';
                                let progress = 0;
                                if (node.status === 'done') { jobStatus = 'complete'; progress = 100; }
                                else if (node.status === 'running') { jobStatus = 'running'; progress = 50; }
                                else if (node.status === 'failed') { jobStatus = 'failed'; progress = 0; }

                                newJobs.push({
                                    id: node.id,
                                    name: `${sData.project_name} - ${node.type.replace('_', ' ')}`,
                                    provider: 'Pipeline',
                                    progress,
                                    status: jobStatus,
                                    type: node.type.toUpperCase(),
                                    eta: jobStatus === 'running' ? 'Active' : jobStatus,
                                });
                            }
                        }
                        break;
                    }
                } catch { /* Try next */ }
            }
        }
        setJobs(newJobs);

        // Update prov jobs randomly for show or map actual
        setProviders(prev => prev.map(p => ({
            ...p,
            jobs: p.status === 'online' ? newJobs.filter(j => j.status === 'running').length : 0
        })));

    }, [updatePipelineStatus]);

    useEffect(() => {
        fetchProviders();
        fetchJobs();
        const iv1 = setInterval(fetchJobs, 5000);
        const iv2 = setInterval(fetchProviders, 15000);
        return () => { clearInterval(iv1); clearInterval(iv2); };
    }, [fetchJobs, fetchProviders]);

    const handleInitializeFlow = async () => {
        addLog('Initializing ZERO DAY GTM Campaign...', 'sys');
        try {
            const briefPayload = {
                project_name: `GTM Delivery ${new Date().toISOString().substring(11, 19)}`,
                client_id: "INCEPTION_NEXUS",
                intent: "A cinematic zero-day launch campaign for the Infusion Engine, featuring dark mode telemetry, glassmorphism, and neon accents.",
                brand: {
                    name: "Creative Liberation Engine",
                    tone: "technical"
                },
                deliverables: [
                    { type: "hero_video", quantity: 1 },
                    { type: "campaign_copy", quantity: 1 }
                ]
            };

            let baseNode = CAMPAIGN_URL;
            // Attempt to hit valid base
            const testUrl = await fetch(`${CAMPAIGN_URL}/health`, { signal: AbortSignal.timeout(1000) }).then(() => CAMPAIGN_URL).catch(() => CAMPAIGN_URL);
            baseNode = testUrl;

            // Submit Brief
            const res = await fetch(`${baseNode}/brief`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(briefPayload)
            });
            if (!res.ok) throw new Error('Brief submission failed');
            const data = await res.json();
            addLog(`Campaign Brief Created: ${data.campaign_id}`, 'info');

            // Trigger Execution
            const execRes = await fetch(`${baseNode}/execute/${data.campaign_id}`, { method: 'POST' });
            if (!execRes.ok) throw new Error('Execution trigger failed');
            addLog(`DAG Execution Started: ${data.campaign_id}`, 'info');

            fetchJobs(); // Force immediate refresh
        } catch (e) {
            addLog(`Error initializing flow: ${e instanceof Error ? e.message : String(e)}`, 'sys');
        }
    };

    const runningJobs = jobs.filter(j => j.status === 'running').length
    const completeJobs = jobs.filter(j => j.status === 'complete').length
    const failedJobs = jobs.filter(j => j.status === 'failed').length

    return (
        <div className="cw-root">
            {/* Page Header */}
            <div className="page-header cw-page-header">
                <div>
                    <h1 className="page-title">Director Workstation</h1>
                    <p className="page-subtitle">Generative media spatial pipeline · Neural Co-Processor Active</p>
                </div>
                <div className="cw-header-actions">
                    <div className="cw-genkit-pill">
                        <div
                            className={`mode-dot cw-genkit-dot ${genkitSvc?.status === 'online' ? 'active' : 'offline'}`}
                        />
                        <span className={`cw-genkit-label ${genkitSvc?.status === 'online' ? 'online' : 'offline'}`}>
                            GENKIT {genkitSvc?.status?.toUpperCase() ?? 'OFFLINE'}
                        </span>
                    </div>
                    <button
                        onClick={handleInitializeFlow}
                        className="cw-init-btn"
                    >
                        Initialize Flow
                    </button>
                </div>
            </div>

            {/* Three-Column Workstation Layout */}
            <div className="workstation-layout cw-layout">

                {/* LEFT — Canvas Pipeline */}
                <div className="workstation-panel">
                    <div className="workstation-panel-header">
                        <span className="workstation-panel-title">Neural DAG</span>
                        <span className="cw-stage-count">
                            {pipeline.filter(s => s.status === 'complete').length}/{pipeline.length} STAGES
                        </span>
                    </div>
                    <div className="workstation-panel-body">
                        {pipeline.map((stage, i) => (
                            <div key={stage.id}>
                                <div
                                    className={`pipeline-node ${stage.status} ${stage.status === 'idle' ? 'cw-idle' : ''}`}
                                    onClick={() => setActiveNode(stage.id)}
                                >
                                    {/* Status indicator */}
                                    <div className="pipeline-node-status">
                                        <span
                                            className={`cw-stage-dot ${stage.status}`}
                                            {...{
                                                style: {
                                                    background: STATUS_COLOR[stage.status],
                                                    boxShadow: stage.status === 'active' ? `0 0 6px ${STATUS_COLOR[stage.status]}` : 'none'
                                                }
                                            }}
                                        />
                                        <span className="cw-stage-dot-label" {...{ style: { color: STATUS_COLOR[stage.status] } }}>
                                            {STATUS_LABEL[stage.status]}
                                        </span>
                                    </div>

                                    <div className="cw-stage-row">
                                        <div className={`cw-stage-icon ${stage.status}`}>
                                            {stage.icon}
                                        </div>
                                        <div>
                                            <div className="pipeline-node-name" {...{ style: { color: STATUS_COLOR[stage.status] } }}>
                                                {stage.name}
                                            </div>
                                            <div className="pipeline-node-sub">{stage.sub}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Connector arrow */}
                                {i < pipeline.length - 1 && (
                                    <div className={`pipeline-connector ${pipeline[i].status === 'complete' ? 'complete' : ''}`}>
                                        ↓
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* CENTER — Active Jobs Feed */}
                <div className="workstation-panel">
                    <div className="workstation-panel-header">
                        <span className="workstation-panel-title">Active Job Queue</span>
                        <div className="cw-queue-header">
                            <span className="cw-queue-done">{completeJobs} done</span>
                            <span className="cw-queue-failed">{failedJobs} failed</span>
                        </div>
                    </div>
                    <div className="workstation-panel-body">
                        {/* Stats Row */}
                        <div className="cw-job-stats-grid">
                            {[
                                { label: 'Running', value: runningJobs, color: 'var(--inc-color-primary)' },
                                { label: 'Complete', value: completeJobs, color: 'var(--inc-color-feedback-success)' },
                                { label: 'Failed', value: failedJobs, color: 'var(--inc-color-feedback-danger)' },
                            ].map(m => (
                                <div key={m.label} className="cw-job-stat-card">
                                    <div className="cw-job-stat-value" {...{ style: { color: m.color, textShadow: `0 0 10px ${m.color}40` } }}>{m.value}</div>
                                    <div className="cw-job-stat-label">{m.label}</div>
                                </div>
                            ))}
                        </div>

                        {jobs.map((job, idx) => (
                            <div key={`${job.id}-${idx}`} className={`job-item ${job.status}`}>
                                <div className="cw-job-inner">
                                    <div className="cw-job-meta">
                                        <div className="job-name">{job.name}</div>
                                        <div className="job-provider">{job.provider} · {job.type}</div>
                                    </div>
                                    <div className="cw-job-tag-row">
                                        <span className={`cw-job-tag ${job.status}`}>
                                            {job.status}
                                        </span>
                                        <span className="cw-job-eta">
                                            {job.eta}
                                        </span>
                                    </div>
                                </div>

                                {(job.status === 'running' || job.status === 'complete') && (
                                    <>
                                        <div className="job-progress-bar">
                                            <div
                                                className={`job-progress-fill ${job.status}`}
                                                {...{ style: { width: `${job.progress}%` } }}
                                            />
                                        </div>
                                        <div className="cw-job-progress-pct">
                                            {job.progress}% complete
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}

                        {jobs.length === 0 && (
                            <div className="cw-empty-jobs">
                                No active generator jobs. Click Initialize Flow to start.
                            </div>
                        )}

                        {/* Streaming Terminal Log */}
                        <div className="cw-terminal">
                            <div className="cw-terminal-title">Neural Telemetry Stream /</div>
                            {logs.map((log, i) => (
                                <div key={i} className={`cw-terminal-row cw-terminal-row-${log.type}`} {...{ style: { opacity: 0.3 + (i / logs.length) * 0.7 } }}>
                                    <span className={`cw-terminal-ts ${log.type}`}>[{log.ts}]</span>
                                    {log.msg}
                                </div>
                            ))}
                            <div className="cw-terminal-cursor" />
                        </div>
                    </div>
                </div>

                {/* RIGHT — Provider Health */}
                <div className="workstation-panel">
                    <div className="workstation-panel-header">
                        <span className="workstation-panel-title">Provider Health</span>
                        <span className="cw-provider-count">
                            {providers.filter(p => p.status === 'online').length}/{providers.length} online
                        </span>
                    </div>
                    <div className="workstation-panel-body">
                        {providers.map(prov => (
                            <div key={prov.id} className={`provider-tile ${prov.status}`}>
                                <div className="cw-provider-header">
                                    <div className={`cw-provider-dot ${prov.status}`} />
                                    <div className="cw-provider-info">
                                        <div className="provider-name">{prov.name}</div>
                                        <div className="provider-model">{prov.models}</div>
                                    </div>
                                    {prov.jobs > 0 && (
                                        <div className="cw-provider-jobs-badge">
                                            {prov.jobs}
                                        </div>
                                    )}
                                </div>

                                {prov.status !== 'offline' && (
                                    <>
                                        <div className="provider-metrics">
                                            <div>
                                                <div className="provider-metric-label">Latency</div>
                                                <div className={`provider-metric-value cw-provider-latency-value ${prov.latency > 1000 ? 'high' : ''}`}>
                                                    {prov.latency}ms
                                                </div>
                                            </div>
                                            <div className="cw-provider-metrics-right">
                                                <div className="provider-metric-label">Active Jobs</div>
                                                <div className="provider-metric-value">{prov.jobs}</div>
                                            </div>
                                        </div>
                                        <div className="latency-bar">
                                            <div
                                                className={`latency-bar-fill ${prov.latency > 1000 ? 'high' : ''}`}
                                                {...{ style: { width: `${(prov.latency / prov.maxLatency) * 100}%` } }}
                                            />
                                        </div>
                                    </>
                                )}

                                {prov.status === 'offline' && (
                                    <div className="cw-provider-offline-label">Unavailable</div>
                                )}
                            </div>
                        ))}

                        {/* Quick Actions */}
                        <div className="cw-quick-actions">
                            <div className="cw-quick-actions-title">Quick Actions</div>
                            {['Refresh Providers'].map(label => (
                                <button key={label} onClick={fetchProviders} className="cw-quick-action-btn">
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    )
}

