import { z } from 'zod';

// ─── ATLAS LIVE — WebSocket Live Data Overlay Bridge ─────────────────────────
// Streams real-time data (sports scores, financial tickers, social feeds,
// event data) into CasparCG HTML templates via WebSocket push.
// Architecture:
//   DataSource → LiveDataFeed → WebSocket Server → CasparCG Template (window.liveData)

const ENV_LDF = globalThis as unknown as { process?: { env?: Record<string, string | undefined> } };
const getEnv = (k: string) => ENV_LDF.process?.env?.[k];

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const LiveFeedConfigSchema = z.object({
    feed_id: z.string().describe('Unique identifier for this live data feed'),
    feed_type: z.enum(['sports_score', 'financial_ticker', 'social_counter', 'weather', 'election', 'custom']),
    update_interval_ms: z.number().min(500).max(60000).default(3000),
    template_field_map: z.record(z.string()).describe('Maps data keys → CasparCG template field IDs (e.g. { "home_score": "f1" })'),
    auto_update_template: z.boolean().default(true).describe('Auto-push updates to CasparCG CG/UPDATE on each data change'),
    caspar_config: z.object({
        host: z.string().default('127.0.0.1'),
        port: z.number().default(6250),
        channel: z.number().default(1),
        layer: z.number().default(25),
    }).optional(),
});

export const SportsScoreSchema = z.object({
    home_team: z.string(),
    away_team: z.string(),
    home_score: z.number(),
    away_score: z.number(),
    period: z.string().default('1'),
    period_label: z.string().default('PERIOD'),
    game_clock: z.string().optional().describe('e.g. "14:32"'),
    sport: z.enum(['football', 'basketball', 'soccer', 'hockey', 'baseball', 'custom']).default('custom'),
});

export const FinancialTickerSchema = z.object({
    symbols: z.array(z.object({
        ticker: z.string(),
        name: z.string().optional(),
        price: z.number(),
        change: z.number(),
        change_percent: z.number(),
        direction: z.enum(['up', 'down', 'flat']),
    })).max(20),
    scroll_speed: z.enum(['slow', 'normal', 'fast']).default('normal'),
});

export const SocialCounterSchema = z.object({
    platform: z.enum(['twitter', 'instagram', 'youtube', 'tiktok', 'custom']),
    label: z.string().describe('e.g. "Live Viewers", "Followers"'),
    count: z.number(),
    formatted: z.string().optional().describe('Pre-formatted string, e.g. "1.2M"'),
});

export const WeatherOverlaySchema = z.object({
    location: z.string(),
    temperature: z.number(),
    unit: z.enum(['F', 'C']).default('F'),
    condition: z.string().describe('e.g. "Partly Cloudy"'),
    icon: z.string().optional().describe('Weather icon identifier or emoji'),
    humidity: z.number().optional(),
    wind_speed: z.number().optional(),
});

export const CustomDataFeedSchema = z.object({
    fields: z.record(z.union([z.string(), z.number(), z.boolean()])).describe('Arbitrary key-value data to push to templates'),
    label: z.string().optional().describe('Human-readable label for this data feed'),
});

// ─── Data formatters → template field maps ────────────────────────────────────

export function formatSportsForTemplate(data: z.infer<typeof SportsScoreSchema>): Record<string, string> {
    return {
        f0: data.home_team.toUpperCase(),
        f1: String(data.home_score),
        f2: String(data.away_score),
        f3: data.away_team.toUpperCase(),
        f4: data.period_label,
        f5: data.period,
        f6: data.game_clock ?? '',
    };
}

export function formatFinancialForTicker(data: z.infer<typeof FinancialTickerSchema>): { f0: string; f1: string } {
    const label = 'MARKET';
    const items = data.symbols.map(s => {
        const arrow = s.direction === 'up' ? '▲' : s.direction === 'down' ? '▼' : '—';
        const sign = s.change >= 0 ? '+' : '';
        return `${s.ticker} $${s.price.toFixed(2)} ${arrow}${sign}${s.change.toFixed(2)} (${sign}${s.change_percent.toFixed(2)}%)`;
    }).join('   •   ');
    return { f0: label, f1: items };
}

