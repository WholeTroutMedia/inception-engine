/**
 * COMET — CometPage
 * Phase C: Spatial Intelligence Console UI
 *
 * Two primary views:
 *   1. COMMAND — Natural language task input + execution stream
 *   2. TOPOLOGY — Interactive SMG force-graph of mapped domains
 *
 * Design: Spatial. Dense. Fast. Constitutional.
 */

import React, { useState, useRef, useCallback } from 'react';
import { useSMGStore } from '../hooks/useSMGStore';
import { useCometSocket } from '../hooks/useCometSocket';
import './CometPage.css';

const GATEWAY = import.meta.env.VITE_GATEWAY_URL ?? 'http://localhost:3080';

// Typed response from COMET /execute endpoint
interface CometResponse {
    status: string;
    mode_used?: string;
    smg_hit?: boolean;
    task_id?: string;
    error?: string;
    preflight?: { verdict: 'APPROVED' | 'REVIEW' | 'BLOCKED'; reasoning: string; flagged_nodes: string[] };
    plan?: { id: string; nodes: Array<{ node_id: string; type: string; action?: string; description: string; requires_confirmation?: boolean }>; };
    result?: { node_results: Array<{ node_id: string; status: string }>; smg_updates: number; duration_ms: number; };
}

// ─── Lynch Type Colors ───────────────────────────────────────────────────────
const LYNCH_COLORS = {
    landmark: '#E8621A',   // Copper — dominant
    node: '#C93B2A',   // Live Red — high-traffic hub
    district: '#B05A38',   // Burnt sienna — zone
    path: '#8C6D50',   // Warm grey-brown — passage
    edge: '#5A4A3A',   // Deep — boundary
};

const LYNCH_LABELS = {
    landmark: '◆ Landmark',
    node: '● Node',
    district: '▣ District',
    path: '→ Path',
    edge: '┤ Edge',
};

// ─── StatusPill ──────────────────────────────────────────────────────────────
function StatusPill({ verdict }: { verdict?: 'APPROVED' | 'REVIEW' | 'BLOCKED' }) {
    if (!verdict) return null;
    return (
        <span className={`comet-status-pill ${verdict.toLowerCase()}`}>{verdict}</span>
    );
}

// ─── EventLog ────────────────────────────────────────────────────────────────
function EventLog({ events }: { events: ReturnType<typeof useCometSocket>['events'] }) {
    const logRef = useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
    }, [events]);

    return (
        <div ref={logRef} className="comet-event-log">
            {events.map((evt, i) => (
                <div key={i} className={`comet-event-item comet-event-type-${evt.type} ${!['node_start', 'node_complete', 'node_failed', 'node_repaired', 'plan_complete', 'connected', 'disconnected'].includes(evt.type) ? 'comet-event-type-default' : ''}`}>
                    <span className="comet-event-time">{evt.timestamp.slice(11, 19)}</span>
                    <span className="comet-event-type">{evt.type}</span>
                    {evt.node_id && <span className="comet-event-node">{evt.node_id}</span>}
                    {evt.description && <span className="comet-event-desc">{evt.description}</span>}
                    {evt.error && <span className="comet-event-err"> ✕ {evt.error}</span>}
                </div>
            ))}
            {events.length === 0 && (
                <div className="comet-event-empty">
                    Awaiting connection...
                </div>
            )}
        </div>
    );
}

// ─── SMG Coverage Block ──────────────────────────────────────────────────────
function CoverageMeter({ coverage }: { coverage: ReturnType<typeof useSMGStore>['coverage'] }) {
    if (!coverage) return null;
    const pct = Math.round(coverage.coverage_score * 100);
    const stalePct = Math.round(coverage.staleness_score * 100);
    return (
        <div className="comet-coverage-meter">
            <span className="comet-coverage-label">SMG: <span className={coverage.exists ? 'comet-coverage-val-mapped' : 'comet-coverage-val-unmapped'}>{coverage.exists ? `${pct}%` : 'UNMAPPED'}</span></span>
            <span className="comet-coverage-label">states: <span className="comet-coverage-val-states">{coverage.total_states}</span></span>
            <span className="comet-coverage-label">stale: <span className={stalePct > 50 ? 'comet-coverage-val-stale-bad' : 'comet-coverage-val-stale-ok'}>{stalePct}%</span></span>
            {coverage.crawl_in_progress && <span className="comet-coverage-crawling">⟳ crawling...</span>}
        </div>
    );
}

