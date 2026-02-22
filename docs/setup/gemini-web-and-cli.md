# Google Gemini Setup (Web + CLI)

Use Inception Engine with Google Gemini through the web app or the Gemini CLI.

## Who This Is For

- Gemini Advanced users
- Developers using the Gemini API or Gemini CLI
- Anyone who wants to import a GitHub repo directly into Gemini

## What You Get

- Gemini reasoning over the full Inception Engine codebase
- Agent orchestration through Gemini models
- Web-based or CLI-based interaction
- Code Assist integration for IDE workflows

## Method 1: Gemini Web App (Easiest - 5 minutes)

Gemini now supports importing GitHub repos directly.

### Steps

1. Go to [gemini.google.com](https://gemini.google.com)
2. Start a new conversation
3. Click the **+** (attach) button
4. Select **Import code** or paste the repo URL:
   ```
   https://github.com/WholeTroutMedia/inception-engine
   ```
5. Gemini will index the repository
6. Ask Gemini:
   > "Read this repo and boot AVERI. Show me available agents and what this system can do."

### What This Gets You

Gemini will understand the full agent architecture, constitutional framework, and mode system. You can have it:

- Explain any agent's role
- Walk through IDEATE/PLAN/SHIP/VALIDATE workflows
- Generate code using the engine's patterns
- Analyze architecture decisions

### Limitation

This method gives Gemini **reasoning over** the engine. It does not execute Python code server-side. For execution, use Method 2 or 3.

## Method 2: Gemini CLI (10 minutes)

### Step 1: Install the Gemini CLI

```bash
npm install -g @anthropic-ai/gemini-cli
# or
pip install google-generativeai
```

### Step 2: Authenticate

```bash
gemini auth login
```

### Step 3: Link the repo

```bash
git clone https://github.com/WholeTroutMedia/inception-engine.git
cd inception-engine
gemini chat --context .
```

This gives Gemini full context of the repo. Ask it to boot AVERI.

## Method 3: Gemini API (Programmatic)

### Step 1: Configure

```bash
cp .env.example .env
```

Edit `.env`:

```
GEMINI_API_KEY=your-key-here
LLM_PROVIDER=gemini
LLM_MODEL=gemini-2.0-flash
```

### Step 2: Boot and run

```python
from src.core.boot_system import BootSystem
from src.core.orchestrator import InceptionOrchestrator

boot = BootSystem()
session = boot.boot(package_name="Inception Engine (Light Edition)")

orchestrator = InceptionOrchestrator()
result = orchestrator.execute_express_workflow(
    "Build a recipe sharing app for home cooks"
)
```

## Method 4: Gemini Code Assist (IDE)

For VS Code or JetBrains users with Gemini Code Assist:

1. Install the Gemini Code Assist extension
2. Open the inception-engine folder as your workspace
3. Gemini gets full repo context automatically
4. Ask in the Gemini chat panel: "Boot AVERI from this repo"

## HELIX Mode

In any method, request HELIX by saying:

> "Switch to HELIX mode and run strategy, design, and engineering analysis in parallel."

With the API, Gemini's high throughput makes HELIX particularly effective for parallel workstreams.

## Limitations

- Web app method is read/reason only (no code execution)
- Gemini CLI availability varies by region
- VALIDATE mode is simplified in the Light Edition

## Next Steps

- [Agent Registry](../AGENTS.md) - All available agents
- [Four Modes Guide](../FOUR_MODES.md) - Mode deep dive
- [Back to Setup Index](./README.md)
