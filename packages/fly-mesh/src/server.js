/**
 * Creative Liberation Engine — Fly.io Cloud Mesh Node
 * Lightweight Express server implementing /api/mesh/execute
 * Uses Gemini API directly for fast inference without the full Genkit runtime.
 */

const express = require('express');
const app = express();
app.use(express.json({ limit: '10mb' }));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

const PORT = process.env.PORT || 4100;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

app.get('/health', (_, res) => {
  res.json({
    status: 'operational',
    service: 'inception-fly-mesh',
    version: '5.0.0',
    provider: 'fly.io',
    region: process.env.FLY_REGION ?? 'iad',
    timestamp: new Date().toISOString(),
  });
});

app.post('/api/mesh/execute', async (req, res) => {
  const { taskId, agentId, payload } = req.body;
  if (!taskId || !payload) {
    return res.status(400).json({ error: '"taskId" and "payload" are required' });
  }
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  }

  console.log(`[FLY:MESH] ⚡ Executing task: ${taskId} agent: ${agentId ?? 'anon'}`);

  if (payload.prompt || payload.messages) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
      const contents = payload.messages
        ? payload.messages.map(m => ({ role: m.role || 'user', parts: [{ text: m.content }] }))
        : [{ role: 'user', parts: [{ text: payload.prompt }] }];
      if (payload.system) contents.unshift({ role: 'user', parts: [{ text: `SYSTEM: ${payload.system}` }] });

      const aiRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents }),
      });

      if (!aiRes.ok) {
        const err = await aiRes.text();
        return res.status(aiRes.status).json({ error: err });
      }

      const data = await aiRes.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      return res.json({
        text,
        usage: data.usageMetadata,
        finishReason: data.candidates?.[0]?.finishReason,
        custom: { fly_routed: true, region: process.env.FLY_REGION ?? 'iad' },
      });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(400).json({ error: 'Payload must contain prompt or messages' });
});

app.listen(PORT, () => console.log(`[FLY:MESH] 🚀 Listening on port ${PORT}`));
