# IDE / Antigravity Setup

Use Inception Engine from any code editor with an AI assistant.

## Who This Is For

- Developers who prefer working in their IDE
- VS Code, JetBrains, Emacs, Neovim, or Antigravity users
- Anyone who wants repo-aware AI chat alongside their code

## What You Get

- Full repo context available to your IDE's AI assistant
- Agent orchestration through your preferred editor
- Inline code generation following Inception Engine patterns
- HELIX mode through workspace-aware AI chat

## The Universal Pattern

Regardless of IDE, the pattern is the same:

1. Clone the repo
2. Open it in your IDE
3. Enable your IDE's AI chat (Copilot, Gemini Code Assist, Cody, etc.)
4. The AI gets full repo context
5. Ask it to boot AVERI

## Setup (5 minutes)

### Step 1: Clone

```bash
git clone https://github.com/WholeTroutMedia/inception-engine.git
cd inception-engine
```

### Step 2: Open in your IDE

Open the `inception-engine` folder as your workspace root.

### Step 3: Enable AI chat

Use whichever AI assistant your IDE supports:

| IDE | AI Assistant Options |
|-----|---------------------|
| **VS Code** | GitHub Copilot, Gemini Code Assist, Cody, Continue |
| **JetBrains** | AI Assistant (built-in), Copilot, Gemini Code Assist |
| **Antigravity** | Built-in AI, custom LLM connections |
| **Neovim** | Copilot.vim, Codeium, Avante |
| **Emacs** | chatgpt-shell (supports ChatGPT, Claude, Gemini, Perplexity), Copilot |

### Step 4: Boot AVERI

In your IDE's AI chat panel, type:

> "Read this workspace and boot AVERI from the Inception Engine. Show me available agents and capabilities."

The AI assistant will scan the repo structure, read the agent definitions, and present the system to you.

## VS Code Specific Setup

1. Install GitHub Copilot (or your preferred AI extension)
2. Open the inception-engine folder
3. Open Copilot Chat (`Ctrl+Shift+I`)
4. Use `@workspace` to give it full repo context:
   > "@workspace Boot AVERI and show me how to use this agent system."

## Antigravity Specific Setup

1. Open the inception-engine project
2. Connect to your preferred LLM backend
3. Use the AI panel with workspace context enabled
4. Ask it to walk you through the agent architecture

## Running the Engine from IDE Terminal

You can also run Inception Engine directly from your IDE's integrated terminal:

```bash
# Install dependencies
pip install -r requirements.txt

# Configure
cp .env.example .env
# Edit .env with your preferred LLM provider key

# Run Python
python -c "
from src.core.boot_system import BootSystem
boot = BootSystem()
session = boot.boot(package_name='Inception Engine (Light Edition)')
print(session)
"
```

## HELIX Mode

In your IDE's AI chat:

> "Switch to HELIX mode. I want parallel analysis: one strand on architecture, one on UX, one on data models."

The AI will use the repo's HELIX definitions to structure parallel workstreams.

## Limitations

- AI assistant capabilities vary by extension and subscription tier
- Some AI assistants have limited workspace context windows
- VALIDATE mode is simplified in the Light Edition

## Next Steps

- [Agent Registry](../AGENTS.md) - All available agents
- [Getting Started](../GETTING_STARTED.md) - Detailed onboarding
- [Back to Setup Index](./README.md)
