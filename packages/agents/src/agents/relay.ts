/**
 * RELAY â€” Event Router & Pub/Sub Bridge
 *
 * Connects the Creative Liberation Engine hive to the Redis Streams event bus.
 * Routes messages between agents, services, and external webhooks.
 * RELAY is the nervous system â€” all inter-agent communication flows through it.
 *
 * Hive: INFRASTRUCTURE | Constitutional Access: false
 * Mode compatibility: PLAN, SHIP, VALIDATE
 */

import type { AgentDefinition } from '../types.js';

export const RELAY: AgentDefinition = {
    id: 'RELAY',
    name: 'RELAY',
    description: 'Event routing â€” pub/sub bridge, Redis Streams, inter-agent message dispatch',
    hive: 'INFRASTRUCTURE',
    modes: ['PLAN', 'SHIP', 'VALIDATE'],
    constitutionalAccess: false,
};

// â”€â”€â”€ RELAY Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type EventPriority = 'low' | 'normal' | 'high' | 'critical';

export interface RelayEvent {
    id?: string;
    channel: string;
    type: string;
    payload: unknown;
    sourceAgent?: string;
    targetAgent?: string;
    priority: EventPriority;
    timestamp: string;
    correlationId?: string;
}

export interface RelaySubscription {
    channel: string;
    handler: (event: RelayEvent) => Promise<void> | void;
}

// â”€â”€â”€ In-Memory Event Bus (local fallback) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const subscriptions = new Map<string, Array<(event: RelayEvent) => Promise<void> | void>>();

export const RelayBus = {
    /**
     * Subscribe to a channel. Returns an unsubscribe function.
     */
    subscribe(channel: string, handler: (event: RelayEvent) => Promise<void> | void): () => void {
        if (!subscriptions.has(channel)) {
            subscriptions.set(channel, []);
        }
        subscriptions.get(channel)!.push(handler);

        return () => {
            const handlers = subscriptions.get(channel);
            if (handlers) {
                const idx = handlers.indexOf(handler);
                if (idx > -1) handlers.splice(idx, 1);
            }
        };
    },

    /**
     * Publish an event to a channel â€” dispatches to all subscribers.
     * Also forwards to the Dispatch Server SSE bus if online.
     */
    async publish(event: Omit<RelayEvent, 'timestamp' | 'id'>): Promise<void> {
        const full: RelayEvent = {
            ...event,
            id: `relay-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            timestamp: new Date().toISOString(),
        };

        // Local delivery
        const handlers = subscriptions.get(full.channel) ?? [];
        await Promise.allSettled(handlers.map(h => h(full)));

        // Remote delivery â€” fire and forget
        fetch('http://127.0.0.1:5050/api/events/relay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(full),
        }).catch(() => {
            // Dispatch server offline â€” local delivery already done
        });
    },

    /**
     * Broadcast from one agent to all subscribers on a channel.
     */
    async broadcast(channel: string, type: string, payload: unknown, sourceAgent?: string): Promise<void> {
        await RelayBus.publish({ channel, type, payload, sourceAgent, priority: 'normal' });
    },

    /**
     * Direct message â€” from one agent to a specific target.
     */
    async send(targetAgent: string, type: string, payload: unknown, sourceAgent?: string): Promise<void> {
        await RelayBus.publish({
            channel: `agent:${targetAgent}`,
            type,
            payload,
            sourceAgent,
            targetAgent,
            priority: 'normal',
        });
    },

    activeSubscriptions(): number {
        let total = 0;
        for (const handlers of subscriptions.values()) {
            total += handlers.length;
        }
        return total;
    },
};
