/**
 * @inception/finance-agent — Solana Wallet
 * Stub: Phantom/Keypair wallet management for the Solana DeFi agent.
 */

export interface WalletConfig {
    keypairPath?: string;
    publicKey?: string;
    network: 'mainnet-beta' | 'devnet' | 'testnet';
}

export interface WalletBalance {
    sol: number;
    usdEquivalent?: number;
}

export class SolanaWallet {
    readonly config: WalletConfig;

    constructor(config: WalletConfig) {
        this.config = config;
    }

    async getBalance(): Promise<WalletBalance> {
        // TODO: impl via @solana/web3.js Connection
        return { sol: 0 };
    }

    async sign(data: Uint8Array): Promise<Uint8Array> {
        // TODO: impl keypair signing
        return new Uint8Array(64);
    }
}

export const solanaWallet = new SolanaWallet({ network: 'mainnet-beta' });
