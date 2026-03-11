/**
 * mobile-bridge — AVERI → ntfy push notification adapter
 *
 * Subscribes to Redis pub/sub channels for agent events and
 * forwards them as ntfy push notifications to connected mobile clients.
 *
 * Endpoints:
 *   GET  /health          — service health
 *   POST /notify          — send a push notification directly
 *   POST /subscribe/:topic — subscribe a device to a topic
 *   GET  /status          — connected clients + recent events
 */

import { createServer } from 'http';
import { createClient } from 'redis';

const PORT = parseInt(process.env.PORT || '4800', 10);
const NTFY_URL = process.env.NTFY_URL || 'http://ntfy:80';
const NTFY_TOKEN = process.env.NTFY_TOKEN || '';
const NTFY_TOPIC = process.env.NTFY_TOPIC || 'inception-averi';
const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';

// ── Redis subscriber ─────────────────────────────────────────────────────────
const sub = createClient({ url: REDIS_URL });
const pub = createClient({ url: REDIS_URL });

let stats = { sent: 0, errors: 0, startedAt: new Date().toISOString() };

async function sendNtfy(topic, title, body, tags = [], priority = 'default', url = '') {
    const headers = {
        'Content-Type': 'application/json',
        'Title': title,
        'Tags': tags.join(','),
        'Priority': priority,
    };
    if (NTFY_TOKEN) headers['Authorization'] = `Bearer ${NTFY_TOKEN}`;
    if (url) headers['Click'] = url;

    try {
        const res = await fetch(`${NTFY_URL}/${topic}`, {
            method: 'POST',
            headers,
            body,
        });
        if (!res.ok) throw new Error(`ntfy responded ${res.status}`);
        stats.sent++;
        console.log(`[mobile-bridge] ✅ Pushed to ${topic}: ${title}`);
    } catch (err) {
        stats.errors++;
        console.error(`[mobile-bridge] ❌ Push failed: ${err.message}`);
    }
}

// ── Agent event → push notification mapping ──────────────────────────────────
const EVENT_MAP = {
    'dispatch:task:new': { priority: 'default', tags: ['rocket'], title: 'New Task' },
    'dispatch:task:done': { priority: 'low', tags: ['white_check_mark'], title: 'Task Complete' },
    'dispatch:task:failed': { priority: 'high', tags: ['x'], title: '⚠️ Task Failed' },
    'averi:alert': { priority: 'urgent', tags: ['rotating_light'], title: 'AVERI Alert' },
    'averi:signal': { priority: 'default', tags: ['satellite'], title: 'SIGNAL Update' },
};

async function connectRedis() {
    await sub.connect();
    await pub.connect();
    console.log(`[mobile-bridge] 📡 Connected to Redis at ${REDIS_URL}`);

    // Subscribe to all mapped channels
    for (const channel of Object.keys(EVENT_MAP)) {
        await sub.subscribe(channel, async (message) => {
            const meta = EVENT_MAP[channel];
            let body = message;
            let clickUrl = '';
            try {
                const parsed = JSON.parse(message);
                body = parsed.message || parsed.body || message;
                clickUrl = parsed.url || '';
            } catch { /* raw string */ }

            await sendNtfy(NTFY_TOPIC, meta.title, body, meta.tags, meta.priority, clickUrl);
        });
        console.log(`[mobile-bridge] 👂 Subscribed to ${channel}`);
    }
}

// ── HTTP server ───────────────────────────────────────────────────────────────
const server = createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost`);

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    if (url.pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', service: 'mobile-bridge', ...stats }));
        return;
    }

    if (url.pathname === '/status') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ntfy: NTFY_URL, topic: NTFY_TOPIC, redis: REDIS_URL, ...stats }));
        return;
    }

    if (url.pathname === '/notify' && req.method === 'POST') {
        let body = '';
        for await (const chunk of req) body += chunk;
        const { title, message, topic, tags, priority } = JSON.parse(body);
        await sendNtfy(topic || NTFY_TOPIC, title || 'Inception', message, tags || [], priority || 'default');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
        return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'not found' }));
});

// ── Boot ──────────────────────────────────────────────────────────────────────
connectRedis().catch(console.error);
server.listen(PORT, () => {
    console.log(`[mobile-bridge] 🚀 Listening on :${PORT}`);
    console.log(`[mobile-bridge] 📬 Forwarding to ${NTFY_URL}/${NTFY_TOPIC}`);
});
