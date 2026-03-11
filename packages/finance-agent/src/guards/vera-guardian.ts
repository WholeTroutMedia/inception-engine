/**
 * Inception Finance Agent — VERA Guardian
 *
 * VERA truth-checks every trade signal before execution.
 * Calls the Genkit /generate endpoint with a constitutional prompt.
 * Returns: { approved: boolean, confidence: number, reasoning: string }
 *
 * Constitutional: Article III — Human Supremacy.
 * Any agent action on real money MUST pass VERA review.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TradeSignal {
    action: 'BUY' | 'SELL' | 'HOLD';
    inputMint: string;
    outputMint: string;
    amountSol: number;
    strategy: string;
    reasoning: string;
    marketContext?: string;
}

export interface VeraDecision {
    approved: boolean;
    confidence: number;   // 0–1
    reasoning: string;
    flags: string[];
    timestamp: string;
}

// ---------------------------------------------------------------------------
// VERA Guardian
// ---------------------------------------------------------------------------

const VERA_PROMPT_TEMPLATE = (signal: TradeSignal) => `
You are VERA — the Creative Liberation Engine's truth-checking agent for financial decisions.

Your job: evaluate this trade signal and decide if it should be APPROVED or REJECTED.

## Trade Signal
Action: ${signal.action}
Strategy: ${signal.strategy}
Amount: ${signal.amountSol} SOL
Input Token: ${signal.inputMint}
Output Token: ${signal.outputMint}
Agent Reasoning: ${signal.reasoning}
Market Context: ${signal.marketContext ?? 'Not provided'}

## Evaluation Criteria
1. Is the reasoning coherent and non-hallucinated?
2. Does the amount respect conservative risk management (no FOMO, no revenge trading)?
3. Are there red flags: extreme greed signals, market panic, unclear reasoning?
4. Is this constitutional with Article III (human-guided, not reckless autonomy)?

## Response Format (JSON only)
{
  "approved": true or false,
  "confidence": 0.0 to 1.0,
  "reasoning": "one sentence explanation",
  "flags": ["list of any concerns, empty if none"]
}
`;

export class VeraGuardian {
    private genkitUrl: string;

    constructor(genkitUrl?: string) {
        this.genkitUrl = genkitUrl
            ?? process.env['GENKIT_URL']
            ?? 'http://localhost:4100';
    }

    async evaluate(signal: TradeSignal): Promise<VeraDecision> {
        const timestamp = new Date().toISOString();

        // If no GENKIT_URL, apply deterministic heuristic fallback
        if (!this.genkitUrl) {
            return this.heuristicFallback(signal, timestamp);
        }

        try {
            const res = await fetch(`${this.genkitUrl}/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'googleai/gemini-2.0-flash',
                    prompt: VERA_PROMPT_TEMPLATE(signal),
                    config: { temperature: 0.1, maxOutputTokens: 512 },
                }),
            });

            if (!res.ok) {
                console.warn(`[FA:VERA] Genkit unreachable (${res.status}) — applying heuristic fallback`);
                return this.heuristicFallback(signal, timestamp);
            }

            const data = await res.json() as { text?: string };
            const text = (data.text ?? '').replace(/```json|```/g, '').trim();

            type VeraRaw = {
                approved?: boolean;
                confidence?: number;
                reasoning?: string;
                flags?: string[];
            };
            const parsed = JSON.parse(text) as VeraRaw;

            const decision: VeraDecision = {
                approved: Boolean(parsed.approved),
                confidence: Number(parsed.confidence ?? 0),
                reasoning: String(parsed.reasoning ?? ''),
                flags: Array.isArray(parsed.flags) ? parsed.flags as string[] : [],
                timestamp,
            };

            console.log(`[FA:VERA] ${decision.approved ? '✓ APPROVED' : '✗ REJECTED'} | confidence: ${decision.confidence.toFixed(2)} | ${decision.reasoning}`);
            return decision;

        } catch (err) {
            console.warn('[FA:VERA] Parse error — applying heuristic fallback:', err);
            return this.heuristicFallback(signal, timestamp);
        }
    }

    // Deterministic safety fallback when VERA AI call fails
    private heuristicFallback(signal: TradeSignal, timestamp: string): VeraDecision {
        const flags: string[] = [];
        let approved = true;

        // Never trade more than 0.1 SOL without AI confirmation
        if (signal.amountSol > 0.1) {
            flags.push(`Amount ${signal.amountSol} SOL exceeds heuristic fallback limit of 0.1 SOL`);
            approved = false;
        }

        // Reject if reasoning is too short (likely garbage signal)
        if (signal.reasoning.length < 20) {
            flags.push('Reasoning too short — signal lacks justification');
            approved = false;
        }

        return {
            approved,
            confidence: approved ? 0.6 : 0,
            reasoning: approved
                ? 'Heuristic fallback: signal passes basic safety checks'
                : 'Heuristic fallback: signal failed safety checks — rejected',
            flags,
            timestamp,
        };
    }
}
