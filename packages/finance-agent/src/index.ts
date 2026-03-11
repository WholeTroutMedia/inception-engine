/**
 * @inception/finance-agent — Barrel Export
 *
 * Solana-native finance agent: wallet management, DeFi execution,
 * real-time market data, VERA constitutional risk guardrails.
 */

// Server
export { default as financeApp } from './server.js';

// Core finance agent + config types
export { FinanceAgent } from './vault.js';
export type { FinanceAgentConfig, AgentStatus, MarketScan } from './vault.js';

// Solana wallet
export { SolanaWallet, solanaWallet } from './solana-wallet.js';
export type { WalletConfig, WalletBalance } from './solana-wallet.js';

// Jupiter swap
export { JupiterClient, jupiterClient } from './jupiter.js';
export type { SwapQuote, SwapParams } from './jupiter.js';

// Helius data feed
export { HeliusDataFeed } from './helius.js';
export type { HeliusConfig, TokenPrice } from './helius.js';

// Risk engine
export { RiskEngine, riskEngine } from './risk-engine.js';
export type { RiskConfig, RiskAssessment } from './risk-engine.js';

// VERA constitutional guardian
export { VeraGuardian, veraGuardian } from './vera-guardian.js';
export type { VeraGuardianResult, FinancialAction } from './vera-guardian.js';
