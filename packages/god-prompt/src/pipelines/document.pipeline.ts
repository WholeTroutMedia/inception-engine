import { z } from 'zod';

// ─── GOD PROMPT — Document Pipeline ──────────────────────────────────────────
// Generates professional HTML documents: proposals, pitch decks, brand guidelines,
// case studies, and branded reports ready for PDF export or web delivery.

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const ProposalSchema = z.object({
    client_name: z.string(),
    project_title: z.string(),
    agency_name: z.string().default('Whole Trout Media'),
    tagline: z.string().optional(),
    executive_summary: z.string().describe('2-4 sentence project overview'),
    scope_items: z.array(z.object({
        title: z.string(),
        description: z.string(),
        deliverables: z.array(z.string()),
        timeline: z.string().optional(),
    })),
    pricing: z.array(z.object({
        line_item: z.string(),
        amount: z.number(),
        note: z.string().optional(),
    })),
    timeline_weeks: z.number().default(8),
    validity_days: z.number().default(14),
    accent_color: z.string().default('#b87333'),
    include_signature_block: z.boolean().default(true),
});

export const PitchDeckSchema = z.object({
    brand_name: z.string(),
    tagline: z.string(),
    problem_statement: z.string(),
    solution: z.string(),
    target_audience: z.string(),
    key_features: z.array(z.string()).max(6),
    social_proof: z.array(z.string()).max(3).optional().describe('Testimonials or stats'),
    call_to_action: z.string(),
    accent_color: z.string().default('#b87333'),
    num_slides: z.number().min(5).max(12).default(8),
});

export const BrandGuidelineSchema = z.object({
    brand_name: z.string(),
    tagline: z.string().optional(),
    mission: z.string(),
    values: z.array(z.string()).max(6),
    primary_color: z.string().default('#b87333'),
    secondary_color: z.string().default('#0a0a0f'),
    accent_color: z.string().default('#f5f0e8'),
    primary_font: z.string().default('Inter'),
    secondary_font: z.string().default('Georgia'),
    tone_of_voice: z.array(z.string()).max(5).describe('e.g. ["bold", "trustworthy", "innovative"]'),
    logo_usage_notes: z.string().optional(),
    do_list: z.array(z.string()).max(6).optional(),
    dont_list: z.array(z.string()).max(6).optional(),
});

// ─── Shared CSS ───────────────────────────────────────────────────────────────

function sharedStyles(accent: string, font = 'Inter'): string {
    return `
    @import url('https://fonts.googleapis.com/css2?family=${encodeURIComponent(font)}:wght@300;400;600;700;800&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root { --accent: ${accent}; --dark: #0a0a0f; --cream: #f5f0e8; --mid: #3a3a4a; }
    body { font-family: '${font}', -apple-system, sans-serif; background: #fff; color: var(--dark); line-height: 1.6; font-size: 16px; }
    h1, h2, h3, h4 { line-height: 1.15; }
    @media print { .no-print { display: none !important; } body { font-size: 12pt; } }
  `;
}

// ─── Proposal builder ─────────────────────────────────────────────────────────

