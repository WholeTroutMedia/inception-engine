import { Redis } from 'ioredis';
import type { Deliverable, ProjectType } from '../brief/schema.js';

// ─── Campaign Event Subscriber (Streams) ───────────────────────────────────────
// Consumes zeroday:brief.created from a Redis Stream.
// This is the Article XX implementation — zero human wait time after intake.
// Uses Consumer Groups for guaranteed delivery even across restarts.

const STREAM_BRIEF_CREATED = 'stream:zeroday:briefs';
const CONSUMER_GROUP = 'campaign_service_group';

export interface BriefCreatedEvent {
    type: 'brief.created';
    session_id: string;
    client_email: string;
    client_name: string;
    brief_text: string;
    project_type: string;
    budget_range: string;
    timeline: string;
    occured_at: string;
}

// Map project_type from zero-day onto campaign deliverable defaults
// All types must be valid DeliverableType values from schema.ts
function defaultDeliverablesForType(projectType: string): Deliverable[] {
    const presets: Record<string, Deliverable[]> = {
        campaign: [
            { type: 'social_cutdowns', quantity: 5, format: '1:1' },
            { type: 'product_stills', quantity: 1, format: '16:9' },
        ],
        brand_identity: [
            { type: 'brand_identity', quantity: 1 },
            { type: 'brand_guidelines', quantity: 1 },
        ],
        website: [
            { type: 'product_stills', quantity: 1, format: '16:9' },
            { type: 'web_banner', quantity: 3, format: '16:9' },
        ],
        social_media: [
            { type: 'social_cutdowns', quantity: 8, format: '1:1' },
        ],
        broadcast_production: [
            { type: 'hero_video', quantity: 2, format: '16:9' },
            { type: 'product_stills', quantity: 1, format: '16:9' },
        ],
        content_series: [
            { type: 'social_cutdowns', quantity: 4, format: '9:16' },
            { type: 'campaign_copy', quantity: 1 },
        ],
        product_launch: [
            { type: 'hero_video', quantity: 1, format: '16:9' },
            { type: 'product_stills', quantity: 3, format: '1:1' },
            { type: 'campaign_copy', quantity: 1 },
        ],
    };
    return presets[projectType] ?? [{ type: 'product_stills', quantity: 1, format: '16:9' }];
}

// Map zero-day project_type string to valid campaign ProjectType
function toProjectType(raw: string): ProjectType {
    const mapping: Record<string, ProjectType> = {
        campaign: 'campaign',
        brand_identity: 'brand_identity',
        website: 'web_experience',
        social_media: 'content_series',
        broadcast_production: 'broadcast',
        content_series: 'content_series',
        product_launch: 'product_launch',
        event: 'event',
        spatial_xr: 'spatial_xr',
    };
    return mapping[raw] ?? 'campaign';
}



function buildBriefPayload(event: BriefCreatedEvent): Record<string, unknown> {
    return {
        client_id: `zeroday-${event.session_id}`,
        project_name: `Auto-Campaign: ${event.client_name} — ${event.project_type}`,
        project_type: toProjectType(event.project_type),
        intent: event.brief_text.slice(0, 500) || `Campaign for ${event.client_name}`,
        summary: event.brief_text.slice(0, 200) || `Auto-generated from Zero-Day intake session ${event.session_id}`,
        deliverables: defaultDeliverablesForType(event.project_type),
        brand: {
            name: event.client_name,
            tone: 'bold',                    // default — AVERI will refine
        },
        audience: {},
        timeline: event.timeline === 'flexible' ? 'standard' : 'standard',
        budget_tier: event.budget_range === 'over_100k' ? 'enterprise'
            : event.budget_range === '50k_to_100k' ? 'enterprise'
                : event.budget_range === '15k_to_50k' ? 'scale'
                    : event.budget_range === '5k_to_15k' ? 'growth'
                        : 'starter',
        averi_notes: `Auto-triggered from Zero-Day intake. Session: ${event.session_id}. Client: ${event.client_email}.`,
    };
}

export class BriefSubscriber {
    private subscriber: Redis | null = null;
    private campaignServiceUrl: string;
    private processedSessions = new Set<string>(); // local memory idempotency guard
    private running = false;
    private consumerName: string;

    constructor(campaignServiceUrl: string) {
        this.campaignServiceUrl = campaignServiceUrl;
        this.consumerName = `campaign_worker_${Math.random().toString(36).substring(2, 9)}`;
    }

