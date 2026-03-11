# Claude Cowork + Creative Liberation Engine Setup Guide

> Connect IE's 36-agent constitutional system to Claude Cowork via MCP servers.

## Prerequisites

- Claude Cowork desktop app (Claude Pro/Max subscription)
- Dispatch server running on NAS at `127.0.0.1:5050`
- Node.js 20+ installed

## Quick Start

### 1. Build MCP Servers

```bash
cd packages/mcp-servers/inception-scribe && npm install && npm run build
cd packages/mcp-servers/inception-registry && npm install && npm run build
```

### 2. Configure Cowork

Add to your `claude_desktop_config.json` (typically at `~/.config/claude/claude_desktop_config.json` on Linux or `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "inception-dispatch": {
      "url": "http://127.0.0.1:5050/sse",
      "transport": "sse"
    },
    "inception-scribe": {
      "command": "node",
      "args": ["packages/mcp-servers/inception-scribe/dist/mcp-server.js"],
      "env": {
        "IE_NAS_BASE": "/volume1/creative-liberation-engine"
      }
    },
    "inception-registry": {
      "command": "node",
      "args": ["packages/mcp-servers/inception-registry/dist/mcp-server.js"],
      "env": {
        "IE_DISPATCH_URL": "http://127.0.0.1:5050",
        "IE_AVERI_DIR": ".averi"
      }
    }
  }
}
```

### 3. Verify Connection

In Cowork, try:
- "Show me the dispatch queue" â†’ triggers `inception-dispatch` tools
- "What agents are active?" â†’ triggers `registry_get_agents`
- "Remember that we completed the spatial intelligence pipeline" â†’ triggers `scribe_remember`

## Available MCP Servers

| Server | Transport | Tools | Description |
|--------|-----------|-------|-------------|
| `inception-dispatch` | SSE (remote) | 15+ | Task queue, agent coordination, vault |
| `inception-scribe` | stdio (local) | 5 | 3-tier memory (episodic/semantic/procedural) |
| `inception-registry` | stdio (local) | 6 | Agent status, hive state, boot config |

## Tool Reference

### Dispatch Tools
- `list_tasks` â€” Query tasks by status, project, workstream, agent
- `claim_task` â€” Atomically claim a queued task
- `complete_task` â€” Mark task done with artifacts
- `add_task` â€” Queue new work
- `delegate_task` â€” Assign to specific agent
- `notify_agent` â€” Send inter-agent messages
- `spawn_subtask` â€” Create child tasks
- `get_status` â€” Full dispatch board snapshot
- `get_secret` / `set_secret` / `list_secrets` â€” Vault operations

### Scribe Tools
- `scribe_remember` â€” Store memory to episodic/semantic/procedural tier
- `scribe_recall` â€” Search memories by query, tags, tier
- `scribe_compact` â€” Promote frequently-accessed memories to higher tiers
- `scribe_get_context` â€” Get all session context
- `scribe_stats` â€” Memory system statistics

### Registry Tools
- `registry_get_agents` â€” Live agent status from dispatch
- `registry_get_hive` â€” Agents in a specific hive
- `registry_get_modes` â€” IDEATE/PLAN/SHIP/VALIDATE state
- `registry_invoke_agent` â€” Delegate task to agent
- `registry_get_boot_config` â€” System configuration
- `registry_get_charters` â€” Agent charter files

## Architecture

```
Claude Cowork (Desktop GUI)
  |
  +-- SSE --> inception-dispatch (127.0.0.1:5050)
  +-- stdio --> inception-scribe (local process)
  +-- stdio --> inception-registry (local process)
  |
  User: "Research competitors and build a report"
  Cowork -> dispatch.add_task -> ATHENA routes to AURORA hive
  BOLT does research -> scribe.remember logs context
  Result written to local filesystem
```

**Agent**: COMET | **Issue**: #30 | **Phase**: A â€” Foundation