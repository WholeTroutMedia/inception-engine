/**
 * FORGE — HTTP API Server
 *
 * Exposes the FORGE asset economy layer as REST endpoints.
 * Runs on port 4300.
 *
 * Endpoints:
 *   POST /assets/mint                — Create a new digital asset
 *   GET  /assets/:id                 — Fetch a single asset by ID
 *   POST /assets/:id/transfer        — Transfer asset between wallets
 *   GET  /stats                      — Economy-wide statistics
 *   GET  /royalties/:creatorId       — Royalty history for a creator
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import {
  mintAsset,
  getAsset,
  recordTransfer,
  computeStats,
} from './ledger.js';
import {
  getRoyaltyHistory,
  getPendingBalance,
} from './royalties.js';
import {
  getComputeCostSummary,
} from './compute-ledger.js';
import type { MintRequest } from './economy-types.js';


const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const PORT = Number(process.env.PORT ?? 4300);

// ─── Health ───────────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'operational', service: 'forge-api', version: '1.0.0' });
});

// ─── POST /assets/mint ────────────────────────────────────────────────────────

app.post('/assets/mint', async (req, res) => {
  try {
    const body = req.body as MintRequest;

    if (!body.assetType || !body.title || !body.creatorId) {
      return res.status(400).json({
        error: 'Missing required fields: assetType, title, creatorId',
      });
    }

    const asset = await mintAsset({
      assetType: body.assetType,
      title: body.title,
      creatorId: body.creatorId,
      initialSupply: body.initialSupply ?? 1,
      basePrice: body.basePrice ?? 0,
      royaltyBps: body.royaltyBps ?? 500, // 5% default
      tags: body.tags ?? [],
      metadata: body.metadata ?? {},
    });

    res.status(201).json(asset);
  } catch (err: any) {
    console.error('[FORGE] mint error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /assets/:id ──────────────────────────────────────────────────────────

app.get('/assets/:id', async (req, res) => {
  try {
    const asset = await getAsset(req.params.id!);
    if (!asset) return res.status(404).json({ error: 'Asset not found' });
    res.json(asset);
  } catch (err: any) {
    console.error('[FORGE] getAsset error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /assets/:id/transfer ────────────────────────────────────────────────

app.post('/assets/:id/transfer', async (req, res) => {
  try {
    const { fromId, toId, quantity } = req.body as {
      fromId: string;
      toId: string;
      quantity?: number;
    };

    if (!fromId || !toId) {
      return res
        .status(400)
        .json({ error: 'Missing required fields: fromId, toId' });
    }

    const tx = await recordTransfer(
      req.params.id!,
      fromId,
      toId,
      quantity ?? 1,
      (req.body.amountUsd as number) ?? 0,
    );

    res.json(tx);
  } catch (err: any) {
    console.error('[FORGE] transfer error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /stats ───────────────────────────────────────────────────────────────

app.get('/stats', async (_req, res) => {
  try {
    const stats = await computeStats();
    res.json(stats);
  } catch (err: any) {
    console.error('[FORGE] stats error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /royalties/:creatorId ────────────────────────────────────────────────

app.get('/royalties/:creatorId', async (req, res) => {
  try {
    const creatorId = req.params.creatorId!;
    const limit = Number(req.query['limit'] ?? 500);
    const [allHistory, pending] = await Promise.all([
      getRoyaltyHistory(limit),
      getPendingBalance(creatorId),
    ]);
    const history = allHistory.filter(r => r.creatorId === creatorId);
    res.json({ creatorId, pending, history });
  } catch (err: any) {
    console.error('[FORGE] royalties error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /cloud-costs ─────────────────────────────────────────────────────────

app.get('/cloud-costs', async (req, res) => {
  try {
    const limit = Number(req.query['limit'] ?? 50);
    const summary = await getComputeCostSummary(limit);
    res.json(summary);
  } catch (err: any) {
    console.error('[FORGE] cloud-costs error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Boot ─────────────────────────────────────────────────────────────────────

// Auto-boot ForgeCloudRouter from environment if cloud endpoints are configured
import { getForgeCloudRouter } from './cloud-router.js';

const sovereignEndpoint = process.env['FORGE_SOVEREIGN_ENDPOINT'];
const gcpEndpoint       = process.env['FORGE_GCP_ENDPOINT'];
const cfEndpoint        = process.env['FORGE_CF_ENDPOINT'];

let cloudRouter: ReturnType<typeof getForgeCloudRouter> | null = null;

if (sovereignEndpoint || gcpEndpoint || cfEndpoint) {
  cloudRouter = getForgeCloudRouter({
    sovereignEndpoint: sovereignEndpoint || undefined,
    gcpEndpoint: gcpEndpoint || undefined,
    cfEndpoint: cfEndpoint || undefined,
  });
  console.log(`[FORGE] ☁  Cloud router active — sovereign:${!!sovereignEndpoint} gcp:${!!gcpEndpoint} cf:${!!cfEndpoint}`);
} else {
  console.log('[FORGE] ℹ  No FORGE_*_ENDPOINT env vars set — cloud routing disabled (local only)');
}

const server = app.listen(PORT, () => {
  console.log(`[FORGE] ✓ API server live on port ${PORT}`);
});

// Graceful shutdown — stop health monitor before exit
process.on('SIGTERM', () => {
  console.log('[FORGE] Shutting down...');
  cloudRouter?.stop();
  server.close(() => process.exit(0));
});

export default app;
