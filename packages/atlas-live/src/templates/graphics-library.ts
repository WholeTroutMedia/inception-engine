// ─── ATLAS LIVE — CasparCG HTML Graphics Template Library ────────────────────
// Production-ready HTML/CSS/JS templates for broadcast graphics.
// Deploy to CasparCG server's template folder and call via atlas_caspar_play.

// ─── Lower Third ──────────────────────────────────────────────────────────────

export const LOWER_THIRD_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Lower Third</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: transparent; width: 1920px; height: 1080px; overflow: hidden; font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif; }

    #lower-third {
      position: absolute;
      bottom: 120px;
      left: 80px;
      display: flex;
      flex-direction: column;
      transform: translateX(-120%);
      transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
    }

    #lower-third.animate-in { transform: translateX(0); }
    #lower-third.animate-out { transform: translateX(-120%); transition: transform 0.4s ease-in; }

    .accent-bar {
      width: 0;
      height: 4px;
      background: #b87333;
      transition: width 0.4s ease 0.3s;
    }
    #lower-third.animate-in .accent-bar { width: 100%; }

    .name-plate {
      background: rgba(10, 10, 15, 0.92);
      backdrop-filter: blur(8px);
      padding: 16px 28px 14px;
      margin-top: 2px;
    }

    #f0 {
      font-size: 42px;
      font-weight: 700;
      color: #f5f0e8;
      letter-spacing: -0.5px;
      line-height: 1.1;
      white-space: nowrap;
    }

    #f1 {
      font-size: 24px;
      font-weight: 400;
      color: #b87333;
      letter-spacing: 0.5px;
      margin-top: 4px;
      white-space: nowrap;
    }
  </style>
</head>
<body>
  <div id="lower-third">
    <div class="accent-bar"></div>
    <div class="name-plate">
      <div id="f0">Name</div>
      <div id="f1">Title / Role</div>
    </div>
  </div>

  <script>
    function update(data) {
      const parsed = data?.componentData ?? [];
      parsed.forEach(item => {
        const el = document.getElementById(item.id);
        if (el) el.textContent = item.data?.value ?? '';
      });
    }

    function play() {
      document.getElementById('lower-third').classList.add('animate-in');
    }

    function stop() {
      const el = document.getElementById('lower-third');
      el.classList.remove('animate-in');
      el.classList.add('animate-out');
    }

    function next() { stop(); }
  </script>
</body>
</html>`;

// ─── Scoreboard ───────────────────────────────────────────────────────────────

export const SCOREBOARD_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Scoreboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: transparent; width: 1920px; height: 1080px; font-family: 'Inter', Arial, sans-serif; }

    #scoreboard {
      position: absolute;
      top: 40px;
      left: 50%;
      transform: translateX(-50%) translateY(-200px);
      transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
      display: flex;
      align-items: center;
      gap: 2px;
      min-width: 500px;
    }

    #scoreboard.animate-in { transform: translateX(-50%) translateY(0); }
    #scoreboard.animate-out { transform: translateX(-50%) translateY(-200px); transition: transform 0.3s ease-in; }

    .team-block {
      background: rgba(10, 10, 15, 0.92);
      backdrop-filter: blur(8px);
      padding: 14px 24px;
      display: flex;
      align-items: center;
      gap: 16px;
      flex: 1;
    }

    .team-name {
      font-size: 28px;
      font-weight: 700;
      color: #f5f0e8;
      letter-spacing: 1px;
      text-transform: uppercase;
    }

    .score {
      font-size: 52px;
      font-weight: 800;
      color: #f5f0e8;
      font-variant-numeric: tabular-nums;
      min-width: 60px;
      text-align: center;
    }

    .divider {
      background: #b87333;
      width: 4px;
      height: 80px;
    }

    .period-block {
      background: #b87333;
      padding: 8px 16px;
      text-align: center;
    }

    #f4 { font-size: 14px; color: rgba(245,240,232,0.8); font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
    #f5 { font-size: 28px; font-weight: 700; color: #f5f0e8; margin-top: 2px; }

    .score-bump {
      animation: scoreBump 0.5s ease;
    }

    @keyframes scoreBump {
      0% { transform: scale(1); }
      40% { transform: scale(1.3); color: #b87333; }
      100% { transform: scale(1); }
    }
  </style>
</head>
<body>
  <div id="scoreboard">
    <div class="team-block" style="justify-content: flex-end;">
      <div class="team-name" id="f0">HOME</div>
      <div class="score" id="f1">0</div>
    </div>
    <div class="divider"></div>
    <div class="period-block">
      <div id="f4">PERIOD</div>
      <div id="f5">1</div>
    </div>
    <div class="divider"></div>
    <div class="team-block">
      <div class="score" id="f2">0</div>
      <div class="team-name" id="f3">AWAY</div>
    </div>
  </div>

  <script>
    function update(data) {
      const parsed = data?.componentData ?? [];
      parsed.forEach(item => {
        const el = document.getElementById(item.id);
        if (el) {
          const oldVal = el.textContent;
          const newVal = item.data?.value ?? '';
          if (oldVal !== newVal && (item.id === 'f1' || item.id === 'f2')) {
            el.classList.remove('score-bump');
            void el.offsetWidth;
            el.classList.add('score-bump');
          }
          el.textContent = newVal;
        }
      });
    }

    function play() { document.getElementById('scoreboard').classList.add('animate-in'); }
    function stop() {
      const el = document.getElementById('scoreboard');
      el.classList.remove('animate-in');
      el.classList.add('animate-out');
    }
    function next() { stop(); }
  </script>
</body>
</html>`;

