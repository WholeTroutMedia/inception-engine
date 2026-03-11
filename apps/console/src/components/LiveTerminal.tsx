import { useState, useEffect, useRef } from 'react';
import './LiveTerminal.css';

interface LogEntry {
    id: number;
    timestamp: string;
    level: 'INFO' | 'WARN' | 'ERROR' | 'SYS' | 'AXON';
    source: string;
    message: string;
}

export function LiveTerminal() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const endRef = useRef<HTMLDivElement>(null);
    const [autoScroll, setAutoScroll] = useState(true);

    useEffect(() => {
        const es = new EventSource('http://127.0.0.1:5050/api/events');
        
        const addSystemLog = (level: LogEntry['level'], source: string, message: string) => {
            setLogs(prev => {
                const newLog = {
                    id: Date.now() + Math.random(),
                    timestamp: new Date().toISOString().split('T')[1].substring(0, 12),
                    level, source, message
                };
                return [...prev.slice(-99), newLog];
            });
        };

        es.addEventListener('connected', () => {
            addSystemLog('SYS', 'Dispatch', 'Connected to SSE terminal stream.');
        });

        es.addEventListener('status', (e) => {
            try {
                const data = JSON.parse(e.data);
                addSystemLog('INFO', 'Observer', `Status sync: ${data.summary?.active || 0} active tasks, ${data.summary?.queued || 0} queued.`);
            } catch (err) { console.error('Error parsing status event', err); }
        });

        es.addEventListener('blocker', (e) => {
            try {
                const data = JSON.parse(e.data);
                addSystemLog('WARN', 'AgentMesh', `Blocker ${data.event?.toUpperCase()}: ${data.blocker?.id}`);
            } catch (err) { console.error('Error parsing blocker event', err); }
        });
        
        es.addEventListener('capability_update', (e) => {
            try {
                const data = JSON.parse(e.data);
                addSystemLog('SYS', 'NeuralBus', `Capability Reload [${data.hash}] via ${data.source}`);
            } catch (err) { console.error('Error parsing capability_update event', err); }
        });

        es.onerror = () => {
            addSystemLog('ERROR', 'Dispatch', 'SSE connection lost. Reconnecting...');
        };

        return () => es.close();
    }, []);

    useEffect(() => {
        if (autoScroll) {
            endRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs, autoScroll]);

    return (
        <div className="terminal-pane">
            <div className="term-header">
                <div>
                    <span className="term-title">MEMORY BUS / NEURAL LOG</span>
                    <span className="term-subtitle">Reading from /api/events</span>
                </div>
                <button 
                    className={`scroll-btn ${autoScroll ? 'active' : ''}`}
                    onClick={() => setAutoScroll(!autoScroll)}
                >
                    AUTO-SCROLL {autoScroll ? 'ON' : 'OFF'}
                </button>
            </div>
            
            <div 
                className="term-body"
                onWheel={(e) => { if (e.deltaY < 0) setAutoScroll(false); }}
            >
                {logs.map(log => (
                    <div key={log.id} className={`log-line lvl-${log.level}`}>
                        <span className="log-time">[{log.timestamp}]</span>
                        <span className="log-level">{log.level.padEnd(5)}</span>
                        <span className="log-src">[{log.source.padEnd(10)}]</span>
                        <span className="log-msg">{log.message}</span>
                    </div>
                ))}
                <div ref={endRef} />
            </div>
        </div>
    );
}
