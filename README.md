# INCEPTION ENGINE

**The AI That Builds With You**

> Every user explores their own Wonderland. Every design element is discoverable. Every interaction teaches through delight.
> 
> *The Alice Principle* - Learning through wonder, exploration through play.

---

## Down the Rabbit Hole

Inception Engine is an AI-native development platform where specialized agents collaborate like a coordinated team. You describe what you want to build. The agents ideate, plan, ship, and validate - producing complete, production-ready output.

This isn't a chatbot. It's not an autocomplete engine. It's a **coordinated intelligence system** governed by a constitutional framework that ensures every output serves the creator, not the platform.

The system was designed from day one around one question:

> **"Does this make artists more free or less free?"**

If less free, we don't build it.

---

## What It Can Do

### Four-Mode Workflow

Every project moves through up to four intentional stages. Use all four, or skip to what you need.

| Mode | What Happens | Output |
|------|-------------|--------|
| **IDEATE** | Full-team brainstorm. All agents contribute. Strategic alignment. | Vision document |
| **PLAN** | Focused specification. Architecture decisions. Task breakdown. | Technical spec |
| **SHIP** | Implementation to production. Cannot exit until live and accessible. | Working application |
| **VALIDATE** | Independent quality review by a separate team of agents. | Assessment report |

**Choose your path:**
- **Full Lifecycle**: IDEATE > PLAN > SHIP > VALIDATE (enterprise)
- **Rapid**: IDEATE > SHIP > VALIDATE (fast prototypes)
- **Express**: SHIP > VALIDATE (prompt to production)
- **Continuous**: VALIDATE > SHIP (maintenance)

### Constitutional Governance

19 articles. Zero tolerance for theft. Complete solutions only - never MVPs. Open standards, no lock-in. Every agent, every operation, every output checked against the constitution.

Three sacred principles:
- **Article 0: No Stealing** - Learn, study, adapt, synthesize. Never copy.
- **Article XVII: Zero Day Creativity** - Ship complete or don't ship. No "we'll fix it later."
- **Article XVIII: Generative Agency** - Digital soil, not digital fences. Users own everything.

[Read the full Constitution](./CONSTITUTION.md)

### Neural Architecture

Five brain-inspired systems coordinate agent communication:

- **PFC Planning** - Executive decision-making and goal decomposition
- **Hippocampal Memory** - Context preservation across modes and sessions
- **Default Mode Network** - Background creative processing and insight generation
- **Small-World Topology** - Any agent reaches any other in 6 hops or fewer
- **Attractor Dynamics** - System converges toward quality, not "good enough"

[Deep dive into neural architecture](./docs/NEURAL_ARCHITECTURE.md)

### The Wonder Engine (Design System)
The Wonder Engine ships as a blank canvas - no opinions about what your project should look like. Describe a mood, upload an image, or set every value by hand. The system generates a complete token set and every component inherits it automatically.

- **Design tokens** - CSS variables, HSL colors, configurable spacing grid
- **Prompt-based generation** - Describe a mood, get a complete theme
- **Image extraction** - Upload any image, extract its palette and atmosphere
- **Motion presets** - Spring, smooth, snappy, or none at all
- **Surface system** - Flat, elevated, blurred, textured - your choice

[Explore the design system](./design-system/)

### MCP Integration

Inception Engine works as an MCP (Model Context Protocol) server, allowing any MCP-compatible client to connect and use the agent system directly.

[MCP setup guide](./docs/MCP_GUIDE.md)

### Browser Automation with COMET

COMET is the browser automation agent. It operates real browsers, manages multiple tabs in parallel, fills forms, navigates sites, and executes multi-step workflows across the web. Pair it with GitHub for automated repo management, CI/CD, and deployment.

[COMET + GitHub guide](./docs/COMET_GITHUB.md)

---

## Quick Start

### 1. Clone and explore

