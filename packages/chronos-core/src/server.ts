/**
 * Chronos Core — REST API Server
 * Creative Liberation Engine v5.0.0 (GENESIS)
 *
 * Exposes the ChronosEngine over HTTP:
 *   GET  /health    — liveness probe
 *   POST /ingest    — ingest a time-series event
 *   GET  /query     — query events by stream + time range
 */

import express, { type Application, type Request, type Response } from 'express';
import { ChronosEngine } from './ChronosEngine';
import { TimeSeriesManager } from './store/TimeSeriesManager';

const app: Application = express();
app.use(express.json());

const engine = new ChronosEngine();
const tsManager = new TimeSeriesManager();

let booted = false;

// ─── Boot engine on startup ───────────────────────────────────────────────────
(async () => {
  try {
    await tsManager.connect();
    await engine.boot();
    booted = true;
    console.log('[ChronosServer] Engine online.');
  } catch (err) {
    console.error('[ChronosServer] Boot failed — running in degraded mode:', err);
  }
})();

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * GET /health
 * Returns engine status and uptime, including Redis TimeSeries connection status.
 */
app.get('/health', (_req: Request, res: Response) => {
  const isRedisConnected = tsManager.isConnected;
  const isEngineRunning = engine.isRunning;
  const isOperational = booted && isEngineRunning && isRedisConnected;

  res.json({
    status: isOperational ? 'operational' : 'degraded',
    service: 'chronos-core',
    version: '1.0.0',
    components: {
      engine: isEngineRunning ? 'online' : 'offline',
      redis: isRedisConnected ? 'connected' : 'disconnected',
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /ingest
 * Body: { modality: string, source: string, score: number, timestamp?: number (ms epoch), features?: Record<string,unknown> }
 */
app.post('/ingest', async (req: Request, res: Response) => {
  const { modality, source, score, timestamp, features } = req.body as {
    modality?: string;
    source?: string;
    score?: number;
    timestamp?: number;
    features?: Record<string, unknown>;
  };

  if (!modality || !source || score === undefined) {
    res.status(400).json({ error: 'modality, source and score are required' });
    return;
  }

  try {
    const ts = timestamp ?? Date.now();
    await tsManager.indexEvent(
      ts,
      {
        modality: modality as 'video' | 'audio' | 'finance' | 'biometric',
        source,
        features: features ?? {},
      },
      score,
    );
    res.json({ ok: true, modality, source, ts, score });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

/**
 * GET /query?modality=<modality>&source=<source>&from=<ms>&to=<ms>
 */
app.get('/query', async (req: Request, res: Response) => {
  const { modality, source, from, to } = req.query as {
    modality?: string;
    source?: string;
    from?: string;
    to?: string;
  };

  if (!modality || !source) {
    res.status(400).json({ error: 'modality and source query params required' });
    return;
  }

  try {
    const fromMs = from ? parseInt(from, 10) : Date.now() - 60_000;
    const toMs = to ? parseInt(to, 10) : Date.now();
    const samples = await tsManager.queryTimeRange(modality, source, fromMs, toMs);
    res.json({ modality, source, from: fromMs, to: toMs, count: samples.length, samples });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env['PORT'] ?? '7800', 10);
app.listen(PORT, () => {
  console.log(`[ChronosServer] Listening on :${PORT}`);
});

export { app };
