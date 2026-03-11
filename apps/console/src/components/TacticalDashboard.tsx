import { useState } from 'react';
import { DispatchBoard } from './DispatchBoard';
import { LiveTerminal } from './LiveTerminal';
import { HealthMetricsTab } from './HealthMetricsTab';
import './TacticalDashboard.css';

export function TacticalDashboard() {
    const [leftPane, setLeftPane] = useState<'dispatch' | 'health'>('dispatch');

    return (
        <div className="tactical-dash-layout">
            <div className="tactical-left-pane">
                <div className="tactical-pane-tabs">
                    <div 
                        className={`tactical-tab ${leftPane === 'dispatch' ? 'active' : ''}`}
                        onClick={() => setLeftPane('dispatch')}
                    >
                        DISPATCH
                    </div>
                    <div 
                        className={`tactical-tab ${leftPane === 'health' ? 'active' : ''}`}
                        onClick={() => setLeftPane('health')}
                    >
                        HEALTH & METRICS
                    </div>
                </div>
                <div className="tactical-pane-content">
                    {leftPane === 'dispatch' && <DispatchBoard />}
                    {leftPane === 'health' && <HealthMetricsTab />}
                </div>
            </div>
            <div className="tactical-right-pane">
                <LiveTerminal />
            </div>
        </div>
    );
}
