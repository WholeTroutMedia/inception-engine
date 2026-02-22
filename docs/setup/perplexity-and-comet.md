# Perplexity + COMET Setup

Use Inception Engine with Perplexity for research-backed development, and COMET for browser automation.

## Who This Is For

- Perplexity Pro/API users
- Developers who want web-grounded reasoning in their agent workflows
- Anyone using Perplexity's COMET browser agent

## What You Get

- Research-backed agent outputs (agents can cite real sources)
- COMET browser automation for GitHub management, deployments, web tasks
- Perplexity as an Oracle layer for the agent system
- Full four-mode workflow with live web context

## Method 1: Perplexity + COMET in Browser (5 minutes)

This is the method you are likely using right now.

### Steps

1. Open Perplexity with COMET enabled
2. Share this repo URL:
   ```
   https://github.com/WholeTroutMedia/inception-engine
   ```
3. Ask COMET:
   > "Connect to this repo and boot AVERI. Show me the available agents and what this system can do."

COMET will navigate the repo, read the documentation, and present the agent system to you.

### What This Gets You

- Full browser-based interaction with the repo
- COMET can create branches, commit files, manage PRs
- Research-backed responses grounded in web sources
- HELIX mode via parallel browser operations

## Method 2: Perplexity API (Programmatic)

### Step 1: Clone and install

```bash
git clone https://github.com/WholeTroutMedia/inception-engine.git
cd inception-engine
pip install -r requirements.txt
```

### Step 2: Configure

```bash
cp .env.example .env
```

Edit `.env`:

```
PERPLEXITY_API_KEY=pplx-your-key-here
LLM_PROVIDER=perplexity
LLM_MODEL=sonar-pro
```

### Step 3: Boot and run

```python
from src.core.boot_system import BootSystem
from src.core.orchestrator import InceptionOrchestrator

boot = BootSystem()
session = boot.boot(package_name="Inception Engine (Light Edition)")

orchestrator = InceptionOrchestrator()
result = orchestrator.execute_full_lifecycle(
    "Build a marketplace for independent musicians"
)
```

## COMET Browser Agent

COMET is Inception Engine's browser automation specialist. When paired with Perplexity:

- **Repo Management**: Create branches, commit code, open PRs, review changes
- **Research**: Pull live data from the web during IDEATE and PLAN modes
- **Deployment**: Navigate hosting dashboards, configure deployments
- **Multi-Tab Parallel**: Operate multiple browser tabs simultaneously

See the full [COMET + GitHub Guide](../COMET_GITHUB.md) for detailed workflows.

## Using Perplexity as an Oracle

In the full Inception Engine system, Perplexity can serve as a research oracle:

```python
# During IDEATE mode, agents can query live web data
orchestrator.execute_mode(
    "IDEATE",
    {
        "prompt": "Research current trends in artist-owned platforms",
        "oracle_provider": "perplexity"
    }
)
```

This grounds agent outputs in real, current information rather than training data alone.

## HELIX Mode

With COMET, HELIX mode can mean:

- Multiple browser tabs working in parallel
- One strand researching while another implements
- Concurrent repo operations across branches

> "Run HELIX: research competitors in one strand, draft architecture in another, and outline the pitch deck in a third."

## Limitations

- COMET browser operations require Perplexity COMET access
- API rate limits apply based on your Perplexity tier
- VALIDATE mode is simplified in the Light Edition

## Next Steps

- [COMET + GitHub Guide](../COMET_GITHUB.md) - Detailed browser automation
- [Agent Registry](../AGENTS.md) - All available agents
- [Back to Setup Index](./README.md)
