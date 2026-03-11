/**
 * packages/campaign/src/brief/schema.ts
 * The CreativeBrief — single source of truth for every campaign
 * Flows through: Zero-Day → AVERI → god-prompt → GenMedia → COMPASS → COMET
 */

// ─────────────────────────────────────────────────────────────────────────────
// DELIVERABLE TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type DeliverableType =
    | 'hero_video'
    | 'product_stills'
    | 'campaign_copy'
    | 'voiceover'
    | 'background_music'
    | 'social_cutdowns'
    | '3d_asset'
    | 'brand_identity'
    | 'motion_graphic'
    | 'web_banner'
    | 'email_campaign'
    | 'brand_guidelines';

export interface Deliverable {
    type: DeliverableType;
    quantity: number;
    format?: '9:16' | '16:9' | '1:1' | '4:5' | 'landscape' | 'vertical' | 'square';
    duration_seconds?: number;       // for video/audio
    resolution?: '1080p' | '4K' | '8K';
    notes?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// BRAND PARAMETERS
// ─────────────────────────────────────────────────────────────────────────────

export interface BrandParameters {
    name: string;
    primary_colors?: string[];       // hex values
    secondary_colors?: string[];
    fonts?: string[];
    tone: 'bold' | 'minimal' | 'luxury' | 'playful' | 'technical' | 'warm' | 'raw' | 'editorial';
    mood_words?: string[];           // e.g. ["architectural", "raw", "kinetic"]
    restricted_content?: string[];  // things NEVER to include
    style_references?: string[];    // URLs or descriptions
    logo_url?: string;
    guidelines_url?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// AUDIENCE DEFINITION
// ─────────────────────────────────────────────────────────────────────────────

export interface AudienceDefinition {
    age_range?: [number, number];
    demographics?: string[];
    psychographics?: string[];
    platforms?: ('instagram' | 'tiktok' | 'youtube' | 'linkedin' | 'twitter' | 'web')[];
    geographic_focus?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// THE CREATIVE BRIEF
// ─────────────────────────────────────────────────────────────────────────────

export type ProjectType =
    | 'campaign'
    | 'brand_identity'
    | 'content_series'
    | 'product_launch'
    | 'event'
    | 'broadcast'
    | 'web_experience'
    | 'spatial_xr';

export type Timeline = 'express' | 'standard' | 'premium' | 'bespoke';
// express = <24h, standard = 3-5 days, premium = 1-2 weeks, bespoke = negotiated

export interface CreativeBrief {
    id: string;
    client_id: string;
    project_name: string;
    project_type: ProjectType;
    intent: string;                  // raw client language — preserved verbatim
    summary: string;                 // AVERI-synthesized 2-sentence summary
    deliverables: Deliverable[];
    brand: BrandParameters;
    audience: AudienceDefinition;
    timeline: Timeline;
    budget_tier: 'starter' | 'growth' | 'scale' | 'enterprise';
    constitutional_flags: string[];  // pre-cleared by LEX
    averi_notes: string;             // ATHENA strategic notes
    created_at: string;
    updated_at: string;
    status: 'draft' | 'approved' | 'active' | 'delivered' | 'archived';
    version: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// CAMPAIGN — full runtime record
// ─────────────────────────────────────────────────────────────────────────────

export interface CampaignAsset {
    id: string;
    deliverable_type: DeliverableType;
    provider: string;
    local_path: string;
    url?: string;
    quality_score: number;           // 0-100 from LoRA critique
    compass_approved: boolean;
    compass_score: number;
    iterations: number;              // how many re-rolls it took
    created_at: string;
}

export interface CampaignIteration {
    iteration_number: number;
    trigger: 'initial' | 'client_revision' | 'compass_rejection' | 'critique_loop';
    notes: string;
    assets_regenerated: string[];
    created_at: string;
}

export interface Campaign {
    id: string;
    brief: CreativeBrief;
    vision_document?: string;        // IRIS Creative Vision Document (Markdown)
    dag?: CampaignDAGNode[];
    assets: CampaignAsset[];
    compass_report?: CompassReport;
    iterations: CampaignIteration[];
    client_delivery_url?: string;
    stripe_charge_id?: string;
    status: 'briefing' | 'planning' | 'directing' | 'producing' | 'validating' | 'client_review' | 'approved' | 'delivered';
    created_at: string;
    updated_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// DAG NODE — one asset job in the execution graph
// ─────────────────────────────────────────────────────────────────────────────

export interface CampaignDAGNode {
    id: string;
    deliverable_type: DeliverableType;
    depends_on: string[];             // IDs of nodes that must complete first
    provider_hint?: string;           // preferred provider
    prompt?: string;
    direction_notes?: string;         // from Creative Vision Document
    status: 'pending' | 'running' | 'done' | 'failed' | 'retrying';
    asset_id?: string;               // populated on completion
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPASS REPORT
// ─────────────────────────────────────────────────────────────────────────────

export interface CompassReport {
    overall_score: number;
    sentinel_pass: boolean;
    archon_pass: boolean;
    proof_pass: boolean;
    harbor_pass: boolean;
    issues: string[];
    timestamp: string;
}
