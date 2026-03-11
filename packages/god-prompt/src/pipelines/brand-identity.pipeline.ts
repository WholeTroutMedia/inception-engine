import { z } from 'zod';

// ─── GOD PROMPT — Full Brand Identity Kit Generator ──────────────────────────
// Generates a complete brand identity system from a single brand brief:
// name, logo concepts (SVG), color palette, typography sheet, and voice guide.

export const BrandBriefSchema = z.object({
  brand_name: z.string(),
  industry: z.string().describe('e.g. "Creative Agency", "Tech Startup", "Wellness Brand"'),
  target_audience: z.string(),
  personality_words: z.array(z.string()).min(3).max(6).describe('Brand adjectives, e.g. ["bold", "minimal", "innovative"]'),
  primary_color: z.string().default('#b87333').describe('Hex color code'),
  secondary_color: z.string().default('#0a0a0f'),
  accent_color: z.string().default('#f5f0e8'),
  logo_style: z.enum(['wordmark', 'lettermark', 'abstract', 'geometric', 'emblem']).default('wordmark'),
  mission: z.string().describe('One sentence mission statement'),
  tagline: z.string().optional(),
});

export interface BrandIdentityKit {
  brand_name: string;
  logo_svg: string;
  color_palette: { primary: string; secondary: string; accent: string; description: string };
  typography: { primary_font: string; secondary_font: string; usage_note: string };
  voice_guide: { tone_words: string[]; do_say: string[]; dont_say: string[] };
  style_guide_html: string;
  generated_at: string;
}

// ─── SVG Logo generators ──────────────────────────────────────────────────────

function generateWordmarkSvg(name: string, primary: string, secondary: string): string {
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 100" width="400" height="100">
  <rect width="400" height="100" fill="${secondary}"/>
  <rect x="0" y="0" width="4" height="100" fill="${primary}"/>
  <text x="24" y="68" font-family="'Helvetica Neue',Arial,sans-serif" font-size="52" font-weight="800" fill="${primary}" letter-spacing="-2">${name.toUpperCase()}</text>
  <rect x="24" y="80" width="${name.length * 24}" height="2" fill="${primary}" opacity="0.4"/>
</svg>`;
}

function generateLettermarkSvg(name: string, primary: string, secondary: string): string {
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <rect width="100" height="100" rx="12" fill="${secondary}"/>
  <text x="50" y="68" font-family="'Helvetica Neue',Arial,sans-serif" font-size="${initials.length === 1 ? 56 : 44}" font-weight="900" fill="${primary}" text-anchor="middle" letter-spacing="-2">${initials}</text>
</svg>`;
}

function generateGeometricSvg(name: string, primary: string, secondary: string): string {
  const initials = name[0]?.toUpperCase() ?? 'B';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <polygon points="60,8 112,90 8,90" fill="${secondary}" stroke="${primary}" stroke-width="3"/>
  <polygon points="60,28 95,84 25,84" fill="none" stroke="${primary}" stroke-width="1.5" opacity="0.4"/>
  <text x="60" y="76" font-family="'Helvetica Neue',Arial,sans-serif" font-size="28" font-weight="900" fill="${primary}" text-anchor="middle">${initials}</text>
</svg>`;
}

function generateAbstractSvg(_name: string, primary: string, secondary: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <rect width="100" height="100" rx="8" fill="${secondary}"/>
  <circle cx="38" cy="50" r="22" fill="none" stroke="${primary}" stroke-width="6"/>
  <circle cx="62" cy="50" r="22" fill="none" stroke="${primary}" stroke-width="6" opacity="0.6"/>
  <rect x="38" y="28" width="24" height="44" fill="${secondary}"/>
  <ellipse cx="50" cy="50" rx="12" ry="22" fill="${primary}" opacity="0.9"/>
</svg>`;
}