// ─── Ticker / Crawl ───────────────────────────────────────────────────────────

export const TICKER_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>News Ticker</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: transparent; width: 1920px; height: 1080px; font-family: 'Inter', Arial, sans-serif; overflow: hidden; }

    #ticker-bar {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 56px;
      display: flex;
      transform: translateY(100%);
      transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
    }

    #ticker-bar.animate-in { transform: translateY(0); }
    #ticker-bar.animate-out { transform: translateY(100%); transition: transform 0.3s ease-in; }

    .ticker-label {
      background: #b87333;
      padding: 0 24px;
      display: flex;
      align-items: center;
      white-space: nowrap;
      font-size: 20px;
      font-weight: 800;
      color: #f5f0e8;
      letter-spacing: 1px;
      text-transform: uppercase;
      flex-shrink: 0;
      z-index: 2;
    }

    .ticker-scroll-wrap {
      flex: 1;
      background: rgba(10, 10, 15, 0.92);
      overflow: hidden;
      display: flex;
      align-items: center;
    }

    .ticker-content {
      white-space: nowrap;
      font-size: 22px;
      color: #f5f0e8;
      font-weight: 400;
      letter-spacing: 0.3px;
    }

    .ticker-content.scrolling {
      animation: tickerScroll linear infinite;
    }

    @keyframes tickerScroll {
      from { transform: translateX(1920px); }
      to { transform: translateX(-100%); }
    }
  </style>
</head>
<body>
  <div id="ticker-bar">
    <div class="ticker-label" id="f0">BREAKING</div>
    <div class="ticker-scroll-wrap">
      <div class="ticker-content" id="f1">Ticker text goes here &bull; More news here &bull; And more here &bull;</div>
    </div>
  </div>

  <script>
    let scrollDuration = 20;

    function update(data) {
      const parsed = data?.componentData ?? [];
      parsed.forEach(item => {
        const el = document.getElementById(item.id);
        if (el) el.textContent = item.data?.value ?? '';
      });
      startScroll();
    }

    function startScroll() {
      const el = document.getElementById('f1');
      const textLen = el.textContent.length;
      scrollDuration = Math.max(10, textLen * 0.12);
      el.style.animationDuration = scrollDuration + 's';
      el.classList.remove('scrolling');
      void el.offsetWidth;
      el.classList.add('scrolling');
    }

    function play() {
      document.getElementById('ticker-bar').classList.add('animate-in');
      setTimeout(startScroll, 400);
    }

    function stop() {
      const el = document.getElementById('ticker-bar');
      el.classList.remove('animate-in');
      el.classList.add('animate-out');
    }

    function next() { stop(); }
  </script>
