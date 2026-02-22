# OpenAI / ChatGPT Setup

Use Inception Engine with OpenAI's API or ChatGPT.

## Who This Is For

- Developers with an OpenAI API key
- ChatGPT Plus/Team/Enterprise users who want to use Custom GPTs or the API
- Anyone comfortable with Python and API keys

## What You Get

- Full agent orchestration through OpenAI models (GPT-4o, GPT-4, o1, etc.)
- All four modes: IDEATE, PLAN, SHIP, VALIDATE
- HELIX parallel processing via concurrent API calls
- Constitutional governance on every output

## Setup (5 minutes)

### Step 1: Clone the repo

```bash
git clone https://github.com/WholeTroutMedia/inception-engine.git
cd inception-engine
```

### Step 2: Install dependencies

```bash
pip install -r requirements.txt
```

### Step 3: Configure your API key

```bash
cp .env.example .env
```

Edit `.env` and add your key:

```
OPENAI_API_KEY=sk-your-key-here
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o
```

### Step 4: Boot AVERI

```python
from src.core.boot_system import BootSystem

boot = BootSystem()
session = boot.boot(
    package_name="Inception Engine (Light Edition)",
    show_agents=True,
    show_session_options=True
)
```

You should see the welcome message with all available agents listed.

### Step 5: Start building

```python
from src.core.orchestrator import InceptionOrchestrator

orchestrator = InceptionOrchestrator()

# Express mode: prompt to production
result = orchestrator.execute_express_workflow(
    "Build a landing page for an indie music label"
)

# Full lifecycle
result = orchestrator.execute_full_lifecycle(
    "Design a portfolio platform for photographers"
)
```

## Using with ChatGPT Custom GPTs

If you prefer a conversational interface:

1. Create a Custom GPT at [chat.openai.com](https://chat.openai.com)
2. In the Instructions field, paste the contents of the repo's system prompts
3. Upload the key agent definition files as knowledge
4. The GPT will operate as AVERI with the full agent roster available

## HELIX Mode

To run parallel agent workstreams:

```python
session = boot.boot(
    package_name="Inception Engine (Light Edition)",
    session_mode="HELIX"
)
```

In HELIX mode, the orchestrator fans out tasks to multiple agents simultaneously. With OpenAI, this means concurrent API calls - each agent strand gets its own thread.

## Limitations

- Rate limits apply based on your OpenAI tier
- HELIX parallelism is bounded by your API rate limit
- VALIDATE mode is simplified (checklist-based) in the Light Edition

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `AuthenticationError` | Check your API key in `.env` |
| Rate limit errors | Reduce HELIX parallelism or upgrade OpenAI tier |
| Model not found | Verify `LLM_MODEL` matches an available model |

## Next Steps

- [Agent Registry](../AGENTS.md) - See all available agents
- [Four Modes Guide](../FOUR_MODES.md) - Understand IDEATE/PLAN/SHIP/VALIDATE
- [Back to Setup Index](./README.md)
