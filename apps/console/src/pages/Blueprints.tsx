/**
 * Blueprints Console Page — W3
 *
 * Browse and execute Inception Blueprints (Finance, Healthcare, Media).
 * Shows a card grid, run panel with live reasoning trace, and simulation results.
 */

import { useState, useEffect, useCallback } from 'react';
import './Blueprints.css';

interface Blueprint {
    id: string;
    name: string;
    vertical: string;
    description: string;
    version: string;
    tags: string[];
    agentTeam: string[];
}

interface TraceStep {
    step: number;
    name: string;
    procedure: string;
    reasoning: string;
    output: unknown;
    latencyMs?: number;
}

interface RunResult {
    runId: string;
    blueprintId: string;
    status: 'running' | 'complete' | 'failed';
    traces: TraceStep[];
    finalAnswer: string;
    simulationPassed: boolean;
    constitutionalApproved: boolean;
    totalLatencyMs: number;
    error?: string;
}

const VERTICAL_COLORS: Record<string, string> = {
    finance: 'var(--inc-neon-teal, #00FFF5)',
    healthcare: 'var(--inc-neon-green, #7EDE8A)',
    media: 'var(--inc-amber, #FF6B35)',
};

const VERTICAL_COLOR_FALLBACK = 'var(--inc-amber, #FF6B35)';

const VERTICAL_ICONS: Record<string, string> = {
    finance: '📈',
    healthcare: '🏥',
    media: '🎬',
};

const DISPATCH_BASE = import.meta.env.VITE_DISPATCH_URL ?? 'http://localhost:5050';

