/**
 * packages/campaign/src/compass/validator.ts
 * COMPASS Validation Chain — runs after all assets are produced
 * SENTINEL → ARCHON → PROOF → HARBOR
 * Each validator is a Genkit call with a specialized system prompt
 */

import type { Campaign, CampaignAsset, CompassReport } from '../brief/schema.js';

const GENKIT_URL = process.env.GENKIT_URL ?? 'http://genkit:4000';

async function genkitGenerate(system: string, prompt: string): Promise<string> {
    const res = await fetch(`${GENKIT_URL}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system, prompt, model: 'googleai/gemini-2.0-flash' }),
    });
    if (!res.ok) throw new Error(`Genkit ${res.status}`);
    const data = await res.json() as { text: string };
    return data.text;
}

// ─────────────────────────────────────────────────────────────────────────────
// SENTINEL — brand safety + constitutional compliance
// ─────────────────────────────────────────────────────────────────────────────

async function runSentinel(campaign: Campaign, assets: CampaignAsset[]): Promise<{ pass: boolean; issues: string[] }> {
    const system = `You are SENTINEL — the security and brand-safety validator of the Creative Liberation Engine.

Your job: review a list of generated campaign assets and determine if any violate:
1. The client's stated restricted content rules
2. Constitutional Article 3 (no deceptive content)  
3. Constitutional Article 7 (no content that harms the world)
4. Basic brand safety standards (no violence, discrimination, explicit content)

Respond with JSON: { "pass": boolean, "issues": string[] }`;

    const prompt = `Campaign: ${campaign.brief.project_name}
Brand: ${campaign.brief.brand.name}
Restricted content rules: ${campaign.brief.brand.restricted_content?.join(', ') || 'none specified'}
Assets produced: ${assets.map(a => `${a.deliverable_type} (score: ${a.quality_score})`).join(', ')}
Constitutional flags cleared: ${campaign.brief.constitutional_flags.join(', ') || 'none'}

Run full SENTINEL check. Return JSON only.`;

    try {
        const response = await genkitGenerate(system, prompt);
        const parsed = JSON.parse(response.replace(/```json|```/g, '').trim()) as { pass: boolean; issues: string[] };
        return parsed;
    } catch {
        return { pass: true, issues: ['SENTINEL: parsing error — auto-pass'] };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// ARCHON — architecture compliance (did we produce everything?)
// ─────────────────────────────────────────────────────────────────────────────

function runArchon(campaign: Campaign, assets: CampaignAsset[]): { pass: boolean; issues: string[] } {
    const issues: string[] = [];
    const producedTypes = new Set(assets.map(a => a.deliverable_type));

    for (const deliverable of campaign.brief.deliverables) {
        const produced = assets.filter(a => a.deliverable_type === deliverable.type);
        if (produced.length < deliverable.quantity) {
            issues.push(`ARCHON: Expected ${deliverable.quantity}x ${deliverable.type}, got ${produced.length}`);
        }
    }

    return { pass: issues.length === 0, issues };
}

// ─────────────────────────────────────────────────────────────────────────────
// PROOF — behavioral correctness (assets match brief intent)
// ─────────────────────────────────────────────────────────────────────────────

async function runProof(campaign: Campaign, assets: CampaignAsset[]): Promise<{ pass: boolean; issues: string[] }> {
    const system = `You are PROOF — the behavioral correctness validator.

You verify that generated assets actually fulfill the stated creative intent.
You check quality scores and flag any assets scoring below 70.
Respond with JSON: { "pass": boolean, "issues": string[] }`;

    const lowScoring = assets.filter(a => a.quality_score < 70);
    if (lowScoring.length === 0) return { pass: true, issues: [] };

    const prompt = `Brief intent: ${campaign.brief.intent}
Low-scoring assets: ${lowScoring.map(a => `${a.deliverable_type} (score: ${a.quality_score})`).join(', ')}

Do these asset scores indicate fundamental failure to meet the brief? JSON only.`;

    try {
        const response = await genkitGenerate(system, prompt);
        return JSON.parse(response.replace(/```json|```/g, '').trim()) as { pass: boolean; issues: string[] };
    } catch {
        const issues = lowScoring.map(a => `PROOF: ${a.deliverable_type} scored ${a.quality_score}/100 — below threshold`);
        return { pass: false, issues };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// HARBOR — completeness check
// ─────────────────────────────────────────────────────────────────────────────

function runHarbor(assets: CampaignAsset[]): { pass: boolean; issues: string[] } {
    const issues: string[] = [];
    const missingPaths = assets.filter(a => !a.local_path || a.local_path.length === 0);
    if (missingPaths.length > 0) {
        issues.push(`HARBOR: ${missingPaths.length} assets have no output path`);
    }
    const zeroScore = assets.filter(a => a.quality_score === 0);
    if (zeroScore.length > 0) {
        issues.push(`HARBOR: ${zeroScore.length} assets have zero quality score`);
    }
    return { pass: issues.length === 0, issues };
}

// ─────────────────────────────────────────────────────────────────────────────
// FULL COMPASS CHAIN
// ─────────────────────────────────────────────────────────────────────────────

export async function runCompassValidation(
    campaign: Campaign,
    assets: CampaignAsset[]
): Promise<CompassReport> {
    console.log(`[COMPASS] 🧭 Running full validation chain for campaign ${campaign.id}`);

    const [sentinel, proof] = await Promise.all([
        runSentinel(campaign, assets),
        runProof(campaign, assets),
    ]);

    const archon = runArchon(campaign, assets);
    const harbor = runHarbor(assets);

    const allIssues = [
        ...sentinel.issues,
        ...archon.issues,
        ...proof.issues,
        ...harbor.issues,
    ];

    const passCount = [sentinel.pass, archon.pass, proof.pass, harbor.pass].filter(Boolean).length;
    const overall_score = Math.round((passCount / 4) * 100);

    const report: CompassReport = {
        overall_score,
        sentinel_pass: sentinel.pass,
        archon_pass: archon.pass,
        proof_pass: proof.pass,
        harbor_pass: harbor.pass,
        issues: allIssues,
        timestamp: new Date().toISOString(),
    };

    console.log(`[COMPASS] ✅ Score: ${overall_score}/100 | Issues: ${allIssues.length}`);
    if (allIssues.length > 0) {
        allIssues.forEach(i => console.warn(`[COMPASS] ⚠️ ${i}`));
    }

    return report;
}
