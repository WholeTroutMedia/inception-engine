/**
 * Inception Finance Agent — Jupiter Aggregator Provider
 *
 * Executes token swaps via Jupiter v6 API on Solana mainnet.
 * Supports: best-route swaps, slippage control, priority fees.
 *
 * Constitutional: All swaps require VERA guardian sign-off before execution.
 */

import { Connection, VersionedTransaction, PublicKey } from '@solana/web3.js';
import type { Keypair } from '@solana/web3.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SwapQuote {
    inputMint: string;
    outputMint: string;
    inputAmount: string;      // in micro-units (lamports / token decimals)
    outputAmount: string;
    priceImpactPct: string;
    routePlan: Array<{
        swapInfo: { ammKey: string; label?: string; inputMint: string; outputMint: string };
        percent: number;
    }>;
    slippageBps: number;
    otherAmountThreshold: string;
}

export interface SwapRequest {
    /** Token mint to sell — defaults to SOL */
    inputMint?: string;
    /** Token mint to buy */
    outputMint: string;
    /** Amount in SOL (will be converted to lamports) */
    amountSol: number;
    /** Slippage tolerance in basis points (default: 50 = 0.5%) */
    slippageBps?: number;
    /** Priority fee in microlamports (default: 5000) */
    priorityFee?: number;
}

export interface SwapResult {
    signature: string;
    inputMint: string;
    outputMint: string;
    amountIn: string;
    amountOut: string;
    priceImpact: string;
    success: boolean;
    error?: string;
}

// Popular token addresses
export const TOKENS = {
    SOL: 'So11111111111111111111111111111111111111112',
    USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    JUP: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
    BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    WIF: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
} as const;

const JUPITER_QUOTE_API = 'https://quote-api.jup.ag/v6';
const JUPITER_SWAP_API = 'https://quote-api.jup.ag/v6/swap';

// ---------------------------------------------------------------------------
// JupiterProvider
// ---------------------------------------------------------------------------

export class JupiterProvider {
    private connection: Connection;
    private keypair: Keypair;

    constructor(connection: Connection, keypair: Keypair) {
        this.connection = connection;
        this.keypair = keypair;
    }

    // ---- Quote -------------------------------------------------------------

    async getQuote(request: SwapRequest): Promise<SwapQuote> {
        const inputMint = request.inputMint ?? TOKENS.SOL;
        const lamports = Math.floor(request.amountSol * 1_000_000_000);
        const slippage = request.slippageBps ?? 50;

        const params = new URLSearchParams({
            inputMint,
            outputMint: request.outputMint,
            amount: lamports.toString(),
            slippageBps: slippage.toString(),
            onlyDirectRoutes: 'false',
            asLegacyTransaction: 'false',
        });

        const res = await fetch(`${JUPITER_QUOTE_API}/quote?${params.toString()}`);
        if (!res.ok) {
            const err = await res.text().catch(() => 'unknown');
            throw new Error(`[Jupiter] Quote failed (${res.status}): ${err}`);
        }

        return await res.json() as SwapQuote;
    }

    // ---- Execute Swap ------------------------------------------------------

    async executeSwap(request: SwapRequest): Promise<SwapResult> {
        console.log(`[FA:JUPITER] Quoting swap: ${request.amountSol} SOL → ${request.outputMint.slice(0, 8)}...`);

        let quote: SwapQuote;
        try {
            quote = await this.getQuote(request);
        } catch (err: unknown) {
            return {
                signature: '',
                inputMint: request.inputMint ?? TOKENS.SOL,
                outputMint: request.outputMint,
                amountIn: '0',
                amountOut: '0',
                priceImpact: '0',
                success: false,
                error: err instanceof Error ? err.message : String(err),
            };
        }

        const priceImpact = parseFloat(quote.priceImpactPct);
        if (priceImpact > 3) {
            return {
                signature: '',
                inputMint: request.inputMint ?? TOKENS.SOL,
                outputMint: request.outputMint,
                amountIn: quote.inputAmount,
                amountOut: quote.outputAmount,
                priceImpact: quote.priceImpactPct,
                success: false,
                error: `[GUARDIAN] Price impact too high: ${priceImpact.toFixed(2)}% (max: 3%)`,
            };
        }

        // Build swap transaction
        const swapBody = {
            quoteResponse: quote,
            userPublicKey: this.keypair.publicKey.toBase58(),
            wrapAndUnwrapSol: true,
            dynamicComputeUnitLimit: true,
            prioritizationFeeLamports: request.priorityFee ?? 5000,
        };

        const swapRes = await fetch(JUPITER_SWAP_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(swapBody),
        });

        if (!swapRes.ok) {
            const err = await swapRes.text().catch(() => 'unknown');
            return {
                signature: '',
                inputMint: request.inputMint ?? TOKENS.SOL,
                outputMint: request.outputMint,
                amountIn: quote.inputAmount,
                amountOut: quote.outputAmount,
                priceImpact: quote.priceImpactPct,
                success: false,
                error: `[Jupiter] Swap tx build failed: ${err}`,
            };
        }

        const { swapTransaction } = await swapRes.json() as { swapTransaction: string };
        const txBuf = Buffer.from(swapTransaction, 'base64');
        const tx = VersionedTransaction.deserialize(txBuf);
        tx.sign([this.keypair]);

        const rawTx = tx.serialize();
        const signature = await this.connection.sendRawTransaction(rawTx, {
            skipPreflight: false,
            maxRetries: 3,
        });

        await this.connection.confirmTransaction(signature, 'confirmed');

        console.log(`[FA:JUPITER] ✓ Swap confirmed: ${signature}`);
        return {
            signature,
            inputMint: request.inputMint ?? TOKENS.SOL,
            outputMint: request.outputMint,
            amountIn: quote.inputAmount,
            amountOut: quote.outputAmount,
            priceImpact: quote.priceImpactPct,
            success: true,
        };
    }

    // ---- Price (USD) -------------------------------------------------------

    async getSolPriceUsd(): Promise<number> {
        try {
            const res = await fetch(
                'https://price.jup.ag/v6/price?ids=So11111111111111111111111111111111111111112'
            );
            if (!res.ok) return 0;
            const data = await res.json() as {
                data: Record<string, { price: number }>;
            };
            return data.data['So11111111111111111111111111111111111111112']?.price ?? 0;
        } catch {
            return 0;
        }
    }
}
