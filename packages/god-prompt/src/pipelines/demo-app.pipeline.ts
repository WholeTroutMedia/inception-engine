import { z } from 'zod';
import { ai } from '@inception/genkit';

// ─── GOD PROMPT — Interactive Demo App Pipeline ───────────────────────────────
// Generates a complete, self-contained interactive demo application:
//   - Single-file React app (no build step — served directly)
//   - Brand DNA-driven design (colors, fonts, copy)
//   - Interactive product walkthrough with guided steps
//   - Live chat widget stub (ready to wire to ORACLE/ECHO)
//   - Mobile-responsive, share-ready

const MODEL = 'googleai/gemini-2.5-pro-preview-03-25';

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const DemoAppInputSchema = z.object({
    brand_name: z.string(),
    tagline: z.string(),
    product_description: z.string().describe('2-3 sentence product description'),
    key_features: z.array(z.object({
        title: z.string(),
        description: z.string(),
        icon: z.string().optional().describe('Emoji or SVG icon'),
    })).max(6),
    primary_color: z.string().default('#b87333'),
    secondary_color: z.string().default('#0a0a0f'),
    accent_color: z.string().default('#f5f0e8'),
    cta_text: z.string().default('Get Started Free'),
    cta_url: z.string().url().optional(),
    demo_steps: z.array(z.object({
        step_number: z.number(),
        title: z.string(),
        description: z.string(),
        ui_hint: z.string().optional().describe('What the UI should show or simulate'),
    })).optional().describe('Guided demo steps. Auto-generated if omitted.'),
    include_chat_widget: z.boolean().default(true),
    include_analytics_hook: z.boolean().default(false),
});

export const DemoAppOutputSchema = z.object({
    html: z.string().describe('Complete self-contained demo app HTML'),
    demo_steps: DemoAppInputSchema.shape.demo_steps.unwrap(),
    word_count: z.number(),
    features_count: z.number(),
});

export type DemoAppInput = z.infer<typeof DemoAppInputSchema>;

// ─── Demo Steps Generator ─────────────────────────────────────────────────────

async function generateDemoSteps(input: DemoAppInput): Promise<NonNullable<DemoAppInput['demo_steps']>> {
    if (input.demo_steps?.length) return input.demo_steps;

    const prompt = `Generate 4-5 guided demo steps for ${input.brand_name}.

Product: ${input.product_description}
Features: ${input.key_features.map(f => f.title).join(', ')}

Return ONLY valid JSON array:
[
  { "step_number": 1, "title": "...", "description": "...", "ui_hint": "What the simulated UI shows" },
  ...
]

Each step should feel like a natural product tour. Start with the core value, build to the wow moment.`;

    const response = await ai.generate({ model: MODEL, prompt, config: { temperature: 0.7 } });
    const text = response.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(text) as NonNullable<DemoAppInput['demo_steps']>;
}

// ─── App Generator ────────────────────────────────────────────────────────────