export default function Blueprints() {
    const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
    const [selected, setSelected] = useState<Blueprint | null>(null);
    const [query, setQuery] = useState('');
    const [runResult, setRunResult] = useState<RunResult | null>(null);
    const [running, setRunning] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${DISPATCH_BASE}/blueprints`)
            .then(r => r.json())
            .then((data: Blueprint[]) => setBlueprints(data))
            .catch(() => setBlueprints(MOCK_BLUEPRINTS))
            .finally(() => setLoading(false));
    }, []);

    const runBlueprint = useCallback(async () => {
        if (!selected || !query.trim()) return;
        setRunning(true);
        setRunResult({ runId: '', blueprintId: selected.id, status: 'running', traces: [], finalAnswer: '', simulationPassed: false, constitutionalApproved: false, totalLatencyMs: 0 });

        try {
            const response = await fetch(`${DISPATCH_BASE}/blueprints/${selected.id}/run`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ blueprintId: selected.id, query }),
            });
            const result: RunResult = await response.json();
            setRunResult(result);
        } catch {
            setRunResult(prev => prev ? { ...prev, status: 'failed', error: 'Connection failed' } : null);
        } finally {
            setRunning(false);
        }
    }, [selected, query]);

    return (
        <div className="bp-container">
            <div className="bp-header">
                <h1 className="bp-title">
                    <span className="bp-accent">⊡</span> Inception Blueprints
                </h1>
                <p className="bp-subtitle">Domain-optimized agent configurations for regulated industries</p>
            </div>

            <div className="bp-layout">
                {/* Blueprint Grid */}
                <div className="bp-grid">
                    {loading ? [...Array(3)].map((_, i) => (
                        <div key={i} className="bp-card-skeleton" />
                    )) : blueprints.map(bp => (
                        <div
                            key={bp.id}
                            className={`bp-card ${selected?.id === bp.id ? 'active' : ''}`}
                            style={{ borderColor: selected?.id === bp.id ? (VERTICAL_COLORS[bp.vertical] ?? VERTICAL_COLOR_FALLBACK) : 'rgba(255,255,255,0.06)' }}
                            onClick={() => { setSelected(bp); setRunResult(null); }}
                        >
                            <div className="bp-card-top">
                                <span className="bp-icon">{VERTICAL_ICONS[bp.vertical]}</span>
                                <span className="bp-tag" style={{ color: VERTICAL_COLORS[bp.vertical] ?? VERTICAL_COLOR_FALLBACK, borderColor: VERTICAL_COLORS[bp.vertical] ?? VERTICAL_COLOR_FALLBACK }}>
                                    {bp.vertical}
                                </span>
                            </div>
                            <h3 className="bp-card-title">{bp.name}</h3>
                            <p className="bp-card-desc">{bp.description}</p>
                            <div className="bp-agent-row">
                                {bp.agentTeam.slice(0, 4).map(a => (
                                    <span key={a} className="bp-agent-chip">{a}</span>
                                ))}
                                {bp.agentTeam.length > 4 && <span className="bp-agent-chip">+{bp.agentTeam.length - 4}</span>}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Run Panel */}
                {selected && (
                    <div className="bp-run-panel">
                        <h2 className="bp-panel-title">Run — {selected.name}</h2>

                        <div className="bp-field">
                            <label className="bp-label">Query / Prompt</label>
                            <textarea
                                className="bp-textarea"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                rows={4}
                                title="Blueprint Query"
                                placeholder={`e.g. "${selected.vertical === 'finance' ? 'Analyze AAPL given Q4 earnings miss' : selected.vertical === 'healthcare' ? 'Patient presents with chest pain and hypertension' : 'Generate a product launch campaign for Q2'}"`}
                            />
                        </div>

                        <button onClick={runBlueprint} disabled={running || !query.trim()} className="bp-run-btn">
                            {running ? '⟳ Executing Reasoning Trace...' : '▶ Run Blueprint'}
                        </button>

                        {/* Trace Output */}
                        {runResult && (
                            <div className="bp-trace-container">
                                <div className="bp-trace-header">
                                    <span className="bp-status-dot" style={{ background: runResult.status === 'complete' ? 'var(--status-success)' : runResult.status === 'failed' ? 'var(--status-error)' : 'var(--amber)' }} />
                                    <span className="bp-trace-status">{runResult.status}</span>
                                    {runResult.constitutionalApproved && <span className="bp-approved-badge">✓ Constitutional</span>}
                                    {runResult.simulationPassed && <span className="bp-approved-badge">✓ Simulation</span>}
                                </div>

                                {runResult.traces.map((trace, idx) => (
                                    <div key={idx} className="bp-trace-step">
                                        <div className="bp-step-header">
                                            <span className="bp-step-num">Step {trace.step}</span>
                                            <span className="bp-step-name">{trace.name}</span>
                                            {trace.latencyMs && <span className="bp-latency">{trace.latencyMs}ms</span>}
                                        </div>
                                        <p className="bp-step-proc">{trace.procedure}</p>
                                        {trace.reasoning && <p className="bp-step-reasoning">{trace.reasoning}</p>}
                                    </div>
                                ))}

                                {runResult.finalAnswer && (
                                    <div className="bp-final-answer">
                                        <h4 className="bp-final-label">Final Recommendation</h4>
                                        <p className="bp-final-text">{runResult.finalAnswer}</p>
                                        {runResult.totalLatencyMs > 0 && (
                                            <p className="bp-total-latency">Total: {runResult.totalLatencyMs}ms</p>
                                        )}
                                    </div>
                                )}

                                {runResult.error && <p className="bp-error-text">{runResult.error}</p>}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

const MOCK_BLUEPRINTS: Blueprint[] = [
    { id: 'finance-v1', name: 'Financial Analysis Suite', vertical: 'finance', description: 'Institutional research, risk assessment, and compliance-aware recommendations.', version: '1.0.0', tags: ['sox', 'mifid'], agentTeam: ['ATHENA', 'VERA', 'LEX', 'COMPASS', 'PRISM'] },
    { id: 'healthcare-v1', name: 'Clinical Decision Support', vertical: 'healthcare', description: 'HIPAA-aware differential diagnosis and treatment recommendation engine.', version: '1.0.0', tags: ['hipaa'], agentTeam: ['ATHENA', 'VERA', 'LEX', 'SENTINEL', 'HARBOR'] },
    { id: 'media-v1', name: 'Broadcast Production Suite', vertical: 'media', description: 'Real-time creative concept to rights-cleared production breakdown.', version: '1.0.0', tags: ['broadcast'], agentTeam: ['IRIS', 'AURORA', 'ATLAS', 'BOLT', 'GRAPHICS'] },
];
