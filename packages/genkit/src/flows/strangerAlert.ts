/**
 * strangerAlert — Anomaly detection flow for unregistered repeat visitors
 *
 * Scans the Presence Graph for unknown devices that appear multiple times
 * without registering through the guest portal.
 * Generates actionable AnomalyCard alerts with severity tiering.
 */

import { z } from 'genkit';
import { ai } from '../index.js';
import { defaultMiddleware } from '../middleware/fallback-chain.js';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const AnomalyCardSchema = z.object({
    id: z.string(),
    severity: z.enum(['info', 'warning', 'alert']),
    title: z.string(),
    description: z.string(),
    subjectId: z.string().describe('MAC address or device identifier'),
    detectedAt: z.string().describe('ISO timestamp'),
    evidenceEventIds: z.array(z.string()),
    acknowledged: z.boolean(),
});

const StrangerAlertInputSchema = z.object({
    scanWindowDays: z.number().default(30).describe('How many days back to scan for anomalies'),
    rawAnomalies: z.array(AnomalyCardSchema).describe('Pre-detected anomaly cards from PresenceGraph.detectAnomalies()'),
    guestCount: z.number().describe('Total number of registered guest profiles'),
    totalEventCount: z.number().describe('Total events in rolling window'),
});

const StrangerAlertOutputSchema = z.object({
    alerts: z.array(AnomalyCardSchema).describe('Enriched and prioritized anomaly alerts'),
    summary: z.string().describe('Brief human-readable summary of the security scan'),
    recommendedActions: z.array(z.string()).describe('Suggested actions for the homeowner'),
    riskLevel: z.enum(['low', 'medium', 'high']).describe('Overall risk assessment'),
});

export type StrangerAlertInput = z.infer<typeof StrangerAlertInputSchema>;
export type StrangerAlertOutput = z.infer<typeof StrangerAlertOutputSchema>;

// ─── Flow ─────────────────────────────────────────────────────────────────────

export const strangerAlertFlow = ai.defineFlow(
    {
        name: 'stranger-alert',
        inputSchema: StrangerAlertInputSchema,
        outputSchema: StrangerAlertOutputSchema,
    },
    async (input) => {

        if (input.rawAnomalies.length === 0) {
            return {
                alerts: [],
                summary: `Security scan complete. Scanned ${input.totalEventCount} events across ${input.scanWindowDays} days. No anomalies detected. ${input.guestCount} guests registered.`,
                recommendedActions: ['Continue monitoring'],
                riskLevel: 'low' as const,
            };
        }

        const { output } = await ai.generate({
            prompt: `You are VERA — the Creative Liberation Engine's security and compliance AI.

You are analyzing a security scan of a private home network.

SCAN PARAMETERS:
- Window: ${input.scanWindowDays} days
- Total events: ${input.totalEventCount}
- Registered guests: ${input.guestCount}

RAW ANOMALIES DETECTED (${input.rawAnomalies.length} total):
${JSON.stringify(input.rawAnomalies, null, 2)}

Your task:
1. Review each anomaly and assess its severity
2. Write a clear, non-alarming summary for the homeowner
3. Suggest concrete, actionable next steps
4. Assign an overall risk level (low / medium / high)

IMPORTANT:
- Be reassuring but honest about genuine risks
- Unknown devices at 3-5 visits are curious, not necessarily threatening (could be neighbor's device, delivery driver)
- 6+ visits of an unregistered unknown device warrants 'high' risk
- Always suggest the captive portal registration as the preferred resolution
- Respect privacy — describe devices by fingerprint only, never speculate about individuals`,
            output: { schema: StrangerAlertOutputSchema },
            use: defaultMiddleware(),
        });

        if (!output) {
            return {
                alerts: input.rawAnomalies,
                summary: `Detected ${input.rawAnomalies.length} anomalies. AI enrichment unavailable — raw alerts returned.`,
                recommendedActions: ['Review the anomaly list manually'],
                riskLevel: input.rawAnomalies.some(a => a.severity === 'alert') ? 'high' as const :
                          input.rawAnomalies.some(a => a.severity === 'warning') ? 'medium' as const : 'low' as const,
            };
        }

        return output;
    }
);
