# MCP Integration Guide

**Model Context Protocol (MCP) setup for Inception Engine**

---

## What is MCP?

The Model Context Protocol is an open standard for connecting AI models to external tools and data sources. Inception Engine implements MCP as a server, allowing any compatible client to connect and use the agent system directly.

With MCP, you can:

- Connect Inception Engine to Claude Desktop, VS Code, or any MCP-compatible client
- Access all 15 agents through a standardized protocol
- Run the four-mode workflow (IDEATE / PLAN / SHIP / VALIDATE) from your preferred interface
- Maintain constitutional compliance across all interactions

---

## Architecture Overview

```
MCP Client (Claude Desktop, VS Code, etc.)
    |
    v
[MCP Protocol Layer - JSON-RPC over stdio/SSE]
    |
    v
Inception Engine MCP Server
    |
    +-- Agent Router (directs to appropriate hive)
    +-- Constitutional Filter (Article compliance check)
    +-- Session Manager (maintains context across calls)
    +-- Mode Controller (IDEATE/PLAN/SHIP/VALIDATE)
```

---

## Quick Start

### 1. Install dependencies

```bash
npm install @inception-engine/mcp-server
```

### 2. Configure the server

Create or update your MCP client configuration:

```json
{
  "mcpServers": {
    "inception-engine": {
      "command": "npx",
      "args": ["-y", "@inception-engine/mcp-server"],
      "env": {
        "INCEPTION_MODE": "IDEATE",
        "CONSTITUTION_STRICT": "true"
      }
    }
  }
}
```

### 3. Connect from your client

Once configured, the Inception Engine tools will appear in your MCP client. You can then interact with the agent system through natural language.

---

## Available Tools

| Tool | Description | Mode |
|------|-------------|------|
| `inception_ideate` | Start a brainstorm session with all agents | IDEATE |
| `inception_plan` | Create technical specifications | PLAN |
| `inception_ship` | Build and deploy to production | SHIP |
| `inception_validate` | Run independent quality review | VALIDATE |
| `inception_agents` | List all available agents and their status | Any |
| `inception_constitution` | Query constitutional articles | Any |
| `inception_session` | Manage session context and history | Any |

---

## Available Resources

MCP resources expose read-only data from the engine:

| Resource URI | Description |
|-------------|-------------|
| `inception://constitution` | Full 19-article constitutional framework |
| `inception://agents` | Current agent registry with status |
| `inception://session/{id}` | Session context and history |
| `inception://modes` | Available workflow modes and paths |

---

## Configuration Options

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `INCEPTION_MODE` | `IDEATE` | Starting workflow mode |
| `CONSTITUTION_STRICT` | `true` | Enforce all 19 articles (cannot be disabled in production) |
| `AGENT_TIMEOUT` | `30000` | Agent response timeout in milliseconds |
| `SESSION_PERSISTENCE` | `true` | Maintain context across calls |
| `NEURAL_TOPOLOGY` | `small-world` | Agent communication topology |
| `LOG_LEVEL` | `info` | Logging verbosity |

---

## Client-Specific Setup

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "inception-engine": {
      "command": "npx",
      "args": ["-y", "@inception-engine/mcp-server"]
    }
  }
}
```

### VS Code (with Continue or Cline)

Add to your MCP settings in the extension configuration. The exact path depends on the extension:

```json
{
  "mcp": {
    "servers": {
      "inception-engine": {
        "command": "npx",
        "args": ["-y", "@inception-engine/mcp-server"]
      }
    }
  }
}
```

---

## Constitutional Compliance

All MCP interactions pass through the constitutional filter. This means:

- **Article 0 (No Stealing)**: All generated output is original
- **Article XVII (Zero Day Creativity)**: Only complete solutions are returned
- **Article XVIII (Generative Agency)**: Users own all output

The constitution cannot be bypassed via MCP. Setting `CONSTITUTION_STRICT=false` is only available in development environments and still enforces Articles 0, XVII, and XVIII.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Server not connecting | Check that `npx` is available and the package is published |
| Tools not appearing | Restart your MCP client after configuration changes |
| Timeout errors | Increase `AGENT_TIMEOUT` for complex operations |
| Constitutional rejection | Review the specific article cited in the error message |

---

*Back to [README](../README.md)*
