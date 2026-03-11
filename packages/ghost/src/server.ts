/**
 * GHOST — QA Engine Server (v2 — SMG Upgrade)
 *
 * Express HTTP server exposing SENTINEL security scanning,
 * performance auditing, accessibility testing, uptime monitoring,
 * AND the new SMG Crawl Mode for spatial web/mobile mapping.
 *
 * Port 6000 | Docker healthcheck: GET /health
 *
 * === SMG ROUTES (NEW) ===
 * POST /crawl              — Web BFS crawl → SMGGraph
 * POST /crawl/android      — Android UIAutomator2 crawl → SMGGraph
 * POST /crawl/ios          — iOS XCUITest crawl → SMGGraph
 * GET  /smg/:domain        — Get stored SMGGraph for domain
 * PUT  /smg/:domain        — Partial update to stored graph
 * GET  /smg/:domain/coverage — Coverage report
 * GET  /smg                — List all stored domains
 */

import express, { Request, Response, Application } from 'express';
import { sentinel } from './sentinel.js';
import { CrawlAgent } from './smg/crawl-agent.js';
import { AndroidCrawlAgent } from './smg/android-crawl-agent.js';
import { IOSCrawlAgent } from './smg/ios-crawl-agent.js';
import { smgStore } from './smg/smg-store.js';

const app: Application = express();
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.PORT || 6000;

// In-progress crawls — prevents double-crawling same domain
const activeCrawls = new Map<string, Promise<unknown>>();

// ── Health ─────────────────────────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
    res.json({
        status: 'operational',
        service: 'inception-ghost',
        version: '2.0.0-smg',
        timestamp: new Date().toISOString(),
        capabilities: ['sentinel', 'performance', 'accessibility', 'seo', 'monitor', 'smg-crawl', 'smg-android', 'smg-ios'],
        active_crawls: activeCrawls.size,
    });
});

// ══ SENTINEL ══════════════════════════════════════════════════════════════════

