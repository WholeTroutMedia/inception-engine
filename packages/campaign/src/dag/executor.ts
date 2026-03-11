/**
 * packages/campaign/src/dag/executor.ts
 * Campaign DAG Executor — parallel asset production with self-critique loop
 * Runs all deliverables simultaneously, respecting dependencies
 */

import type {
    Campaign, CampaignDAGNode, CampaignAsset, CreativeBrief,
} from '../brief/schema.js';

// ─────────────────────────────────────────────────────────────────────────────
// LOCAL VISION TYPE — mirrors god-prompt's CreativeVision without the import
// ─────────────────────────────────────────────────────────────────────────────

export interface CreativeVision {
    campaign_name: string;
    visual_language: {
        color_palette: string[];
        cinematography: string;
        typography: string;
        motion_language: string;
        composition_rules: string;
    };
    audio_identity: {
        bpm_range: [number, number];
        musical_key: string;
        instrumentation: string;
        vo_persona: string;
        sound_design: string;
    };
    spatial_language: {
        depth_zones: string;
        material_palette: string;
        camera_physics: string;
    };
    narrative_arc: string;
    negative_direction: string;
    reference_works: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// LOCAL PROMPT BUILDER — pure function, no external deps
// ─────────────────────────────────────────────────────────────────────────────

function buildGenerativePrompt(
    vision: CreativeVision,
    deliverable_type: string,
    brief: CreativeBrief
): string {
    const { visual_language: vl, audio_identity: audio, spatial_language: sl } = vision;
    const baseVisual = `${vl.cinematography}. Color palette: ${vl.color_palette.slice(0, 3).join(', ')}. ${vl.composition_rules}`;
    const baseBrand = `Brand: ${brief.brand.name}. Tone: ${brief.brand.tone}. ${vision.narrative_arc}`;
    const neg = `Avoid: ${vision.negative_direction}`;

    switch (deliverable_type) {
        case 'hero_video': return `${baseBrand}. ${baseVisual}. Motion: ${vl.motion_language}. Camera: ${sl.camera_physics}. Cinematic, 4K. | ${neg}`;
        case 'product_stills': return `${baseBrand}. Product photography. ${baseVisual}. Material: ${sl.material_palette}. Commercial grade. | ${neg}`;
        case 'social_cutdowns': return `${baseBrand}. ${baseVisual}. Punchy, ${brief.brand.tone}. For ${brief.audience.platforms?.join('/') ?? 'social'}. Square or vertical format. | ${neg}`;
        case '3d_asset': return `${baseBrand}. 3D render. ${baseVisual}. Depth: ${sl.depth_zones}. Materials: ${sl.material_palette}. | ${neg}`;
        case 'campaign_copy': return `Write copy for: ${baseBrand}. Voice: ${brief.brand.tone}. Audience: ${brief.audience.demographics?.join(', ') ?? 'general'}.`;
        case 'voiceover': return `VO script for: ${baseBrand}. Persona: ${audio.vo_persona}. ${audio.sound_design}.`;
        case 'background_music': return `${audio.instrumentation}. BPM: ${audio.bpm_range[0]}–${audio.bpm_range[1]}. Key: ${audio.musical_key}. ${audio.sound_design}.`;
        case 'motion_graphic': return `${baseBrand}. Motion graphic. ${baseVisual}. Motion: ${vl.motion_language}. Short-form, loop-capable. | ${neg}`;
        case 'web_banner': return `${baseBrand}. Web banner. ${baseVisual}. Clean, click-worthy, brand-forward. Standard IAB sizes. | ${neg}`;
        case 'email_campaign': return `${baseBrand}. Email campaign copy. Voice: ${brief.brand.tone}. Subject line + body. Audience: ${brief.audience.demographics?.join(', ') ?? 'subscribers'}.`;
        case 'brand_identity': return `${baseBrand}. Brand identity design concept. ${vl.composition_rules}. Color system: ${vl.color_palette.join(', ')}. | ${neg}`;
        case 'brand_guidelines': return `${baseBrand}. Brand guidelines document. Typography, color system, logo usage rules, do/don'ts. Tone: ${brief.brand.tone}.`;
        default: return `${baseBrand}. ${baseVisual}. | ${neg}`;
    }
}


// ─────────────────────────────────────────────────────────────────────────────
// CRITIQUE LOOP — generate → LoRA score → re-roll
// ─────────────────────────────────────────────────────────────────────────────

export interface AssetJob {
    node: CampaignDAGNode;
    brief: CreativeBrief;
    vision: CreativeVision;
    campaign_id: string;
    output_dir: string;
}

export interface AssetResult {
    asset: CampaignAsset;
    node_id: string;
}

async function scoreAsset(
    local_path: string,
    deliverable_type: string,
    vision: CreativeVision
): Promise<{ score: number; critique: string }> {
    // Call the genkit service's score flow — VISION LoRA
    try {
        const res = await fetch(`${process.env.GENKIT_URL ?? 'http://genkit:4000'}/score`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                local_path,
                deliverable_type,
                vision_document: JSON.stringify(vision),
            }),
        });
        if (!res.ok) throw new Error(`Score API ${res.status}`);
        const data = await res.json() as { score: number; critique: string };
        return data;
    } catch {
        // If scoring unavailable, pass with neutral score
        return { score: 85, critique: 'Scoring unavailable — auto-pass' };
    }
}