async function generateDemoAppHtml(input: DemoAppInput, steps: NonNullable<DemoAppInput['demo_steps']>): Promise<string> {
    const featureCards = input.key_features.map(f => `
        <div class="feature-card">
          <div class="feature-icon">${f.icon ?? '✦'}</div>
          <div class="feature-title">${f.title}</div>
          <div class="feature-desc">${f.description}</div>
        </div>`).join('');

    const stepItems = steps.map(s => `
        <div class="step-item" data-step="${s.step_number}">
          <div class="step-num">${String(s.step_number).padStart(2, '0')}</div>
          <div class="step-content">
            <div class="step-title">${s.title}</div>
            <div class="step-desc">${s.description}</div>
            ${s.ui_hint ? `<div class="step-hint">${s.ui_hint}</div>` : ''}
          </div>
        </div>`).join('');

    const chatWidget = input.include_chat_widget ? `
    <div id="chat-bubble" onclick="toggleChat()" title="Chat with us">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    </div>
    <div id="chat-panel">
      <div class="chat-header">
        <span>Ask us anything</span>
        <button onclick="toggleChat()" style="background:none;border:none;color:inherit;cursor:pointer;font-size:18px">×</button>
      </div>
      <div class="chat-messages" id="chatMessages">
        <div class="chat-msg agent">👋 Hi! I'm your ${input.brand_name} guide. What would you like to know?</div>
      </div>
      <div class="chat-input-row">
        <input id="chatInput" placeholder="Ask a question..." onkeydown="if(event.key==='Enter')sendChat()">
        <button onclick="sendChat()">→</button>
      </div>
    </div>` : '';

    const analyticsHook = input.include_analytics_hook ? `
    // Analytics hook — wire to your analytics provider
    function track(event, props) {
      console.log('[DEMO ANALYTICS]', event, props);
      // window.gtag('event', event, props);
      // window.analytics.track(event, props);
    }
    document.querySelectorAll('[data-track]').forEach(el => {
      el.addEventListener('click', () => track(el.dataset.track, { brand: '${input.brand_name}' }));
    });` : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${input.brand_name} — Interactive Demo</title>
  <meta name="description" content="${input.tagline}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --primary: ${input.primary_color};
      --dark: ${input.secondary_color};
      --cream: ${input.accent_color};
      --mid: rgba(245,240,232,0.6);
    }
    html { scroll-behavior: smooth; }
    body { font-family: 'Inter', -apple-system, sans-serif; background: var(--dark); color: var(--cream); overflow-x: hidden; }

    /* ── Navigation ── */
    nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; padding: 20px 40px; display: flex; justify-content: space-between; align-items: center; background: rgba(10,10,15,0.8); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(245,240,232,0.08); }
    .nav-brand { font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
    .nav-brand span { color: var(--primary); }
    .nav-cta { background: var(--primary); color: var(--dark); padding: 10px 24px; border-radius: 100px; font-size: 14px; font-weight: 700; text-decoration: none; transition: transform 0.15s, box-shadow 0.15s; }
    .nav-cta:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(184,115,51,0.4); }

    /* ── Hero ── */
    .hero { min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 120px 40px 80px; position: relative; overflow: hidden; }
    .hero::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse 80% 60% at 50% 0%, rgba(184,115,51,0.15), transparent); pointer-events: none; }
    .hero-eyebrow { font-size: 12px; letter-spacing: 4px; text-transform: uppercase; color: var(--primary); font-weight: 700; margin-bottom: 24px; }
    .hero-title { font-size: clamp(48px, 8vw, 96px); font-weight: 900; letter-spacing: -4px; line-height: 0.95; max-width: 900px; }
    .hero-title span { color: var(--primary); }
    .hero-sub { font-size: 20px; color: var(--mid); margin-top: 24px; max-width: 600px; line-height: 1.6; }
    .hero-actions { display: flex; gap: 16px; margin-top: 48px; flex-wrap: wrap; justify-content: center; }
    .btn-primary { background: var(--primary); color: var(--dark); padding: 16px 40px; border-radius: 100px; font-size: 16px; font-weight: 700; text-decoration: none; transition: all 0.2s; border: none; cursor: pointer; }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 16px 40px rgba(184,115,51,0.35); }
    .btn-ghost { background: transparent; color: var(--cream); padding: 16px 40px; border-radius: 100px; font-size: 16px; font-weight: 600; text-decoration: none; border: 1px solid rgba(245,240,232,0.2); transition: all 0.2s; cursor: pointer; }
    .btn-ghost:hover { border-color: var(--primary); color: var(--primary); }

    /* ── Stats Bar ── */
    .stats-bar { display: flex; justify-content: center; gap: 64px; padding: 48px 40px; border-top: 1px solid rgba(245,240,232,0.08); border-bottom: 1px solid rgba(245,240,232,0.08); flex-wrap: wrap; }
    .stat { text-align: center; }
    .stat-val { font-size: 40px; font-weight: 900; letter-spacing: -2px; color: var(--primary); }
    .stat-label { font-size: 13px; color: var(--mid); margin-top: 4px; letter-spacing: 1px; text-transform: uppercase; }

    /* ── Features ── */
    .section { padding: 96px 40px; max-width: 1200px; margin: 0 auto; }
    .section-label { font-size: 12px; letter-spacing: 4px; text-transform: uppercase; color: var(--primary); font-weight: 700; margin-bottom: 16px; text-align: center; }
    .section-title { font-size: 48px; font-weight: 800; letter-spacing: -2px; text-align: center; margin-bottom: 64px; }
    .features-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px; }
    .feature-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(245,240,232,0.08); border-radius: 16px; padding: 32px; transition: all 0.2s; }
    .feature-card:hover { transform: translateY(-4px); border-color: var(--primary); background: rgba(184,115,51,0.06); }
    .feature-icon { font-size: 32px; margin-bottom: 16px; }
    .feature-title { font-size: 18px; font-weight: 700; margin-bottom: 8px; }
    .feature-desc { font-size: 14px; color: var(--mid); line-height: 1.6; }

    /* ── Demo Steps ── */
    .demo-section { background: rgba(255,255,255,0.02); border-top: 1px solid rgba(245,240,232,0.06); border-bottom: 1px solid rgba(245,240,232,0.06); }
    .steps-container { display: flex; gap: 40px; align-items: flex-start; flex-wrap: wrap; }
    .steps-list { flex: 1; min-width: 300px; display: flex; flex-direction: column; gap: 4px; }
    .step-item { display: flex; gap: 20px; padding: 20px; border-radius: 12px; cursor: pointer; transition: all 0.2s; border: 1px solid transparent; }
    .step-item:hover, .step-item.active { background: rgba(184,115,51,0.08); border-color: var(--primary); }
    .step-num { font-size: 13px; font-weight: 800; color: var(--primary); letter-spacing: 1px; padding-top: 2px; min-width: 28px; }
    .step-title { font-size: 16px; font-weight: 700; margin-bottom: 6px; }
    .step-desc { font-size: 14px; color: var(--mid); line-height: 1.5; }
    .step-hint { font-size: 12px; color: var(--primary); margin-top: 8px; font-style: italic; }
    .demo-preview { flex: 1.2; min-width: 320px; background: rgba(255,255,255,0.04); border: 1px solid rgba(245,240,232,0.1); border-radius: 20px; padding: 40px; min-height: 400px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; transition: all 0.3s; }
    .preview-icon { font-size: 64px; margin-bottom: 24px; }
    .preview-title { font-size: 24px; font-weight: 700; margin-bottom: 12px; }
    .preview-desc { font-size: 16px; color: var(--mid); max-width: 360px; line-height: 1.6; }

    /* ── CTA Section ── */
    .cta-section { text-align: center; padding: 120px 40px; background: radial-gradient(ellipse 60% 80% at 50% 100%, rgba(184,115,51,0.12), transparent); }
    .cta-title { font-size: clamp(40px, 6vw, 72px); font-weight: 900; letter-spacing: -3px; margin-bottom: 24px; }
    .cta-sub { font-size: 20px; color: var(--mid); margin-bottom: 48px; }

    /* ── Chat Widget ── */
    #chat-bubble { position: fixed; bottom: 32px; right: 32px; width: 56px; height: 56px; background: var(--primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 8px 24px rgba(184,115,51,0.4); z-index: 200; transition: transform 0.2s; color: var(--dark); }
    #chat-bubble:hover { transform: scale(1.1); }
    #chat-panel { position: fixed; bottom: 104px; right: 32px; width: 360px; background: #1a1a25; border: 1px solid rgba(245,240,232,0.12); border-radius: 16px; overflow: hidden; z-index: 200; transform: scale(0.9); opacity: 0; pointer-events: none; transition: all 0.2s; transform-origin: bottom right; }
    #chat-panel.open { transform: scale(1); opacity: 1; pointer-events: all; }
    .chat-header { background: var(--primary); color: var(--dark); padding: 16px 20px; font-weight: 700; display: flex; justify-content: space-between; align-items: center; }
    .chat-messages { padding: 16px; height: 280px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; }
    .chat-msg { padding: 12px 16px; border-radius: 12px; font-size: 14px; max-width: 85%; line-height: 1.5; }
    .chat-msg.agent { background: rgba(255,255,255,0.06); align-self: flex-start; }
    .chat-msg.user { background: var(--primary); color: var(--dark); align-self: flex-end; font-weight: 600; }
    .chat-input-row { display: flex; gap: 8px; padding: 12px 16px; border-top: 1px solid rgba(255,255,255,0.08); }
    .chat-input-row input { flex: 1; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 10px 14px; color: var(--cream); font-size: 14px; outline: none; }
    .chat-input-row input:focus { border-color: var(--primary); }
    .chat-input-row button { background: var(--primary); color: var(--dark); border: none; border-radius: 8px; padding: 10px 16px; font-weight: 700; cursor: pointer; }

    @media (max-width: 768px) {
      .hero-title { letter-spacing: -2px; }
      .stats-bar { gap: 32px; }
      nav { padding: 16px 20px; }
      .section { padding: 64px 20px; }
      #chat-panel { width: calc(100vw - 40px); right: 20px; }
    }
  </style>
