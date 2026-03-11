/**
 * Inception Finance Agent — Main Vault
 *
 * The FinanceAgent class orchestrates the full trade lifecycle:
 * 1. Monitor prices (Helius)
 * 2. Generate signal (Momentum or Funding Rate strategy)
 * 3. VERA truth-check
 * 4. Risk engine assessment
 * 5. Execute swap (Jupiter)
 * 6. Record outcome
 *
 * Constitutional: Article IX — ship complete. All guardrails active before live trading.
 */

import { SolanaWallet, type WalletConfig } from './wallet/solana-wallet.js';
import { JupiterProvider, TOKENS } from './providers/jupiter.js';
import { HeliusProvider } from './providers/helius.js';
import { VeraGuardian, type TradeSignal } from './guards/vera-guardian.js';
import { RiskEngine, MODERATE_AGGRESSIVE_CONFIG, type RiskConfig, type TradeOutcome } from './guards/risk-engine.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FinanceAgentConfig {
    walletConfig?: WalletConfig;
    riskConfig?: RiskConfig;
    genkitUrl?: string;
    /** Interval between market scans in milliseconds (default: 60000 = 1 min) */
    scanIntervalMs?: number;
    /** Whether to execute real trades or just simulate */
    liveTrading?: boolean;
}

export interface AgentStatus {
    running: boolean;
    liveTrading: boolean;
    walletAddress: string;
    balanceSol: number;
    balanceUsd: number;
    sessionSpent: number;
    sessionLimit: number;
    risk: ReturnType<RiskEngine['getStats']>;
    lastScan: string;
    uptimeMs: number;
}

export interface MarketScan {
    timestamp: string;
    solPriceUsd: number;
    signal: TradeSignal | null;
    veraDecision: { approved: boolean; confidence: number; reasoning: string } | null;
    riskAssessment: { allowed: boolean; reasons: string[] } | null;
    executed: boolean;
    txSignature?: string;
}

// ---------------------------------------------------------------------------
// FinanceAgent
// ---------------------------------------------------------------------------

export class FinanceAgent {
    private wallet: SolanaWallet;
    private jupiter: JupiterProvider;
    private helius: HeliusProvider;
    private vera: VeraGuardian;
    private risk!: RiskEngine;
    private config: Required<FinanceAgentConfig>;

    private running = false;
    private startTime = Date.now();
    private lastScan = '';
    private scanHistory: MarketScan[] = [];
    private scanInterval: ReturnType<typeof setInterval> | null = null;

    constructor(config: FinanceAgentConfig = {}) {
        this.config = {
            walletConfig: config.walletConfig ?? {},
            riskConfig: config.riskConfig ?? MODERATE_AGGRESSIVE_CONFIG,
            genkitUrl: config.genkitUrl ?? process.env['GENKIT_URL'] ?? 'http://genkit:4100',
            scanIntervalMs: config.scanIntervalMs ?? 60_000,
            liveTrading: config.liveTrading ?? false, // 🔴 OFF by default — must explicitly enable
        };

        this.helius = new HeliusProvider();
        this.wallet = new SolanaWallet({
            ...this.config.walletConfig,
            rpcUrl: this.config.walletConfig.rpcUrl ?? this.helius.getRpcUrl(),
        });
        this.jupiter = new JupiterProvider(
            this.wallet.getConnection(),
            this.wallet.getKeypair()
        );
        this.vera = new VeraGuardian(this.config.genkitUrl);

        if (!this.config.liveTrading) {
            console.log('[FA] ⚠ SIMULATION MODE — no real trades will execute. Set liveTrading: true + CONFIRM_LIVE_TRADING=1 to go live.');
        } else {
            console.log('[FA] 🔴 LIVE TRADING MODE — real SOL on the line.');
        }
    }

    // ---- Lifecycle ---------------------------------------------------------

    async start(): Promise<void> {
        const balance = await this.wallet.getBalance();
        this.risk = new RiskEngine(balance, this.config.riskConfig);
        this.running = true;
        this.startTime = Date.now();

        console.log(`[FA] 🚀 Finance Agent started | Wallet: ${this.wallet.publicKeyString}`);
        console.log(`[FA]    Balance: ${balance} SOL | Mode: ${this.config.liveTrading ? 'LIVE 🔴' : 'SIM 🟡'}`);

        // Immediate first scan
        await this.scan();

        // Recurring scans
        this.scanInterval = setInterval(async () => {
            if (this.running) await this.scan();
        }, this.config.scanIntervalMs);
    }

    stop(): void {
        this.running = false;
        if (this.scanInterval) {
            clearInterval(this.scanInterval);
            this.scanInterval = null;
        }
        console.log('[FA] Agent stopped');
    }

    // ---- Market Scan -------------------------------------------------------

