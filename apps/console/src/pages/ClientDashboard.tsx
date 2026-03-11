import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Shield, Cpu, Activity, Zap, CheckCircle2, AlertCircle } from 'lucide-react';
import './ClientDashboard.css';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgentStatus {
    agentId: string;
    role: string;
    status: 'initializing' | 'ready' | 'error';
}

interface ProvisioningData {
    provisioningId: string;
    clientId: string;
    status: 'pending' | 'provisioning' | 'active' | 'failed';
    assignedBlueprint: { id: string; name: string; vertical: string };
    agentTeam: AgentStatus[];
    dashboardUrl: string;
    contractDraftUrl?: string;
    estimatedReadyTime: string;
    constitutionalFlags: string[];
    onboardingSteps: string[];
    error?: string;
    logs?: Array<{ timestamp: string; message: string }>;
}

// ─── Constants & Styles ───────────────────────────────────────────────────────


const COLORS = {
    initializing: 'var(--amber)',
    ready: 'var(--status-success)',
    error: 'var(--status-error)',
    accent: 'var(--inc-cyan, #06b6d4)',
    purple: 'var(--inc-purple, #a855f7)'
};

// ─── Components ───────────────────────────────────────────────────────────────

function LiveTerminal({ logs }: { logs?: Array<{ timestamp: string; message: string }> }) {
    const endRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    return (
        <div className="cd-terminal">
            <div className="cd-terminal-header">
                <Terminal size={16} className="cd-terminal-icon" />
                <span className="cd-terminal-title">ZERO-DAY ENGINE LOGS</span>
            </div>

            <AnimatePresence>
                {logs?.map((log, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3 }}
                        className="cd-terminal-log"
                    >
                        <span className="cd-terminal-timestamp">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                        <span style={{ color: log.message.includes('FAILURE') || log.message.includes('failed') ? COLORS.error : log.message.includes('ready') || log.message.includes('complete') ? COLORS.ready : 'var(--text-primary)' }}>
                            {log.message}
                        </span>
                    </motion.div>
                ))}
            </AnimatePresence>
            <div ref={endRef} />

            {/* Ambient scan line effect */}
            <motion.div
                animate={{ top: ['0%', '100%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                className="cd-terminal-scanline"
            />
        </div>
    );
}

function AgentNode({ agent }: { agent: AgentStatus }) {
    const isReady = agent.status === 'ready';
    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`cd-agent-node ${isReady ? 'ready' : 'initializing'}`}
        >
            {isReady && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.15 }}
                    className="cd-agent-bg-glow"
                />
            )}

            <div className={`cd-agent-icon-wrapper ${isReady ? 'ready' : 'initializing'}`}>
                {agent.role.includes('Context') ? <Shield size={20} /> : agent.role.includes('Strategic') ? <Zap size={20} /> : <Cpu size={20} />}
            </div>

            <div>
                <motion.div className="cd-agent-id">
                    {agent.agentId}
                </motion.div>
                <div className={`cd-agent-role ${isReady ? 'ready' : 'initializing'}`}>
                    {agent.role}
                </div>
            </div>

            <div className="cd-agent-status-icon">
                {isReady ? (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                        <CheckCircle2 size={24} color={COLORS.ready} />
                    </motion.div>
                ) : (
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    >
                        <Activity size={24} color={COLORS.initializing} />
                    </motion.div>
                )}
            </div>
        </motion.div>
    );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function ClientDashboard() {
    const { clientId } = useParams<{ clientId: string }>();
    const [data, setData] = useState<ProvisioningData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!clientId) return;
        const poll = async () => {
            try {
                const res = await fetch(`/api/zeroday/client/${clientId}/provisioning`);
                if (!res.ok) throw new Error('Client not found');
                const json = await res.json() as ProvisioningData;
                setData(json);

                // If it's still provisioning, keep polling every 1 sec for that crisp live effect
                if (json.status === 'provisioning' || json.status === 'pending') {
                    setTimeout(() => void poll(), 1000);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        void poll();
    }, [clientId]);

    if (loading) {
        return (
            <div className="cd-loading-screen">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                    <Zap size={32} color={COLORS.accent} style={{ opacity: 0.5 }} />
                </motion.div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="cd-error-screen">
                <AlertCircle size={32} style={{ marginRight: 12 }} /> PROVISIONING PROFILE NOT FOUND
            </div>
        );
    }

    const isComplete = data.status === 'active';

    return (
        <div className="cd-container">
            <div className="cd-content-wrapper">

                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="cd-header"
                >
                    <div>
                        <div className="cd-provisioning-id-container">
                            <div className={`cd-status-indicator ${isComplete ? 'ready' : 'initializing'}`} />
                            <span className="cd-provisioning-id-text">
                                PROVISIONING ID // {data.provisioningId.split('-')[1]}
                            </span>
                        </div>
                        <h1 className="cd-title">
                            Zero-Day Enterprise Delivery
                        </h1>
                        <div className="cd-subtitle">Autonomous compilation of {data.assignedBlueprint.name}</div>
                    </div>
                </motion.div>

                {/* Main Content Grid */}
                <div className="cd-grid">

                    {/* Left Column: Network Assembly */}
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                        <div className="cd-topology-header">
                            <h2 className="cd-topology-title">Agent Network Topology</h2>
                            <span className="cd-topology-status">{data.agentTeam.filter(a => a.status === 'ready').length} / {data.agentTeam.length} ONLINE</span>
                        </div>

                        <div className="cd-agent-list">
                            {data.agentTeam.map((agent) => (
                                <AgentNode key={agent.agentId} agent={agent} />
                            ))}
                        </div>

                        {data.constitutionalFlags.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                                className="cd-constitutional-flags"
                            >
                                <div className="cd-flags-title">
                                    Constitutional Directives
                                </div>
                                <div className="cd-flags-list">
                                    {data.constitutionalFlags.map(flag => (
                                        <div key={flag} className="cd-flag">
                                            {flag}
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </motion.div>

                    {/* Right Column: Live Terminal & Onboarding */}
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="cd-right-column">
                        <LiveTerminal logs={data.logs} />

                        {isComplete && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="cd-finalized-card"
                            >
                                <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 4, repeat: Infinity }} className="cd-finalized-glow" />

                                <h3 className="cd-finalized-title">Network Finalized</h3>
                                <p className="cd-finalized-text">
                                    Your secure sovereign intelligence network is now online. The LEX master service agreement has been drafted and requires your signature.
                                </p>
                                <div className="cd-finalized-actions">
                                    {data.contractDraftUrl && (
                                        <a href={data.contractDraftUrl} className="cd-review-link">
                                            Review Agreement
                                        </a>
                                    )}
                                    <button className="cd-dashboard-btn">
                                        Enter Dashboard →
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </motion.div>

                </div>
            </div>
        </div>
    );
}
