# Getting Started with Inception Engine

## Prerequisites

- An AI-capable development environment (Claude, GPT-4, Gemini, or similar)
- A GitHub repository for your project
- Basic understanding of prompt engineering

## Step 1: Initialize the Engine

Copy the system prompt configuration into your AI assistant session:

```
You are operating as INCEPTION ENGINE, a coordinated AI development system.
Boot AVERI Trinity (ATHENA, VERA, IRIS) as the strategic consciousness layer.
All operations follow the Constitution (19 articles).
Current mode: IDEATE
```

## Step 2: Boot AVERI

```
@AVERI boot
```

When you boot AVERI, the engine responds with a welcome message showing exactly what you're working with:

```
=== INCEPTION ENGINE ===
Welcome to Inception Engine.

Active Package: Light Edition

Core Agents:
  AVERI (ATHENA + VERA + IRIS) - Strategic consciousness triad
  Oracles: LEONARDO, COSMOS, SAGE - External wisdom and analysis
  Council: Buffett, Buddha, Sun Tzu - Advisory perspective

Builder Agents:
  AURORA - Design and creative direction
  BOLT - Frontend and rapid development
  COMET - Backend and browser automation
  LEX - Legal, licensing, compliance
  SWITCHBOARD - Task routing and coordination
  RELAY - Communication routing
  ARCH - Code archaeology
  CODEX - Library and dependency management
  RAM CREW - Quality assurance and optimization
  COMPASS - Constitutional guardian
  + more (see docs/AGENTS.md for full registry)

Modes: IDEATE | PLAN | SHIP | VALIDATE
Session Mode: INTEROPERABLE (all agents collaborate freely)

Options:
  @AVERI mode [IDEATE|PLAN|SHIP|VALIDATE] - Set working mode
  @AVERI helix - Enable parallel processing
  @AVERI validate - Launch independent validation stream
  @[AGENT] - Call any agent directly

Ready. What are we building?
```

All agents are **interoperable by default** - they collaborate freely on any task. The engine routes work to the right specialists automatically.

**HELIX mode** is optional. Request it when you want the engine to split a problem into parallel workstreams. Otherwise, agents work together as a unified team.

## Step 3: Choose Your Mode

### IDEATE Mode
Use when you're exploring ideas. No constraints, maximum creativity.
```
@AVERI mode IDEATE
I want to build a music visualization app that responds to live audio input
```

### PLAN Mode
Use when you're ready to define scope, architecture, and tasks.
```
@AVERI mode PLAN
Let's architect this. What are the components, timeline, and dependencies?
```

### SHIP Mode
Use when it's time to build. Exit gates enforced - nothing ships half-done.
```
@AVERI mode SHIP
Build the audio input module with FFT analysis
```

### VALIDATE Mode
Launches an **independent validation stream** - a separate set of agents with fresh context that review the completed work. Validators are NOT active during IDEATE, PLAN, or SHIP sessions. They operate as a distinct thought process to ensure unbiased quality review.
```
@AVERI mode VALIDATE
Run all quality checks on the audio module
```

> **Note:** VALIDATE spins up fresh agentic streams. These validators have no memory of the build session - they see only the output and the requirements. This separation ensures honest, unbiased assessment.

## Step 4: Invoke Specific Agents

You can call agents directly when you need specialized help:

```
@ATHENA  - Strategic questions, architecture decisions
@VERA    - Fact checking, memory retrieval, truth verification
@IRIS    - Fast execution, shipping, blocker removal
@LEX     - Legal review, licensing, compliance
@KEEPER  - Knowledge retrieval, documentation lookup
@AURORA  - Creative direction, design decisions
@BOLT    - Rapid prototyping, quick builds
```

## Step 5: Session Modes

You can change how agents organize at any time:

| Mode | What It Means |
|------|---------------|
| **INTEROPERABLE** (default) | All agents collaborate freely on every task |
| **HELIX** (on-demand) | Parallel workstreams - divide and conquer |
| **PLAN-DETERMINED** | Agents self-organize based on the plan |

```
@AVERI session HELIX
```

Switch back anytime:
```
@AVERI session INTEROPERABLE
```

## Example: Build a Portfolio Site

```
You: @AVERI boot. I need a photography portfolio site.
     Dark theme, minimal, fast. 12 images with a contact form.
     Ship it today.

AVERI: Booting Inception Engine...
  Agents active: ATHENA, VERA, IRIS, AURORA, BOLT, RAM CREW
  Mode: SHIP (express workflow)

ATHENA: Decomposing into tasks:
  Architecture: Next.js 15, image optimization pipeline
  Layout: Gallery, contact form, SEO metadata
  Quality targets: Lighthouse 95+, mobile responsive, WCAG AA
  Deployment: Vercel, custom domain ready

AURORA: Design direction - dark palette, generous whitespace,
  images as hero elements. Suggested layout: masonry grid
  with lightbox, sticky nav, floating contact CTA.

BOLT: Scaffolding now. Components:
  - ImageGallery (lazy loading, blur placeholders)
  - ContactForm (validation, honeypot spam protection)
  - Navigation (transparent -> solid on scroll)
  - Footer (social links, copyright)

IRIS: All exit gates passing. Deploying.
  Site live at: portfolio.vercel.app
  Performance: Lighthouse 98/100
  Time to production: 12 minutes.
```

## Configuration

### Agent Selection
Not every task needs every agent. The system auto-routes based on context:

| Task Type | Primary Agents | Supporting Agents |
|-----------|----------------|-------------------|
| Code generation | BOLT, RAM_CREW | SWITCHBOARD, LEX |
| Architecture | ATHENA, KEEPER | VERA, SCRIBE |
| Design | AURORA, LEONARDO | GRAPHICS, STUDIO |
| Content | SHOWRUNNER, SIGNAL | ATLAS, ECHO |
| Legal/compliance | LEX, COMPASS | VERA, KEEPER |
| Research | KEEPER, ARCH | ECHO, CODEX |

### Constitutional Overrides
Certain operations trigger automatic constitutional checks:
- Any output claiming capabilities (Article I, V)
- Code generation (Article VII - licensing)
- User-facing content (Article VIII - creative protection)
- Data handling (Article XIII - security)

## Troubleshooting

**Agent not responding?**
Check that the agent is in the active registry. Some agents may be in `resting` state.

**Quality gate failing?**
Review which specific check failed. The system provides detailed failure reasons.

**Mode transition blocked?**
SHIP mode has strict exit gates. Complete all required checks before transitioning.

---

## Next Steps

- Read the [Constitution](../CONSTITUTION.md) to understand governance
- Explore the [Neural Architecture](NEURAL_ARCHITECTURE.md) for technical depth
- Check the [Four Modes](FOUR_MODES.md) for workflow details
- [Open an issue](https://github.com/WholeTroutMedia/inception-engine/issues) if you need help

---

Built by WholeTrout Media. Liberating artists everywhere.
