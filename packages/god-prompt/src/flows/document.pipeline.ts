/**
 * packages/god-prompt/src/flows/document.pipeline.ts
 * Document generation pipeline — pitch decks, proposals, brand guidelines
 */

// ─── Pitch Deck ───────────────────────────────────────────────────────────────

export interface PitchDeckInput {
    brand_name: string;
    tagline: string;
    problem_statement: string;
    solution: string;
    target_audience: string;
    key_features: string[];
    call_to_action: string;
    accent_color: string;
    num_slides: number;
}

export function generatePitchDeck(input: PitchDeckInput): string {
    const { brand_name, tagline, problem_statement, solution, target_audience, key_features, call_to_action, accent_color } = input;
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>${brand_name} — Pitch Deck</title>
<style>
  :root { --accent: ${accent_color}; }
  body { font-family: system-ui; background: #0a0a0f; color: #f5f0e8; margin: 0; }
  .slide { min-height: 100vh; display: flex; flex-direction: column; justify-content: center; padding: 80px; border-bottom: 1px solid rgba(255,255,255,0.1); }
  h1 { font-size: 4rem; margin: 0; color: var(--accent); }
  h2 { font-size: 2.5rem; color: var(--accent); }
  p { font-size: 1.25rem; opacity: 0.85; max-width: 700px; }
  ul { font-size: 1.1rem; } li { margin: 8px 0; }
  .cta { display: inline-block; padding: 16px 40px; background: var(--accent); color: #0a0a0f; border-radius: 4px; font-weight: 700; font-size: 1.25rem; text-decoration: none; margin-top: 24px; }
</style></head>
<body>
  <div class="slide"><h1>${brand_name}</h1><p style="font-size:1.75rem;opacity:1;">${tagline}</p></div>
  <div class="slide"><h2>The Problem</h2><p>${problem_statement}</p></div>
  <div class="slide"><h2>Our Solution</h2><p>${solution}</p></div>
  <div class="slide"><h2>Who We Serve</h2><p>${target_audience}</p></div>
  <div class="slide"><h2>Key Features</h2><ul>${key_features.map(f => `<li>${f}</li>`).join('')}</ul></div>
  <div class="slide"><h2>Join Us</h2><p>${call_to_action}</p><a href="#" class="cta">Get Started</a></div>
</body></html>`;
}

// ─── Proposal ─────────────────────────────────────────────────────────────────

export interface ScopeItem {
    title: string;
    description: string;
    deliverables: string[];
    timeline: string;
}

export interface PricingItem {
    line_item: string;
    amount: number;
}

export interface ProposalInput {
    client_name: string;
    project_title: string;
    agency_name: string;
    executive_summary: string;
    scope_items: ScopeItem[];
    pricing: PricingItem[];
    accent_color: string;
}

export function generateProposal(input: ProposalInput): string {
    const { client_name, project_title, agency_name, executive_summary, scope_items, pricing, accent_color } = input;
    const total = pricing.reduce((s, p) => s + p.amount, 0);
    const scopeHtml = scope_items.map(s => `
        <div class="scope-item">
            <h3>${s.title} <span class="timeline">${s.timeline}</span></h3>
            <p>${s.description}</p>
            <ul>${s.deliverables.map(d => `<li>${d}</li>`).join('')}</ul>
        </div>`).join('');
    const pricingHtml = pricing.map(p => `<tr><td>${p.line_item}</td><td>$${p.amount.toLocaleString()}</td></tr>`).join('');
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>${project_title} — Proposal</title>
<style>
  :root { --accent: ${accent_color}; }
  body { font-family: Georgia, serif; background: #fafaf8; color: #1a1a1a; max-width: 860px; margin: 0 auto; padding: 60px 40px; }
  h1, h2 { color: var(--accent); }
  .scope-item { border: 1px solid #ddd; padding: 24px; margin: 16px 0; border-radius: 4px; }
  .timeline { font-size: 0.875rem; background: var(--accent); color: white; padding: 2px 10px; border-radius: 20px; margin-left: 12px; vertical-align: middle; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  td { padding: 12px 16px; border-bottom: 1px solid #eee; }
  .total { font-weight: bold; font-size: 1.25rem; }
</style></head>
<body>
  <h1>${project_title}</h1>
  <p>Prepared for <strong>${client_name}</strong> by ${agency_name}</p>
  <h2>Executive Summary</h2>
  <p>${executive_summary}</p>
  <h2>Scope of Work</h2>
  ${scopeHtml}
  <h2>Investment</h2>
  <table>${pricingHtml}<tr class="total"><td>Total</td><td>$${total.toLocaleString()}</td></tr></table>
</body></html>`;
}

// ─── Brand Guideline ──────────────────────────────────────────────────────────

export interface BrandGuidelineInput {
    brand_name: string;
    tagline: string;
    mission: string;
    values: string[];
    primary_color: string;
    secondary_color: string;
    accent_color: string;
    primary_font: string;
    secondary_font: string;
    tone_of_voice: string[];
}

export function generateBrandGuideline(input: BrandGuidelineInput): string {
    const { brand_name, tagline, mission, values, primary_color, secondary_color, accent_color, primary_font, secondary_font, tone_of_voice } = input;
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>${brand_name} — Brand Guidelines</title>
<link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(primary_font)}:wght@400;700&display=swap" rel="stylesheet">
<style>
  :root { --primary: ${primary_color}; --secondary: ${secondary_color}; --accent: ${accent_color}; }
  body { font-family: '${primary_font}', system-ui; background: var(--secondary); color: var(--accent); margin: 0; }
  section { padding: 80px; border-bottom: 1px solid rgba(255,255,255,0.1); }
  h1 { font-size: 3rem; color: var(--primary); }
  h2 { font-size: 2rem; color: var(--primary); }
  .swatch { display: inline-block; width: 80px; height: 80px; border-radius: 8px; margin: 8px; vertical-align: middle; }
  .color-label { font-size: 0.875rem; opacity: 0.7; display: block; text-align: center; }
  .value-tag { display: inline-block; border: 1px solid var(--primary); color: var(--primary); padding: 6px 18px; border-radius: 20px; margin: 4px; }
</style></head>
<body>
  <section><h1>${brand_name}</h1><p style="font-size:1.5rem;">${tagline}</p></section>
  <section><h2>Mission</h2><p style="font-size:1.25rem;">${mission}</p></section>
  <section><h2>Values</h2>${values.map(v => `<span class="value-tag">${v}</span>`).join('')}</section>
  <section>
    <h2>Color Palette</h2>
    <div><span class="swatch" style="background:${primary_color}"></span><span class="color-label">${primary_color}<br>Primary</span></div>
    <div><span class="swatch" style="background:${secondary_color}"></span><span class="color-label">${secondary_color}<br>Background</span></div>
    <div><span class="swatch" style="background:${accent_color}"></span><span class="color-label">${accent_color}<br>Accent</span></div>
  </section>
  <section><h2>Typography</h2><p><strong>Primary:</strong> ${primary_font} — <strong>Secondary:</strong> ${secondary_font}</p></section>
  <section><h2>Tone of Voice</h2>${tone_of_voice.map(t => `<span class="value-tag">${t}</span>`).join('')}</section>
</body></html>`;
}