export function generateProposal(input: z.infer<typeof ProposalSchema>): string {
    const v = ProposalSchema.parse(input);
    const total = v.pricing.reduce((s, p) => s + p.amount, 0);
    const validUntil = new Date(Date.now() + v.validity_days * 86400000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Proposal — ${v.project_title} — ${v.client_name}</title>
  <style>
    ${sharedStyles(v.accent_color)}
    .cover { background: var(--dark); color: var(--cream); min-height: 100vh; display: flex; flex-direction: column; justify-content: flex-end; padding: 80px; }
    .cover-eyebrow { font-size: 12px; letter-spacing: 4px; text-transform: uppercase; color: var(--accent); font-weight: 700; margin-bottom: 16px; }
    .cover-title { font-size: clamp(36px, 6vw, 72px); font-weight: 800; letter-spacing: -2px; max-width: 700px; }
    .cover-sub { font-size: 20px; color: rgba(245,240,232,0.6); margin-top: 16px; }
    .cover-meta { margin-top: 48px; display: flex; gap: 48px; padding-top: 32px; border-top: 1px solid rgba(245,240,232,0.15); }
    .cover-meta-item label { font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: rgba(245,240,232,0.4); }
    .cover-meta-item span { display: block; font-size: 16px; font-weight: 600; color: var(--cream); margin-top: 4px; }
    .accent-line { width: 60px; height: 4px; background: var(--accent); margin-bottom: 32px; }
    .section { padding: 64px 80px; border-bottom: 1px solid #f0f0f0; }
    .section:last-of-type { border-bottom: none; }
    .section-label { font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: var(--accent); font-weight: 700; margin-bottom: 24px; }
    .section-title { font-size: 32px; font-weight: 700; letter-spacing: -0.5px; margin-bottom: 16px; }
    .section-body { font-size: 16px; color: var(--mid); max-width: 680px; }
    .scope-item { margin-bottom: 40px; padding: 28px; background: #f9f9f9; border-radius: 8px; border-left: 4px solid var(--accent); }
    .scope-title { font-size: 20px; font-weight: 700; margin-bottom: 8px; }
    .scope-desc { font-size: 15px; color: var(--mid); margin-bottom: 16px; }
    .deliverables { display: flex; flex-wrap: wrap; gap: 8px; }
    .deliverable { background: var(--dark); color: var(--cream); padding: 4px 12px; border-radius: 100px; font-size: 12px; font-weight: 600; }
    .timeline-badge { display: inline-block; background: var(--accent); color: var(--dark); padding: 4px 12px; border-radius: 100px; font-size: 12px; font-weight: 700; margin-top: 12px; }
    table.pricing { width: 100%; border-collapse: collapse; }
    table.pricing th { text-align: left; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #999; padding: 12px 0; border-bottom: 2px solid #f0f0f0; }
    table.pricing td { padding: 16px 0; border-bottom: 1px solid #f0f0f0; font-size: 15px; }
    table.pricing td:last-child { text-align: right; font-weight: 600; }
    .total-row td { font-size: 20px; font-weight: 800; border-bottom: none; padding-top: 24px; }
    .sig-block { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; margin-top: 48px; }
    .sig-line { border-top: 2px solid var(--dark); padding-top: 12px; font-size: 13px; color: #666; }
    .footer { background: var(--dark); color: rgba(245,240,232,0.4); padding: 24px 80px; font-size: 12px; display: flex; justify-content: space-between; }
  </style>
</head>
<body>
  <!-- Cover -->
  <div class="cover">
    <div class="accent-line"></div>
    <p class="cover-eyebrow">Project Proposal</p>
    <h1 class="cover-title">${v.project_title}</h1>
    <p class="cover-sub">Prepared for ${v.client_name}</p>
    <div class="cover-meta">
      <div class="cover-meta-item"><label>Prepared by</label><span>${v.agency_name}</span></div>
      <div class="cover-meta-item"><label>Date</label><span>${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span></div>
      <div class="cover-meta-item"><label>Valid until</label><span>${validUntil}</span></div>
      <div class="cover-meta-item"><label>Timeline</label><span>${v.timeline_weeks} weeks</span></div>
    </div>
  </div>

  <!-- Executive Summary -->
  <div class="section">
    <p class="section-label">Overview</p>
    <h2 class="section-title">Executive Summary</h2>
    <p class="section-body">${v.executive_summary}</p>
  </div>

  <!-- Scope of Work -->
  <div class="section">
    <p class="section-label">What We'll Build</p>
    <h2 class="section-title">Scope of Work</h2>
    ${v.scope_items.map(item => `
    <div class="scope-item">
      <div class="scope-title">${item.title}</div>
      <div class="scope-desc">${item.description}</div>
      <div class="deliverables">${item.deliverables.map(d => `<span class="deliverable">${d}</span>`).join('')}</div>
      ${item.timeline ? `<span class="timeline-badge">⏱ ${item.timeline}</span>` : ''}
    </div>`).join('')}
  </div>

  <!-- Investment -->
  <div class="section">
    <p class="section-label">Investment</p>
    <h2 class="section-title">Pricing</h2>
    <table class="pricing">
      <thead><tr><th>Service</th><th>Note</th><th>Investment</th></tr></thead>
      <tbody>
        ${v.pricing.map(p => `<tr><td>${p.line_item}</td><td style="color:#999;font-size:13px">${p.note ?? ''}</td><td>$${p.amount.toLocaleString()}</td></tr>`).join('')}
        <tr class="total-row"><td colspan="2">Total Investment</td><td>$${total.toLocaleString()}</td></tr>
      </tbody>
    </table>
  </div>

  ${v.include_signature_block ? `<div class="section">
    <p class="section-label">Agreement</p>
    <h2 class="section-title">Sign to Proceed</h2>
    <p class="section-body">By signing below, ${v.client_name} agrees to the scope, timeline, and investment outlined in this proposal. A 50% deposit is required to begin.</p>
    <div class="sig-block">
      <div>
        <div style="height:60px"></div>
        <div class="sig-line">${v.client_name} &bull; Authorised Signature</div>
      </div>
      <div>
        <div style="height:60px"></div>
        <div class="sig-line">${v.agency_name} &bull; Authorised Signature</div>
      </div>
    </div>
  </div>` : ''}

  <div class="footer">
    <span>${v.agency_name} &bull; ${v.project_title} Proposal</span>
    <span>Valid until ${validUntil}</span>
  </div>
</body>
</html>`;
}

// ─── Pitch Deck builder ────────────────────────────────────────────────────────

export function generatePitchDeck(input: z.infer<typeof PitchDeckSchema>): string {
    const v = PitchDeckSchema.parse(input);

    const slides = [
        { title: v.brand_name, subtitle: v.tagline, type: 'cover' },
        { title: 'The Problem', body: v.problem_statement, type: 'content' },
        { title: 'Our Solution', body: v.solution, type: 'content' },
        { title: 'Who We Serve', body: v.target_audience, type: 'content' },
        { title: 'Key Features', items: v.key_features, type: 'bullets' },
        ...(v.social_proof?.length ? [{ title: 'What People Say', items: v.social_proof, type: 'testimonials' }] : []),
        { title: 'Ready?', subtitle: v.call_to_action, type: 'cta' },
    ].slice(0, v.num_slides);

    const renderSlide = (slide: typeof slides[0], i: number): string => {
        const isFirst = i === 0;
        const bg = isFirst || slide.type === 'cta' ? 'background:#0a0a0f;color:#f5f0e8;' : 'background:#fff;color:#0a0a0f;';
        return `<div class="slide" style="${bg}">
      <div class="slide-num">${String(i + 1).padStart(2, '0')}</div>
      ${'items' in slide && slide.items
                ? `<div class="slide-label">${slide.title}</div>
           <ul class="slide-bullets">${slide.items.map(it => `<li>${slide.type === 'testimonials' ? `"${it}"` : it}</li>`).join('')}</ul>`
                : `<div class="slide-title">${slide.title}</div>
           ${'subtitle' in slide && slide.subtitle ? `<div class="slide-sub">${slide.subtitle}</div>` : ''}
           ${'body' in slide && slide.body ? `<div class="slide-body">${slide.body}</div>` : ''}`
            }
    </div>`;
    };

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${v.brand_name} — Pitch Deck</title>
  <style>
    ${sharedStyles(v.accent_color)}
    body { display: grid; gap: 2px; background: #333; }
    .slide { min-height: 100vh; padding: 80px; display: flex; flex-direction: column; justify-content: flex-end; position: relative; page-break-after: always; }
    .slide-num { position: absolute; top: 40px; right: 56px; font-size: 12px; letter-spacing: 2px; color: rgba(128,128,128,0.5); font-weight: 700; }
    .slide-label { font-size: 12px; letter-spacing: 4px; text-transform: uppercase; color: var(--accent); font-weight: 700; margin-bottom: 24px; }
    .slide-title { font-size: clamp(40px, 7vw, 80px); font-weight: 800; letter-spacing: -2px; max-width: 800px; }
    .slide-sub { font-size: 24px; margin-top: 16px; opacity: 0.7; }
    .slide-body { font-size: 20px; max-width: 640px; line-height: 1.7; margin-top: 16px; opacity: 0.8; }
    .slide-bullets { list-style: none; font-size: 22px; font-weight: 600; display: grid; gap: 16px; max-width: 700px; }
    .slide-bullets li::before { content: '→ '; color: var(--accent); }
    .accent-line { width: 60px; height: 4px; background: var(--accent); margin-bottom: 32px; }
    @media print { body { gap: 0; } .slide { height: 100vh; } }
  </style>
</head>
<body>
  ${slides.map(renderSlide).join('\n')}
</body>
</html>`;
}

// ─── Brand Guideline builder ───────────────────────────────────────────────────

export function generateBrandGuideline(input: z.infer<typeof BrandGuidelineSchema>): string {
    const v = BrandGuidelineSchema.parse(input);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${v.brand_name} — Brand Guidelines</title>
  <style>
    ${sharedStyles(v.primary_color, v.primary_font)}
    .cover { height: 100vh; background: ${v.secondary_color}; color: ${v.accent_color}; display: flex; flex-direction: column; justify-content: flex-end; padding: 80px; }
    .brand-name { font-size: clamp(48px, 8vw, 96px); font-weight: 800; letter-spacing: -3px; color: ${v.accent_color}; }
    .section { padding: 64px 80px; border-bottom: 1px solid #f0f0f0; }
    .section-label { font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: ${v.primary_color}; font-weight: 700; margin-bottom: 24px; }
    .section-title { font-size: 32px; font-weight: 700; margin-bottom: 24px; }
    .color-swatches { display: flex; gap: 16px; flex-wrap: wrap; }
    .swatch { width: 120px; }
    .swatch-block { height: 100px; border-radius: 8px; margin-bottom: 8px; }
    .swatch-label { font-size: 13px; font-weight: 600; }
    .swatch-hex { font-size: 11px; color: #999; font-family: monospace; }
    .font-display { margin-bottom: 24px; }
    .font-name { font-size: 13px; letter-spacing: 2px; text-transform: uppercase; color: #999; margin-bottom: 8px; }
    .font-sample { font-size: 48px; font-weight: 700; }
    .value-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; }
    .value-card { padding: 24px; background: #f9f9f9; border-radius: 8px; border-top: 4px solid ${v.primary_color}; }
    .value-card-name { font-size: 16px; font-weight: 700; }
    .dos-donts { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
    .do-col, .dont-col { }
    .do-header { color: #28a745; font-weight: 700; font-size: 14px; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 16px; }
    .dont-header { color: #dc3545; font-weight: 700; font-size: 14px; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 16px; }
    .do-item, .dont-item { padding: 12px; font-size: 14px; border-radius: 4px; margin-bottom: 8px; }
    .do-item { background: #d4edda; }
    .dont-item { background: #f8d7da; }
    .tone-tags { display: flex; flex-wrap: wrap; gap: 12px; }
    .tone-tag { padding: 10px 20px; background: ${v.secondary_color}; color: ${v.accent_color}; border-radius: 100px; font-weight: 700; font-size: 15px; }
  </style>
</head>
<body>
  <div class="cover">
    <div style="font-size:12px;letter-spacing:4px;text-transform:uppercase;opacity:0.5;margin-bottom:16px">Brand Guidelines</div>
    <div class="brand-name">${v.brand_name}</div>
    ${v.tagline ? `<div style="font-size:20px;margin-top:16px;opacity:0.6">${v.tagline}</div>` : ''}
  </div>

  <div class="section">
    <p class="section-label">Who We Are</p>
    <h2 class="section-title">Mission</h2>
    <p style="font-size:20px;max-width:640px;color:#444;line-height:1.7">${v.mission}</p>
  </div>

  <div class="section">
    <p class="section-label">What We Stand For</p>
    <h2 class="section-title">Brand Values</h2>
    <div class="value-grid">
      ${v.values.map(val => `<div class="value-card"><div class="value-card-name">${val}</div></div>`).join('')}
    </div>
  </div>

  <div class="section">
    <p class="section-label">Visual Identity</p>
    <h2 class="section-title">Color Palette</h2>
    <div class="color-swatches">
      <div class="swatch"><div class="swatch-block" style="background:${v.primary_color}"></div><div class="swatch-label">Primary</div><div class="swatch-hex">${v.primary_color}</div></div>
      <div class="swatch"><div class="swatch-block" style="background:${v.secondary_color}"></div><div class="swatch-label">Secondary</div><div class="swatch-hex">${v.secondary_color}</div></div>
      <div class="swatch"><div class="swatch-block" style="background:${v.accent_color};border:1px solid #e0e0e0"></div><div class="swatch-label">Accent</div><div class="swatch-hex">${v.accent_color}</div></div>
    </div>
  </div>

  <div class="section">
    <p class="section-label">Typography</p>
    <h2 class="section-title">Fonts</h2>
    <div class="font-display"><div class="font-name">Primary — ${v.primary_font}</div><div class="font-sample" style="font-family:'${v.primary_font}',sans-serif">The quick brown fox</div></div>
    <div class="font-display"><div class="font-name">Secondary — ${v.secondary_font}</div><div class="font-sample" style="font-family:'${v.secondary_font}',serif;font-weight:400">The quick brown fox</div></div>
  </div>

  <div class="section">
    <p class="section-label">Voice & Tone</p>
    <h2 class="section-title">How We Sound</h2>
    <div class="tone-tags">${v.tone_of_voice.map(t => `<span class="tone-tag">${t}</span>`).join('')}</div>
  </div>

  ${(v.do_list?.length || v.dont_list?.length) ? `<div class="section">
    <p class="section-label">Usage</p>
    <h2 class="section-title">Do's & Don'ts</h2>
    <div class="dos-donts">
      <div class="do-col"><div class="do-header">✅ Do</div>${(v.do_list ?? []).map(d => `<div class="do-item">${d}</div>`).join('')}</div>
      <div class="dont-col"><div class="dont-header">❌ Don't</div>${(v.dont_list ?? []).map(d => `<div class="dont-item">${d}</div>`).join('')}</div>
    </div>
  </div>` : ''}
</body>
</html>`;
}

// ─── MCP Tool Registration ────────────────────────────────────────────────────

export const DOCUMENT_PIPELINE_TOOLS = [
    {
        name: 'godprompt_generate_proposal',
        description: 'Generate a branded HTML proposal document with cover, scope, pricing, and signature block.',
        inputSchema: ProposalSchema,
        handler: generateProposal,
        agentPermissions: ['GOD_PROMPT', 'ZERO_DAY', 'ORACLE'],
        estimatedCost: 'Free',
    },
    {
        name: 'godprompt_generate_pitch_deck',
        description: 'Generate a multi-slide HTML pitch deck with cover, problem/solution, features, social proof, and CTA.',
        inputSchema: PitchDeckSchema,
        handler: generatePitchDeck,
        agentPermissions: ['GOD_PROMPT', 'NOVA'],
        estimatedCost: 'Free',
    },
    {
        name: 'godprompt_generate_brand_guideline',
        description: 'Generate a comprehensive HTML brand guideline document: colors, typography, values, tone of voice, do/dont.',
        inputSchema: BrandGuidelineSchema,
        handler: generateBrandGuideline,
        agentPermissions: ['GOD_PROMPT', 'NOVA', 'ORACLE'],
        estimatedCost: 'Free',
    },
];
