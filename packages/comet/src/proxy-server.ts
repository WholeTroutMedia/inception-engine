/**
 * MCP Fetch Proxy Server — Port 4200
 * COMET P0 Fix: sovereign stack API bridge so COMET browser can POST to local APIs
 * Creative Liberation Engine v5.0.0 (GENESIS)
 */
import http from 'node:http';
import { handleProxyRequest } from './fetch-proxy.js';

const PORT = parseInt(process.env.FETCH_PROXY_PORT ?? '4200', 10);
const HOST = process.env.FETCH_PROXY_HOST ?? '0.0.0.0';

const server = http.createServer(async (req, res) => {
  // Health probe
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'inception-fetch-proxy', version: '1.0.0' }));
    return;
  }

  // All proxy requests
  if (req.url === '/proxy' || req.url === '/') {
    await handleProxyRequest(req, res);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found', paths: ['/proxy', '/health'] }));
});

server.listen(PORT, HOST, () => {
  console.log(`[fetch-proxy] 🚀 Listening on http://${HOST}:${PORT}`);
  console.log(`[fetch-proxy] ✅ Ready to bridge COMET → sovereign stack APIs`);
});

server.on('error', (err) => {
  console.error(`[fetch-proxy] ❌ Server error:`, err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  server.close(() => {
    console.log('[fetch-proxy] Gracefully shut down');
    process.exit(0);
  });
});
