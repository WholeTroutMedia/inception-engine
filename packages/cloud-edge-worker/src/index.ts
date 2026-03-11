/**
 * Cloud Mesh — Edge Worker
 * 
 * Target: Cloudflare Workers
 * Executes high-speed, lightweight generative tasks using the Gemini API
 * from the absolute edge (< 40ms latency globally).
 *
 * It mimics the /api/mesh/execute endpoint payload interface to act as a seamless Mesh node.
 */

export interface Env {
  GEMINI_API_KEY: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    if (request.method !== 'POST' || !new URL(request.url).pathname.endsWith('/execute')) {
      return new Response('Not Found', { status: 404 });
    }

    try {
      const body = await request.json() as { taskId?: string, payload?: any };
      const { taskId, payload } = body;

      if (!taskId || !payload) {
        return new Response('Missing taskId or payload', { status: 400 });
      }

      // If it's a simple text generation task routed via mesh
      if (payload.prompt || payload.messages) {
        // Direct rapid call to Gemini API bypassing Genkit for pure edge speed
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`;
        
        const contents = payload.messages 
            ? payload.messages.map((m: any) => ({ role: m.role || 'user', parts: [{ text: m.content }] }))
            : [{ role: 'user', parts: [{ text: payload.prompt }] }];

        if (payload.system) {
            contents.unshift({ role: 'system', parts: [{ text: payload.system }] });
        }

        const aiReq = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents }),
        });

        if (!aiReq.ok) {
          const errText = await aiReq.text();
          return new Response(JSON.stringify({ error: errText }), { status: aiReq.status });
        }

        const aiData = await aiReq.json() as any;
        const text = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

        return new Response(JSON.stringify({
          text,
          usage: aiData.usageMetadata,
          finishReason: aiData.candidates?.[0]?.finishReason,
          custom: { edge_routed: true },
        }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }

      return new Response(JSON.stringify({ error: 'Unsupported payload target on Edge Worker' }), { status: 400 });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
  },
};
