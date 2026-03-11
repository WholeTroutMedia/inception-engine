---
description: Claim a workstream for this IDE window in the dispatch registry
---

# /claim <workstream>

Use this workflow when starting a new session to register this IDE window in the multi-instance dispatch registry. This prevents file conflicts with other active Creative Liberation Engine windows.

## Steps

1. Read `.agents/dispatch/registry.md` to see all currently claimed workstreams.

2. Check if the requested workstream is already claimed by another active instance. If it is (status is NOT `idle` or `handoff`), stop and report the conflict. Suggest an available workstream from the pool.

3. If the workstream is free, update `.agents/dispatch/registry.md`. Replace the idle row (or add a new row) with:

   | Window | Claimed By | Workstream | Branch | Status | Last Seen |
   |--------|-----------|------------|--------|--------|-----------| 
   | [Window letter, e.g. A, B, C â€” pick next available] | CORTEX | [workstream] | [current branch or main] | active | [current timestamp ISO8601] |

// turbo
4. Fire a heartbeat to the live dispatch server (fire-and-forget):
   ```
   POST http://127.0.0.1:5050/api/agents/heartbeat
   { "agent_id": "cle-[window]", "window": "[window letter]", "workstream": "[workstream]", "current_task": "Just claimed workstream", "tool": "cle" }
   ```

5. Confirm to the user:
   > âœ… **Claimed `[workstream]`** â€” This window is registered as Window [X]. No conflicts detected.
   > Ready to work. Run `/status` at any time to see all active instances.


## Available Workstreams

- `genkit-flows` â€” AI orchestration, Genkit package
- `console-ui` â€” v5 Console React UI  
- `engine-core` â€” Core runtime types and utilities
- `synology-mcp` â€” NAS MCP server package
- `zero-day` â€” GTM engine, intake, contracts
- `infra-docker` â€” Docker, NAS deployment, CI
- `comet-browser` â€” Sovereign browser agent
- `spatial-visionos` â€” visionOS / TouchDesigner integration
- `genkit-server` â€” Genkit API server
- `free` â€” General / unspecified work

## Rules

- Never claim a workstream already marked `active` by another window
- Always check the registry BEFORE modifying any files in the project
- If you are resuming a `handoff` workstream, you may claim it and clear the handoff note
