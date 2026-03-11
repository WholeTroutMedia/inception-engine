/**
 * packages/campaign/src/server.ts
 * Campaign Execution Service — Express server
 * Routes: /brief, /execute, /status/:id, /deliver/:id, /approve/:id
 *
 * Auto-chain: subscribes to zeroday:brief.created via Redis pub/sub.
 * When a Zero-Day intake session completes, this service automatically
 * creates and executes a campaign — zero human trigger required (Article XX).
 */

import express, { Express, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import type { CreativeBrief, Campaign, CampaignAsset } from './brief/schema.js';
import { planCampaignDAG } from './dag/executor.js';
import { executeCampaignDAG } from './dag/executor.js';
import { runCompassValidation } from './compass/validator.js';
import { BriefSubscriber } from './events/brief-subscriber.js';

const app: Express = express();
app.use(express.json());

const PORT = parseInt(process.env.PORT ?? '4006');
const GENKIT_URL = process.env.GENKIT_URL ?? 'http://genkit:4100';
const OUTPUT_DIR = process.env.CAMPAIGN_OUTPUT_DIR ?? '/tmp/campaigns';

// In-memory store — replace with Postgres in production
const campaigns = new Map<string, Campaign>();

// ─────────────────────────────────────────────────────────────────────────────
// HEALTH
// ─────────────────────────────────────────────────────────────────────────────

app.get('/health', (_req: Request, res: Response) => {
    res.json({
        status: 'healthy',
        service: 'campaign',
        active_campaigns: campaigns.size,
        timestamp: new Date().toISOString(),
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /brief — create a new campaign from a brief
// ─────────────────────────────────────────────────────────────────────────────

app.post('/brief', async (req: Request, res: Response) => {
    try {
        const brief = req.body as Partial<CreativeBrief>;
        if (!brief.intent || !brief.brand || !brief.deliverables?.length) {
            res.status(400).json({ error: 'brief.intent, brief.brand, and brief.deliverables are required' });
            return;
        }

        const now = new Date().toISOString();
        const fullBrief: CreativeBrief = {
            id: randomUUID(),
            client_id: brief.client_id ?? 'unknown',
            project_name: brief.project_name ?? `Campaign ${Date.now()}`,
            project_type: brief.project_type ?? 'campaign',
            intent: brief.intent,
            summary: brief.summary ?? brief.intent.slice(0, 200),
            deliverables: brief.deliverables,
            brand: brief.brand,
            audience: brief.audience ?? {},
            timeline: brief.timeline ?? 'standard',
            budget_tier: brief.budget_tier ?? 'growth',
            constitutional_flags: brief.constitutional_flags ?? [],
            averi_notes: brief.averi_notes ?? '',
            created_at: now,
            updated_at: now,
            status: 'approved',
            version: 1,
        };

        const dag = planCampaignDAG(fullBrief);

        const campaign: Campaign = {
            id: randomUUID(),
            brief: fullBrief,
            dag,
            assets: [],
            iterations: [],
            status: 'planning',
            created_at: now,
            updated_at: new Date().toISOString(),
        };

        campaigns.set(campaign.id, campaign);
        console.log(`[CAMPAIGN] 📋 Created campaign ${campaign.id} with ${dag.length} DAG nodes`);
        res.status(201).json({ campaign_id: campaign.id, dag_size: dag.length, status: campaign.status });
    } catch (err) {
        res.status(500).json({ error: String(err) });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /execute/:id — run the full campaign loop
// ─────────────────────────────────────────────────────────────────────────────

app.post('/execute/:id', async (req: Request, res: Response) => {
    const campaign = campaigns.get(req.params.id);
    if (!campaign) { res.status(404).json({ error: 'Campaign not found' }); return; }
    if (campaign.status !== 'planning' && campaign.status !== 'directing') {
        res.status(409).json({ error: `Campaign is ${campaign.status} — not ready to execute` });
        return;
    }

    // Return immediately — execution is async
    res.json({ message: 'Execution started', campaign_id: campaign.id });

    // Async execution pipeline
    (async () => {
        try {
            // 1. Get Creative Vision from god-prompt
            campaign.status = 'directing';
            campaigns.set(campaign.id, campaign);

            const visionRes = await fetch(`${GENKIT_URL}/flow/CreativeDirector`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ brief: campaign.brief }),
            });
            const visionData = await visionRes.json() as { result: unknown };
            const vision = visionData.result as any;
            campaign.vision_document = JSON.stringify(vision);

            // 2. Execute the DAG
            campaign.status = 'producing';
            campaigns.set(campaign.id, campaign);

            const dagResult = await executeCampaignDAG(campaign, vision, OUTPUT_DIR, (nodeId, status) => {
                console.log(`[CAMPAIGN] ${campaign.id} → node ${nodeId}: ${status}`);
            });

            campaign.assets = dagResult.assets;

            // 3. COMPASS validation
            campaign.status = 'validating';
            campaigns.set(campaign.id, campaign);
            const compassReport = await runCompassValidation(campaign, campaign.assets);
            campaign.compass_report = compassReport;

            // 4. Mark ready for client
            campaign.status = 'client_review';
            campaign.updated_at = new Date().toISOString();
            campaigns.set(campaign.id, campaign);

            console.log(`[CAMPAIGN] ✅ ${campaign.id} ready for client review | COMPASS: ${compassReport.overall_score}/100`);
        } catch (err) {
            console.error(`[CAMPAIGN] ❌ Execution failed for ${campaign.id}:`, err);
            campaign.status = 'planning'; // reset for retry
            campaigns.set(campaign.id, campaign);
        }
    })();
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /status/:id
// ─────────────────────────────────────────────────────────────────────────────

app.get('/status/:id', (req: Request, res: Response) => {
    const campaign = campaigns.get(req.params.id);
    if (!campaign) { res.status(404).json({ error: 'Campaign not found' }); return; }

    res.json({
        campaign_id: campaign.id,
        project_name: campaign.brief.project_name,
        status: campaign.status,
        assets_produced: campaign.assets.length,
        assets_required: campaign.brief.deliverables.reduce((acc, d) => acc + d.quantity, 0),
        compass_score: campaign.compass_report?.overall_score ?? null,
        dag_progress: campaign.dag?.map(n => ({ id: n.id, type: n.deliverable_type, status: n.status })),
        updated_at: campaign.updated_at,
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /campaigns — list all campaigns
// ─────────────────────────────────────────────────────────────────────────────

app.get('/campaigns', (_req: Request, res: Response) => {
    const list = [...campaigns.values()].map(c => ({
        id: c.id,
        project_name: c.brief.project_name,
        client_id: c.brief.client_id,
        status: c.status,
        assets_produced: c.assets.length,
        compass_score: c.compass_report?.overall_score ?? null,
        created_at: c.created_at,
        updated_at: c.updated_at,
    }));
    res.json({ campaigns: list, total: list.length });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /approve/:id — client approves → mark delivered
// ─────────────────────────────────────────────────────────────────────────────

app.post('/approve/:id', async (req: Request, res: Response) => {
    const campaign = campaigns.get(req.params.id);
    if (!campaign) { res.status(404).json({ error: 'Campaign not found' }); return; }

    campaign.status = 'delivered';
    campaign.updated_at = new Date().toISOString();
    campaigns.set(campaign.id, campaign);

    console.log(`[CAMPAIGN] 🎉 Campaign ${campaign.id} approved and delivered`);
    res.json({
        message: 'Campaign approved',
        campaign_id: campaign.id,
        assets: campaign.assets.map(a => ({ type: a.deliverable_type, path: a.local_path, score: a.quality_score })),
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// START
// ─────────────────────────────────────────────────────────────────────────────

const server = app.listen(PORT, () => {
    console.log(`[CAMPAIGN] 🚀 Campaign service running on port ${PORT}`);
    console.log(`[CAMPAIGN] 📡 GenKit: ${GENKIT_URL} | Output: ${OUTPUT_DIR}`);

    // ── Auto-chain: subscribe to Zero-Day brief.created events
    const selfUrl = process.env.CAMPAIGN_SELF_URL ?? `http://localhost:${PORT}`;
    const redisUrl = process.env.REDIS_URL ?? '';
    const briefSubscriber = new BriefSubscriber(selfUrl);
    briefSubscriber.start(redisUrl);

    // Graceful shutdown
    const shutdown = async () => {
        console.log('[CAMPAIGN] Shutting down gracefully...');
        await briefSubscriber.stop();
        server.close(() => process.exit(0));
    };
    process.once('SIGTERM', shutdown);
    process.once('SIGINT', shutdown);
});

export { app };