</head>
<body>

  <!-- Navigation -->
  <nav>
    <div class="nav-brand">${input.brand_name.split('').map((c, i) => i === 0 ? `<span>${c}</span>` : c).join('')}</div>
    <a href="${input.cta_url ?? '#cta'}" class="nav-cta" data-track="nav_cta">${input.cta_text}</a>
  </nav>

  <!-- Hero -->
  <section class="hero">
    <div class="hero-eyebrow">Interactive Demo</div>
    <h1 class="hero-title">${input.brand_name.replace(/(\w+)/, '<span>$1</span>')}</h1>
    <p class="hero-sub">${input.tagline}</p>
    <div class="hero-actions">
      <a href="${input.cta_url ?? '#demo'}" class="btn-primary" data-track="hero_cta">${input.cta_text}</a>
      <a href="#demo" class="btn-ghost">Watch Demo</a>
    </div>
  </section>

  <!-- Stats -->
  <div class="stats-bar">
    <div class="stat"><div class="stat-val">${input.key_features.length}</div><div class="stat-label">Core Features</div></div>
    <div class="stat"><div class="stat-val">∞</div><div class="stat-label">Possibilities</div></div>
    <div class="stat"><div class="stat-val">0</div><div class="stat-label">Code Required</div></div>
    <div class="stat"><div class="stat-val">24/7</div><div class="stat-label">Always On</div></div>
  </div>

  <!-- Features -->
  <div class="section">
    <p class="section-label">What's Inside</p>
    <h2 class="section-title">Everything you need</h2>
    <div class="features-grid">
      ${featureCards}
    </div>
  </div>

  <!-- Interactive Demo Steps -->
  <div class="demo-section" id="demo">
    <div class="section">
      <p class="section-label">Product Tour</p>
      <h2 class="section-title">See it in action</h2>
      <div class="steps-container">
        <div class="steps-list">
          ${stepItems}
        </div>
        <div class="demo-preview" id="demoPreview">
          <div class="preview-icon" id="previewIcon">🚀</div>
          <div class="preview-title" id="previewTitle">Click a step to begin</div>
          <div class="preview-desc" id="previewDesc">${input.product_description}</div>
        </div>
      </div>
    </div>
  </div>

  <!-- CTA -->
  <div class="cta-section" id="cta">
    <h2 class="cta-title">Ready to get started?</h2>
    <p class="cta-sub">${input.tagline}</p>
    <a href="${input.cta_url ?? '#'}" class="btn-primary" style="font-size:18px;padding:20px 48px" data-track="footer_cta">${input.cta_text}</a>
  </div>

  ${chatWidget}

  <script>
    // ── Demo Steps Interaction ──
    const steps = ${JSON.stringify(steps)};
    const stepEls = document.querySelectorAll('.step-item');
    const icons = ${JSON.stringify(input.key_features.map(f => f.icon ?? '✦'))};

    stepEls.forEach((el, i) => {
      el.addEventListener('click', () => {
        stepEls.forEach(s => s.classList.remove('active'));
        el.classList.add('active');
        const step = steps[i];
        if (step) {
          document.getElementById('previewIcon').textContent = icons[i] ?? '🎯';
          document.getElementById('previewTitle').textContent = step.title;
          document.getElementById('previewDesc').textContent = step.ui_hint ?? step.description;
        }
      });
    });

    // Auto-play demo on scroll into view
    const demoSection = document.getElementById('demo');
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !window._demoStarted) {
        window._demoStarted = true;
        let i = 0;
        const cycle = () => {
          if (i < stepEls.length) { stepEls[i].click(); i++; setTimeout(cycle, 3200); }
        };
        setTimeout(cycle, 800);
      }
    }, { threshold: 0.3 });
    observer.observe(demoSection);

    // ── Chat Widget ──
    function toggleChat() {
      document.getElementById('chat-panel').classList.toggle('open');
    }

    const chatResponses = [
      "Great question! ${input.brand_name} is designed to make that effortless.",
      "Absolutely — that's one of our most popular features.",
      "You can set that up in under 2 minutes. Want me to walk you through it?",
      "Our team would love to give you a personalized demo. Ready to jump on a call?",
      "That's exactly what ${input.brand_name} was built to solve.",
    ];

    function sendChat() {
      const input_el = document.getElementById('chatInput');
      const msg = input_el.value.trim();
      if (!msg) return;
      const msgs = document.getElementById('chatMessages');
      msgs.innerHTML += \`<div class="chat-msg user">\${msg}</div>\`;
      input_el.value = '';
      setTimeout(() => {
        const reply = chatResponses[Math.floor(Math.random() * chatResponses.length)];
        msgs.innerHTML += \`<div class="chat-msg agent">\${reply}</div>\`;
        msgs.scrollTop = msgs.scrollHeight;
      }, 800);
      msgs.scrollTop = msgs.scrollHeight;
    }

    ${analyticsHook}
  </script>
</body>
</html>`;
}

