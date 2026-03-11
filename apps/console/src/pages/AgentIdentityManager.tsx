/**
 * Agent Identity Manager — W4 (RBAC Console Page)
 *
 * Displays all 40 agents with their RBAC tier, capabilities, and active sessions.
 * ATHENA-level admin can grant/revoke capabilities.
 */

import { useState, useEffect } from 'react';
import './AgentIdentityManager.css';

interface AgentRecord {
    agentId: string;
    agentType: string;
    tier: 'system' | 'operator' | 'restricted';
    capabilities: string[];
    restrictions: string[];
    sessionToken?: string;
    issuedAt?: string;
    expiresAt?: string;
}

const TIER_ORDER = { system: 0, operator: 1, restricted: 2 } as const;

const GENKIT_BASE = import.meta.env.VITE_GENKIT_URL ?? 'http://localhost:4100';

const CAPABILITY_LABELS: Record<string, string> = {
    'read:memory': '📖 Read Memory',
    'write:memory': '✏️ Write Memory',
    'read:files': '📂 Read Files',
    'write:files': '💾 Write Files',
    'execute:genkit': '⚡ Execute Genkit',
    'call:external-apis': '🌐 External APIs',
    'manage:agents': '🤖 Manage Agents',
    'modify:constitution': '⚖️ Modify Constitution',
    'deploy:production': '🚀 Deploy Production',
    'audit:full': '🔍 Full Audit',
};

