/**
 * FORGE Genkit Tool Bindings
 *
 * Exposes the FORGE asset economy API as callable Genkit tools
 * so any AVERI agent flow can mint, query, and transfer assets.
 *
 * Usage in a flow:
 *   import { forgeMintTool, forgeStatsTool } from './tools/forge-tools.js';
 *   // then reference in ai.defineTool or run() calls
 */

import { ai, z } from '../index.js';

const FORGE_URL = process.env['FORGE_URL'] ?? 'http://localhost:4300';

async function forgePost(path: string, body: unknown) {
  const res = await fetch(`${FORGE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`FORGE API error ${res.status}: ${path}`);
  return res.json();
}

async function forgeGet(path: string) {
  const res = await fetch(`${FORGE_URL}${path}`);
  if (!res.ok) throw new Error(`FORGE API error ${res.status}: ${path}`);
  return res.json();
}

// ─── Mint Tool ────────────────────────────────────────────────────────────────

export const forgeMintTool = ai.defineTool(
  {
    name: 'forge_mint_asset',
    description: 'Mint a new digital asset (creative, data, agent, template, or flow) in the FORGE economy ledger.',
    inputSchema: z.object({
      assetType: z.enum(['creative', 'data', 'agent', 'template', 'flow']),
      title: z.string(),
      creatorId: z.string(),
      initialSupply: z.number().optional(),
      basePrice: z.number().optional(),
      royaltyBps: z.number().optional().describe('Royalty in basis points — 500 = 5%'),
      tags: z.array(z.string()).optional(),
    }),
    outputSchema: z.unknown(),
  },
  async (input) => forgePost('/assets/mint', input),
);

// ─── Transfer Tool ────────────────────────────────────────────────────────────

export const forgeTransferTool = ai.defineTool(
  {
    name: 'forge_transfer_asset',
    description: 'Transfer ownership of an asset between wallets in the FORGE ledger.',
    inputSchema: z.object({
      assetId: z.string(),
      fromId: z.string(),
      toId: z.string(),
      quantity: z.number().optional(),
      amountUsd: z.number().optional(),
    }),
    outputSchema: z.unknown(),
  },
  async ({ assetId, ...body }) =>
    forgePost(`/assets/${assetId}/transfer`, body),
);

// ─── Stats Tool ───────────────────────────────────────────────────────────────

export const forgeStatsTool = ai.defineTool(
  {
    name: 'forge_get_stats',
    description: 'Get economy-wide FORGE statistics: total volume, active creators, top assets.',
    inputSchema: z.object({}),
    outputSchema: z.unknown(),
  },
  async () => forgeGet('/stats'),
);

// ─── Royalties Tool ───────────────────────────────────────────────────────────

export const forgeRoyaltiesTool = ai.defineTool(
  {
    name: 'forge_get_royalties',
    description: 'Retrieve royalty history and pending balance for a creator.',
    inputSchema: z.object({ creatorId: z.string() }),
    outputSchema: z.unknown(),
  },
  async ({ creatorId }) => forgeGet(`/royalties/${encodeURIComponent(creatorId)}`),
);

// ─── Get Asset Tool ──────────────────────────────────────────────────────────────

export const forgeGetAssetTool = ai.defineTool(
  {
    name: 'forge_get_asset',
    description: 'Fetch a single FORGE digital asset by its ID. Returns full asset record including price, royalty, owner, and trade history.',
    inputSchema: z.object({
      assetId: z.string().describe('The UUID of the asset to retrieve'),
    }),
    outputSchema: z.unknown(),
  },
  async ({ assetId }) => forgeGet(`/assets/${encodeURIComponent(assetId)}`),
);

// ─── Barrel ─────────────────────────────────────────────────────────────────────────────

/**
 * All FORGE tools — pass this array to `tools:` in any agent flow.
 *
 * @example
 * const { text } = await ai.generate({ model, tools: forgeTools, ... });
 */
export const forgeTools = [
  forgeMintTool,
  forgeTransferTool,
  forgeGetAssetTool,
  forgeStatsTool,
  forgeRoyaltiesTool,
];