// ─── StateCard (topology list item) ─────────────────────────────────────────
function StateCard({ state, isActive }: { state: { id: string; label: string; lynch_type: string; inbound_count: number; elements: unknown[] }; isActive: boolean }) {
    const color = LYNCH_COLORS[state.lynch_type as keyof typeof LYNCH_COLORS] ?? '#B87333';
    return (
        <div
            className={`comet-state-card ${isActive ? 'active' : 'inactive'}`}
            style={{ ['--c-lynch' as string]: color }}
        >
            <span className="comet-state-lynch">{LYNCH_LABELS[state.lynch_type as keyof typeof LYNCH_LABELS] ?? state.lynch_type}</span>
            <span className="comet-state-label">{state.label}</span>
            <span className="comet-state-stats">{state.inbound_count}↓ {state.elements.length}el</span>
        </div>
    );
}

// ─── CometPage ────────────────────────────────────────────────────────────────
export default function CometPage() {
    const [url, setUrl] = useState('');
    const [instruction, setInstruction] = useState('');
    const [domain, setDomain] = useState('');
    const [view, setView] = useState<'command' | 'topology'>('command');
    const [executing, setExecuting] = useState(false);
    const [result, setResult] = useState<CometResponse | null>(null);
    const [autonomy, setAutonomy] = useState<'supervised' | 'autonomous'>('supervised');

    const { smg, coverage, loading: smgLoading, triggerCrawl } = useSMGStore(domain);
    const { events, connectionState, activeNodeId, connect, clearEvents } = useCometSocket();

    const execute = useCallback(async () => {
        if (!instruction.trim()) return;
        setExecuting(true);
        setResult(null);
        clearEvents();
        connect();

        try {
            const extractedDomain = url ? new URL(url).hostname : '';
            if (extractedDomain) setDomain(extractedDomain);

            const res = await fetch(`${GATEWAY}/comet/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, instruction, autonomy }),
            });
            const data = await res.json();
            setResult(data);
        } catch (err: unknown) {
            setResult({ status: 'failed', error: err instanceof Error ? err.message : String(err) });
        } finally {
            setExecuting(false);
        }
    }, [url, instruction, autonomy, connect, clearEvents]);

    const handleUrlBlur = () => {
        try { if (url) setDomain(new URL(url).hostname); }
        catch { /* ignore invalid URL */ }
    };

    const states = smg ? Object.values(smg.states)
        .sort((a, b) => b.inbound_count - a.inbound_count) : [];

    return (
        <div className="comet-container">

            {/* ── Header ── */}
            <div className="comet-header">
                <div className="comet-header-title">COMET</div>
                <div className="comet-header-subtitle">SOVEREIGN SPATIAL INTELLIGENCE LAYER</div>

                {/* View toggle */}
                <div className="comet-view-toggle">
                    {(['command', 'topology'] as const).map(v => (
                        <button key={v} onClick={() => setView(v)} className={`comet-view-btn ${view === v ? 'active' : 'inactive'}`}>
                            {v.toUpperCase()}
                        </button>
                    ))}
                </div>

                {/* Connection indicator */}
                <div className={`comet-connection-ind ${connectionState === 'connected' ? 'connected' : 'disconnected'}`}>
                    <span className={`comet-connection-dot ${connectionState === 'connected' ? 'connected' : 'disconnected'}`} />
                    {connectionState.toUpperCase()}
                </div>
            </div>

            {/* ── Coverage strip ── */}
            <CoverageMeter coverage={coverage} />

            {/* ── Body ── */}
            <div className="comet-body">

                {/* ── Left: Command Panel ── */}
                <div className="comet-command-panel">

                    {/* URL + Instruction input */}
                    <div className="comet-input-section">
                        <div className="comet-input-label">TARGET URL</div>
                        <input
                            value={url}
                            onChange={e => setUrl(e.target.value)}
                            onBlur={handleUrlBlur}
                            placeholder="https://example.com"
                            className="comet-url-input"
                        />
                    </div>

                    <div className="comet-input-section comet-input-section-flex">
                        <div className="comet-input-label">INSTRUCTION</div>
                        <textarea
                            value={instruction}
                            onChange={e => setInstruction(e.target.value)}
                            placeholder={'Find the top trending post title on Reddit\n\nSearch for "playwright" on GitHub and return the first result\n\nExtract all article headlines from the homepage'}
                            rows={6}
                            className="comet-instruction-textarea"
                        />

                        {/* Autonomy toggle */}
                        <div className="comet-autonomy-wrapper">
                            <span className="comet-autonomy-label">MODE</span>
                            {(['supervised', 'autonomous'] as const).map(m => (
                                <button key={m} onClick={() => setAutonomy(m)} className={`comet-autonomy-btn ${autonomy === m ? 'active' : 'inactive'}`}>
                                    {m.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Execute button */}
                    <div className="comet-input-section">
                        <button
                            onClick={execute}
                            disabled={executing || !instruction.trim()}
                            className={`comet-execute-btn ${executing ? 'executing' : 'ready'}`}
                        >
                            {executing ? '⟳ EXECUTING...' : '▶ EXECUTE'}
                        </button>
                    </div>

                    {/* Preflight + result summary */}
                    {result && (
                        <div className="comet-result-summary">
                            <div className="comet-result-header">
                                <span className={`comet-result-status ${result.status === 'success' ? 'success' : result.status === 'blocked' ? 'blocked' : 'warning'}`}>
                                    {result.status === 'success' ? '✓' : result.status === 'blocked' ? '✕' : '⚠'} {result.status?.toUpperCase()}
                                </span>
                                <StatusPill verdict={result.preflight?.verdict} />
                                <span className="comet-result-mode">{result.mode_used?.toUpperCase()}</span>
                                {result.smg_hit && <span className="comet-smg-hit">SMG HIT</span>}
                            </div>
                            {result.error && <div className="comet-result-error">{result.error}</div>}
                            {result.result && (
                                <div className="comet-result-stats">
                                    {result.result.node_results?.length ?? 0} nodes •{' '}
                                    {result.result.smg_updates ?? 0} SMG updates •{' '}
                                    {result.result.duration_ms ?? 0}ms
                                </div>
                            )}
                            {result.plan && (
                                <div className="comet-result-plan-nodes">{result.plan.nodes?.length ?? 0} plan nodes</div>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Right: Main Panel ── */}
                <div className="comet-main-panel">

                    {view === 'command' ? (
                        /* Execution event log */
                        <>
                            <div className="comet-panel-header">
                                EXECUTION STREAM {domain && `— ${domain}`}
                            </div>
                            <EventLog events={events} />

                            {/* Plan node list if available */}
                            {result?.plan?.nodes && (
                                <div className="comet-plan-wrapper">
                                    <div className="comet-plan-header">PLAN NODES ({result.plan.nodes.length})</div>
                                    {result.plan.nodes.map((node) => {
                                        const nodeResult = result.result?.node_results?.find((r) => r.node_id === node.node_id);
                                        const statusColor = !nodeResult ? '#5A4A3A' : nodeResult.status === 'success' ? '#4CAF50' : nodeResult.status === 'repaired' ? '#8BC34A' : '#C93B2A';
                                        return (
                                            <div key={node.node_id} className={`comet-plan-node ${activeNodeId === node.node_id ? 'active' : 'inactive'}`}>
                                                {/* eslint-disable-next-line react/forbid-component-props -- CSS custom property injection for --c-node-status token */}
                                                <span
                                                    className="comet-node-status"
                                                    style={{ ['--c-node-status' as string]: statusColor }}
                                                >
                                                    {!nodeResult ? '○' : nodeResult.status === 'success' ? '✓' : nodeResult.status === 'repaired' ? '⟳' : '✕'}
                                                </span>
                                                <span className="comet-plan-node-id">{node.node_id}</span>
                                                <span className="comet-plan-node-action">{node.action}</span>
                                                <span className="comet-plan-node-desc">{node.description}</span>
                                                {node.requires_confirmation && <span className="comet-plan-node-confirm">CONFIRM</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    ) : (
                        /* Topology view — SMG state list */
                        <>
                            <div className="comet-panel-header comet-panel-header-flex">
                                <span>
                                    SMG TOPOLOGY {domain && `— ${domain}`} ({states.length} states)
                                </span>
                                <button onClick={() => triggerCrawl(url || undefined)} className="comet-crawl-btn">⟳ CRAWL</button>
                            </div>

                            {smgLoading && (
                                <div className="comet-topology-loading">Loading SMG...</div>
                            )}

                            {!smgLoading && !smg && (
                                <div className="comet-topology-empty">
                                    <div className="comet-topology-empty-text">
                                        No world model found for{domain ? ` "${domain}"` : ' this domain'}.
                                    </div>
                                    <button onClick={() => triggerCrawl(url || undefined)} className="comet-start-mapping-btn">START MAPPING</button>
                                </div>
                            )}

                            {smg && states.length > 0 && (
                                <>
                                    {/* Lynch type legend */}
                                    <div className="comet-lynch-legend">
                                        {Object.entries(LYNCH_LABELS).map(([type, label]) => (
                                            <span
                                                key={type}
                                                className="comet-lynch-legend-item"
                                                style={{ ['--c-lynch' as string]: LYNCH_COLORS[type as keyof typeof LYNCH_COLORS] }}
                                            >
                                                {label}
                                            </span>
                                        ))}
                                    </div>

                                    <div className="comet-state-list">
                                        {states.map(state => (
                                            <StateCard key={state.id} state={state} isActive={activeNodeId === state.id} />
                                        ))}
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

