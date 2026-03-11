/**
 * ServiceScanner — First-Run Phase 3
 * T20260306-913: Browser-Powered Service Scanner
 *
 * Probes all GENESIS services from the browser (CORS-safe endpoints)
 * and provides a live health map before the Setup Wizard begins.
 * Zero Day: all URLs from config/env (no 192.168 in source).
 */

import { useEffect, useState, useCallback } from 'react';
import { DISPATCH_URL, GENKIT_URL, CAMPAIGN_URL, GATEWAY_URL, FORGE_URL, API_BASE } from '../config/env';
import './ServiceScanner.css';

interface ServiceDef {
    id: string;
    name: string;
    url: string;
    port: number;
    category: 'core' | 'ai' | 'media' | 'storage' | 'agent';
    required: boolean;
}

interface ServiceStatus {
    id: string;
    status: 'checking' | 'online' | 'offline' | 'degraded';
    latency?: number;
    version?: string;
    error?: string;
}

const GENESIS_SERVICES: ServiceDef[] = [
    { id: 'dispatch', name: 'Dispatch Server', url: `${DISPATCH_URL}/api/status`, port: 5050, category: 'core', required: true },
    { id: 'genkit', name: 'Genkit Engine', url: `${GENKIT_URL}/health`, port: 4100, category: 'ai', required: true },
    { id: 'redis', name: 'Redis Pub/Sub', url: `${API_BASE}:6379`, port: 6379, category: 'storage', required: true },
    { id: 'chromadb', name: 'ChromaDB Memory', url: `${API_BASE}:8000/api/v1`, port: 8000, category: 'storage', required: false },
    { id: 'zero-day', name: 'Zero-Day Intake', url: `${API_BASE}:9000/health`, port: 9000, category: 'ai', required: false },
    { id: 'campaign', name: 'Campaign Engine', url: `${CAMPAIGN_URL}/health`, port: 4006, category: 'ai', required: false },
    { id: 'genmedia', name: 'GenMedia Studio', url: `${FORGE_URL}/health`, port: 4300, category: 'media', required: false },
    { id: 'comet', name: 'COMET Browser', url: `${API_BASE}:7100/health`, port: 7100, category: 'agent', required: false },
    { id: 'ghost', name: 'GHOST QA Engine', url: `${API_BASE}:6000/health`, port: 6000, category: 'agent', required: false },
    { id: 'scribe', name: 'Scribe Daemon', url: `${API_BASE}:9100/health`, port: 9100, category: 'agent', required: false },
    { id: 'gateway', name: 'API Gateway', url: `${GATEWAY_URL}/health`, port: 3080, category: 'core', required: false },
    { id: 'blueprints', name: 'Blueprints Runtime', url: `${API_BASE}:4200/health`, port: 4200, category: 'ai', required: false },
];


const CATEGORY_LABELS: Record<ServiceDef['category'], string> = {
    core: 'Core',
    ai: 'AI',
    media: 'Media',
    storage: 'Storage',
    agent: 'Agent',
};

interface ServiceScannerProps {
    onComplete: (results: ServiceStatus[]) => void;
    onBack: () => void;
}

