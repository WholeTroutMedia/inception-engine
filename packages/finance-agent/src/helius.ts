/**
 * @inception/finance-agent — Helius Data Feed
 * Stub: Helius RPC real-time market data and transaction webhooks.
 */

export interface HeliusConfig {
    apiKey: string;
    cluster?: 'mainnet-beta' | 'devnet';
}

export interface TokenPrice {
    mint: string;
    priceUsd: number;
    confidence: number;
    timestamp: number;
}

export class HeliusDataFeed {
    private readonly config: HeliusConfig;

    constructor(config: HeliusConfig) {
        this.config = config;
    }

    async getTokenPrice(mint: string): Promise<TokenPrice> {
        // TODO: impl Helius getAsset + Jupiter price API
        throw new Error('HeliusDataFeed.getTokenPrice: not yet implemented');
    }

    async subscribeToWallet(address: string, cb: (tx: unknown) => void): Promise<() => void> {
        // TODO: impl Helius webhook / SSE subscription
        return () => { };
    }
}