    async start(redisUrl: string): Promise<void> {
        if (!redisUrl) {
            console.log('[CAMPAIGN] Redis not configured — brief.created stream consumer inactive');
            return;
        }

        this.subscriber = new Redis(redisUrl, {
            lazyConnect: true,
            enableOfflineQueue: false,
            maxRetriesPerRequest: 2,
        });

        this.subscriber.on('error', (err: Error) => {
            console.warn('[CAMPAIGN] Redis stream consumer error (non-fatal):', err.message);
        });

        try {
            await this.subscriber.connect();
        } catch (err) {
            console.warn('[CAMPAIGN] Failed to connect to Redis — stream consumer will not start:', (err as Error).message);
            return;
        }

        // Initialize Consumer Group
        try {
            await this.subscriber.xgroup('CREATE', STREAM_BRIEF_CREATED, CONSUMER_GROUP, '$', 'MKSTREAM');
            console.log(`[CAMPAIGN] 🏗️ Created consumer group ${CONSUMER_GROUP} for stream ${STREAM_BRIEF_CREATED}`);
        } catch (err: any) {
            if (!err.message.includes('BUSYGROUP')) {
                console.error(`[CAMPAIGN] ❌ Failed to create consumer group:`, err.message);
                return;
            }
        }

        console.log(`[CAMPAIGN] 👂 Stream consumer started: ${this.consumerName} listening to ${STREAM_BRIEF_CREATED} — auto-chain active`);

        this.running = true;
        this.pollLoop();
    }

    private async pollLoop() {
        if (!this.subscriber || !this.running) return;

        try {
            // XREADGROUP GROUP <group> <consumer> BLOCK <ms> STREAMS <stream> >
            const results = await this.subscriber.xreadgroup(
                'GROUP', CONSUMER_GROUP, this.consumerName,
                'BLOCK', 5000,
                'STREAMS', STREAM_BRIEF_CREATED, '>'
            ) as any;

            if (results && results.length > 0) {
                const [streamName, messages] = results[0];
                for (const message of messages) {
                    const [messageId, fields] = message;

                    // Parse payload
                    let payloadStr = '';
                    for (let i = 0; i < fields.length; i += 2) {
                        if (fields[i] === 'payload') {
                            payloadStr = fields[i + 1];
                            break;
                        }
                    }

                    if (payloadStr) {
                        const success = await this.handleBriefCreated(payloadStr, messageId);
                        if (success && this.subscriber) {
                            // Acknowledge processing completion
                            await this.subscriber.xack(STREAM_BRIEF_CREATED, CONSUMER_GROUP, messageId);
                            console.log(`[CAMPAIGN] ✅ XACK sent for stream message ${messageId}`);
                        }
                    }
                }
            }
        } catch (err: any) {
            console.error('[CAMPAIGN] XREADGROUP poll error:', err.message);
            await new Promise(res => setTimeout(res, 2000)); // backoff on error
        }

        // Continue polling
        if (this.running) {
            setImmediate(() => this.pollLoop());
        }
    }

    private async handleBriefCreated(message: string, messageId: string): Promise<boolean> {
        let event: BriefCreatedEvent;
        try {
            event = JSON.parse(message) as BriefCreatedEvent;
        } catch {
            console.warn(`[CAMPAIGN] Malformed brief.created event ${messageId} — skipping`);
            return true; // Return true to XACK and discard poison pills
        }

        // Idempotency: skip if already processed
        if (this.processedSessions.has(event.session_id)) {
            console.log(`[CAMPAIGN] Duplicate brief.created for session ${event.session_id} — skipping`);
            return true; // Already processed, safe to XACK
        }
        this.processedSessions.add(event.session_id);

        console.log(`[CAMPAIGN] ⚡ brief.created received via stream | session: ${event.session_id} | client: ${event.client_email}`);

        try {
            // Step 1: POST /brief → create campaign
            const briefPayload = buildBriefPayload(event);
            const briefRes = await fetch(`${this.campaignServiceUrl}/brief`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(briefPayload),
            });

            if (!briefRes.ok) {
                const errText = await briefRes.text();
                throw new Error(`POST /brief failed (${briefRes.status}): ${errText}`);
            }

            const { campaign_id, dag_size } = await briefRes.json() as { campaign_id: string; dag_size: number };
            console.log(`[CAMPAIGN] 📋 Campaign created: ${campaign_id} | ${dag_size} DAG nodes`);

            // Step 2: POST /execute/:id → kick off full async pipeline
            const execRes = await fetch(`${this.campaignServiceUrl}/execute/${campaign_id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });

            if (!execRes.ok) {
                const errText = await execRes.text();
                throw new Error(`POST /execute/${campaign_id} failed (${execRes.status}): ${errText}`);
            }

            console.log(`[CAMPAIGN] 🚀 Execution started for campaign ${campaign_id} | session: ${event.session_id}`);
            return true;
        } catch (err) {
            // Remove from processed set so it can be retried if subscriber restarts
            this.processedSessions.delete(event.session_id);
            console.error(`[CAMPAIGN] ❌ Auto-chain failed for session ${event.session_id}:`, (err as Error).message);
            return false; // Return false so we DON'T XACK. Message stays in PEL (Pending Entries List).
        }
    }

    async stop(): Promise<void> {
        this.running = false;
        if (this.subscriber) {
            await this.subscriber.quit();
            this.subscriber = null;
        }
    }
}