export function formatSocialCounter(data: z.infer<typeof SocialCounterSchema>): Record<string, string> {
    const formatted = data.formatted ?? formatLargeNumber(data.count);
    return {
        f0: data.platform.toUpperCase(),
        f1: data.label,
        f2: formatted,
        f3: data.platform,
    };
}

export function formatWeather(data: z.infer<typeof WeatherOverlaySchema>): Record<string, string> {
    return {
        f0: data.location,
        f1: `${Math.round(data.temperature)}°${data.unit}`,
        f2: data.condition,
        f3: data.icon ?? '☁️',
        f4: data.humidity ? `${data.humidity}%` : '',
        f5: data.wind_speed ? `${data.wind_speed}mph` : '',
    };
}

function formatLargeNumber(n: number): string {
    if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
}

// ─── Live Feed Manager ────────────────────────────────────────────────────────
// Manages active data feeds, their intervals, and OSC pushes.

type FeedData = Record<string, string>;
type FeedUpdateCallback = (feedId: string, templateData: FeedData) => void;

export interface LiveFeedHandle {
    feed_id: string;
    feed_type: string;
    started_at: string;
    update_interval_ms: number;
    stop: () => void;
}

const _activeFeeds = new Map<string, ReturnType<typeof setInterval>>();

/**
 * Start a live data feed that calls `onUpdate` whenever new data is queued.
 * The caller is responsible for providing fresh data via `pushData()` and
 * connecting `onUpdate` to the CasparCG OSC bridge.
 */
export function startLiveFeed(
    config: z.infer<typeof LiveFeedConfigSchema>,
    getLatestData: () => FeedData | null,
    onUpdate: FeedUpdateCallback
): LiveFeedHandle {
    const { feed_id, update_interval_ms } = config;

    if (_activeFeeds.has(feed_id)) {
        clearInterval(_activeFeeds.get(feed_id)!);
    }

    let lastHash = '';
    const interval = setInterval(() => {
        const data = getLatestData();
        if (!data) return;

        // Map through template_field_map
        const mapped: FeedData = {};
        for (const [dataKey, templateField] of Object.entries(config.template_field_map)) {
            if (dataKey in data) mapped[templateField] = data[dataKey];
        }
        // If no explicit map, pass through as-is
        const templateData = Object.keys(mapped).length > 0 ? mapped : data;

        // Only push if data changed
        const hash = JSON.stringify(templateData);
        if (hash !== lastHash) {
            lastHash = hash;
            onUpdate(feed_id, templateData);
        }
    }, update_interval_ms);

    _activeFeeds.set(feed_id, interval);
    console.log(`[ATLAS/LIVE-FEED] ▶️ Started feed "${feed_id}" @ ${update_interval_ms}ms`);

    return {
        feed_id,
        feed_type: config.feed_type,
        started_at: new Date().toISOString(),
        update_interval_ms,
        stop: () => {
            clearInterval(_activeFeeds.get(feed_id)!);
            _activeFeeds.delete(feed_id);
            console.log(`[ATLAS/LIVE-FEED] ⏹️ Stopped feed "${feed_id}"`);
        },
    };
}

export function stopLiveFeed(feedId: string): boolean {
    if (!_activeFeeds.has(feedId)) return false;
    clearInterval(_activeFeeds.get(feedId)!);
    _activeFeeds.delete(feedId);
    return true;
}

export function listActiveFeeds(): string[] {
    return [..._activeFeeds.keys()];
}

// ─── WebSocket Server for template-side data subscription ────────────────────

export interface WsServerConfig {
    port: number;
    path: string;
}

type WsBroadcastFn = (feedId: string, data: FeedData) => void;

