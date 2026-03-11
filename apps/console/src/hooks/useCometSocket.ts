/**
 * COMET — useCometSocket Hook
 *
 * WebSocket connection to the COMET execution stream.
 * Streams real-time plan execution events to the Console UI.
 *
 * Events:
 *   plan_generated   → Show plan cards before execution starts
 *   node_start       → Highlight active SMG node + show spinner
 *   node_complete    → Dim node, show output badge
 *   node_failed      → Amber pulse on node, show error
 *   node_repaired    → Green pulse, show corrected selector
 *   plan_complete    → Final summary + confetti (you earned it)
 */

import { useState, useEffect, useRef, useCallback } from 'react';

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL ?? 'http://localhost:3080';

export type CometEventType =
    | 'plan_generated'
    | 'node_start'
    | 'node_complete'
    | 'node_failed'
    | 'node_repaired'
    | 'plan_complete'
    | 'connected'
    | 'disconnected';

export interface CometEvent {
    type: CometEventType;
    node_id?: string;
    description?: string;
    output?: unknown;
    error?: string;
    plan?: unknown;
    context?: Record<string, unknown>;
    timestamp: string;
}

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

export function useCometSocket() {
    const [events, setEvents] = useState<CometEvent[]>([]);
    const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
    const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
    const [taskComplete, setTaskComplete] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);

    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;

        const wsUrl = GATEWAY_URL.replace(/^http/, 'ws') + '/comet/ws';
        setConnectionState('connecting');
        setEvents([]);
        setTaskComplete(false);

        try {
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                setConnectionState('connected');
                const connEvent: CometEvent = { type: 'connected', timestamp: new Date().toISOString() };
                setEvents(prev => [...prev, connEvent]);
            };

            ws.onmessage = (msg) => {
                try {
                    const event = JSON.parse(msg.data) as Omit<CometEvent, 'timestamp'>;
                    const fullEvent: CometEvent = { ...event, timestamp: new Date().toISOString() };
                    setEvents(prev => [...prev, fullEvent]);

                    if (event.type === 'node_start') setActiveNodeId(event.node_id ?? null);
                    if (event.type === 'node_complete' || event.type === 'node_repaired' || event.type === 'node_failed') {
                        // Keep active for 500ms then clear
                        setTimeout(() => setActiveNodeId(null), 500);
                    }
                    if (event.type === 'plan_complete') {
                        setTaskComplete(true);
                        setActiveNodeId(null);
                    }
                } catch { /* Ignore malformed messages */ }
            };

            ws.onerror = () => setConnectionState('error');
            ws.onclose = () => {
                setConnectionState('disconnected');
                const discEvent: CometEvent = { type: 'disconnected', timestamp: new Date().toISOString() };
                setEvents(prev => [...prev, discEvent]);
            };
        } catch {
            setConnectionState('error');
        }
    }, []);

    const disconnect = useCallback(() => {
        wsRef.current?.close();
        wsRef.current = null;
    }, []);

    const clearEvents = useCallback(() => {
        setEvents([]);
        setTaskComplete(false);
        setActiveNodeId(null);
    }, []);

    useEffect(() => () => disconnect(), [disconnect]);

    return { events, connectionState, activeNodeId, taskComplete, connect, disconnect, clearEvents };
}
