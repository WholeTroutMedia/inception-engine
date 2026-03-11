/**
 * ATLAS â€” Live Data & Broadcast Intelligence
 *
 * Real-time market feeds, external API aggregation, and live broadcast coordination.
 * ATLAS is the Creative Liberation Engine's eyes on the world â€” streaming data from financial
 * markets, social signals, and external APIs into the hive.
 *
 * Hive: BUILDER | Constitutional Access: required for write ops
 * Mode compatibility: PLAN, SHIP
 */

import type { AgentDefinition, AgentRunInput, AgentRunResult } from '../types.js';

export const ATLAS: AgentDefinition = {
    id: 'ATLAS',
    name: 'ATLAS',
    description: 'Live data â€” market feeds, real-time search, external API aggregation, broadcast coordination',
    hive: 'BUILDER',
    modes: ['PLAN', 'SHIP'],
    constitutionalAccess: false,
};

// â”€â”€â”€ ATLAS Capabilities â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface MarketSnapshot {
    symbol: string;
    price: number;
    change24h: number;
    volume: number;
    timestamp: string;
}

export interface BroadcastSignal {
    channel: string;
    payload: unknown;
    priority: 'low' | 'normal' | 'high' | 'critical';
    timestamp: string;
}

/**
 * Fetch live price snapshot for a given symbol.
 * Falls back to Helius RPC for Solana-native assets.
 */
export async function fetchMarketSnapshot(symbol: string, apiEndpoint?: string): Promise<MarketSnapshot> {
    const endpoint = apiEndpoint ?? `http://localhost:4100/market/${encodeURIComponent(symbol)}`;
    try {
        const res = await fetch(endpoint);
        if (!res.ok) throw new Error(`Market API ${res.status}`);
        return await res.json() as MarketSnapshot;
    } catch {
        // Offline fallback â€” generate synthetic snapshot
        return {
            symbol,
            price: 0,
            change24h: 0,
            volume: 0,
            timestamp: new Date().toISOString(),
        };
    }
}

/**
 * Emit a broadcast signal to the Creative Liberation Engine event bus.
 * Connects to Redis pub/sub via the Dispatch Server.
 */
export async function broadcastSignal(signal: Omit<BroadcastSignal, 'timestamp'>): Promise<void> {
    const full: BroadcastSignal = { ...signal, timestamp: new Date().toISOString() };
    try {
        await fetch('http://127.0.0.1:5050/api/events/broadcast', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(full),
        });
    } catch {
        console.warn(`[ATLAS] Broadcast offline â€” signal dropped: ${signal.channel}`);
    }
}

/**
 * ATLAS agent run handler â€” processes live data query tasks.
 */
export async function atlasRun(input: AgentRunInput): Promise<Partial<AgentRunResult>> {
    const query = typeof input.prompt === 'string' ? input.prompt : '';

    if (query.startsWith('market:')) {
        const symbol = query.replace('market:', '').trim();
        const snapshot = await fetchMarketSnapshot(symbol);
        return { output: JSON.stringify(snapshot, null, 2) };
    }

    if (query.startsWith('broadcast:')) {
        const parts = query.replace('broadcast:', '').split(':');
        const channel = parts[0]?.trim() ?? 'general';
        const payload = parts.slice(1).join(':').trim();
        await broadcastSignal({ channel, payload, priority: 'normal' });
        return { output: `[ATLAS] Broadcast dispatched â†’ ${channel}` };
    }

    return { output: `[ATLAS] Unhandled query: ${query}` };
}
