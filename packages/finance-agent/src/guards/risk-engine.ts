/**
 * Inception Finance Agent — Risk Engine
 *
 * Constitutional guardrails: stop-loss, max drawdown, position sizing.
 * Runs before every trade AND as an ongoing monitoring sentinel.
 *
 * Article IX: Never ship an incomplete risk system.
 * "Risk management is the only part of trading that is fully within your control."
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RiskConfig {
    /** Max drawdown from session start before agent pauses (e.g. 0.15 = 15%) */
    maxDrawdownPct: number;
    /** Stop-loss per individual trade (e.g. 0.05 = 5%) */
    stopLossPct: number;
    /** Max position size as % of total session balance */
    maxPositionPct: number;
    /** Hard floor — agent stops if balance drops below this in SOL */
    absoluteFloorSol: number;
    /** Max number of consecutive losses before forced pause */
    maxConsecutiveLosses: number;
}

export interface RiskAssessment {
    allowed: boolean;
    reasons: string[];
    positionSizeSol: number;
    stopLossPricePct: number;
    warnings: string[];
}

export interface TradeOutcome {
    pnlSol: number;
    isWin: boolean;
    entryBalance: number;
    exitBalance: number;
    timestamp: string;
}

// Default conservative config
export const DEFAULT_RISK_CONFIG: RiskConfig = {
    maxDrawdownPct: 0.15,         // 15% drawdown triggers pause
    stopLossPct: 0.05,            // 5% stop-loss per trade
    maxPositionPct: 0.10,         // Max 10% of balance per position
    absoluteFloorSol: 1.5,        // Never go below 1.5 SOL (keep 50% of 3 SOL safe)
    maxConsecutiveLosses: 3,      // 3 losses in a row = mandatory pause
};

// Moderate-aggressive config for 1–3 SOL vault
export const MODERATE_AGGRESSIVE_CONFIG: RiskConfig = {
    maxDrawdownPct: 0.20,         // 20% max drawdown
    stopLossPct: 0.07,            // 7% stop per trade
    maxPositionPct: 0.15,         // 15% per position
    absoluteFloorSol: 1.0,        // Keep at least 1 SOL
    maxConsecutiveLosses: 4,
};

// ---------------------------------------------------------------------------
// RiskEngine
// ---------------------------------------------------------------------------

export class RiskEngine {
    private config: RiskConfig;
    private sessionStartBalance: number;
    private consecutiveLosses = 0;
    private tradeHistory: TradeOutcome[] = [];
    private isPaused = false;
    private pauseReason = '';

    constructor(sessionStartBalance: number, config: RiskConfig = DEFAULT_RISK_CONFIG) {
        this.sessionStartBalance = sessionStartBalance;
        this.config = config;
        console.log(`[FA:RISK] Engine initialized | Start balance: ${sessionStartBalance} SOL | Config: ${JSON.stringify(config)}`);
    }

    // ---- Pre-Trade Assessment -----------------------------------------------

    assess(currentBalance: number, proposedAmountSol: number): RiskAssessment {
        const reasons: string[] = [];
        const warnings: string[] = [];

        // 1. Is the engine paused?
        if (this.isPaused) {
            return {
                allowed: false,
                reasons: [`Engine paused: ${this.pauseReason}`],
                positionSizeSol: 0,
                stopLossPricePct: 0,
                warnings,
            };
        }

        // 2. Drawdown check
        const drawdownPct = (this.sessionStartBalance - currentBalance) / this.sessionStartBalance;
        if (drawdownPct >= this.config.maxDrawdownPct) {
            this.pause(`Max drawdown reached: ${(drawdownPct * 100).toFixed(1)}%`);
            reasons.push(`Max drawdown exceeded: ${(drawdownPct * 100).toFixed(1)}% (limit: ${(this.config.maxDrawdownPct * 100)}%)`);
        }

        // 3. Absolute floor check
        if (currentBalance - proposedAmountSol < this.config.absoluteFloorSol) {
            reasons.push(`Trade would breach absolute floor of ${this.config.absoluteFloorSol} SOL`);
        }

        // 4. Max position size
        const maxPosition = currentBalance * this.config.maxPositionPct;
        const actualPosition = Math.min(proposedAmountSol, maxPosition);
        if (proposedAmountSol > maxPosition) {
            warnings.push(`Position ${proposedAmountSol} SOL capped to ${maxPosition.toFixed(4)} SOL (${(this.config.maxPositionPct * 100)}% limit)`);
        }

        // 5. Consecutive loss check
        if (this.consecutiveLosses >= this.config.maxConsecutiveLosses) {
            this.pause(`${this.consecutiveLosses} consecutive losses — mandatory cool-down`);
            reasons.push(`Consecutive loss limit hit: ${this.consecutiveLosses} losses in a row`);
        }

        // 6. Drawdown warning at 50% of limit
        if (drawdownPct >= this.config.maxDrawdownPct * 0.5) {
            warnings.push(`Drawdown at ${(drawdownPct * 100).toFixed(1)}% — near limit of ${(this.config.maxDrawdownPct * 100)}%`);
        }

        const allowed = reasons.length === 0;
        if (allowed) {
            console.log(`[FA:RISK] ✓ Trade approved | Position: ${actualPosition.toFixed(4)} SOL | Drawdown: ${(drawdownPct * 100).toFixed(1)}%`);
        } else {
            console.warn(`[FA:RISK] ✗ Trade blocked | Reasons: ${reasons.join('; ')}`);
        }

        return {
            allowed,
            reasons,
            positionSizeSol: actualPosition,
            stopLossPricePct: this.config.stopLossPct,
            warnings,
        };
    }

    // ---- Post-Trade Recording -----------------------------------------------

    recordOutcome(outcome: TradeOutcome): void {
        this.tradeHistory.push(outcome);

        if (outcome.isWin) {
            this.consecutiveLosses = 0;
            console.log(`[FA:RISK] Win recorded: +${outcome.pnlSol.toFixed(4)} SOL`);
        } else {
            this.consecutiveLosses++;
            console.log(`[FA:RISK] Loss recorded: ${outcome.pnlSol.toFixed(4)} SOL | Consecutive losses: ${this.consecutiveLosses}`);
        }
    }

    // ---- Pause/Resume -------------------------------------------------------

    pause(reason: string): void {
        this.isPaused = true;
        this.pauseReason = reason;
        console.warn(`[FA:RISK] 🛑 ENGINE PAUSED: ${reason}`);
    }

    resume(): void {
        this.isPaused = false;
        this.consecutiveLosses = 0;
        this.pauseReason = '';
        console.log('[FA:RISK] ▶ Engine resumed');
    }

    // ---- Stats --------------------------------------------------------------

    getStats(): {
        isPaused: boolean;
        pauseReason: string;
        consecutiveLosses: number;
        totalTrades: number;
        winRate: number;
        totalPnlSol: number;
    } {
        const wins = this.tradeHistory.filter(t => t.isWin).length;
        const totalPnl = this.tradeHistory.reduce((sum, t) => sum + t.pnlSol, 0);
        return {
            isPaused: this.isPaused,
            pauseReason: this.pauseReason,
            consecutiveLosses: this.consecutiveLosses,
            totalTrades: this.tradeHistory.length,
            winRate: this.tradeHistory.length > 0 ? wins / this.tradeHistory.length : 0,
            totalPnlSol: totalPnl,
        };
    }
}