app.post('/scan', async (req: Request, res: Response) => {
    try {
        const { target_url, categories, verbose } = req.body;
        if (!target_url) { res.status(400).json({ error: '"target_url" is required' }); return; }
        const report = await sentinel.runFullScan({ target_base_url: target_url, categories, verbose: verbose ?? true });
        res.json(report);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/audit/performance', async (req: Request, res: Response) => {
    try {
        const { url } = req.body;
        if (!url) { res.status(400).json({ error: '"url" is required' }); return; }
        res.json({ status: 'pending', note: 'Performance audit requires live browser — use GHOST CLI for now' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/audit/accessibility', async (req: Request, res: Response) => {
    try {
        const { url } = req.body;
        if (!url) { res.status(400).json({ error: '"url" is required' }); return; }
        res.json({ status: 'pending', note: 'Accessibility audit requires live browser — use GHOST CLI for now' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/audit/seo', async (req: Request, res: Response) => {
    try {
        const { url } = req.body;
        if (!url) { res.status(400).json({ error: '"url" is required' }); return; }
        res.json({ status: 'pending', note: 'SEO audit requires live browser — use GHOST CLI for now' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ══ SMG CRAWL — Web ════════════════════════════════════════════════════════════
//
// POST /crawl
// Crawls a web domain BFS from start_url and builds an SMGGraph.
// Returns immediately with crawl_id if async=true, or blocks until complete.
//
// Body: { url: string, max_depth?: number, max_states?: number, async?: boolean }

app.post('/crawl', async (req: Request, res: Response) => {
    try {
        const { url, max_depth = 3, max_states = 100, async: isAsync = false, delay_ms = 500 } = req.body;
        if (!url) { res.status(400).json({ error: '"url" is required. Example: { "url": "https://reddit.com", "max_depth": 2 }' }); return; }

        const domain = new URL(url).hostname;

        // Check for existing in-progress crawl
        if (activeCrawls.has(`web:${domain}`)) {
            res.json({ status: 'in_progress', domain, message: 'Crawl already running for this domain. Check /smg/:domain for progress.' });
            return;
        }

        const agent = new CrawlAgent({ maxDepth: max_depth, maxStates: max_states, delayMs: delay_ms });

        if (isAsync) {
            // Fire and return crawl_id
            const crawlPromise = agent.crawl(url).finally(() => activeCrawls.delete(`web:${domain}`));
            activeCrawls.set(`web:${domain}`, crawlPromise);
            res.json({
                status: 'started',
                domain,
                crawl_id: `web:${domain}`,
                message: `Crawl started for ${domain}. Check GET /smg/${domain}/coverage for progress.`,
                poll_url: `/smg/${domain}/coverage`,
            });
        } else {
            // Blocking crawl
            const crawlPromise = agent.crawl(url).finally(() => activeCrawls.delete(`web:${domain}`));
            activeCrawls.set(`web:${domain}`, crawlPromise);
            const graph = await crawlPromise;
            res.json(graph);
        }
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ══ SMG CRAWL — Android ═══════════════════════════════════════════════════════
//
// POST /crawl/android
// Body: { package: string, activity: string, device_id?: string, max_depth?: number }

app.post('/crawl/android', async (req: Request, res: Response) => {
    try {
        const { package: pkg, activity, device_id, max_depth = 2, max_states = 60 } = req.body;
        if (!pkg || !activity) {
            res.status(400).json({ error: '"package" and "activity" are required. Example: { "package": "com.reddit.frontpage", "activity": "com.reddit.frontpage/.MainActivity" }' });
            return;
        }

        const key = `android:${pkg}`;
        if (activeCrawls.has(key)) {
            res.json({ status: 'in_progress', package: pkg, message: 'Android crawl already running.' });
            return;
        }

        const agent = new AndroidCrawlAgent({ deviceId: device_id, maxDepth: max_depth, maxStates: max_states });
        const crawlPromise = agent.crawl(pkg, activity).finally(() => activeCrawls.delete(key));
        activeCrawls.set(key, crawlPromise);
        const graph = await crawlPromise;
        res.json(graph);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ══ SMG CRAWL — iOS ═══════════════════════════════════════════════════════════
//
// POST /crawl/ios
// Body: { bundle_id: string, appium_url?: string, device_name?: string, platform_version?: string }

app.post('/crawl/ios', async (req: Request, res: Response) => {
    try {
        const {
            bundle_id,
            appium_url = 'http://localhost:4723',
            device_name = 'iPhone 15 Pro',
            platform_version = '17.0',
            max_depth = 2,
            max_states = 60,
        } = req.body;

        if (!bundle_id) {
            res.status(400).json({ error: '"bundle_id" is required. Example: { "bundle_id": "com.reddit.Reddit" }' });
            return;
        }

        const key = `ios:${bundle_id}`;
        if (activeCrawls.has(key)) {
            res.json({ status: 'in_progress', bundle_id, message: 'iOS crawl already running.' });
            return;
        }

        const agent = new IOSCrawlAgent({ bundleId: bundle_id, appiumUrl: appium_url, deviceName: device_name, platformVersion: platform_version, maxDepth: max_depth, maxStates: max_states });
        const crawlPromise = agent.crawl().finally(() => activeCrawls.delete(key));
        activeCrawls.set(key, crawlPromise);
        const graph = await crawlPromise;
        res.json(graph);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ══ SMG READ ══════════════════════════════════════════════════════════════════

// GET /smg — List all stored domains
app.get('/smg', async (_req: Request, res: Response) => {
    try {
        const webDomains = await smgStore.listDomains('web');
        const androidDomains = await smgStore.listDomains('android');
        const iosDomains = await smgStore.listDomains('ios');
        res.json({
            web: webDomains,
            android: androidDomains,
            ios: iosDomains,
            total: webDomains.length + androidDomains.length + iosDomains.length,
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// GET /smg/:domain — Full SMGGraph
app.get('/smg/:domain', async (req: Request, res: Response) => {
    try {
        const domain: string = req.params['domain'] as string;
        const platform: string = String(req.query['platform'] ?? 'web');
        const graph = await smgStore.load(domain, platform);
        if (!graph) {
            res.status(404).json({
                error: `No SMG found for ${domain}/${platform}`,
                hint: `Start a crawl: POST /crawl with { "url": "https://${domain}" }`,
            });
            return;
        }
        res.json(graph);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// GET /smg/:domain/coverage — Lightweight coverage report
app.get('/smg/:domain/coverage', async (req: Request, res: Response) => {
    try {
        const domain: string = req.params['domain'] as string;
        const platform: string = String(req.query['platform'] ?? 'web');
        const coverage = await smgStore.getCoverage(domain, platform);
        const inProgress = activeCrawls.has(`${platform}:${domain}`);
        res.json({ ...coverage, crawl_in_progress: inProgress });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// GET /smg/:domain/state/:stateId — Single state lookup
app.get('/smg/:domain/state/:stateId', async (req: Request, res: Response) => {
    try {
        const domain: string = req.params['domain'] as string;
        const stateId: string = req.params['stateId'] as string;
        const platform: string = String(req.query['platform'] ?? 'web');
        const state = await smgStore.getState(domain, stateId, platform);
        if (!state) { res.status(404).json({ error: `State ${stateId} not found in ${domain}/${platform}` }); return; }
        res.json(state);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /smg/:domain — Partial graph update (Validator write-back)
app.put('/smg/:domain', async (req: Request, res: Response) => {
    try {
        const domain: string = req.params['domain'] as string;
        const platform: string = String(req.query['platform'] ?? 'web');
        const { state, transition } = req.body;

        if (state) {
            await smgStore.updateState(domain, state, platform);
        }
        if (transition) {
            await smgStore.appendTransition(domain, transition, platform);
        }

        res.json({ status: 'updated', domain, platform, timestamp: new Date().toISOString() });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /smg/:domain — Reset graph (force re-crawl)
app.delete('/smg/:domain', async (req: Request, res: Response) => {
    try {
        const domain: string = req.params['domain'] as string;
        const platform: string = String(req.query['platform'] ?? 'web');
        await smgStore.delete(domain, platform);
        res.json({ status: 'deleted', domain, platform, hint: 'Trigger a new crawl with POST /crawl' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ── Start ──────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════╗
║   GHOST — AUTONOMOUS QA + SMG ENGINE                     ║
║   v2.0.0-smg | Port ${PORT}                                ║
╠══════════════════════════════════════════════════════════╣
║   GET  /health                  — Health check           ║
║   POST /scan                    — SENTINEL scan          ║
╠═══════════════ SMG CRAWL ════════════════════════════════╣
║   POST /crawl                   — Web BFS crawl          ║
║   POST /crawl/android           — Android crawl          ║
║   POST /crawl/ios               — iOS crawl              ║
║   GET  /smg                     — List all domains       ║
║   GET  /smg/:domain             — Full SMGGraph          ║
║   GET  /smg/:domain/coverage    — Coverage report        ║
║   GET  /smg/:domain/state/:id   — Single state           ║
║   PUT  /smg/:domain             — Partial update         ║
║   DELETE /smg/:domain           — Reset (re-crawl)       ║
╚══════════════════════════════════════════════════════════╝
    `);
});

export { app };