</body>
</html>`;

// ─── Full Screen Headline ─────────────────────────────────────────────────────

export const HEADLINE_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Headline Card</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: transparent; width: 1920px; height: 1080px; font-family: 'Inter', Arial, sans-serif; display: flex; align-items: center; justify-content: flex-start; }

    #headline-card {
      margin-left: 120px;
      max-width: 1000px;
      opacity: 0;
      transform: translateY(30px);
      transition: opacity 0.6s ease, transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
    }

    #headline-card.animate-in { opacity: 1; transform: translateY(0); }
    #headline-card.animate-out { opacity: 0; transform: translateY(-20px); transition: opacity 0.3s, transform: 0.3s; }

    .eyebrow {
      font-size: 18px;
      font-weight: 700;
      color: #b87333;
      letter-spacing: 3px;
      text-transform: uppercase;
      margin-bottom: 16px;
    }

    .headline {
      font-size: 80px;
      font-weight: 800;
      color: #f5f0e8;
      line-height: 1.05;
      letter-spacing: -2px;
      text-shadow: 0 4px 40px rgba(0,0,0,0.5);
    }

    .subline {
      font-size: 32px;
      font-weight: 400;
      color: rgba(245,240,232,0.7);
      margin-top: 20px;
      line-height: 1.4;
    }
  </style>
</head>
<body>
  <div id="headline-card">
    <div class="eyebrow" id="f0">BREAKING NEWS</div>
    <div class="headline" id="f1">Headline Goes Here</div>
    <div class="subline" id="f2">Supporting subtitle text</div>
  </div>

  <script>
    function update(data) {
      const parsed = data?.componentData ?? [];
      parsed.forEach(item => {
        const el = document.getElementById(item.id);
        if (el) el.textContent = item.data?.value ?? '';
      });
    }

    function play() { document.getElementById('headline-card').classList.add('animate-in'); }
    function stop() {
      const el = document.getElementById('headline-card');
      el.classList.remove('animate-in');
      el.classList.add('animate-out');
    }
    function next() { stop(); }
  </script>
</body>
</html>`;

// ─── Template Registry ────────────────────────────────────────────────────────

export const GRAPHICS_TEMPLATE_LIBRARY = {
    lower_third: {
        name: 'lower-third',
        description: 'Animated lower third with name and title/role. Slide-in from left.',
        fields: { f0: 'Name', f1: 'Title / Role' },
        html: LOWER_THIRD_TEMPLATE,
        recommended_layer: 20,
    },
    scoreboard: {
        name: 'scoreboard',
        description: 'Live sports scoreboard with team names, scores, and period/quarter. Score bump animation.',
        fields: { f0: 'Home Team', f1: 'Home Score', f2: 'Away Score', f3: 'Away Team', f4: 'Period Label', f5: 'Period Number' },
        html: SCOREBOARD_TEMPLATE,
        recommended_layer: 25,
    },
    ticker: {
        name: 'ticker',
        description: 'Auto-scrolling news ticker bar with customizable label and text content.',
        fields: { f0: 'Label (e.g. BREAKING)', f1: 'Ticker text' },
        html: TICKER_TEMPLATE,
        recommended_layer: 30,
    },
    headline: {
        name: 'headline',
        description: 'Full-screen headline card with eyebrow, large headline, and subline. Fade+slide in.',
        fields: { f0: 'Eyebrow (e.g. BREAKING NEWS)', f1: 'Main Headline', f2: 'Subtitle' },
        html: HEADLINE_TEMPLATE,
        recommended_layer: 15,
    },
} as const;

export type TemplateName = keyof typeof GRAPHICS_TEMPLATE_LIBRARY;

export function getTemplate(name: TemplateName) {
    return GRAPHICS_TEMPLATE_LIBRARY[name];
}

export function listTemplates() {
    return Object.entries(GRAPHICS_TEMPLATE_LIBRARY).map(([key, t]) => ({
        key,
        name: t.name,
        description: t.description,
        fields: t.fields,
        recommended_layer: t.recommended_layer,
    }));
}
