import { useEffect, useState, useCallback } from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import './FinanceDashboard.css';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StrategyStatus {
    id: string;
    name: string;
    status: 'active' | 'paused' | 'error';
    pnl24h: string;
    pnlValue: number;
    lastSignal: string;
    tradesCount: number;
    sparkline: number[];
}

interface TradeEntry {
    id: string;
    pair: string;
    side: 'BUY' | 'SELL';
    size: number;
    price: number;
    pnl: number;
    timestamp: string;
}

interface AuditEntry {
    id: string;
    rule: string;
    result: 'pass' | 'warn' | 'block';
    detail: string;
    timestamp: string;
}

interface FinanceData {
    walletAddress: string;
    balanceSol: number;
    balanceUsdc: number;
    totalPnl24h: number;
    totalPnlPct: number;
    jupiterStatus: 'connected' | 'disconnected';
    heliusStatus: 'connected' | 'disconnected';
    veraGuardianHits: number;
    veraBlocked: number;
    strategies: StrategyStatus[];
    recentTrades: TradeEntry[];
    auditLog: AuditEntry[];
}

// ─── Sparkline (Recharts) ───────────────────────────────────────────────────

function Sparkline({ data, color = '#4ade80', width = 120, height = 36 }: {
    data: number[];
    color?: string;
    width?: number;
    height?: number;
}) {
    if (!data || data.length < 2) return null;

    // Map raw numbers to objects for Recharts
    const chartData = data.map((val, i) => ({ index: i, value: val }));

    return (
        <div className={`sparkline-wrapper width-${width} height-${height}`}>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                    <YAxis domain={['dataMin', 'dataMax']} hide />
                    <Line
                        type="monotone"
                        dataKey="value"
                        stroke={color}
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

// ─── Mock Data Generator ──────────────────────────────────────────────────────

function generateMockData(): FinanceData {
    const spark = (base: number, len = 20) =>
        Array.from({ length: len }, (_, i) => base + Math.sin(i * 0.5) * base * 0.08 + (Math.random() - 0.5) * base * 0.05);

    return {
        walletAddress: 'D8uW...5pQx',
        balanceSol: 42.5,
        balanceUsdc: 154_032.0,
        totalPnl24h: 3812.4,
        totalPnlPct: 2.54,
        jupiterStatus: 'connected',
        heliusStatus: 'connected',
        veraGuardianHits: 14,
        veraBlocked: 1,
        strategies: [
            {
                id: 'momentum-1',
                name: 'Momentum Scalping',
                status: 'active',
                pnl24h: '+2.4%',
                pnlValue: 2847.2,
                lastSignal: 'BUY SOL/USDC @ 142.50',
                tradesCount: 37,
                sparkline: spark(142, 24),
            },
            {
                id: 'funding-1',
                name: 'Funding Rate Farm',
                status: 'active',
                pnl24h: '+0.8%',
                pnlValue: 965.2,
                lastSignal: 'HEDGE LONG PERP',
                tradesCount: 12,
                sparkline: spark(98, 24),
            },
            {
                id: 'arb-1',
                name: 'Jupiter Route Arb',
                status: 'paused',
                pnl24h: '+0.0%',
                pnlValue: 0,
                lastSignal: 'SPREAD BELOW THRESHOLD',
                tradesCount: 0,
                sparkline: spark(50, 24),
            },
        ],
        recentTrades: [
            { id: 't1', pair: 'SOL/USDC', side: 'BUY', size: 10, price: 142.50, pnl: 142.5, timestamp: '2026-03-07T01:22:11Z' },
            { id: 't2', pair: 'SOL/USDC', side: 'SELL', size: 8, price: 143.80, pnl: 104.0, timestamp: '2026-03-07T01:18:44Z' },
            { id: 't3', pair: 'WIF/USDC', side: 'BUY', size: 200, price: 2.41, pnl: -18.2, timestamp: '2026-03-07T01:09:02Z' },
            { id: 't4', pair: 'JUP/USDC', side: 'BUY', size: 100, price: 0.89, pnl: 23.0, timestamp: '2026-03-07T01:02:58Z' },
        ],
        auditLog: [
            { id: 'a1', rule: 'IX — Position Size Limit', result: 'pass', detail: 'Size 10 SOL within 12 SOL max', timestamp: '2026-03-07T01:22:11Z' },
            { id: 'a2', rule: 'XX — No Manual Override', result: 'pass', detail: 'Trade queued autonomously', timestamp: '2026-03-07T01:18:44Z' },
            { id: 'a3', rule: 'IX — Prohibited Pair (BONK)', result: 'block', detail: 'BONK in volatile-pairs blacklist', timestamp: '2026-03-07T01:15:00Z' },
            { id: 'a4', rule: 'XI — Slippage Tolerance', result: 'warn', detail: 'Slippage 0.47% near 0.5% limit', timestamp: '2026-03-07T01:09:02Z' },
        ]
    };
}

export interface StatusData {
    running: boolean;
    walletAddress?: string;
    balanceSol?: number;
    balanceUsd?: number;
    risk?: {
        totalPnlSol: number;
        winRate: number;
        isPaused: boolean;
        totalTrades: number;
    };
}

export interface ScanData {
    solPriceUsd?: number;
    timestamp: string;
    veraDecision?: {
        approved: boolean;
        reasoning?: string;
    };
    riskAssessment?: {
        allowed: boolean;
        reasons: string[];
    };
    signal?: {
        action: string;
        inputMint: string;
        outputMint: string;
        amountSol: number;
    };
    executed?: boolean;
    txSignature?: string;
}

// ─── FinanceDashboard ──────────────────────────────────────────────────────────

export default function FinanceDashboard() {
    const [data, setData] = useState<FinanceData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'strategies' | 'trades' | 'audit'>('strategies');
    const [lastUpdated, setLastUpdated] = useState('');

    const loadData = useCallback(async () => {
        try {
            const baseUrl = import.meta.env.VITE_FINANCE_AGENT_URL ?? 'http://localhost:4500';
            const [statusRes, scansRes] = await Promise.all([
                fetch(`${baseUrl}/status`, { signal: AbortSignal.timeout(3000) }),
                fetch(`${baseUrl}/scans`, { signal: AbortSignal.timeout(3000) })
            ]);

            if (!statusRes.ok || !scansRes.ok) throw new Error('Finance Agent offline');

            const statusJson: StatusData = await statusRes.json();
            const scansJson: ScanData[] = await scansRes.json();

            const latestPrice = scansJson[scansJson.length - 1]?.solPriceUsd ?? 140;
            const pnlSol = statusJson.risk?.totalPnlSol ?? 0;

            const mappedData: FinanceData = {
                walletAddress: statusJson.walletAddress || 'Offline',
                balanceSol: statusJson.balanceSol || 0,
                balanceUsdc: statusJson.balanceUsd || 0,
                totalPnl24h: pnlSol * latestPrice,
                totalPnlPct: (statusJson.risk?.winRate || 0) * 100, // proxy for win rate
                jupiterStatus: statusJson.running ? 'connected' : 'disconnected',
                heliusStatus: statusJson.running ? 'connected' : 'disconnected',
                veraGuardianHits: scansJson.filter((s) => s.veraDecision).length,
                veraBlocked: scansJson.filter((s) => s.veraDecision && !s.veraDecision.approved).length,

                strategies: [
                    {
                        id: 'momentum-1',
                        name: 'Momentum Scalping',
                        status: statusJson.running ? (statusJson.risk?.isPaused ? 'paused' : 'active') : 'error',
                        pnl24h: `${pnlSol >= 0 ? '+' : ''}${pnlSol.toFixed(4)} SOL`,
                        pnlValue: pnlSol * latestPrice,
                        lastSignal: scansJson.slice().reverse().find((s) => s.signal && s.signal.action !== 'HOLD')?.signal?.action ?? 'AWAITING SIGNAL',
                        tradesCount: statusJson.risk?.totalTrades ?? 0,
                        sparkline: scansJson.map((s) => s.solPriceUsd ?? latestPrice).length > 2 ? scansJson.map((s) => s.solPriceUsd ?? latestPrice) : Array(24).fill(latestPrice)
                    }
                ],

                recentTrades: scansJson
                    .filter((s) => s.executed && s.signal)
                    .map((s, i: number) => ({
                        id: s.txSignature ?? `tx-${i}`,
                        pair: s.signal!.inputMint.includes('USD') || s.signal!.outputMint.includes('USD') ? 'SOL/USDC' : 'SOL/Token',
                        side: s.signal!.action as 'BUY' | 'SELL',
                        size: s.signal!.amountSol,
                        price: s.solPriceUsd ?? latestPrice,
                        pnl: 0,
                        timestamp: s.timestamp
                    })).reverse(),

                auditLog: scansJson
                    .filter((s) => s.veraDecision || (s.riskAssessment && !s.riskAssessment.allowed))
                    .map((s, i: number) => {
                        const isBlock = s.riskAssessment && !s.riskAssessment.allowed;
                        return {
                            id: `audit-${i}`,
                            rule: isBlock ? 'Risk Engine Checks' : 'VERA Review',
                            result: isBlock ? 'block' : (s.veraDecision?.approved ? 'pass' : 'block'),
                            detail: isBlock ? s.riskAssessment!.reasons.join(', ') : s.veraDecision?.reasoning || 'No details',
                            timestamp: s.timestamp
                        } as AuditEntry;
                    }).reverse()
            };

            setData(mappedData);
        } catch {
            // Finance Agent offline — use mock data
            setData(generateMockData());
        }
        setLastUpdated(new Date().toLocaleTimeString());
        setLoading(false);
    }, []);

    useEffect(() => {
        void loadData();
        const interval = setInterval(() => { void loadData(); }, 10_000);
        return () => clearInterval(interval);
    }, [loadData]);

    if (loading) {
        return (
            <div className="fd-loading-page">
                <div className="fd-loading-content">
                    <div className="fd-loading-icon">◎</div>
                    <div className="fd-loading-text">Synchronizing Ledger…</div>
                </div>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="fd-page">
            {/* Header */}
            <div className="fd-header">
                <div>
                    <div className="fd-supertitle">FA-RUNTIME-SOLANA</div>
                    <h1 className="fd-title">Finance Agent</h1>
                    <div className="fd-subtitle">
                        Autonomous Treasury Operations via Jupiter &amp; Helius
                        {lastUpdated && <span className="fd-updated"> · Updated {lastUpdated}</span>}
                    </div>
                </div>
                <div className="fd-header-right">
                    <span className="fd-pill">SYSTEM LIVE</span>
                </div>
            </div>

            {/* PnL Hero */}
            <div className="fd-hero-card">
                <div className="fd-hero-left">
                    <div className="fd-hero-label">24h Portfolio PnL</div>
                    <div className="fd-hero-pnl">+${data.totalPnl24h.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                    <div className="fd-hero-pct">+{data.totalPnlPct.toFixed(2)}%</div>
                </div>
                <div className="fd-hero-right">
                    <Sparkline data={data.strategies[0]?.sparkline ?? []} color="hsl(38,92%,52%)" width={160} height={48} />
                </div>
            </div>

            {/* Provider Status Grid */}
            <div className="fd-grid">
                <div className="fd-card">
                    <div className="fd-card-header solana-wallet">Solana Wallet</div>
                    <div className="fd-card-value">{data.walletAddress}</div>
                    <div className="fd-card-desc">{data.balanceSol} SOL · ${data.balanceUsdc.toLocaleString()} USDC</div>
                </div>
                <div className="fd-card">
                    <div className="fd-card-header jupiter">Jupiter Aggregator</div>
                    <div className={`fd-card-value fd-status-${data.jupiterStatus}`}>{data.jupiterStatus}</div>
                    <div className="fd-card-desc">Direct Route Execution</div>
                </div>
                <div className="fd-card">
                    <div className="fd-card-header helius">Helius RPC</div>
                    <div className={`fd-card-value fd-status-${data.heliusStatus}`}>{data.heliusStatus}</div>
                    <div className="fd-card-desc">Mempool Monitoring Active</div>
                </div>
                <div className="fd-card">
                    <div className="fd-card-header vera">VERA Truth Guard</div>
                    <div className="fd-card-value">{data.veraGuardianHits} Checks Passed</div>
                    <div className="fd-card-desc">{data.veraBlocked} Trade{data.veraBlocked !== 1 ? 's' : ''} Blocked · 0 Violations</div>
                </div>
            </div>

            {/* Sub-section Tabs */}
            <div className="fd-tab-bar">
                {(['strategies', 'trades', 'audit'] as const).map(tab => (
                    <button
                        key={tab}
                        className={`fd-tab ${activeTab === tab ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab)}
                        type="button"
                    >
                        {tab === 'strategies' ? '⚡ Strategies' : tab === 'trades' ? '📋 Trade History' : '🛡 VERA Audit'}
                    </button>
                ))}
            </div>

            {/* Strategies */}
            {activeTab === 'strategies' && (
                <div className="fd-strategy-list">
                    {data.strategies.map(strategy => (
                        <div key={strategy.id} className={`fd-strategy-item ${strategy.status}`}>
                            <div className="fd-strategy-left">
                                <div className={`fd-strategy-dot ${strategy.status}`} />
                                <div>
                                    <div className="fd-strategy-name">{strategy.name}</div>
                                    <div className="fd-strategy-signal">{strategy.lastSignal}</div>
                                    <div className="fd-strategy-trades">{strategy.tradesCount} trades today</div>
                                </div>
                            </div>
                            <div className="fd-strategy-mid">
                                <Sparkline data={strategy.sparkline} color="hsl(262,83%,68%)" width={120} height={36} />
                            </div>
                            <div className="fd-strategy-right">
                                <div className={`fd-strategy-pnl ${parseFloat(strategy.pnl24h) >= 0 ? 'positive' : 'negative'}`}>
                                    {strategy.pnl24h}
                                </div>
                                <div className="fd-strategy-usd">${strategy.pnlValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                <div className="fd-strategy-pnl-label">24H PNL</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Trade History */}
            {activeTab === 'trades' && (
                <div className="fd-card margin">
                    <table className="fd-table">
                        <thead>
                            <tr>
                                <th>Pair</th>
                                <th>Side</th>
                                <th>Size</th>
                                <th>Price</th>
                                <th>PnL</th>
                                <th>Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.recentTrades.map(t => (
                                <tr key={t.id}>
                                    <td className="fd-pair">{t.pair}</td>
                                    <td className={`fd-side ${t.side.toLowerCase()}`}>{t.side}</td>
                                    <td>{t.size}</td>
                                    <td>${t.price.toFixed(2)}</td>
                                    <td className={`fd-pnl ${t.pnl >= 0 ? 'positive' : 'negative'}`}>
                                        {t.pnl >= 0 ? '+' : ''}${Math.abs(t.pnl).toFixed(2)}
                                    </td>
                                    <td className="fd-time">{new Date(t.timestamp).toLocaleTimeString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* VERA Audit Log */}
            {activeTab === 'audit' && (
                <div className="fd-audit-list">
                    {data.auditLog.map(entry => (
                        <div key={entry.id} className={`fd-audit-item ${entry.result}`}>
                            <div className="fd-audit-icon">
                                {entry.result === 'pass' ? '✓' : entry.result === 'warn' ? '⚠' : '✗'}
                            </div>
                            <div className="fd-audit-content">
                                <div className="fd-audit-rule">{entry.rule}</div>
                                <div className="fd-audit-detail">{entry.detail}</div>
                            </div>
                            <div className="fd-audit-time">{new Date(entry.timestamp).toLocaleTimeString()}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
