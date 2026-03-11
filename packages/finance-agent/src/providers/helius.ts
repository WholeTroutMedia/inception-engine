/**
 * Inception Finance Agent — Helius Price Feed
 *
 * Real-time SOL price data, token prices, and mempool monitoring
 * via Helius Enhanced APIs. Falls back to Jupiter price API if no key.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TokenPrice {
    mint: string;
    priceUsd: number;
    priceChangePct24h?: number;
    volume24h?: number;
    timestamp: string;
}

export interface MempoolEvent {
    type: 'SWAP' | 'TRANSFER' | 'NFT_SALE' | 'UNKNOWN';
    signature: string;
    mint?: string;
    amountSol?: number;
    timestamp: string;
}

// ---------------------------------------------------------------------------
// HeliusProvider
// ---------------------------------------------------------------------------

const HELIUS_BASE = 'https://mainnet.helius-rpc.com';
const JUPITER_PRICE_API = 'https://price.jup.ag/v6/price';

// SOL mint for reference
const SOL_MINT = 'So11111111111111111111111111111111111111112';

export class HeliusProvider {
    private apiKey: string | null;
    private rpcUrl: string;

    constructor() {
        this.apiKey = process.env['HELIUS_API_KEY'] ?? null;
        this.rpcUrl = this.apiKey
            ? `${HELIUS_BASE}/?api-key=${this.apiKey}`
            : 'https://api.mainnet-beta.solana.com';

        if (!this.apiKey) {
            console.warn('[FA:HELIUS] No HELIUS_API_KEY — using Jupiter price feed as fallback');
        }
    }

    // ---- SOL Price ---------------------------------------------------------

    async getSolPrice(): Promise<TokenPrice> {
        try {
            const res = await fetch(`${JUPITER_PRICE_API}?ids=${SOL_MINT}`);
            if (!res.ok) throw new Error(`Jupiter price API: ${res.status}`);
            const data = await res.json() as {
                data: Record<string, { price: number; extraInfo?: { priceChange24h?: number } }>;
            };
            const sol = data.data[SOL_MINT];
            return {
                mint: SOL_MINT,
                priceUsd: sol?.price ?? 0,
                priceChangePct24h: sol?.extraInfo?.priceChange24h,
                timestamp: new Date().toISOString(),
            };
        } catch (err) {
            console.warn('[FA:HELIUS] Price fetch failed:', err);
            return { mint: SOL_MINT, priceUsd: 0, timestamp: new Date().toISOString() };
        }
    }

    // ---- Token Prices (batch) ----------------------------------------------

    async getTokenPrices(mints: string[]): Promise<Map<string, TokenPrice>> {
        const result = new Map<string, TokenPrice>();
        try {
            const ids = mints.join(',');
            const res = await fetch(`${JUPITER_PRICE_API}?ids=${ids}`);
            if (!res.ok) throw new Error(`status ${res.status}`);
            const data = await res.json() as {
                data: Record<string, { price: number }>;
            };
            for (const [mint, info] of Object.entries(data.data)) {
                result.set(mint, {
                    mint,
                    priceUsd: info.price,
                    timestamp: new Date().toISOString(),
                });
            }
        } catch (err) {
            console.warn('[FA:HELIUS] Batch price fetch failed:', err);
        }
        return result;
    }

    // ---- Recent Transactions (Helius Enhanced) ------------------------------

    async getRecentTransactions(address: string, limit = 10): Promise<MempoolEvent[]> {
        if (!this.apiKey) return [];

        try {
            const res = await fetch(
                `https://api.helius.xyz/v0/addresses/${address}/transactions?api-key=${this.apiKey}&limit=${limit}`
            );
            if (!res.ok) return [];
            const txs = await res.json() as Array<{
                type?: string;
                signature?: string;
                nativeTransfers?: Array<{ amount: number }>;
                tokenTransfers?: Array<{ mint?: string }>;
                timestamp?: number;
            }>;

            return txs.map(tx => ({
                type: (tx.type === 'SWAP' ? 'SWAP' : tx.type === 'TRANSFER' ? 'TRANSFER' : 'UNKNOWN') as MempoolEvent['type'],
                signature: tx.signature ?? '',
                mint: tx.tokenTransfers?.[0]?.mint,
                amountSol: tx.nativeTransfers?.[0]
                    ? tx.nativeTransfers[0].amount / 1e9
                    : undefined,
                timestamp: tx.timestamp
                    ? new Date(tx.timestamp * 1000).toISOString()
                    : new Date().toISOString(),
            }));
        } catch {
            return [];
        }
    }

    // ---- DAS — Token Holdings ----------------------------------------------

    async getTokenBalances(walletAddress: string): Promise<Array<{ mint: string; amount: number; symbol?: string }>> {
        if (!this.apiKey) return [];

        try {
            const res = await fetch(`${HELIUS_BASE}/?api-key=${this.apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'getTokenAccountsByOwner',
                    params: [
                        walletAddress,
                        { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
                        { encoding: 'jsonParsed' },
                    ],
                }),
            });

            if (!res.ok) return [];
            const data = await res.json() as {
                result?: { value?: Array<{ account: { data: { parsed: { info: { mint: string; tokenAmount: { uiAmount: number } } } } } }> };
            };

            return (data.result?.value ?? []).map(acc => ({
                mint: acc.account.data.parsed.info.mint,
                amount: acc.account.data.parsed.info.tokenAmount.uiAmount,
            }));
        } catch {
            return [];
        }
    }

    getRpcUrl(): string {
        return this.rpcUrl;
    }
}