export function ServiceScanner({ onComplete, onBack }: ServiceScannerProps) {
    const [statuses, setStatuses] = useState<Map<string, ServiceStatus>>(() =>
        new Map(GENESIS_SERVICES.map(s => [s.id, { id: s.id, status: 'checking' }]))
    );
    const [scanning, setScanning] = useState(false);
    const [scanComplete, setScanComplete] = useState(false);

    const probeService = useCallback(async (service: ServiceDef): Promise<ServiceStatus> => {
        const start = Date.now();
        try {
            const res = await fetch(service.url, {
                method: 'GET',
                signal: AbortSignal.timeout(3000),
            });
            const latency = Date.now() - start;
            if (res.ok) {
                let version: string | undefined;
                try {
                    const data = await res.json() as { version?: string; status?: string };
                    version = data.version;
                } catch { /* non-JSON response is still ok */ }
                return { id: service.id, status: 'online', latency, version };
            }
            return { id: service.id, status: 'degraded', latency, error: `HTTP ${res.status}` };
        } catch (e: unknown) {
            const err = e instanceof Error ? e : new Error(String(e));
            return { id: service.id, status: 'offline', error: err.name === 'TimeoutError' ? 'Timeout' : 'Unreachable' };
        }
    }, []);

    const runScan = useCallback(async () => {
        setScanning(true);
        setScanComplete(false);

        // Reset all to checking
        setStatuses(new Map(GENESIS_SERVICES.map(s => [s.id, { id: s.id, status: 'checking' }])));

        // Probe all services concurrently, update status as each resolves
        await Promise.all(GENESIS_SERVICES.map(async (service) => {
            const result = await probeService(service);
            setStatuses(prev => new Map(prev).set(service.id, result));
        }));

        setScanning(false);
        setScanComplete(true);
    }, [probeService]);

    useEffect(() => {
        // Kick off scan on next tick to avoid synchronous cascading renders warning
        const timer = setTimeout(() => {
            void runScan();
        }, 10);
        return () => clearTimeout(timer);
    }, [runScan]);

    const results = Array.from(statuses.values());
    const online = results.filter(r => r.status === 'online').length;
    const total = results.length;
    const requiredOnline = GENESIS_SERVICES.filter(s => s.required).every(
        s => statuses.get(s.id)?.status === 'online'
    );

    return (
        <div className="service-scanner">
            <div className="scanner-header">
                <div className="scanner-icon">◉</div>
                <h2 className="scanner-title">Service Scanner</h2>
                <p className="scanner-subtitle">
                    Probing GENESIS stack — {online}/{total} services reachable
                </p>
            </div>

            <div className="scanner-progress-bar">
                <div
                    className="scanner-progress-fill"
                    ref={el => { if (el) el.style.width = `${(online / total) * 100}%`; }}
                />
            </div>

            <div className="scanner-grid">
                {GENESIS_SERVICES.map(service => {
                    const status = statuses.get(service.id);
                    const statusClass = status?.status ?? 'checking';
                    return (
                        <div key={service.id} className={`scanner-card scanner-card--${statusClass}`}>
                            <div className="scanner-card-header">
                                <span
                                    className={`scanner-card-category scanner-category--${service.category}`}
                                >
                                    {CATEGORY_LABELS[service.category]}
                                </span>
                                {service.required && (
                                    <span className="scanner-card-required">required</span>
                                )}
                            </div>
                            <div className="scanner-card-name">{service.name}</div>
                            <div className="scanner-card-status">
                                <span className={`scanner-dot scanner-dot--${statusClass}`} />
                                <span className="scanner-status-text">
                                    {statusClass === 'checking' && 'Probing...'}
                                    {statusClass === 'online' && `Online${status?.latency ? ` · ${status.latency}ms` : ''}`}
                                    {statusClass === 'offline' && (status?.error ?? 'Offline')}
                                    {statusClass === 'degraded' && (status?.error ?? 'Degraded')}
                                </span>
                            </div>
                            {status?.version && (
                                <div className="scanner-card-version">v{status.version}</div>
                            )}
                        </div>
                    );
                })}
            </div>

            {scanComplete && !requiredOnline && (
                <div className="scanner-warning">
                    ⚠ One or more required services are offline. You can continue setup but some
                    features will be unavailable until the GENESIS stack is running.
                </div>
            )}

            <div className="scanner-actions">
                <button className="scanner-btn scanner-btn--secondary" onClick={onBack}>
                    Back
                </button>
                <button className="scanner-btn scanner-btn--ghost" onClick={() => void runScan()} disabled={scanning}>
                    {scanning ? 'Scanning...' : 'Re-scan'}
                </button>
                {scanComplete && (
                    <button className="scanner-btn scanner-btn--primary" onClick={() => onComplete(results)}>
                        Continue to Setup →
                    </button>
                )}
            </div>
        </div>
    );
}

export default ServiceScanner;
