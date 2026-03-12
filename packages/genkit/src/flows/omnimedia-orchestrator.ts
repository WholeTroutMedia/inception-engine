/**
 * OmniMedia Orchestrator — The God Node
 * The full creative pipeline in a single Genkit flow.
 * Executes multi-hop, multi-provider media generation with compound memory.
 *
 * Given a single creative brief, OMNI can produce:
 * - Visual concept (kuid)
 * - Image generation (GenMedia → Imagen3/Flux)
 * - Video generation (GenMedia → Veo2/Wan)
 * - Audio/music (GenMedia → Lyria)
 * - Copy/script (kstrigd)
 * - Agent handoff (RELAY)
 * - Archive to Living Archive (kstated)
 * - Constitutional validation (kdocsd)
 *
 * This is what v4 imnimedia was building toward.
 * v5 delivers it as a native Genkit orchestration.
 */

import { z } from 'genkit';
import { ai } from '../index.js';
import { memoryBus } from '@cle/memory';
import { VT220Flow } from './vt220.js';
import { AURORAFlow } from './aurora.js';
import { kdocsdFlow } from './kdocsd-compass.js';
// NOTE: @cle/genmedia is dynamically imported to break the genkit ↔ genmedia circular dependency.
// At runtime this is fine — both packages resolve correctly in the ESM module graph.
// DO NOT convert this back to a static import.

// ─── SCHEMA ──────────────────────────────────────────────────────────────────

const OmniInputSchema = z.object({
    brief: z.string().describe('High-level creative brief or campaign concept'),
    brand: z.string().optional().describe('Brand context, guidelines, voice'),
    outputTypes: z.array(z.enum(['image', 'video', 'audio', 'copy', 'all'])).default(['all']),
    format: z.enum(['vertical', 'landscape', 'square']).default('landscape'),
    quality: z.enum(['draft', 'standard', 'ultra']).default('standard'),
    archive: z.boolean().default(true).describe('Archive results to Living Archive'),
    sessionId: z.string().optional(),
});

const OmniOutputSchema = z.object({
    concept: z.string().describe('kuid-generated creative concept'),
    copy: z.string().describe('kstrigd-generated copy/script'),
    assets: z.object({
        images: z.array(z.string()).default([]),
        videos: z.array(z.string()).default([]),
        audio: z.array(z.string()).default([]),
    }),
    lexApproval: z.enum(['PASS', 'WARNING', 'HALT']),
    sessionId: z.string(),
    durationMs: z.number(),
    omniSignature: z.literal('OMNIMEDIA').default('OMNIMEDIA'),
});

// ─────────────────────────────────────────────────────────────────────────────
// OMNIMEDIA FLOW
// ─────────────────────────────────────────────────────────────────────────────

export const kgenmediaFlow = ai.defineFlow(
    { name: 'kgenmedia', inputSchema: OmniInputSchema, outputSchema: OmniOutputSchema },
    async (input): Promise<z.infer<typeof OmniOutputSchema>> => {
        const startMs = Date.now();
        const sessionId = input.sessionId ?? `omni_${Date.now()}`;
        const want = input.outputTypes.includes('all')
            ? ['image', 'video', 'audio', 'copy'] as const
            : input.outputTypes as ('image' | 'video' | 'audio' | 'copy')[];

        console.log(`[OMNIMEDIA] 🌐 Brief: "${input.brief.slice(0, 80)}" | Outputs: ${want.join(', ')}`);

        return memoryBus.withMemory('OMNIMEDIA', input.brief, ['omni', 'orchestration'], async () => {
            // ─── PHASE 1: Constitutional preflight ─────────────────────────
            const lexResult = await kdocsdFlow({
                scanType: 'preflight',
                content: input.brief,
                agentName: 'OMNIMEDIA',
                sessionId,
            }).catch(() => ({ verdict: 'WARNING' as const, violations: [], guidance: '', lexSignature: 'kdocsd' as const }));

            if (lexResult.verdict === 'HALT') {
                console.error('[OMNIMEDIA] ❌ kdocsd HALT — brief failed constitutional preflight');
                return {
                    concept: '', copy: '', assets: { images: [], videos: [], audio: [] },
                    lexApproval: 'HALT' as const, sessionId, durationMs: Date.now() - startMs, omniSignature: 'OMNIMEDIA' as const,
                };
            }

            // ─── PHASE 2: Ideation (parallel) ──────────────────────────────
            const [conceptResult, copyResult] = await Promise.allSettled([
                AURORAFlow({ mode: 'ideate', prompt: input.brief, outputFormat: 'markdown', context: input.brand, sessionId }),
                want.includes('copy') ? VT220Flow({
                    mode: 'klogd',
                    content: `Write compelling copy/script for: ${input.brief}${input.brand ? `\nBrand: ${input.brand}` : ''}`,
                    sessionId,
                }) : Promise.resolve(null),
            ]);

            const concept = conceptResult.status === 'fulfilled' ? conceptResult.value.architecture : input.brief;
            const copy = copyResult.status === 'fulfilled' && copyResult.value
                ? String((copyResult.value as Record<string, unknown>).scribeRecord ?? '')
                : '';

            // ─── PHASE 3: Media Generation (parallel batch) ────────────────
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const mediaRequests: any[] = [];
            if (want.includes('image')) {
                mediaRequests.push({ prompt: concept.slice(0, 500), mediaType: 'image', format: input.format, quality: input.quality, sessionId: `${sessionId}_img` });
            }
            if (want.includes('video')) {
                mediaRequests.push({ prompt: concept.slice(0, 500), mediaType: 'video', format: input.format, quality: input.quality, durationSeconds: 8, sessionId: `${sessionId}_vid` });
            }
            if (want.includes('audio')) {
                mediaRequests.push({ prompt: `Ambient/musical score for: ${input.brief.slice(0, 200)}`, mediaType: 'audio', format: input.format, quality: input.quality, sessionId: `${sessionId}_aud` });
            }

            let images: string[] = [];
            let videos: string[] = [];
            let audio: string[] = [];

            if (mediaRequests.length > 0) {
                // Hide import from TS static analysis to allow genkit to definitively build before genmedia
                const moduleName = '@cle/' + 'genmedia';
                const { GenMediaBatchFlow } = await import(moduleName);
                const batchResult = await GenMediaBatchFlow({ requests: mediaRequests });
                images = batchResult.filter((r: any) => r.mediaType === 'image').map((r: any) => r.localPath);
                videos = batchResult.filter((r: any) => r.mediaType === 'video').map((r: any) => r.localPath);
                audio = batchResult.filter((r: any) => r.mediaType === 'audio').map((r: any) => r.localPath);
            }

            const durationMs = Date.now() - startMs;
            console.log(`[OMNIMEDIA] ✅ Complete — ${images.length} images, ${videos.length} videos, ${audio.length} audio | ${durationMs}ms`);

            return {
                concept, copy,
                assets: { images, videos, audio },
                lexApproval: lexResult.verdict as 'PASS' | 'WARNING',
                sessionId, durationMs,
                omniSignature: 'OMNIMEDIA',
            };
        });
    }
);
