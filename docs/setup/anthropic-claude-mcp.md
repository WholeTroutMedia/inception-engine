# Anthropic Claude + MCP Setup

Use Inception Engine with Claude via the Model Context Protocol (MCP).

## Who This Is For

- Claude Desktop users
- Developers building with the Anthropic API
- MCP enthusiasts who want tool-based agent orchestration

## What You Get

- Inception Engine exposed as an MCP server
- Claude Desktop connects directly to the agent system
- All four modes accessible through natural conversation
- HELIX parallel processing via MCP tool calls

## What Is MCP?

Model Context Protocol (MCP) is an open standard that lets AI assistants connect to external tools and data sources. Inception Engine runs as an MCP server, so Claude Desktop (or any MCP client) can call agent functions directly.

## Setup (10 minutes)

### Step 1: Clone and install

```bash
git clone https://github.com/WholeTroutMedia/inception-engine.git
cd inception-engine
pip install -r requirements.txt
```

### Step 2: Configure Anthropic

```bash
cp .env.example .env
```

Edit `.env`:

```
ANTHROPIC_API_KEY=sk-ant-your-key-here
LLM_PROVIDER=anthropic
LLM_MODEL=claude-sonnet-4-20250514
```

### Step 3: Configure Claude Desktop for MCP

Open your Claude Desktop config file:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

Add the Inception Engine server:

```json
{
  "mcpServers": {
    "inception-engine": {
      "command": "python",
      "args": ["-m", "src.mcp_server"],
      "cwd": "/path/to/inception-engine",
      "env": {
        "ANTHROPIC_API_KEY": "sk-ant-your-key-here"
      }
    }
  }
}
```

### Step 4: Restart Claude Desktop

Close and reopen Claude Desktop. You should see Inception Engine tools available in the tools menu.

### Step 5: Boot AVERI in Claude

Type in Claude Desktop:

> "Boot AVERI and show me available agents."

Claude will call the Inception Engine MCP tools and present the agent roster.

## Available MCP Tools

Once connected, Claude Desktop can call:

| Tool | What It Does |
|------|--------------|
| `boot_averi` | Initialize the system, show agents |
| `set_mode` | Switch between IDEATE/PLAN/SHIP/VALIDATE |
| `run_task` | Execute a task through the orchestrator |
| `list_agents` | Show available agents and capabilities |
| `set_session_mode` | Switch between INTEROPERABLE/HELIX/PLAN-DETERMINED |

## Using the Anthropic API Directly

If you prefer programmatic access without Claude Desktop:

```python
from src.core.boot_system import BootSystem
from src.core.orchestrator import InceptionOrchestrator

boot = BootSystem()
session = boot.boot(package_name="Inception Engine (Light Edition)")

orchestrator = InceptionOrchestrator()
result = orchestrator.execute_express_workflow(
    "Build a booking system for a yoga studio"
)
```

## HELIX Mode via MCP

In Claude Desktop, simply say:

> "Switch to HELIX mode and run parallel analysis on this project idea."

The MCP server handles spinning up concurrent agent strands and braiding results back together.

## Limitations

- Claude Desktop MCP requires the desktop app (not claude.ai web)
- MCP tool calls have a context window limit
- VALIDATE mode is simplified in the Light Edition

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Tools not appearing in Claude | Check `claude_desktop_config.json` path and restart |
| Connection refused | Ensure the MCP server path is correct |
| API errors | Verify your Anthropic API key |

## Further Reading

- [MCP Guide](../MCP_GUIDE.md) - Deep dive into MCP integration
- [Agent Registry](../AGENTS.md) - All available agents
- [Back to Setup Index](./README.md)
