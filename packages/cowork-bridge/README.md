# @inception/cowork-bridge

MCP wrapper layer that connects Creative Liberation Engine's dispatch server to Claude Cowork / Claude Desktop.

## Overview

This package wraps IE dispatch MCP tools with:
- **Ownership enforcement** -- agents can only access tools permitted by `agent-ownership.json`
- **Model routing** -- routes requests to optimal LLM provider based on task complexity
- **Context generation** -- builds rich context for agent sessions
- **Config loading** -- reads `claude_desktop_config.json` for MCP server configuration

## Architecture

```
Cowork Desktop / Claude Desktop
  |
  +-- cowork-bridge (this package)
       |
       +-- mcp-wrapper.ts    -> Dispatch REST API with ownership gates
       +-- model-router.ts   -> Multi-provider LLM routing
       +-- context-generator.ts -> Session context builder
       +-- config-loader.ts  -> Config file parser
       +-- types.ts          -> Shared type definitions
```

## Setup

1. Copy `claude_desktop_config.example.json` from repo root to your Claude Desktop config location
2. Update `IE_NAS_HOST` to point to your NAS IP
3. Build: `pnpm build`
4. Restart Claude Desktop / Cowork

## MCP Servers

| Server | Package | Tools |
|--------|---------|-------|
| `inception-dispatch` | `packages/dispatch` | list_tasks, claim_task, complete_task, add_task, delegate_task, etc. |
| `inception-browser` | `packages/inception-browser` | browser_navigate, browser_screenshot, browser_text, etc. |
| `inception-scribe` | `packages/genkit` | scribe.remember, scribe.recall, scribe.compact |
| `inception-registry` | `packages/agents` | registry.get_agents, registry.get_hive, registry.invoke_agent |

## Agent Ownership

Each agent has a policy in `agent-ownership.json` controlling which tools and workstreams it can access. The `enforceOwnership()` function in `mcp-wrapper.ts` checks every tool call against these policies before routing to the dispatch server.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DISPATCH_URL` | `http://127.0.0.1:5050` | Dispatch server base URL |
| `CHROMA_URL` | `http://127.0.0.1:8000` | ChromaDB for SCRIBE memory |
| `HEADLESS` | `true` | Browser automation mode |