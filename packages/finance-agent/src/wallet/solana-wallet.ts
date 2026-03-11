/**
 * Inception Finance Agent — Solana Wallet Manager
 *
 * Manages the agent wallet with scoped session keys and hard spending limits.
 * Constitutional: No transaction without VERA guardian approval.
 * Article IX: Never ship incomplete — all guardrails enforced before any trade.
 */

import {
    Connection,
    Keypair,
    PublicKey,
    Transaction,
    SystemProgram,
    LAMPORTS_PER_SOL,
    sendAndConfirmTransaction,
} from '@solana/web3.js';
import fs from 'node:fs';
import path from 'node:path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WalletConfig {
    /** RPC endpoint — defaults to helius if key available, else mainnet */
    rpcUrl?: string;
    /** Max SOL the agent can spend in a single session (hard cap) */
    maxSpendPerSession?: number;
    /** Max SOL per single transaction */
    maxSpendPerTx?: number;
    /** Keyfile path for persistent wallet (optional — ephemeral if not set) */
    keyfilePath?: string;
}

export interface WalletSession {
    publicKey: string;
    balanceLamports: bigint;
    balanceSol: number;
    sessionSpent: number;
    sessionLimit: number;
    sessionStart: string;
}

export interface TransactionResult {
    signature: string;
    success: boolean;
    error?: string;
    lamports?: number;
}

// ---------------------------------------------------------------------------
// SolanaWallet
// ---------------------------------------------------------------------------

export class SolanaWallet {
    private connection: Connection;
    private keypair: Keypair;
    private sessionSpent = 0;
    private readonly config: Required<WalletConfig>;

    constructor(config: WalletConfig = {}) {
        const heliusKey = process.env['HELIUS_API_KEY'];
        const defaultRpc = heliusKey
            ? `https://mainnet.helius-rpc.com/?api-key=${heliusKey}`
            : 'https://api.mainnet-beta.solana.com';

        this.config = {
            rpcUrl: config.rpcUrl ?? defaultRpc,
            maxSpendPerSession: config.maxSpendPerSession ?? 0.5, // 0.5 SOL default
            maxSpendPerTx: config.maxSpendPerTx ?? 0.05,         // 0.05 SOL per tx
            keyfilePath: config.keyfilePath ?? '',
        };

        this.connection = new Connection(this.config.rpcUrl, 'confirmed');
        this.keypair = this.loadOrCreateKeypair();
    }

    // ---- Keypair Management ------------------------------------------------

    private loadOrCreateKeypair(): Keypair {
        const keyPath = this.config.keyfilePath
            || path.join(process.env['HOME'] ?? process.env['USERPROFILE'] ?? '.', '.inception', 'finance-agent-wallet.json');

        try {
            if (fs.existsSync(keyPath)) {
                const raw = JSON.parse(fs.readFileSync(keyPath, 'utf8')) as number[];
                console.log(`[FA:WALLET] Loaded keypair from ${keyPath}`);
                return Keypair.fromSecretKey(new Uint8Array(raw));
            }
        } catch {
            console.warn('[FA:WALLET] Could not load keypair — generating ephemeral key');
        }

        const kp = Keypair.generate();
        try {
            const dir = path.dirname(keyPath);
            fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(keyPath, JSON.stringify(Array.from(kp.secretKey)));
            console.log(`[FA:WALLET] Generated + saved new keypair → ${keyPath}`);
        } catch {
            console.warn('[FA:WALLET] Could not save keypair — using ephemeral key');
        }
        return kp;
    }

    // ---- Public Key --------------------------------------------------------

    get publicKey(): PublicKey {
        return this.keypair.publicKey;
    }

    get publicKeyString(): string {
        return this.keypair.publicKey.toBase58();
    }

    // ---- Balance -----------------------------------------------------------

    async getBalance(): Promise<number> {
        const lamports = await this.connection.getBalance(this.keypair.publicKey);
        return lamports / LAMPORTS_PER_SOL;
    }

    async getSession(): Promise<WalletSession> {
        const lamports = await this.connection.getBalance(this.keypair.publicKey);
        return {
            publicKey: this.publicKeyString,
            balanceLamports: BigInt(lamports),
            balanceSol: lamports / LAMPORTS_PER_SOL,
            sessionSpent: this.sessionSpent,
            sessionLimit: this.config.maxSpendPerSession,
            sessionStart: new Date().toISOString(),
        };
    }

    // ---- Spending Guard ----------------------------------------------------

    canSpend(amountSol: number): { allowed: boolean; reason?: string } {
        if (amountSol > this.config.maxSpendPerTx) {
            return {
                allowed: false,
                reason: `Tx limit: ${amountSol} SOL exceeds per-tx cap of ${this.config.maxSpendPerTx} SOL`,
            };
        }
        if (this.sessionSpent + amountSol > this.config.maxSpendPerSession) {
            return {
                allowed: false,
                reason: `Session limit: would spend ${this.sessionSpent + amountSol} SOL total (cap: ${this.config.maxSpendPerSession})`,
            };
        }
        return { allowed: true };
    }

    recordSpend(amountSol: number): void {
        this.sessionSpent += amountSol;
        console.log(`[FA:WALLET] Spent ${amountSol} SOL | Session total: ${this.sessionSpent}/${this.config.maxSpendPerSession} SOL`);
    }

    resetSession(): void {
        this.sessionSpent = 0;
        console.log('[FA:WALLET] Session limits reset');
    }

    // ---- Connection --------------------------------------------------------

    getConnection(): Connection {
        return this.connection;
    }

    getKeypair(): Keypair {
        return this.keypair;
    }
}
