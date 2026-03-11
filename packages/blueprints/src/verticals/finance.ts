/**
 * Finance Blueprint — W3 Inception Blueprints
 *
 * Bloomberg/Two Sigma pattern: market intelligence for hedge funds and asset managers.
 * Reasoning trace: signal detection → risk scoring → position recommendation → compliance audit.
 *
 * Constitutional flags: sox-compliance (Sarbanes-Oxley), no-pii-storage
 */

import type { Blueprint } from '../types.js';

export const financeBlueprint: Blueprint = {
    id: 'finance-v1',
    name: 'Financial Intelligence Engine',
    vertical: 'finance',
    description:
        'Multi-agent financial analysis: market signal detection, risk assessment, position recommendations, and SOX-compliant audit trail. Built for hedge funds, asset managers, and quantitative research teams.',
    version: '1.0.0',
    tags: ['finance', 'quantitative', 'risk', 'compliance', 'bloomberg-pattern'],

    domainModel: {
        preferred: 'gemini-2.5-pro',
        systemPrompt: `You are a senior quantitative analyst with 15 years at a top-tier hedge fund.
You reason step-by-step, cite your data sources, acknowledge uncertainty explicitly,
and always check your conclusions against regulatory requirements (SOX, SEC Rule 10b-5).
You NEVER make directional predictions without a confidence interval.
You identify and disclose conflicts of interest in every recommendation.`,
        knowledgeBase: 'inception-finance-kb',
        temperature: 0.2,
    },

    agentTeam: ['ATHENA', 'VERA', 'SENTINEL', 'LEX', 'COMPASS'],

    reasoningTraces: [
        {
            step: 1,
            name: 'Signal Detection',
            procedure:
                'Scan available market data, news feeds, and earnings reports for statistically significant signals. Filter noise using historical base rates.',
            prompt: `Given the following query, identify all relevant market signals.
For each signal: (1) data source, (2) historical precedent, (3) signal strength (1-10), (4) time horizon.
Be explicit about what you cannot know from available data.`,
            tools: ['perplexity-search', 'market-data-feed', 'sec-filings-reader'],
            outputSchema: 'SignalList',
            requiredCapabilities: ['read:memory', 'call:external-apis'],
        },
        {
            step: 2,
            name: 'Risk Assessment',
            procedure:
                'Quantify downside risk for each identified signal. Calculate VaR (Value at Risk), tail risk, and correlation with existing portfolio positions.',
            prompt: `Given the signals identified, perform a full risk assessment.
Output: (1) VaR at 95% and 99% confidence, (2) maximum drawdown estimate, (3) correlation risks,
(4) macro tail risks (rates, credit spreads, vol surface), (5) liquidity risk rating.`,
            tools: ['portfolio-analyzer', 'risk-calculator'],
            outputSchema: 'RiskAssessment',
            requiredCapabilities: ['read:memory'],
        },
        {
            step: 3,
            name: 'Position Recommendation',
            procedure:
                'Generate a specific, actionable position recommendation with sizing, entry criteria, stop-loss levels, and profit targets.',
            prompt: `Based on signals and risk assessment, generate a position recommendation.
Required: (1) direction (long/short/neutral), (2) instrument and sizing, (3) entry trigger,
(4) stop-loss level with rationale, (5) profit target (3:1 minimum R/R), (6) conviction score (1-10),
(7) what would change your view. No recommendation without stop-loss.`,
            tools: [],
            outputSchema: 'PositionRecommendation',
            requiredCapabilities: ['read:memory', 'write:memory'],
        },
        {
            step: 4,
            name: 'Compliance Audit',
            procedure:
                'Run the recommendation through SOX, SEC, and internal compliance checks. Flag any regulatory exposure. Generate audit trail document.',
            prompt: `Review the position recommendation for regulatory compliance.
Check: (1) material non-public information (MNPI) risk, (2) SEC Rule 10b-5 applicability,
(3) position size vs portfolio limits, (4) counterparty exposure, (5) disclosure requirements.
Produce a compliance memo suitable for the legal and compliance team.`,
            tools: ['compliance-checker'],
            outputSchema: 'ComplianceMemo',
            requiredCapabilities: ['read:memory', 'write:memory'],
        },
    ],

    simulationSteps: [
        {
            name: 'Historical Backtest',
            description: 'Validate recommendation against last 5 years of similar setups',
            validationQuery: 'How did similar signals perform historically?',
            passCriteria: 'Win rate > 55% and Sharpe ratio > 1.0 on historical analogues',
            failAction: 'warn',
        },
        {
            name: 'Stress Test',
            description: 'Simulate performance in 2008, 2020, and 2022 crash scenarios',
            validationQuery: 'What is the worst realistic loss in a tail event?',
            passCriteria: 'Maximum drawdown < 15% in simulated tail scenarios',
            failAction: 'warn',
        },
    ],

    constitutionalFlags: ['sox-compliance', 'no-pii-storage', 'no-mnpi'],
};
