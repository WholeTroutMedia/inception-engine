/**
 * @module orchestrator/EventBus
 * @description Typed pub/sub with wildcard subscriptions, replay buffer, and cross-package events
 * Closes #85 (partial)
 */
import { z } from 'zod';

// -- Event Types --

export const EventEnvelopeSchema = z.object({
  eventId: z.string().uuid(),
  topic: z.string(),
  payload: z.record(z.unknown()).default({}),
  source: z.string(),
  timestamp: z.number(),
  metadata: z.record(z.unknown()).default({}),
});
export type EventEnvelope = z.infer<typeof EventEnvelopeSchema>;

export const EventBusConfigSchema = z.object({
  maxReplaySize: z.number().int().positive().default(1000),
  enableReplay: z.boolean().default(true),
  enableWildcards: z.boolean().default(true),
  maxListenersPerTopic: z.number().int().positive().default(100),
});
export type EventBusConfig = z.infer<typeof EventBusConfigSchema>;

export type EventHandler = (event: EventEnvelope) => void | Promise<void>;

export interface Subscription {
  id: string;
  topic: string;
  handler: EventHandler;
  once: boolean;
  createdAt: number;
}

export interface EventBusStats {
  totalPublished: number;
  totalDelivered: number;
  totalDropped: number;
  activeSubscriptions: number;
  replayBufferSize: number;
  topicCount: number;
}

// -- EventBus --

export class EventBus {
  private subscriptions = new Map<string, Subscription[]>();
  private replayBuffer: EventEnvelope[] = [];
  private config: EventBusConfig;
  private stats: EventBusStats = {
    totalPublished: 0,
    totalDelivered: 0,
    totalDropped: 0,
    activeSubscriptions: 0,
    replayBufferSize: 0,
    topicCount: 0,
  };
  private subCounter = 0;

  constructor(config?: Partial<EventBusConfig>) {
    this.config = EventBusConfigSchema.parse(config ?? {});
  }

  on(topic: string, handler: EventHandler): string {
    return this.addSubscription(topic, handler, false);
  }

  once(topic: string, handler: EventHandler): string {
    return this.addSubscription(topic, handler, true);
  }

  off(subscriptionId: string): boolean {
    for (const [topic, subs] of this.subscriptions.entries()) {
      const idx = subs.findIndex((s: Subscription) => s.id === subscriptionId);
      if (idx !== -1) {
        subs.splice(idx, 1);
        this.stats.activeSubscriptions--;
        if (subs.length === 0) {
          this.subscriptions.delete(topic);
          this.stats.topicCount--;
        }
        return true;
      }
    }
    return false;
  }

  async emit(topic: string, payload: Record<string, unknown>, source: string, metadata?: Record<string, unknown>): Promise<EventEnvelope> {
    const event = EventEnvelopeSchema.parse({
      eventId: this.generateId(),
      topic,
      payload,
      source,
      timestamp: Date.now(),
      metadata: metadata ?? {},
    });

    this.stats.totalPublished++;

    if (this.config.enableReplay) {
      this.replayBuffer.push(event);
      if (this.replayBuffer.length > this.config.maxReplaySize) {
        this.replayBuffer.shift();
      }
      this.stats.replayBufferSize = this.replayBuffer.length;
    }

    const matchingSubs = this.getMatchingSubscriptions(topic);
    const onceSubs: string[] = [];

    for (const sub of matchingSubs) {
      try {
        await sub.handler(event);
        this.stats.totalDelivered++;
        if (sub.once) onceSubs.push(sub.id);
      } catch {
        this.stats.totalDropped++;
      }
    }

    for (const id of onceSubs) {
      this.off(id);
    }

    return event;
  }

  replay(topic: string, handler: EventHandler): number {
    if (!this.config.enableReplay) return 0;
    const matching = this.replayBuffer.filter((e) => this.topicMatches(topic, e.topic));
    for (const event of matching) {
      handler(event);
    }
    return matching.length;
  }

  getReplayBuffer(topic?: string): EventEnvelope[] {
    if (!topic) return [...this.replayBuffer];
    return this.replayBuffer.filter((e) => this.topicMatches(topic, e.topic));
  }

  clearReplayBuffer(): void {
    this.replayBuffer = [];
    this.stats.replayBufferSize = 0;
  }

  removeAllListeners(topic?: string): void {
    if (topic) {
      const subs = this.subscriptions.get(topic);
      if (subs) {
        this.stats.activeSubscriptions -= subs.length;
        this.subscriptions.delete(topic);
        this.stats.topicCount--;
      }
    } else {
      this.subscriptions.clear();
      this.stats.activeSubscriptions = 0;
      this.stats.topicCount = 0;
    }
  }

  getStats(): EventBusStats {
    return { ...this.stats };
  }

  getConfig(): EventBusConfig {
    return { ...this.config };
  }

  getTopics(): string[] {
    return [...this.subscriptions.keys()];
  }

  listenerCount(topic: string): number {
    return this.subscriptions.get(topic)?.length ?? 0;
  }

  // -- Private --

  private addSubscription(topic: string, handler: EventHandler, once: boolean): string {
    const id = `sub_${++this.subCounter}_${Date.now()}`;
    const sub: Subscription = { id, topic, handler, once, createdAt: Date.now() };

    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, []);
      this.stats.topicCount++;
    }

    const subs = this.subscriptions.get(topic)!;
    if (subs.length >= this.config.maxListenersPerTopic) {
      throw new Error(`EventBus: max listeners (${this.config.maxListenersPerTopic}) reached for '${topic}'`);
    }

    subs.push(sub);
    this.stats.activeSubscriptions++;
    return id;
  }

  private getMatchingSubscriptions(topic: string): Subscription[] {
    const result: Subscription[] = [];
    for (const [pattern, subs] of this.subscriptions.entries()) {
      if (this.topicMatches(pattern, topic)) {
        result.push(...subs);
      }
    }
    return result;
  }

  private topicMatches(pattern: string, topic: string): boolean {
    if (!this.config.enableWildcards) return pattern === topic;
    if (pattern === '*') return true;
    if (pattern === topic) return true;

    const patternParts = pattern.split('.');
    const topicParts = topic.split('.');

    if (patternParts[patternParts.length - 1] === '**') {
      const prefix = patternParts.slice(0, -1).join('.');
      return topic.startsWith(prefix + '.') || topic === prefix;
    }

    if (patternParts.length !== topicParts.length) return false;

    return patternParts.every((p, i) => p === '*' || p === topicParts[i]);
  }

  private generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}