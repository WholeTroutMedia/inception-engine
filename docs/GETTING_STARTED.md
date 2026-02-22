# Getting Started with Inception Engine

**No coding experience required for this guide.** If you've never used GitHub, a terminal, or an AI API before — you're in the right place. We'll walk through everything.

---

## What Is This?

Inception Engine is a system of 15 specialized AI agents that work together as a coordinated team. You give them a goal. They ideate, plan, build, and validate — producing complete, production-ready output.

You interact with them through whatever AI tool you already use: Claude, ChatGPT, Gemini, Perplexity, or an IDE like Cursor or VS Code. **No special software required.**

---

## Choose Your Starting Point

**I just want to try it right now** → [Jump to Quick Start (5 minutes)](#quick-start-5-minutes)

**I want to set it up properly on my computer** → [Full Setup Guide](#full-setup-guide)

**I use an IDE (Cursor, VS Code, Windsurf)** → [IDE + Antigravity Setup](./setup/ide-and-antigravity.md)

**I use Claude Desktop** → [Claude + MCP Setup](./setup/anthropic-claude-mcp.md)

**I don’t code at all** → [No-Code Setup](./setup/no-code-automation.md)

---

## Quick Start (5 minutes)

You don't need to download anything. Open any AI assistant (Claude, ChatGPT, Gemini, Perplexity) and paste this:

```
You are now operating as INCEPTION ENGINE — a coordinated AI development system with 15 specialized agents.

Your agents:
- AVERI (ATHENA + VERA + IRIS) — Strategic Trinity. Boot first.
- AURORA — Creative direction and design
- BOLT — Frontend and mobile development (React, Next.js, SwiftUI)
- COMET — Browser automation and agentic web workflows
- KEEPER — Knowledge retrieval and institutional memory
- ARCH — Code archaeology and codebase understanding
- CODEX — Dependency management
- SCRIBE — Documentation writer
- SWITCHBOARD — Task routing and agent coordination
- RELAY — Communication routing
- LEX — Legal, licensing, compliance
- COMPASS — Constitutional guardian (North Star)

Operating modes:
- INTEROPERABLE (default): All agents collaborate freely
- HELIX (on-demand): Parallel workstreams
- PLAN-DETERMINED: Self-organize during PLAN mode

Workflow modes: IDEATE → PLAN → SHIP → VALIDATE

Constitution: 19 articles. Never copy. Ship complete. Users own everything.

Boot AVERI Trinity now and confirm you are operational.
```

Then type:
```
@AVERI boot
```

That's it. You're running Inception Engine.

---

## Full Setup Guide

### Step 1: Get the Files onto Your Computer

You need to download this repository. Here are three ways, from easiest to most technical:

#### Option A — Download as ZIP (easiest, no Git required)

1. Go to [github.com/WholeTroutMedia/inception-engine](https://github.com/WholeTroutMedia/inception-engine)
2. Click the green **Code** button (top right area of the file list)
3. Click **Download ZIP**
4. Find the downloaded file (usually in your Downloads folder)
5. Double-click it to unzip — you'll get a folder called `inception-engine-main`
6. Move that folder somewhere you'll remember it (Desktop, Documents, Projects folder, etc.)

#### Option B — GitHub Desktop (visual Git client, recommended for beginners)

1. Download [GitHub Desktop](https://desktop.github.com/) (free)
2. Install and open it
3. Sign in with your GitHub account (or create one free at github.com)
4. Click **File** → **Clone Repository**
5. Click **URL** tab and paste: `https://github.com/WholeTroutMedia/inception-engine`
6. Choose where to save it on your computer
7. Click **Clone**

#### Option C — Terminal (for developers)

```bash
git clone https://github.com/WholeTroutMedia/inception-engine.git
cd inception-engine
```

---

### Step 2: Find Your System Prompt

Once you have the files, open the folder. You'll see:

```
inception-engine/
├── README.md          ← Start here for overview
├── CONSTITUTION.md    ← The 19-article governance framework
├── docs/              ← All documentation
│   ├── AGENTS.md      ← All 15 agents explained
│   ├── FOUR_MODES.md  ← IDEATE/PLAN/SHIP/VALIDATE explained
│   └── setup/         ← Setup guides for every platform
├── examples/
│   └── agent-config.json  ← Full agent configuration
└── design-system/
    └── tokens.json    ← Design language tokens
```

You can open any `.md` file in a text editor to read it. They're just text files.

---

### Step 3: Load into Your AI Tool

Pick the platform you use:

| Platform | How to Use It | Guide |
|---|---|---|
| **Claude (claude.ai)** | Paste system prompt in Projects | [Claude Setup](./setup/anthropic-claude-mcp.md) |
| **ChatGPT** | Create a Custom GPT or paste in chat | [OpenAI Setup](./setup/openai-chatgpt.md) |
| **Gemini** | Paste in chat or use Gemini Advanced | [Gemini Setup](./setup/gemini-web-and-cli.md) |
| **Perplexity** | Paste in chat + COMET for browser tasks | [Perplexity Setup](./setup/perplexity-and-comet.md) |
| **Cursor / VS Code / Windsurf** | Add as workspace rules + AI assistant | [IDE Setup](./setup/ide-and-antigravity.md) |
| **No-code (Zapier, Make)** | Trigger agents via automation | [No-Code Setup](./setup/no-code-automation.md) |

---

### Step 4: Boot AVERI

In whatever AI tool you're using:

```
@AVERI boot
```

AVERI will respond with a status confirmation. The Trinity is now active:
- **ATHENA** — strategic assessment
- **VERA** — truth and memory
- **IRIS** — ready for execution

---

### Step 5: Choose Your Mode

```
@AVERI mode IDEATE
```
Use when exploring ideas. No constraints, maximum creativity.

```
@AVERI mode PLAN
```
Use when you're ready to define scope and architecture.

```
@AVERI mode SHIP
```
Use when it's time to build. Exit gates enforced — nothing ships half-done.

```
@AVERI mode VALIDATE
```
Use to review, verify, and document quality.

---

### Step 6: Call Specific Agents

You can address any agent directly:

```
@AURORA — design this interface
@BOLT — build this component in React
@COMET — open this URL and pull the data
@KEEPER — what do we know about this?
@LEX — is this approach legally sound?
@COMPASS — does this pass constitutional review?
@SCRIBE — write documentation for what we just built
```

You don’t have to route agents manually. `@AVERI` coordinates automatically.

---

### Step 7: Advance All Four Dimensions

Every task should advance all four dimensions:

1. **Structure** — Is the architecture right?
2. **Content** — Is the substance complete?
3. **Quality** — Does it pass all checks?
4. **Delivery** — Is it shipped and deployed?

---

## Real Example: Build a Portfolio Site

```
You: @AVERI boot. I need a photography portfolio site.
Dark theme, minimal, fast. 12 images with a contact form. Ship it today.

ATHENA: Breaking this down into four dimensions:
  Structure: Next.js 15, image optimization pipeline
  Content: Gallery layout, contact form, SEO metadata
  Quality: Lighthouse 95+, mobile responsive, WCAG AA
  Delivery: Vercel deployment, custom domain ready

AURORA: Design direction — dark palette, generous whitespace, images
as hero elements. Masonry grid with lightbox, sticky nav, floating CTA.

BOLT: Scaffolding now. Components:
  - ImageGallery (lazy loading, blur placeholders)
  - ContactForm (validation, spam protection)
  - Navigation (transparent → solid on scroll)

IRIS: All exit gates passing. Deploying.
Site live at: portfolio.vercel.app
Lighthouse: 98/100. Time to production: 12 minutes.
```

---

## Configuration

### Which Agents for Which Tasks?

The system auto-routes, but here's a reference:

| Task Type | Best Agents | Supporting |
|---|---|---|
| Architecture decisions | ATHENA, KEEPER | ARCH, VERA |
| UI/UX design | AURORA, BOLT | SCRIBE |
| Code generation | BOLT, IRIS | CODEX, ARCH |
| Browser automation | COMET | SWITCHBOARD |
| Research & analysis | KEEPER, ARCH | ECHO |
| Documentation | SCRIBE, VERA | KEEPER |
| Legal & compliance | LEX, COMPASS | VERA |
| Project routing | SWITCHBOARD, RELAY | AVERI |

### Design System

The Wonder Engine (`design-system/tokens.json`) ships as a blank canvas. Describe a mood, and AURORA generates a complete token set:

```
@AURORA generate tokens for a dark meditation app - calm, deep blues, soft glows
```

---

## Troubleshooting

**Agent not responding?**
Type their name directly: `@BOLT` or `@KEEPER`. Some agents default to resting state and activate when called.

**Getting generic responses?**
Make sure you pasted the full system prompt from the Quick Start section above. The agent names need to be established in the session context.

**SHIP mode exit gate failing?**
SHIP mode has strict exit criteria. The system will tell you exactly which gate failed and what’s needed to pass it.

**Running in an IDE?**
See the [IDE + Antigravity guide](./setup/ide-and-antigravity.md) for workspace-specific setup, including how to enable COMET browser automation.

**Want browser automation?**
See [COMET + Browser System](./BROWSER_SYSTEM.md) for the full agentic browsing guide.

---

## Next Steps

- [The Four Modes](./FOUR_MODES.md) — Deep dive into IDEATE / PLAN / SHIP / VALIDATE
- [Agent Registry](./AGENTS.md) — All 15 agents, what they do, when to use them
- [Neural Architecture](./NEURAL_ARCHITECTURE.md) — How the brain-inspired systems work
- [Browser System](./BROWSER_SYSTEM.md) — COMET and agentic web automation
- [MCP Guide](./MCP_GUIDE.md) — Model Context Protocol integration
- [Open an issue](https://github.com/WholeTroutMedia/inception-engine/issues) — Questions, feature requests, use cases

---

Built by [Whole Trout Media](https://github.com/WholeTroutMedia). Liberating artists everywhere.

*Curiouser and curiouser. — The Alice Principle, always.*
