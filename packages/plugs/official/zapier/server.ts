import axios from 'axios';
import { z } from 'zod';

// ─── THE PLUG — Zapier Webhook Adapter ───────────────────────────────────────
// Sends data to Zapier webhooks (Catch Hook triggers), and receives data
// from Zapier via a configurable endpoint. Supports all standard Zapier
// automation patterns: single triggers, batch, and meta-workflows.

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const ZapierTriggerSchema = z.object({
    webhook_url: z.string().url().describe('Your Zapier Catch Hook URL'),
    payload: z.record(z.unknown()).describe('Data to send to the Zap'),
    dedup_id: z.string().optional().describe('Unique ID to prevent duplicate triggers'),
    source: z.string().optional().describe('Identify which system triggered this zap, e.g. "ZERO_DAY"'),
    trigger_name: z.string().optional().describe('Human label for this trigger, e.g. "New Client Created"'),
});

export const ZapierBatchSchema = z.object({
    webhook_url: z.string().url(),
    items: z.array(z.record(z.unknown())).min(1).max(100),
    delay_between_ms: z.number().min(0).max(5000).default(200).describe('Rate limit: delay between each item in ms'),
    source: z.string().optional(),
});

export const ZapierMultiHookSchema = z.object({
    zaps: z.array(z.object({
        webhook_url: z.string().url(),
        name: z.string(),
        payload: z.record(z.unknown()),
    })).min(1).max(20),
    parallel: z.boolean().default(true),
});

export const ZapierVerifySchema = z.object({
    webhook_url: z.string().url(),
    echo_payload: z.record(z.unknown()).default({ ping: true, source: 'CREATIVE_LIBERATION_ENGINE', ts: new Date().toISOString() }),
});

// ─── Handlers ─────────────────────────────────────────────────────────────────

interface ZapierResponse { attempt: string; id: string; request_id: string; status: string }

export async function triggerZap(input: z.infer<typeof ZapierTriggerSchema>): Promise<{
    success: boolean;
    zap_response: ZapierResponse | null;
    trigger_name?: string;
    source?: string;
}> {
    const v = ZapierTriggerSchema.parse(input);
    const payload = {
        ...v.payload,
        ...(v.source ? { _source: v.source } : {}),
        ...(v.dedup_id ? { _dedup_id: v.dedup_id } : {}),
        _triggered_at: new Date().toISOString(),
    };

    const res = await axios.post<ZapierResponse>(v.webhook_url, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000,
    });

    return { success: res.status === 200, zap_response: res.data ?? null, trigger_name: v.trigger_name, source: v.source };
}

export async function triggerZapBatch(input: z.infer<typeof ZapierBatchSchema>): Promise<{
    triggered: number;
    failed: number;
    results: Array<{ index: number; success: boolean; error?: string }>;
}> {
    const v = ZapierBatchSchema.parse(input);
    const results: Array<{ index: number; success: boolean; error?: string }> = [];
    let triggered = 0;
    let failed = 0;

    for (let i = 0; i < v.items.length; i++) {
        try {
            await triggerZap({ webhook_url: v.webhook_url, payload: v.items[i], source: v.source });
            results.push({ index: i, success: true });
            triggered++;
        } catch (e: unknown) {
            results.push({ index: i, success: false, error: (e as Error).message });
            failed++;
        }
        if (v.delay_between_ms > 0 && i < v.items.length - 1) {
            await new Promise(r => setTimeout(r, v.delay_between_ms));
        }
    }

    return { triggered, failed, results };
}

export async function triggerMultipleHooks(input: z.infer<typeof ZapierMultiHookSchema>): Promise<{
    results: Array<{ name: string; success: boolean; error?: string }>;
}> {
    const v = ZapierMultiHookSchema.parse(input);

    if (v.parallel) {
        const settled = await Promise.allSettled(
            v.zaps.map(zap => triggerZap({ webhook_url: zap.webhook_url, payload: zap.payload, trigger_name: zap.name }))
        );
        return {
            results: v.zaps.map((zap, i) => ({
                name: zap.name,
                success: settled[i].status === 'fulfilled',
                error: settled[i].status === 'rejected' ? (settled[i] as PromiseRejectedResult).reason?.message : undefined,
            })),
        };
    }

    const results: Array<{ name: string; success: boolean; error?: string }> = [];
    for (const zap of v.zaps) {
        try {
            await triggerZap({ webhook_url: zap.webhook_url, payload: zap.payload, trigger_name: zap.name });
            results.push({ name: zap.name, success: true });
        } catch (e: unknown) {
            results.push({ name: zap.name, success: false, error: (e as Error).message });
        }
    }
    return { results };
}

export async function verifyZapierHook(input: z.infer<typeof ZapierVerifySchema>): Promise<{
    reachable: boolean;
    response_ms: number;
    error?: string;
}> {
    const v = ZapierVerifySchema.parse(input);
    const start = Date.now();
    try {
        await axios.post(v.webhook_url, v.echo_payload, { timeout: 10000 });
        return { reachable: true, response_ms: Date.now() - start };
    } catch (e: unknown) {
        return { reachable: false, response_ms: Date.now() - start, error: (e as Error).message };
    }
}

// ─── MCP Tools ────────────────────────────────────────────────────────────────

export const ZAPIER_TOOLS = [
    { name: 'zapier_trigger', description: 'Trigger a single Zapier Catch Hook with a custom payload. Optionally include dedup_id and source for tracing.', inputSchema: ZapierTriggerSchema, handler: triggerZap, agentPermissions: ['RELAY', 'ORACLE', 'ZERO_DAY'], estimatedCost: 'Free (webhook)' },
    { name: 'zapier_trigger_batch', description: 'Send an array of payloads to a Zapier hook, one at a time with configurable rate limiting.', inputSchema: ZapierBatchSchema, handler: triggerZapBatch, agentPermissions: ['RELAY', 'ORACLE', 'ZERO_DAY'], estimatedCost: 'Free (webhook × N)' },
    { name: 'zapier_trigger_multi_hooks', description: 'Trigger multiple different Zapier hooks in a single call, optionally in parallel.', inputSchema: ZapierMultiHookSchema, handler: triggerMultipleHooks, agentPermissions: ['RELAY', 'ORACLE'], estimatedCost: 'Free (webhook × N)' },
    { name: 'zapier_verify_hook', description: 'Verify that a Zapier Catch Hook URL is reachable by sending a test ping payload.', inputSchema: ZapierVerifySchema, handler: verifyZapierHook, agentPermissions: ['RELAY', 'ORACLE', 'GHOST'], estimatedCost: 'Free' },
];
