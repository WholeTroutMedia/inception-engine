# Creative Liberation Engine v5

> **The AI That Builds With You**
>
> Every user explores their own Wonderland. Every design element is discoverable. Every interaction teaches through delight.
>
> *The Alice Principle — Learning through wonder, exploration through play.*

The Creative Liberation Engine is a compound-learning, multi-agent AI operating system for artists, creators, and studios. Built on Google's Genkit framework, governed by a 20-article Constitution, and wired for compound intelligence through the hierarchical Live Memory Bus.

> âš ï¸ **Disclaimer: AI-Generated Documentation**  
> Notice: A large portion of this repository's documentation is generated and maintained autonomously by AI agents. While we strive for hyper-accuracy, there may be discrepancies, outdated context, or hallucinated facts. Please verify any critical information and report inaccuracies. We believe in being fully honest about the role of AI in maintaining this project.

<br>
<img src="assets/cle-hero-banner.png" width="100%" alt="Creative Liberation Engine Hero Banner" style="border-radius: 8px;">
<br>

![License: FSL-1.1-ALv2](https://img.shields.io/badge/License-FSL--1.1--ALv2-violet) ![Version](https://img.shields.io/badge/version-5.0.0--GENESIS-gold) ![Agents](https://img.shields.io/badge/agents-40%2B-blue)

---

## ✨ What Makes It Different

| Platform             | What you get                                                                  |
|----------------------|-------------------------------------------------------------------------------|
| ChatGPT              | A chatbot                                                                     |
| Midjourney           | An image generator                                                            |
| Runway               | A video generator                                                             |
| **Creative Liberation Engine** | **A full creative team with memory, specialization, and constitutional governance** |

The engine doesn't just respond — it *learns*, *remembers*, and *compounds* every creative decision across all runs.

---

## ⚖️ The Scale

- **40+ Total Agents & LoRAs**

---

## 🏛️ Architecture

```text
+-------------------------------------------------------------------------+
|                    Creative Liberation Engine v5                        |
|                                                                         |
|  [CORE TRINITY]                [kuid HIVE]                           |
|  kstratd      (Strategy)      kuid      (Architect)                  |
|  kmemd         (Truth/klogd)  kbuildd        (Code Gen)                   |
|  kexecd       (Execution)     cometd       (Backend)                    |
|                                                                         |
|  [kstated HIVE]                [kdocsd HIVE]                              |
|  kstated      (Knowledge)     kdocsd         (Constitutional)             |
|  archd        (Patterns)      compassd     (Ethics)                     |
|  codexd       (Docs)                                                    |
|                                                                         |
|  [switchd HIVE]               [VALIDATOR HIVE]                          |
|  relayd       (Routing)       sentineld    (Security)                   |
|  signald      (Integrations)  archond      (Architecture)               |
|  switchd      (Ops)           proofd       (Correctness)                |
|                               harbord      (Test Coverage)              |
|  [BROADCAST HIVE]             krecd     (Ship Decision)              |
|  atlasd       (Lead)                                                    |
|  controlroomd (LiveOps)       ----------------------------------------- |
|  showrunnerd  (Prod.)         [LIVE MEMORY BUS]                         |
|  graphicsd    (Motion)        Every execution -> klogd pattern         |
|  studiod      (Studio)        extraction -> compound learning           |
|  systemsd     (Infra)                                                   |
+-------------------------------------------------------------------------+
|  [GENMEDIA studiod v5] Unified Provider Abstraction                     |
|  Imagen3 / Flux Pro / Wan 2.1 / Veo2 / Lyria / SDXL                     |
+-------------------------------------------------------------------------+
```

---

## 📜 The 20-Article Constitution

The engine is governed by 20 immutable articles. Selected highlights:

- **Article 0** — Sacred Mission: *"Artist liberation through sovereign technology"* — immutable
- **Article V** — User Sovereignty: user creative vision is supreme
- **Article VI** — Quality Gates: code doesn't ship without VALIDATE approval (`krecd`)
- **Article VII** — Knowledge Compounding: every execution teaches the system
- **Article XIV** — Testing Mandate: untested code is unshipped code
- **Article XVIII** — Anti-Lock-In: you can always export and leave

---

## 🧠 Live Memory Bus

The engine's compound intelligence layer. Every agent execution:

1. **Pre-flight recall** — queries past episodes via tag similarity
2. **Execution** — runs with historical context in mind
3. **Post-flight klogd** — Gemini extracts a reusable pattern; persists to JSONL + Git

This means `kbuildd` gets better at your codebase with every run. `kuid` remembers your design decisions. `kstated` tracks what works.

---

## ⚡ The OmniMedia Orchestrator

The God Node. A single creative brief produces:

```typescript
const result = await OmniMediaOrchestratorFlow({
    brief: "Bold campaign for a new streetwear drop in NYC",
    brand: "Raw, authentic, anti-corporate",
    outputTypes: ['all'],    // concept + copy + images + video + audio
    quality: 'ultra',
    format: 'vertical',     // 9:16 for social
});

// result.concept         → kuid creative concept
// result.copy            → kmemd campaign copy
// result.assets.images   → ["/path/to/imagen3_output.png", ...]
// result.assets.videos   → ["/path/to/wan21_output.mp4", ...]
// result.assets.audio    → ["/path/to/lyria_track.mp3", ...]
// result.lexdApproval     → "PASS"  // Constitutional validation
```

---

## 🚀 Quick Start

```bash
git clone https://github.com/Creative-Liberation-Engine/creative-liberation-engine.git
cd creative-liberation-engine
pnpm install
cp .env.example .env   # Add GEMINI_API_KEY (or GOOGLE_API_KEY) for AI
pnpm run build
pnpm run dev           # Boots the agent server on http://localhost:4100
```

In a second terminal, open the Genkit Dev UI to run flows:

```bash
pnpm run genkit:ui    # Opens http://localhost:4000
```

**→ Full walkthrough:** [docs/GETTING-STARTED.md](docs/GETTING-STARTED.md)

---

## 🛡️ Constitutional Preflight (Public SDK)

```typescript
import { constitutionalPreflight, CONSTITUTION, HIVES } from '@cle/core';

// Lightweight check before submitting to the engine
const { pass, flags } = constitutionalPreflight("Generate brand assets for our new campaign");
// → { pass: true, flags: [] }

// Query the Constitution
console.log(CONSTITUTION[0].summary);
// → "Artist liberation through sovereign technology"

// Explore hives
console.log(HIVES.kuid.members);
// → ["kuid", "kbuildd", "cometd"]
```

---

## 🔐 Access Tiers

| Tier            | Who        | Capabilities                                        |
|-----------------|------------|-----------------------------------------------------|
| **Studio**      | CLE | Full 40-agent system, all providers, Living Archive |
| **Client**      | Projects   | Project-scoped agents, client memory isolated       |
| **Merch**       | Public     | OmniMedia only, rate-limited, no private memory     |

---

## 📊 The Numbers

| Metric                | Value                              |
|-----------------------|------------------------------------|
| Active Agents         | 40+                                |
| Hives                 | 7                                  |
| Constitution Articles | 20                                 |
| Memory Provider       | Hierarchical JSONL + ChromaDB + Git |
| LLM Providers         | Gemini 2.5 Pro, Claude 3.5, GPT-4o, Perplexity Sonar, Grok, DeepSeek |
| Media Providers       | Imagen3, Flux Pro, Wan 2.1, Veo2, Lyria |
| Offline Mode          | Ollama (Llama 3, Mistral, Gemma)   |
| Compound Learning     | Live Memory Bus — CLS hierarchical, per-agent klogd |

---

## 📧 Correspondence

For correspondence, reach out to `operator@gmail.com`.

> *"Artist liberation through sovereign technology."*

---

## 🗺️ Repository Navigation

| Area | Link | Description |
|---|---|---|
| **System** | | |
| Boot Config | [`.agents/boot.json`](/Creative-Liberation-Engine/creative-liberation-engine/src/branch/main/.agents/boot.json) | Engine manifest — 40+ agents |
| Agent Charters | [`.agents/charters/`](/Creative-Liberation-Engine/creative-liberation-engine/src/branch/main/.agents/charters) | Constitution + agent definitions |
| Inbox Pipeline | [`.agents/inbox/`](/Creative-Liberation-Engine/creative-liberation-engine/src/branch/main/.agents/inbox) | Phone-to-execution capture pipeline |
| **Agent Orchestration** | | |
| Engine Protocol | [`.agents/ENGINE.md`](/Creative-Liberation-Engine/creative-liberation-engine/src/branch/main/.agents/ENGINE.md) | Agent identity + coordination rules |
| Project Board | [`.agents/dispatch/project_dispatch.md`](/Creative-Liberation-Engine/creative-liberation-engine/src/branch/main/.agents/dispatch/project_dispatch.md) | Live workstream kanban |
| Instance Registry | [`.agents/dispatch/registry.md`](/Creative-Liberation-Engine/creative-liberation-engine/src/branch/main/.agents/dispatch/registry.md) | Multi-instance coordination |
| Agent Workflows | [`.agents/workflows/`](/Creative-Liberation-Engine/creative-liberation-engine/src/branch/main/.agents/workflows) | Claim, dispatch, handoff, sync |
| **Core Packages** | | |
| Genkit Orchestration | [`packages/genkit/`](/Creative-Liberation-Engine/creative-liberation-engine/src/branch/main/packages/genkit) | AI flow engine |
| cometd Browser | [`packages/comet/`](/Creative-Liberation-Engine/creative-liberation-engine/src/branch/main/packages/comet) | Sovereign Playwright browser |
| **Infrastructure** | | |
| Docker | [`docker/`](/Creative-Liberation-Engine/creative-liberation-engine/src/branch/main/docker) | Container configs |
| CI/CD | [`.forgejo/workflows/`](/Creative-Liberation-Engine/creative-liberation-engine/src/branch/main/.forgejo/workflows) | Forgejo Actions |
| Deploy | [`deploy/orchestrator/`](/Creative-Liberation-Engine/creative-liberation-engine/src/branch/main/deploy/orchestrator) | GCP Cloud Run deployment |
| **Services** | | |
| Inbox Webhook | [`services/inbox-webhook/`](/Creative-Liberation-Engine/creative-liberation-engine/src/branch/main/services/inbox-webhook) | iOS Share Sheet + Flipboard RSS ingestion |
| **Docs** | | |
| iOS Shortcut Guide | [`docs/ios-shortcut-setup.md`](/Creative-Liberation-Engine/creative-liberation-engine/src/branch/main/docs/ios-shortcut-setup.md) | Phone capture setup |
