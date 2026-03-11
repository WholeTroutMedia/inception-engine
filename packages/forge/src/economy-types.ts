/**
 * FORGE — Economy Types (Real-Time Asset Economy Extension)
 * New layer on top of the existing ForgeEngine — Redis-backed ledger,
 * demand-curve pricing, and royalty distribution.
 */

export interface EconomyAsset {
  id: string;
  type: 'creative' | 'data' | 'agent' | 'template' | 'flow';
  title: string;
  creatorId: string;
  createdAt: string;
  mintedAt?: string;
  supply: number;
  price: number;
  demandScore: number;
  royaltyBps: number;
  tags: string[];
  metadata: Record<string, unknown>;
}

export interface EconomyTransaction {
  id: string;
  assetId: string;
  type: 'mint' | 'transfer' | 'royalty' | 'burn';
  fromId: string | null;
  toId: string;
  amount: number;
  quantity: number;
  timestamp: string;
  txHash?: string;
}

export interface PricingSignal {
  assetId: string;
  currentPrice: number;
  demandScore: number;
  supply: number;
  recentTxCount: number;
  priceChangePercent: number;
  updatedAt: string;
}

export interface MintRequest {
  assetType: EconomyAsset['type'];
  title: string;
  creatorId: string;
  initialSupply: number;
  basePrice: number;
  royaltyBps: number;
  tags: string[];
  metadata: Record<string, unknown>;
}

export interface EconomyRoyaltyPayment {
  assetId: string;
  creatorId: string;
  amount: number;
  txId: string;
  periodStart: string;
  periodEnd: string;
}

export interface ForgeEconomyStats {
  totalAssets: number;
  totalTransactions: number;
  totalVolume: number;
  activeCreators: number;
  top5Assets: Array<{ id: string; title: string; price: number; volume: number }>;
  updatedAt: string;
}
