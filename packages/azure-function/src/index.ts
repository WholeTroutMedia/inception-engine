/**
 * Creative Liberation Engine — Azure Cloud Mesh Node
 *
 * Azure Functions HTTP Trigger
 * Implements the /api/mesh/execute contract to participate in the
 * Creative Liberation Engine Cloud Mesh as the Azure compute node.
 *
 * Executes generative AI tasks by proxying to the Gemini API directly
 * for fast, lightweight inference without a heavy Genkit runtime.
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

const GEMINI_API_KEY = process.env['GEMINI_API_KEY'];

interface MeshPayload {
  taskId: string;
  agentId?: string;
  payload: {
    prompt?: string;
    messages?: Array<{ role: string; content: string }>;
    system?: string;
    model?: string;
    config?: Record<string, unknown>;
    flow?: string;
  };
}

async function meshExecuteHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('[AZURE:MESH] Incoming request:', request.method, request.url);

  // CORS preflight
  if (request.method === 'OPTIONS') {
    return {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    };
  }

  // Health check on GET
  if (request.method === 'GET') {
    return {
      status: 200,
      jsonBody: {
        status: 'operational',
        service: 'inception-azure-mesh',
        version: '5.0.0',
        provider: 'azure',
        region: process.env['WEBSITE_REGION'] ?? 'unknown',
        timestamp: new Date().toISOString(),
      },
      headers: { 'Access-Control-Allow-Origin': '*' },
    };
  }

  if (request.method !== 'POST') {
    return { status: 405, jsonBody: { error: 'Method Not Allowed' } };
  }

  try {
    const body = await request.json() as MeshPayload;
    const { taskId, agentId, payload } = body;

    if (!taskId || !payload) {
      return { status: 400, jsonBody: { error: '"taskId" and "payload" are required' } };
    }

    context.log(`[AZURE:MESH] ⚡ Executing task: ${taskId} for agent: ${agentId ?? 'anonymous'}`);

    if (!GEMINI_API_KEY) {
      return { status: 500, jsonBody: { error: 'GEMINI_API_KEY not configured' } };
    }

    // Execute via Gemini API (lightweight, no Genkit overhead on Azure)
    if (payload.prompt || payload.messages) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

      const contents = payload.messages
        ? payload.messages.map((m) => ({ role: m.role || 'user', parts: [{ text: m.content }] }))
        : [{ role: 'user', parts: [{ text: payload.prompt! }] }];

      if (payload.system) {
        contents.unshift({ role: 'user', parts: [{ text: `SYSTEM: ${payload.system}` }] });
      }

      const aiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents }),
      });

      if (!aiRes.ok) {
        const errText = await aiRes.text();
        context.log(`[AZURE:MESH] Gemini error: ${errText}`);
        return { status: aiRes.status, jsonBody: { error: errText } };
      }

      const aiData = await aiRes.json() as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }>}; finishReason?: string }>;
        usageMetadata?: unknown;
      };

      const text = aiData.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

      return {
        status: 200,
        jsonBody: {
          text,
          usage: aiData.usageMetadata,
          finishReason: aiData.candidates?.[0]?.finishReason,
          custom: { azure_routed: true, region: process.env['WEBSITE_REGION'] ?? 'unknown' },
        },
        headers: { 'Access-Control-Allow-Origin': '*' },
      };
    }

    return {
      status: 400,
      jsonBody: { error: 'Payload must contain prompt or messages for Azure mesh node' },
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    context.log('[AZURE:MESH] Error:', msg);
    return { status: 500, jsonBody: { error: msg } };
  }
}

// Register the HTTP trigger
app.http('mesh-execute', {
  methods: ['GET', 'POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'mesh/execute',
  handler: meshExecuteHandler,
});