function generateEmblemSvg(name: string, primary: string, secondary: string): string {
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <circle cx="60" cy="60" r="56" fill="${secondary}" stroke="${primary}" stroke-width="3"/>
  <circle cx="60" cy="60" r="48" fill="none" stroke="${primary}" stroke-width="1" opacity="0.4"/>
  <text x="60" y="72" font-family="'Helvetica Neue',Arial,sans-serif" font-size="36" font-weight="900" fill="${primary}" text-anchor="middle">${initials}</text>
  <text x="60" y="92" font-family="'Helvetica Neue',Arial,sans-serif" font-size="8" font-weight="600" fill="${primary}" text-anchor="middle" letter-spacing="3" text-transform="uppercase">${name.toUpperCase().slice(0, 12)}</text>
</svg>`;
}

function generateLogo(style: string, name: string, primary: string, secondary: string): string {
  switch (style) {
    case 'lettermark': return generateLettermarkSvg(name, primary, secondary);
    case 'geometric': return generateGeometricSvg(name, primary, secondary);
    case 'abstract': return generateAbstractSvg(name, primary, secondary);
    case 'emblem': return generateEmblemSvg(name, primary, secondary);
    default: return generateWordmarkSvg(name, primary, secondary);
  }
}

// ─── Voice guide builder ──────────────────────────────────────────────────────

function buildVoiceGuide(brand: z.infer<typeof BrandBriefSchema>): BrandIdentityKit['voice_guide'] {
  const p = brand.personality_words;
  const isBold = p.some(w => ['bold', 'confident', 'assertive', 'powerful'].includes(w.toLowerCase()));
  const isWarm = p.some(w => ['warm', 'friendly', 'approachable', 'playful'].includes(w.toLowerCase()));
  const isMinimal = p.some(w => ['minimal', 'clean', 'precise', 'refined'].includes(w.toLowerCase()));

  const doSay = [
    isBold ? "Make strong statements without hedging" : "Speak clearly and directly",
    isWarm ? "Use inclusive, welcoming language" : "Maintain professional clarity",
    isMinimal ? "Say more with less — cut every unnecessary word" : "Be thorough and detailed when needed",
    "Back claims with specifics, not vague superlatives",
  ];

  const dontSay = [
    "Avoid jargon that alienates non-experts",
    isBold ? "Never be passive or overly deferential" : "Avoid aggressive or pushy language",
    isMinimal ? "Don't pad copy to fill space" : "Don't be so brief you lose warmth",
    "Never make promises you can't keep",
  ];

  return { tone_words: p, do_say: doSay, dont_say: dontSay };
}

// ─── Style guide HTML ─────────────────────────────────────────────────────────

function buildStyleGuideHtml(v: z.infer<typeof BrandBriefSchema>, logo: string, voice: BrandIdentityKit['voice_guide']): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${v.brand_name} — Identity Kit</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800&display=swap">
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Inter',sans-serif;background:#fff;color:#1a1a1a}
.cover{background:${v.secondary_color};color:${v.accent_color};padding:80px;min-height:60vh;display:flex;flex-direction:column;justify-content:flex-end}
.cover-sub{font-size:12px;letter-spacing:4px;text-transform:uppercase;color:${v.primary_color};margin-bottom:16px}
.cover-title{font-size:clamp(48px,8vw,96px);font-weight:800;letter-spacing:-3px}
.cover-tagline{font-size:20px;opacity:.6;margin-top:12px}
.section{padding:64px 80px;border-bottom:1px solid #f0f0f0}
.section-label{font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:${v.primary_color};margin-bottom:24px}
.section-title{font-size:32px;font-weight:700;margin-bottom:24px}
.logo-row{display:flex;gap:32px;flex-wrap:wrap;align-items:center}
.logo-variant{padding:24px;border-radius:8px;text-align:center}
.swatch-row{display:flex;gap:20px;flex-wrap:wrap}
.swatch{width:140px}.swatch-block{height:120px;border-radius:8px;margin-bottom:10px}
.swatch-name{font-weight:700;font-size:14px}.swatch-hex{font-size:12px;color:#999;font-family:monospace}
.type-row{margin-bottom:32px}
.type-label{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#999;margin-bottom:8px}
.voice-grid{display:grid;grid-template-columns:1fr 1fr;gap:32px}
.do-item{background:#d4edda;padding:12px 16px;border-radius:6px;font-size:14px;margin-bottom:8px}
.dont-item{background:#f8d7da;padding:12px 16px;border-radius:6px;font-size:14px;margin-bottom:8px}
.tag{display:inline-block;background:${v.secondary_color};color:${v.primary_color};padding:8px 18px;border-radius:100px;font-weight:700;font-size:14px;margin:4px}
</style></head><body>
<div class="cover">
  <div class="cover-sub">Brand Identity System</div>
  <div class="cover-title">${v.brand_name}</div>
  ${v.tagline ? `<div class="cover-tagline">${v.tagline}</div>` : ''}
</div>
<div class="section">
  <p class="section-label">Brand Mark</p>
  <h2 class="section-title">Logo System</h2>
  <div class="logo-row">
    <div class="logo-variant" style="background:${v.secondary_color}">${logo}</div>
    <div class="logo-variant" style="background:#fff;border:1px solid #f0f0f0">${logo}</div>
  </div>
</div>
<div class="section">
  <p class="section-label">Colour Palette</p>
  <h2 class="section-title">Colours</h2>
  <div class="swatch-row">
    <div class="swatch"><div class="swatch-block" style="background:${v.primary_color}"></div><div class="swatch-name">Primary</div><div class="swatch-hex">${v.primary_color}</div></div>
    <div class="swatch"><div class="swatch-block" style="background:${v.secondary_color}"></div><div class="swatch-name">Secondary</div><div class="swatch-hex">${v.secondary_color}</div></div>
    <div class="swatch"><div class="swatch-block" style="background:${v.accent_color};border:1px solid #e0e0e0"></div><div class="swatch-name">Accent</div><div class="swatch-hex">${v.accent_color}</div></div>
  </div>
</div>
<div class="section">
  <p class="section-label">Typography</p>
  <h2 class="section-title">Type Scale</h2>
  <div class="type-row"><div class="type-label">Display / 800</div><div style="font-size:48px;font-weight:800;letter-spacing:-2px">${v.brand_name}</div></div>
  <div class="type-row"><div class="type-label">Heading / 700</div><div style="font-size:32px;font-weight:700">${v.tagline ?? v.mission}</div></div>
  <div class="type-row"><div class="type-label">Body / 400</div><div style="font-size:16px;line-height:1.7;max-width:600px">${v.mission}</div></div>
</div>
<div class="section">
  <p class="section-label">Brand Personality</p>
  <h2 class="section-title">Voice & Tone</h2>
  <div style="margin-bottom:24px">${voice.tone_words.map(w => `<span class="tag">${w}</span>`).join('')}</div>
  <div class="voice-grid">
    <div><div style="font-size:12px;font-weight:700;letter-spacing:2px;color:#28a745;margin-bottom:12px">✅ DO SAY</div>${voice.do_say.map(d => `<div class="do-item">${d}</div>`).join('')}</div>
    <div><div style="font-size:12px;font-weight:700;letter-spacing:2px;color:#dc3545;margin-bottom:12px">❌ DON'T SAY</div>${voice.dont_say.map(d => `<div class="dont-item">${d}</div>`).join('')}</div>
  </div>
</div>
</body></html>`;
}

