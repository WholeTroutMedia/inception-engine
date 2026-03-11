/**
 * FORGE Genkit Tool Bridge
 *
 * Provides typed HTTP client functions for FORGE asset economy endpoints.
 * These are consumed by the Genkit tools in packages/genkit/src/tools/forge-tools.ts
 * which wrap them in ai.defineTool() calls.
 *
 * This module has NO dependency on @genkit-ai/core — use the genkit package
 * for AI tool registration.
 */

import { z } from 'zod';

const FORGE_URL = process.env.FORGE_URL ?? 'http://forge:4300';

// ─── Input Schemas ─────────────────────────────────────────────────────────────

export const MintAssetInput = z.object({
  assetType: z.enum(['theme', 'preset', 'template', 'audio', 'visual']).describe('Category of the asset'),
  title: z.string().describe('Human-readable name for the asset'),
  creatorId: z.string().describe('Creator wallet/user ID'),
  basePrice: z.number().optional().describe('Listing price in USD'),
  royaltyBps: z.number().optional().describe('Royalty in basis points (e.g. 500 = 5%)'),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const GetAssetInput = z.object({
  assetId: z.string().describe('The UUID of the asset to retrieve'),
});

export const TransferAssetInput = z.object({
  assetId: z.string(),
  fromId: z.string().describe('Sender wallet/user ID'),
  toId: z.string().describe('Recipient wallet/user ID'),
  quantity: z.number().optional().default(1),
  amountUsd: z.number().optional().describe('Transaction price in USD'),
});

export const GetRoyaltiesInput = z.object({
  creatorId: z.string().describe('The creator wallet/user ID'),
});

export type MintAssetInput = z.infer<typeof MintAssetInput>;
export type GetAssetInput = z.infer<typeof GetAssetInput>;
export type TransferAssetInput = z.infer<typeof TransferAssetInput>;
export type GetRoyaltiesInput = z.infer<typeof GetRoyaltiesInput>;

// ─── HTTP Client Functions ─────────────────────────────────────────────────────

/** Mint a new digital asset in the FORGE economy */
export async function mintAsset(input: MintAssetInput): Promise<unknown> {
  const res = await fetch(`${FORGE_URL}/assets/mint`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return res.json();
}

/** Fetch a single FORGE digital asset by its ID */
export async function getAsset({ assetId }: GetAssetInput): Promise<unknown> {
  const res = await fetch(`${FORGE_URL}/assets/${assetId}`);
  if (!res.ok) throw new Error(`Asset ${assetId} not found`);
  return res.json();
}

/** Transfer a FORGE digital asset between two users or wallets */
export async function transferAsset({ assetId, ...body }: TransferAssetInput): Promise<unknown> {
  const res = await fetch(`${FORGE_URL}/assets/${assetId}/transfer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

/** Get economy-level statistics */
export async function getEconomyStats(): Promise<unknown> {
  const res = await fetch(`${FORGE_URL}/stats`);
  return res.json();
}

/** Get royalty history and pending balance for a FORGE creator */
export async function getRoyalties({ creatorId }: GetRoyaltiesInput): Promise<unknown> {
  const res = await fetch(`${FORGE_URL}/royalties/${creatorId}`);
  return res.json();
}

// ─── Named exports for backwards compatibility ────────────────────────────────

export const forgeClient = {
  mintAsset,
  getAsset,
  transferAsset,
  getEconomyStats,
  getRoyalties,
};