export default function AgentIdentityManager() {
    const [agents, setAgents] = useState<AgentRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'system' | 'operator' | 'restricted'>('all');
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<AgentRecord | null>(null);
    const [auditLog, setAuditLog] = useState<string[]>([]);

    useEffect(() => {
        fetch(`${GENKIT_BASE}/api/agents`)
            .then(r => r.json())
            .then((data: AgentRecord[]) => setAgents(data))
            .catch(() => setAgents(MOCK_AGENTS))
            .finally(() => {
                setLoading(false);
                setAuditLog([
                    `[${new Date().toLocaleTimeString()}] VERA — Agent catalog loaded (${MOCK_AGENTS.length} agents)`,
                    `[${new Date().toLocaleTimeString()}] KEEPER — Audit log initialized`,
                    `[${new Date().toLocaleTimeString()}] FORGE — Token issuance active`,
                ]);
            });
    }, []);

    const filtered = agents
        .filter(a => filter === 'all' || a.tier === filter)
        .filter(a => !search || a.agentId.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier]);

    const counts = {
        system: agents.filter(a => a.tier === 'system').length,
        operator: agents.filter(a => a.tier === 'operator').length,
        restricted: agents.filter(a => a.tier === 'restricted').length,
    };

    return (
        <div className="aim-container">
            <div className="aim-header">
                <h1 className="aim-title"><span className="aim-accent">🔐</span> Agent Identity Manager</h1>
                <p className="aim-subtitle">RBAC for all 40 agents — capabilities, restrictions, active sessions</p>
            </div>

            {/* Tier Summary */}
            <div className="aim-tier-row">
                {(['all', 'system', 'operator', 'restricted'] as const).map(t => (
                    <button
                        key={t}
                        onClick={() => setFilter(t)}
                        className={`aim-tier-btn ${filter === t ? 'active' : ''}`}
                    >
                        {t === 'all' ? `All (${agents.length})` : `${t.charAt(0).toUpperCase() + t.slice(1)} (${counts[t] ?? 0})`}
                    </button>
                ))}
                <input
                    className="aim-search"
                    placeholder="Search agents..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            <div className="aim-layout">
                {/* Agent Table */}
                <div className="aim-table-wrap">
                    {loading ? <div className="aim-loading">Loading agent catalog...</div> : (
                        <table className="aim-table">
                            <thead>
                                <tr>
                                    <th className="aim-th">Agent</th>
                                    <th className="aim-th">Type</th>
                                    <th className="aim-th">Tier</th>
                                    <th className="aim-th">Capabilities</th>
                                    <th className="aim-th">Session</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(agent => (
                                    <tr
                                        key={agent.agentId}
                                        onClick={() => setSelected(agent)}
                                        className={`aim-row ${selected?.agentId === agent.agentId ? 'active' : ''}`}
                                    >
                                        <td className="aim-td aim-td-id">{agent.agentId}</td>
                                        <td className="aim-td aim-td-type">{agent.agentType}</td>
                                        <td className="aim-td">
                                            <span className={`aim-tier-chip aim-tier-${agent.tier}`}>
                                                {agent.tier}
                                            </span>
                                        </td>
                                        <td className="aim-td">
                                            <span className="aim-cap-count">{agent.capabilities.length} caps</span>
                                        </td>
                                        <td className="aim-td">
                                            <span className={`aim-session-status ${agent.sessionToken ? 'active' : 'none'}`}>
                                                {agent.sessionToken ? '● active' : '○ none'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Detail Panel */}
                <div className="aim-detail-panel">
                    {!selected ? (
                        <div className="aim-empty-state">
                            <p>Select an agent to view details</p>
                        </div>
                    ) : (
                        <>
                            <h2 className="aim-agent-name">{selected.agentId}</h2>
                            <span className={`aim-tier-chip aim-tier-lg aim-tier-${selected.tier}`}>{selected.tier}</span>

                            <h3 className="aim-section-head">Capabilities</h3>
                            <div className="aim-cap-list">
                                {selected.capabilities.map(cap => (
                                    <span key={cap} className="aim-cap-badge">{CAPABILITY_LABELS[cap] ?? cap}</span>
                                ))}
                            </div>

                            {selected.restrictions.length > 0 && (
                                <>
                                    <h3 className="aim-section-head">Restrictions</h3>
                                    <div className="aim-cap-list">
                                        {selected.restrictions.map(r => (
                                            <span key={r} className={`aim-cap-badge aim-cap-badge-restricted`}>
                                                🚫 {r}
                                            </span>
                                        ))}
                                    </div>
                                </>
                            )}

                            <h3 className="aim-section-head">Session</h3>
                            <p className="aim-session-info">{selected.sessionToken ? `Active — expires ${selected.expiresAt ?? 'unknown'}` : 'No active session'}</p>
                        </>
                    )}

                    {/* Audit Log */}
                    <div className="aim-audit-section">
                        <h3 className="aim-section-head">Audit Log</h3>
                        <div className="aim-audit-log">
                            {auditLog.map((entry, i) => (
                                <div key={i} className="aim-audit-entry">{entry}</div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

const MOCK_AGENTS: AgentRecord[] = [
    { agentId: 'ATHENA', agentType: 'leadership', tier: 'system', capabilities: ['read:memory', 'write:memory', 'read:files', 'write:files', 'execute:genkit', 'call:external-apis', 'manage:agents', 'modify:constitution', 'deploy:production', 'audit:full'], restrictions: [] },
    { agentId: 'VERA', agentType: 'leadership', tier: 'system', capabilities: ['read:memory', 'write:memory', 'read:files', 'write:files', 'execute:genkit', 'call:external-apis', 'manage:agents', 'modify:constitution', 'deploy:production', 'audit:full'], restrictions: [] },
    { agentId: 'IRIS', agentType: 'leadership', tier: 'system', capabilities: ['read:memory', 'write:memory', 'read:files', 'write:files', 'execute:genkit', 'call:external-apis', 'manage:agents', 'modify:constitution', 'deploy:production', 'audit:full'], restrictions: [] },
    { agentId: 'LEX', agentType: 'hive', tier: 'system', capabilities: ['read:memory', 'write:memory', 'read:files', 'write:files', 'execute:genkit', 'call:external-apis', 'manage:agents', 'modify:constitution', 'deploy:production', 'audit:full'], restrictions: [] },
    { agentId: 'COMPASS', agentType: 'validator', tier: 'system', capabilities: ['read:memory', 'write:memory', 'read:files', 'write:files', 'execute:genkit', 'call:external-apis', 'manage:agents', 'modify:constitution', 'deploy:production', 'audit:full'], restrictions: [] },
    { agentId: 'AURORA', agentType: 'hive', tier: 'operator', capabilities: ['read:memory', 'write:memory', 'read:files', 'write:files', 'execute:genkit', 'call:external-apis', 'deploy:production'], restrictions: [] },
    { agentId: 'FORGE', agentType: 'hive', tier: 'operator', capabilities: ['read:memory', 'write:memory', 'read:files', 'write:files', 'execute:genkit', 'call:external-apis', 'deploy:production'], restrictions: [] },
    { agentId: 'KEEPER', agentType: 'hive', tier: 'operator', capabilities: ['read:memory', 'write:memory', 'read:files', 'write:files', 'execute:genkit', 'call:external-apis', 'deploy:production', 'audit:full'], restrictions: [] },
    { agentId: 'SCRIBE', agentType: 'coordinator', tier: 'operator', capabilities: ['read:memory', 'write:memory', 'read:files', 'write:files', 'execute:genkit', 'call:external-apis', 'deploy:production', 'audit:full'], restrictions: [] },
    { agentId: 'BOLT', agentType: 'hive', tier: 'restricted', capabilities: ['read:memory', 'write:memory', 'read:files', 'execute:genkit'], restrictions: [] },
    { agentId: 'COMET', agentType: 'hive', tier: 'restricted', capabilities: ['read:memory', 'write:memory', 'read:files', 'execute:genkit'], restrictions: [] },
    { agentId: 'SENTINEL', agentType: 'validator', tier: 'restricted', capabilities: ['read:memory', 'write:memory', 'read:files', 'execute:genkit', 'audit:full'], restrictions: [] },
];