// ─── Main Flow ────────────────────────────────────────────────────────────────

export const demoAppFlow = ai.defineFlow(
    {
        name: 'demoApp',
        inputSchema: DemoAppInputSchema,
        outputSchema: DemoAppOutputSchema,
    },
    async (input) => {
        console.log(`\n🖥  DEMO APP — Building for ${input.brand_name}`);

        const steps = await generateDemoSteps(input);
        console.log(`  ✅ ${steps.length} demo steps generated`);

        const html = await generateDemoAppHtml(input, steps);
        console.log(`  ✅ Demo app built: ${html.split(' ').length} words`);

        return {
            html,
            demo_steps: steps,
            word_count: html.split(/\s+/).length,
            features_count: input.key_features.length,
        };
    }
);

export const DEMO_APP_TOOLS = [
    {
        name: 'godprompt_generate_demo_app',
        description: 'Generate a complete self-contained interactive demo web app. Brand-driven design, guided product tour steps, live chat widget, mobile-responsive. Returns a single HTML file — deployable anywhere instantly.',
        inputSchema: DemoAppInputSchema,
        handler: (input: DemoAppInput) => demoAppFlow(input),
        agentPermissions: ['BOLT', 'GOD_PROMPT', 'ATLAS'],
        estimatedCost: 'Free (AI generation only)',
    },
];