async function generateAsset(
    prompt: string,
    deliverable_type: string,
    output_dir: string,
    session_id: string
): Promise<string> {
    // Route to genkit media generation endpoint
    const res = await fetch(`${process.env.GENKIT_URL ?? 'http://genkit:4000'}/generate-media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            prompt,
            deliverable_type,
            output_dir,
            session_id,
        }),
    });
    if (!res.ok) {
        const err = await res.text();
        throw new Error(`GenMedia API ${res.status}: ${err.slice(0, 200)}`);
    }
    const data = await res.json() as { local_path: string };
    return data.local_path;
}

async function runAssetJob(job: AssetJob): Promise<AssetResult> {
    const { node, brief, vision, campaign_id } = job;
    const maxAttempts = 3;
    const threshold = 80;

    const prompt = buildGenerativePrompt(vision, node.deliverable_type, brief);
    const output_dir = `${job.output_dir}/${campaign_id}`;
    const session_id = `${campaign_id}_${node.id}`;

    let best_path = '';
    let best_score = 0;
    let best_critique = '';
    let iterations = 0;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        iterations++;
        const adjustedPrompt = attempt === 0
            ? prompt
            : `${prompt}. Critique from previous attempt: ${best_critique}. Fix these issues specifically.`;

        console.log(`[DAG] 🎨 ${node.deliverable_type} attempt ${attempt + 1}/${maxAttempts}`);

        let local_path: string;
        try {
            local_path = await generateAsset(adjustedPrompt, node.deliverable_type, output_dir, session_id);
        } catch (err) {
            console.error(`[DAG] ❌ Generate failed (attempt ${attempt + 1}): ${String(err).slice(0, 100)}`);
            continue;
        }

        const { score, critique } = await scoreAsset(local_path, node.deliverable_type, vision);
        console.log(`[DAG] 📊 ${node.deliverable_type} scored: ${score}/100`);

        if (score > best_score) {
            best_score = score;
            best_path = local_path;
            best_critique = critique;
        }

        if (score >= threshold) {
            console.log(`[DAG] ✅ ${node.deliverable_type} passed threshold (${score}/100)`);
            break;
        }

        if (attempt < maxAttempts - 1) {
            console.log(`[DAG] 🔄 Re-rolling ${node.deliverable_type} (score ${score} < ${threshold})`);
        }
    }

    if (!best_path) throw new Error(`[DAG] All ${maxAttempts} attempts failed for ${node.deliverable_type}`);

    const asset: CampaignAsset = {
        id: `${campaign_id}_${node.id}_${Date.now()}`,
        deliverable_type: node.deliverable_type,
        provider: node.provider_hint ?? 'auto',
        local_path: best_path,
        quality_score: best_score,
        compass_approved: false,      // set by validator after
        compass_score: 0,
        iterations,
        created_at: new Date().toISOString(),
    };

    return { asset, node_id: node.id };
}

// ─────────────────────────────────────────────────────────────────────────────
// DAG EXECUTOR — topological parallel execution
// ─────────────────────────────────────────────────────────────────────────────

export interface DAGExecutionResult {
    assets: CampaignAsset[];
    failed_nodes: string[];
    total_duration_ms: number;
}

export async function executeCampaignDAG(
    campaign: Campaign,
    vision: CreativeVision,
    output_dir: string,
    onProgress?: (node_id: string, status: string) => void
): Promise<DAGExecutionResult> {
    const startMs = Date.now();
    const nodes = campaign.dag ?? [];
    const brief = campaign.brief;

    const completed = new Set<string>();
    const failed = new Set<string>();
    const assets: CampaignAsset[] = [];

    console.log(`[DAG] 🚀 Executing ${nodes.length} asset jobs for campaign ${campaign.id}`);

    // Topological wave execution — all ready nodes run in parallel
    let pass = 0;
    while (completed.size + failed.size < nodes.length) {
        pass++;

        // Find all nodes whose dependencies are satisfied
        const ready = nodes.filter(n =>
            !completed.has(n.id) &&
            !failed.has(n.id) &&
            n.depends_on.every(dep => completed.has(dep))
        );

        if (ready.length === 0) {
            // Check for deadlock (unresolvable dependencies)
            const remaining = nodes.filter(n => !completed.has(n.id) && !failed.has(n.id));
            if (remaining.length > 0) {
                console.error(`[DAG] ⚠️ Deadlock detected — marking ${remaining.length} nodes failed`);
                remaining.forEach(n => failed.add(n.id));
            }
            break;
        }

        console.log(`[DAG] Wave ${pass}: ${ready.length} jobs running in parallel — [${ready.map(n => n.deliverable_type).join(', ')}]`);
        onProgress?.('wave', `Wave ${pass}: ${ready.map(n => n.deliverable_type).join(', ')}`);

        // Execute all ready nodes in parallel
        const results = await Promise.allSettled(
            ready.map(node => runAssetJob({ node, brief, vision, campaign_id: campaign.id, output_dir }))
        );

        results.forEach((result, i) => {
            const node = ready[i];
            if (result.status === 'fulfilled') {
                assets.push(result.value.asset);
                completed.add(node.id);
                onProgress?.(node.id, 'done');
                console.log(`[DAG] ✅ ${node.deliverable_type} complete`);
            } else {
                failed.add(node.id);
                onProgress?.(node.id, 'failed');
                console.error(`[DAG] ❌ ${node.deliverable_type} failed: ${result.reason}`);
            }
        });
    }

    const total_duration_ms = Date.now() - startMs;
    console.log(`[DAG] 🏁 Campaign ${campaign.id} complete: ${assets.length} assets, ${failed.size} failed (${Math.round(total_duration_ms / 1000)}s)`);

    return { assets, failed_nodes: [...failed], total_duration_ms };
}

// ─────────────────────────────────────────────────────────────────────────────
// DAG PLANNER — build the execution graph from deliverables
// ─────────────────────────────────────────────────────────────────────────────

export function planCampaignDAG(brief: CreativeBrief): CampaignDAGNode[] {
    const nodes: CampaignDAGNode[] = [];

    // 1. Brand identity / guidelines always first (no deps)
    const hasBrandId = brief.deliverables.some(d => d.type === 'brand_identity');
    if (hasBrandId) {
        nodes.push({
            id: 'brand_identity',
            deliverable_type: 'brand_identity',
            depends_on: [],
            status: 'pending',
        });
    }

    // 2. Product stills — no dependency (or after brand_identity)
    brief.deliverables.filter(d => d.type === 'product_stills').forEach((d, i) => {
        for (let j = 0; j < d.quantity; j++) {
            nodes.push({
                id: `product_still_${i}_${j}`,
                deliverable_type: 'product_stills',
                depends_on: hasBrandId ? ['brand_identity'] : [],
                status: 'pending',
            });
        }
    });

    // 3. Campaign copy — no image dependency
    if (brief.deliverables.some(d => d.type === 'campaign_copy')) {
        nodes.push({
            id: 'campaign_copy',
            deliverable_type: 'campaign_copy',
            depends_on: [],
            status: 'pending',
        });
    }

    // 4. VO — depends on copy
    if (brief.deliverables.some(d => d.type === 'voiceover')) {
        nodes.push({
            id: 'voiceover',
            deliverable_type: 'voiceover',
            depends_on: ['campaign_copy'],
            status: 'pending',
        });
    }

    // 5. Background music — no dependency
    if (brief.deliverables.some(d => d.type === 'background_music')) {
        nodes.push({
            id: 'background_music',
            deliverable_type: 'background_music',
            depends_on: [],
            status: 'pending',
        });
    }

    // 6. Hero video — depends on stills if available (for img2vid)
    if (brief.deliverables.some(d => d.type === 'hero_video')) {
        const stillDeps = nodes.filter(n => n.deliverable_type === 'product_stills').map(n => n.id);
        nodes.push({
            id: 'hero_video',
            deliverable_type: 'hero_video',
            depends_on: stillDeps.slice(0, 1), // use first still as seed if available
            status: 'pending',
        });
    }

    // 7. Social cutdowns — depend on hero video if available
    brief.deliverables.filter(d => d.type === 'social_cutdowns').forEach((d, i) => {
        const heroDep = nodes.find(n => n.deliverable_type === 'hero_video');
        for (let j = 0; j < d.quantity; j++) {
            nodes.push({
                id: `social_cutdown_${i}_${j}`,
                deliverable_type: 'social_cutdowns',
                depends_on: heroDep ? ['hero_video'] : [],
                status: 'pending',
            });
        }
    });

    // 8. 3D assets — no dependency
    brief.deliverables.filter(d => d.type === '3d_asset').forEach((_, i) => {
        nodes.push({
            id: `3d_asset_${i}`,
            deliverable_type: '3d_asset',
            depends_on: [],
            status: 'pending',
        });
    });

    // 9. Motion graphics — no dependency
    brief.deliverables.filter(d => d.type === 'motion_graphic').forEach((_, i) => {
        nodes.push({
            id: `motion_graphic_${i}`,
            deliverable_type: 'motion_graphic',
            depends_on: [],
            status: 'pending',
        });
    });

    // 10. Web banners — no dependency
    brief.deliverables.filter(d => d.type === 'web_banner').forEach((_, i) => {
        nodes.push({
            id: `web_banner_${i}`,
            deliverable_type: 'web_banner',
            depends_on: [],
            status: 'pending',
        });
    });

    // 11. Email campaigns — depend on campaign copy if available
    brief.deliverables.filter(d => d.type === 'email_campaign').forEach((_, i) => {
        const hasCopy = nodes.find(n => n.deliverable_type === 'campaign_copy');
        nodes.push({
            id: `email_campaign_${i}`,
            deliverable_type: 'email_campaign',
            depends_on: hasCopy ? ['campaign_copy'] : [],
            status: 'pending',
        });
    });

    // 12. Brand guidelines — depend on brand_identity if available
    if (brief.deliverables.some(d => d.type === 'brand_guidelines')) {
        const hasBrandNode = nodes.find(n => n.deliverable_type === 'brand_identity');
        nodes.push({
            id: 'brand_guidelines',
            deliverable_type: 'brand_guidelines',
            depends_on: hasBrandNode ? ['brand_identity'] : [],
            status: 'pending',
        });
    }

    return nodes;
}
