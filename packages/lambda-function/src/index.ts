/**
 * Creative Liberation Engine — AWS Lambda Cloud Mesh Node
 *
 * Lambda Function URL handler implementing the /api/mesh/execute contract.
 * Executes generative AI tasks via Gemini API for the Creative Liberation Engine mesh.
 */

import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';

const GEMINI_API_KEY = process.env['GEMINI_API_KEY'];

interface MeshPayload {
  taskId: string;
  agentId?: string;
  payload: {
    prompt?: string;
    messages?: Array<{ role: string; content: string }>;
    system?: string;
    flow?: string;
  };
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };
}

export const handler = async (
  event: APIGatewayProxyEventV2,
  _context: Context
): Promise<APIGatewayProxyResultV2> => {
  const method = event.requestContext.http.method;

  // CORS preflight
  if (method === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' };
  }

  // Health check
  if (method === 'GET') {
    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({
        status: 'operational',
        service: 'inception-lambda-mesh',
        version: '5.0.0',
        provider: 'aws-lambda',
        region: process.env['AWS_REGION'] ?? 'unknown',
        timestamp: new Date().toISOString(),
      }),
    };
  }

  if (method !== 'POST') {
    return { statusCode: 405, headers: corsHeaders(), body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const body: MeshPayload = JSON.parse(event.body ?? '{}');
    const { taskId, agentId, payload } = body;

    if (!taskId || !payload) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ error: '"taskId" and "payload" are required' }),
      };
    }

    console.log(`[LAMBDA:MESH] ⚡ Executing task: ${taskId} for agent: ${agentId ?? 'anonymous'}`);

    if (!GEMINI_API_KEY) {
      return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: 'GEMINI_API_KEY not configured' }) };
    }

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
        return { statusCode: aiRes.status, headers: corsHeaders(), body: JSON.stringify({ error: errText }) };
      }

      const aiData = await aiRes.json() as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>;
        usageMetadata?: unknown;
      };

      const text = aiData.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

      return {
        statusCode: 200,
        headers: corsHeaders(),
        body: JSON.stringify({
          text,
          usage: aiData.usageMetadata,
          finishReason: aiData.candidates?.[0]?.finishReason,
          custom: { lambda_routed: true, region: process.env['AWS_REGION'] ?? 'unknown' },
        }),
      };
    }

    return {
      statusCode: 400,
      headers: corsHeaders(),
      body: JSON.stringify({ error: 'Payload must contain prompt or messages' }),
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[LAMBDA:MESH] Error:', msg);
    return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: msg }) };
  }
};
