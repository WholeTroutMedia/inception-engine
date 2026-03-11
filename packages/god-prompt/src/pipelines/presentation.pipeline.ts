import { z } from 'zod';

// ─── GOD PROMPT — Presentation Pipeline (Reveal.js Slide Decks) ──────────────
// Generates self-contained Reveal.js HTML presentations from structured data.
// Supports multiple themes, code blocks, images, and speaker notes.

export const SlideSchema = z.object({
    layout: z.enum(['title', 'content', 'code', 'image', 'split', 'quote', 'bullets', 'cta']),
    heading: z.string().optional(),
    subheading: z.string().optional(),
    body: z.string().optional(),
    bullets: z.array(z.string()).optional(),
    code: z.string().optional(),
    code_language: z.string().default('typescript'),
    image_url: z.string().optional(),
    image_caption: z.string().optional(),
    quote_text: z.string().optional(),
    quote_author: z.string().optional(),
    background_color: z.string().optional(),
    speaker_note: z.string().optional(),
    emoji: z.string().optional(),
});

export const PresentationSchema = z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    author: z.string().optional(),
    theme: z.enum(['trichromatic', 'dark', 'minimal', 'brand']).default('trichromatic'),
    accent_color: z.string().default('#b87333'),
    slides: z.array(SlideSchema).min(1).max(40),
    include_progress_bar: z.boolean().default(true),
    transition: z.enum(['slide', 'fade', 'zoom', 'none']).default('slide'),
    auto_animate: z.boolean().default(true),
});

// ─── Theme definitions ────────────────────────────────────────────────────────

function getThemeCSS(theme: string, accent: string): string {
    const themes: Record<string, string> = {
        trichromatic: `--bg:#0a0a0f;--fg:#f5f0e8;--accent:${accent};--mid:rgba(245,240,232,0.6);--code-bg:rgba(255,255,255,0.07);`,
        dark: `--bg:#111;--fg:#eee;--accent:${accent};--mid:#aaa;--code-bg:#1e1e1e;`,
        minimal: `--bg:#fff;--fg:#111;--accent:${accent};--mid:#666;--code-bg:#f5f5f5;`,
        brand: `--bg:${accent};--fg:#fff;--accent:#fff;--mid:rgba(255,255,255,0.8);--code-bg:rgba(0,0,0,0.2);`,
    };
    return themes[theme] ?? themes.trichromatic;
}

// ─── Slide renderers ──────────────────────────────────────────────────────────

function renderSlide(slide: z.infer<typeof SlideSchema>, accent: string): string {
    const bg = slide.background_color ? `data-background-color="${slide.background_color}"` : '';
    const note = slide.speaker_note ? `<aside class="notes">${slide.speaker_note}</aside>` : '';

    const inner: Record<string, string> = {
        title: `<div class="slide-inner title-slide">
      ${slide.emoji ? `<div class="slide-emoji">${slide.emoji}</div>` : ''}
      <div class="accent-line"></div>
      <h1>${slide.heading ?? ''}</h1>
      ${slide.subheading ? `<p class="slide-sub">${slide.subheading}</p>` : ''}
      ${slide.body ? `<p class="slide-caption">${slide.body}</p>` : ''}
    </div>`,

        content: `<div class="slide-inner">
      ${slide.heading ? `<h2>${slide.heading}</h2>` : ''}
      ${slide.body ? `<p class="slide-body">${slide.body}</p>` : ''}
    </div>`,

        bullets: `<div class="slide-inner">
      ${slide.heading ? `<h2>${slide.heading}</h2>` : ''}
      <ul class="slide-bullets">${(slide.bullets ?? []).map(b => `<li>${b}</li>`).join('')}</ul>
    </div>`,

        code: `<div class="slide-inner wide">
      ${slide.heading ? `<h3>${slide.heading}</h3>` : ''}
      <pre><code class="language-${slide.code_language}">${escapeHtml(slide.code ?? '')}</code></pre>
    </div>`,

        quote: `<div class="slide-inner quote-slide">
      <blockquote>${slide.quote_text ?? ''}</blockquote>
      ${slide.quote_author ? `<cite>— ${slide.quote_author}</cite>` : ''}
    </div>`,

        image: `<div class="slide-inner">
      ${slide.heading ? `<h2>${slide.heading}</h2>` : ''}
      ${slide.image_url ? `<img src="${slide.image_url}" alt="${slide.image_caption ?? ''}">` : ''}
      ${slide.image_caption ? `<p class="img-caption">${slide.image_caption}</p>` : ''}
    </div>`,

        split: `<div class="slide-inner split-slide">
      <div class="split-left">${slide.heading ? `<h2>${slide.heading}</h2>` : ''}${slide.body ? `<p>${slide.body}</p>` : ''}</div>
      <div class="split-right">${slide.image_url ? `<img src="${slide.image_url}" alt="">` : (slide.bullets ?? []).map(b => `<p class="bullet">→ ${b}</p>`).join('')}</div>
    </div>`,

        cta: `<div class="slide-inner cta-slide">
      ${slide.emoji ? `<div class="slide-emoji">${slide.emoji}</div>` : ''}
      <h2>${slide.heading ?? ''}</h2>
      ${slide.body ? `<p class="cta-body">${slide.body}</p>` : ''}
      ${slide.subheading ? `<div class="cta-btn">${slide.subheading}</div>` : ''}
    </div>`,
    };

    return `<section ${bg}>${inner[slide.layout] ?? inner.content}${note}</section>`;
}

function escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ─── Main generator ───────────────────────────────────────────────────────────

export function generatePresentation(input: z.infer<typeof PresentationSchema>): string {
    const v = PresentationSchema.parse(input);
    const themeCSS = getThemeCSS(v.theme, v.accent_color);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${v.title}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5/dist/reveal.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5/dist/theme/black.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/highlight.js@11/styles/github-dark.min.css">
  <style>
    :root{${themeCSS}}
    .reveal{font-size:24px}
    .reveal .slides{text-align:left}
    .reveal section{height:100%}
    .slide-inner{position:absolute;bottom:80px;left:80px;right:80px;color:var(--fg)}
    .slide-inner.wide{bottom:60px;top:80px;left:60px;right:60px}
    .accent-line{width:60px;height:4px;background:var(--accent);margin-bottom:28px}
    .reveal h1{font-size:3.2em;font-weight:800;letter-spacing:-2px;color:var(--fg);text-shadow:none}
    .reveal h2{font-size:2em;font-weight:700;letter-spacing:-1px;color:var(--fg);text-shadow:none;margin:0 0 24px}
    .reveal h3{font-size:1.4em;font-weight:700;color:var(--accent);margin-bottom:16px}
    .slide-emoji{font-size:64px;margin-bottom:16px}
    .slide-sub{font-size:1.4em;color:var(--mid);margin-top:12px}
    .slide-caption{font-size:0.9em;color:var(--mid);margin-top:24px;border-top:1px solid rgba(255,255,255,0.1);padding-top:16px}
    .slide-body{font-size:1.1em;color:var(--mid);line-height:1.7;max-width:700px}
    .slide-bullets{list-style:none;margin:0;padding:0;display:grid;gap:14px}
    .slide-bullets li{font-size:1.1em;padding-left:24px;position:relative;color:var(--fg)}
    .slide-bullets li::before{content:'→';position:absolute;left:0;color:var(--accent);font-weight:700}
    blockquote{font-size:1.8em;font-weight:300;font-style:italic;line-height:1.5;color:var(--fg);border:none;padding:0;margin:0 0 24px}
    cite{font-size:0.9em;color:var(--accent);font-style:normal;font-weight:700;letter-spacing:1px}
    .split-slide{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center}
    .cta-slide{text-align:center;left:50%;transform:translateX(-50%);width:80%}
    .cta-body{font-size:1.2em;color:var(--mid);margin:16px 0 32px}
    .cta-btn{display:inline-block;background:var(--accent);color:var(--bg);padding:14px 32px;border-radius:100px;font-weight:700;font-size:1em;letter-spacing:0.5px}
    .img-caption{font-size:0.8em;color:var(--mid);margin-top:8px;text-align:center}
    pre{font-size:0.65em!important}
    .bullet{color:var(--fg);font-size:1em;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.1)}
    ${v.include_progress_bar ? '.reveal .progress{color:var(--accent)}' : ''}
  </style>
</head>
<body>
<div class="reveal">
  <div class="slides">
    ${v.slides.map(s => renderSlide(s, v.accent_color)).join('\n    ')}
  </div>
</div>
<script src="https://cdn.jsdelivr.net/npm/reveal.js@5/dist/reveal.js"></script>
<script src="https://cdn.jsdelivr.net/npm/reveal.js@5/plugin/highlight/highlight.js"></script>
<script src="https://cdn.jsdelivr.net/npm/reveal.js@5/plugin/notes/notes.js"></script>
<script>
  Reveal.initialize({
    hash: true,
    transition: '${v.transition}',
    autoAnimate: ${v.auto_animate},
    progress: ${v.include_progress_bar},
    controls: true,
    slideNumber: 'c/t',
    plugins: [RevealHighlight, RevealNotes],
  });
</script>
</body>
</html>`;
}

export const PRESENTATION_TOOLS = [
    { name: 'godprompt_generate_presentation', description: 'Generate a full Reveal.js HTML presentation from structured slide data. Supports code slides, image slides, quotes, bullet lists, split layouts. Self-contained — works offline after first load.', inputSchema: PresentationSchema, handler: generatePresentation, agentPermissions: ['GOD_PROMPT', 'NOVA', 'ORACLE'], estimatedCost: 'Free' },
];