    async scan(): Promise<MarketScan> {
        this.lastScan = new Date().toISOString();
        const solPrice = await this.helius.getSolPrice();
        const currentBalance = await this.wallet.getBalance();

        console.log(`[FA:SCAN] SOL: $${solPrice.priceUsd.toFixed(2)} | Balance: ${currentBalance.toFixed(4)} SOL`);

        const result: MarketScan = {
            timestamp: this.lastScan,
            solPriceUsd: solPrice.priceUsd,
            signal: null,
            veraDecision: null,
            riskAssessment: null,
            executed: false,
        };

        // Generate signal — simple momentum strategy for now
        const signal = await this.generateMomentumSignal(solPrice.priceUsd, currentBalance);
        result.signal = signal;

        if (!signal || signal.action === 'HOLD') {
            this.scanHistory.push(result);
            return result;
        }

        // VERA check
        const veraDecision = await this.vera.evaluate(signal);
        result.veraDecision = veraDecision;

        if (!veraDecision.approved) {
            console.log(`[FA] Signal rejected by VERA: ${veraDecision.reasoning}`);
            this.scanHistory.push(result);
            return result;
        }

        // Risk check
        const riskAssessment = this.risk.assess(currentBalance, signal.amountSol);
        result.riskAssessment = riskAssessment;

        if (!riskAssessment.allowed) {
            console.log(`[FA] Signal blocked by RiskEngine: ${riskAssessment.reasons.join(', ')}`);
            this.scanHistory.push(result);
            return result;
        }

        // Execute (or simulate)
        if (this.config.liveTrading && process.env['CONFIRM_LIVE_TRADING'] === '1') {
            const spendCheck = this.wallet.canSpend(signal.amountSol);
            if (!spendCheck.allowed) {
                console.warn(`[FA] Wallet spend limit: ${spendCheck.reason}`);
                this.scanHistory.push(result);
                return result;
            }

            const swapResult = await this.jupiter.executeSwap({
                outputMint: signal.outputMint,
                amountSol: riskAssessment.positionSizeSol,
            });

            if (swapResult.success) {
                this.wallet.recordSpend(riskAssessment.positionSizeSol);
                result.executed = true;
                result.txSignature = swapResult.signature;

                const newBalance = await this.wallet.getBalance();
                const pnl = newBalance - currentBalance;
                this.risk.recordOutcome({
                    pnlSol: pnl,
                    isWin: pnl > 0,
                    entryBalance: currentBalance,
                    exitBalance: newBalance,
                    timestamp: new Date().toISOString(),
                } satisfies TradeOutcome);
            }
        } else {
            console.log(`[FA] [SIM] Would execute: ${signal.action} ${riskAssessment.positionSizeSol.toFixed(4)} SOL → ${signal.outputMint.slice(0, 8)}...`);
            result.executed = false;
        }

        this.scanHistory.push(result);
        if (this.scanHistory.length > 100) this.scanHistory.shift();
        return result;
    }

    // ---- Simple Momentum Signal --------------------------------------------

    private async generateMomentumSignal(
        currentSolPrice: number,
        currentBalance: number
    ): Promise<TradeSignal | null> {
        // Very simple: if last 3 scans show price trending up, buy; trending down, sell to USDC
        const recent = this.scanHistory.slice(-3);
        if (recent.length < 2) return { action: 'HOLD', inputMint: TOKENS.SOL, outputMint: TOKENS.USDC, amountSol: 0, strategy: 'momentum', reasoning: 'Insufficient price history for signal' };

        const prices = recent.map(s => s.solPriceUsd).filter(p => p > 0);
        if (prices.length < 2) return null;

        const trend = prices[prices.length - 1]! - prices[0]!;
        const trendPct = trend / prices[0]! * 100;

        if (trendPct > 2) {
            return {
                action: 'BUY',
                inputMint: TOKENS.USDC,
                outputMint: TOKENS.SOL,
                amountSol: currentBalance * 0.05, // 5% position
                strategy: 'momentum',
                reasoning: `SOL up ${trendPct.toFixed(2)}% in recent scans — momentum buy signal`,
                marketContext: `Current price: $${currentSolPrice}`,
            };
        } else if (trendPct < -2) {
            return {
                action: 'SELL',
                inputMint: TOKENS.SOL,
                outputMint: TOKENS.USDC,
                amountSol: currentBalance * 0.05,
                strategy: 'momentum',
                reasoning: `SOL down ${Math.abs(trendPct).toFixed(2)}% — defensive sell to USDC`,
                marketContext: `Current price: $${currentSolPrice}`,
            };
        }

        return { action: 'HOLD', inputMint: TOKENS.SOL, outputMint: TOKENS.USDC, amountSol: 0, strategy: 'momentum', reasoning: `Trend: ${trendPct.toFixed(2)}% — below 2% threshold, holding` };
    }

    // ---- Status ------------------------------------------------------------

    async getStatus(): Promise<AgentStatus> {
        const balance = await this.wallet.getBalance().catch(() => 0);
        const solPrice = await this.helius.getSolPrice();
        const session = await this.wallet.getSession();

        return {
            running: this.running,
            liveTrading: this.config.liveTrading,
            walletAddress: this.wallet.publicKeyString,
            balanceSol: balance,
            balanceUsd: balance * solPrice.priceUsd,
            sessionSpent: session.sessionSpent,
            sessionLimit: session.sessionLimit,
            risk: this.risk?.getStats() ?? { isPaused: false, pauseReason: '', consecutiveLosses: 0, totalTrades: 0, winRate: 0, totalPnlSol: 0 },
            lastScan: this.lastScan,
            uptimeMs: Date.now() - this.startTime,
        };
    }

    getScanHistory(): MarketScan[] {
        return this.scanHistory.slice(-20);
    }
}