// ─── Main generator ───────────────────────────────────────────────────────────

export function generateBrandIdentityKit(input: z.infer<typeof BrandBriefSchema>): BrandIdentityKit {
  const v = BrandBriefSchema.parse(input);
  const logo_svg = generateLogo(v.logo_style, v.brand_name, v.primary_color, v.secondary_color);
  const voice_guide = buildVoiceGuide(v);
  const style_guide_html = buildStyleGuideHtml(v, logo_svg, voice_guide);

  return {
    brand_name: v.brand_name,
    logo_svg,
    color_palette: { primary: v.primary_color, secondary: v.secondary_color, accent: v.accent_color, description: `${v.brand_name} custom palette` },
    typography: { primary_font: 'Inter', secondary_font: 'Georgia', usage_note: 'Inter for all UI and headlines, Georgia for long-form editorial content.' },
    voice_guide,
    style_guide_html,
    generated_at: new Date().toISOString(),
  };
}

export const BRAND_IDENTITY_TOOLS = [
  { name: 'godprompt_generate_brand_identity', description: 'Generate a complete brand identity kit: SVG logo, color palette, typography, voice guide, and HTML style guide — from a single brand brief.', inputSchema: BrandBriefSchema, handler: generateBrandIdentityKit, agentPermissions: ['GOD_PROMPT', 'NOVA', 'ORACLE'], estimatedCost: 'Free' },
];