```bash
git clone https://github.com/WholeTroutMedia/inception-engine.git
cd inception-engine
```

### 2. Read the docs

Start with [Getting Started](./docs/GETTING_STARTED.md), then explore:

- [The Four Modes](./docs/FOUR_MODES.md) - How the workflow cycle operates
- [Neural Architecture](./docs/NEURAL_ARCHITECTURE.md) - How agent coordination works
- [Agent Registry](./docs/AGENTS.md) - Meet the 27 specialized agents
- [MCP Guide](./docs/MCP_GUIDE.md) - Connect via Model Context Protocol
- [COMET + GitHub](./docs/COMET_GITHUB.md) - Browser automation and repo management

### 3. Configure

See [`examples/agent-config.json`](./examples/agent-config.json) for a complete configuration template covering agents, modes, neural systems, and constitutional parameters.

---

## Architecture

```
inception-engine/
|-- CONSTITUTION.md          # Full 19-article governance framework
|-- design-system/           # Wonder Engine - tokens, themes, components
|   |-- tokens.json          # Color, spacing, typography, motion tokens
|   |-- WONDER_ENGINE.md     # The Alice Principle design philosophy
|-- docs/                    # Deep-dive documentation
|   |-- GETTING_STARTED.md   # Onboarding guide
|   |-- FOUR_MODES.md        # IDEATE / PLAN / SHIP / VALIDATE
|   |-- NEURAL_ARCHITECTURE.md # Brain-inspired coordination systems
|   |-- AGENTS.md            # Full agent registry and hive structure
|   |-- MCP_GUIDE.md         # Model Context Protocol integration
|   |-- COMET_GITHUB.md      # Browser automation + GitHub workflows
|-- examples/                # Configuration templates
|   |-- agent-config.json    # Complete agent + neural system config
|-- CONTRIBUTING.md          # How to contribute (constitutional compliance required)
|-- LICENSE                  # AGPL-3.0
```

---

## The Mission

**North Star**: Liberate artists to create without compromise.

We build technology that serves humans. We charge for infrastructure, never for lock-in. We prove that ethical AI isn't a constraint - it's a competitive advantage.

Every agent in this system asks the same question before every action:

> **"Does this make artists more free or less free?"**

---

## Explore Further

| Resource | What You'll Find |
|----------|------------------|
| [Constitution](./CONSTITUTION.md) | The full 19-article governance framework |
| [Getting Started](./docs/GETTING_STARTED.md) | Setup, configuration, first steps |
| [Four Modes](./docs/FOUR_MODES.md) | IDEATE / PLAN / SHIP / VALIDATE deep dive |
| [Neural Architecture](./docs/NEURAL_ARCHITECTURE.md) | Brain-inspired coordination systems |
| [Agent Registry](./docs/AGENTS.md) | All 27 agents, 6 hives, roles and capabilities |
| [MCP Guide](./docs/MCP_GUIDE.md) | Model Context Protocol integration |
| [COMET + GitHub](./docs/COMET_GITHUB.md) | Browser automation and repo management |
| [Design System](./design-system/) | Wonder Engine tokens, themes, components |
| [Contributing](./CONTRIBUTING.md) | How to contribute (Article 0 compliance required) |
| [Example Config](./examples/agent-config.json) | Complete configuration template |

---

## Contributing

We welcome contributions that pass the constitutional test:

1. **Is this original work?** (Article 0)
2. **Is this complete and tested?** (Article XVII)
3. **Does this make creators more free?** (Article XVIII)

Read the full [Contributing Guide](./CONTRIBUTING.md) before submitting.

---

## License

AGPL-3.0 - See [LICENSE](./LICENSE)

All usage must comply with the [Agent Constitution](./CONSTITUTION.md).

---

**Built by [Whole Trout Media](https://github.com/WholeTroutMedia)**

*"We are not gatekeepers. We are gardeners."*

*Curiouser and curiouser.* - The Alice Principle, always.