export async function createLiveDataWsServer(config: WsServerConfig): Promise<{
    broadcast: WsBroadcastFn;
    close: () => void;
}> {
    // Dynamically import ws to avoid hard dependency in non-node environments
    const { WebSocketServer } = await import('ws') as typeof import('ws');
    const wss = new WebSocketServer({ port: config.port, path: config.path });

    console.log(`[ATLAS/WS] 🌐 Live data WebSocket server on ws://localhost:${config.port}${config.path}`);

    const broadcast: WsBroadcastFn = (feedId, data) => {
        const payload = JSON.stringify({ feed_id: feedId, data, ts: Date.now() });
        wss.clients.forEach(client => {
            if (client.readyState === 1 /* OPEN */) client.send(payload);
        });
    };

    wss.on('connection', (ws) => {
        console.log(`[ATLAS/WS] Client connected (${wss.clients.size} total)`);
        ws.on('close', () => console.log(`[ATLAS/WS] Client disconnected (${wss.clients.size} remaining)`));
    });

    return {
        broadcast,
        close: () => { wss.close(); console.log('[ATLAS/WS] Server closed'); },
    };
}

// ─── Client-side template snippet (injected into CasparCG HTML templates) ────

export const LIVE_DATA_CLIENT_SNIPPET = `
<!-- ATLAS LIVE — inject into <head> of any CasparCG template to receive live data -->
<script>
  (function() {
    const WS_URL = 'ws://localhost:${getEnv('ATLAS_WS_PORT') ?? '7890'}/live';
    let ws, reconnectTimer;

    function connect() {
      ws = new WebSocket(WS_URL);
      ws.onmessage = function(event) {
        try {
          const msg = JSON.parse(event.data);
          if (msg.feed_id && msg.data && typeof window.liveUpdate === 'function') {
            window.liveUpdate(msg.feed_id, msg.data);
          }
        } catch(e) { console.warn('[ATLAS] Message parse error', e); }
      };
      ws.onclose = function() {
        clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(connect, 3000);
      };
      ws.onerror = function() { ws.close(); };
    }

    connect();
  })();
</script>
`;

// ─── MCP Tool Registration ────────────────────────────────────────────────────

export const LIVE_DATA_TOOLS = [
    {
        name: 'atlas_format_sports_data',
        description: 'Format sports score data into CasparCG template fields (f0-f6).',
        inputSchema: SportsScoreSchema,
        handler: (input: z.infer<typeof SportsScoreSchema>) => ({ fields: formatSportsForTemplate(input) }),
        agentPermissions: ['ATLAS'],
        estimatedCost: 'Free',
    },
    {
        name: 'atlas_format_financial_ticker',
        description: 'Format multiple stock/crypto quotes into a ticker crawl string for CasparCG.',
        inputSchema: FinancialTickerSchema,
        handler: (input: z.infer<typeof FinancialTickerSchema>) => ({ fields: formatFinancialForTicker(input) }),
        agentPermissions: ['ATLAS'],
        estimatedCost: 'Free',
    },
    {
        name: 'atlas_format_social_counter',
        description: 'Format a social media follower/viewer count for CasparCG overlay display.',
        inputSchema: SocialCounterSchema,
        handler: (input: z.infer<typeof SocialCounterSchema>) => ({ fields: formatSocialCounter(input) }),
        agentPermissions: ['ATLAS'],
        estimatedCost: 'Free',
    },
    {
        name: 'atlas_format_weather',
        description: 'Format weather data for a CasparCG weather overlay template.',
        inputSchema: WeatherOverlaySchema,
        handler: (input: z.infer<typeof WeatherOverlaySchema>) => ({ fields: formatWeather(input) }),
        agentPermissions: ['ATLAS'],
        estimatedCost: 'Free',
    },
    {
        name: 'atlas_stop_live_feed',
        description: 'Stop an active live data feed by its feed_id.',
        inputSchema: z.object({ feed_id: z.string() }),
        handler: ({ feed_id }: { feed_id: string }) => ({ stopped: stopLiveFeed(feed_id), feed_id }),
        agentPermissions: ['ATLAS'],
        estimatedCost: 'Free',
    },
    {
        name: 'atlas_list_active_feeds',
        description: 'List all currently active live data feeds.',
        inputSchema: z.object({}),
        handler: () => ({ active_feeds: listActiveFeeds() }),
        agentPermissions: ['ATLAS'],
        estimatedCost: 'Free',
    },
];
