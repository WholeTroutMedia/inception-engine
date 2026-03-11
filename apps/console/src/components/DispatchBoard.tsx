import { useState, useEffect } from 'react';
import './DispatchBoard.css';

interface DispatchTask {
    id: string;
    title: string;
    workstream: string;
    priority: string;
    status: string;
    claimed_by: string | null;
}

interface DispatchAgent {
    agent_id: string;
    tool: string;
    active_task_id: string | null;
}

interface DispatchStatus {
    summary: { queued: number; active: number; done: number; total_agents: number };
    queued_tasks: DispatchTask[];
    active_tasks: DispatchTask[];
    active_agents: DispatchAgent[];
    idle_agents: DispatchAgent[];
}

export function DispatchBoard() {
    const [dispatch, setDispatch] = useState<DispatchStatus | null>(null);
    const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking');

    const pollDispatch = async () => {
        try {
            const res = await fetch('/api/dispatch/status', { signal: AbortSignal.timeout(3000) });
            if (res.ok) {
                setDispatch(await res.json());
                setStatus('online');
            } else {
                setStatus('offline');
            }
        } catch {
            setStatus('offline');
        }
    };

    useEffect(() => {
        pollDispatch();
        const interval = setInterval(pollDispatch, 5000);
        return () => clearInterval(interval);
    }, []);

    const allTasks = [...(dispatch?.active_tasks || []), ...(dispatch?.queued_tasks || [])];
    const allAgents = [...(dispatch?.active_agents || []), ...(dispatch?.idle_agents || [])];

    return (
        <div className="dispatch-pane">
            <div className="pane-header">
                <span className="pane-title">DISPATCH ORCHESTRATION</span>
                <span className={`status-badge ${status}`}>{status.toUpperCase()}</span>
            </div>

            <div className="dispatch-metrics">
                <div className="metric">
                    <span className="metric-val">{dispatch?.summary.queued || 0}</span>
                    <span className="metric-lbl">QUEUED</span>
                </div>
                <div className="metric">
                    <span className="metric-val active">{dispatch?.summary.active || 0}</span>
                    <span className="metric-lbl">ACTIVE</span>
                </div>
                <div className="metric">
                    <span className="metric-val agents">{dispatch?.summary.total_agents || 0}</span>
                    <span className="metric-lbl">AGENTS</span>
                </div>
            </div>

            <div className="dispatch-lists">
                <div className="list-section">
                    <div className="list-title">TASK QUEUE</div>
                    {allTasks.length === 0 ? <div className="empty">Queue is empty.</div> : allTasks.slice(0, 15).map(t => (
                        <div key={t.id} className={`task-row ${t.status === 'active' ? 'active-border' : ''}`}>
                            <div className={`priority p-${t.priority}`}>{t.priority}</div>
                            <div className="task-info">
                                <div className="task-name">{t.title}</div>
                                <div className="task-meta">{t.workstream} &middot; {t.id.substring(0,8)}</div>
                            </div>
                            <div className={`task-status ${t.status}`}>
                                {t.status === 'active' ? t.claimed_by || 'WORKING' : 'QUEUED'}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="list-section">
                    <div className="list-title">HIVE AGENTS</div>
                    {allAgents.length === 0 ? <div className="empty">No agents registered.</div> : allAgents.map(a => (
                        <div key={a.agent_id} className="agent-row">
                            <span className={`agent-dot ${a.active_task_id ? 'working' : 'idle'}`}></span>
                            <div className="task-info">
                                <div className="task-name">{a.agent_id}</div>
                                <div className="task-meta">{a.tool}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
