---
description: Show a compact status panel of all active IDE windows and system health
---

# /status

// turbo-all

Prints a compact, scannable overview of the entire multi-window orchestration state.
Uses the **live dispatch server registry** (not the stale registry.md file).

## Steps

// turbo

1. Call `GET http://127.0.0.1:5050/api/agents` â€” live agent registry with stale detection.
   Fall back to reading `.agents/dispatch/registry.md` if dispatch is offline.

// turbo
2. Call `GET http://127.0.0.1:5050/api/status` for task queue summary.

// turbo
3. Read `../brainchild-v4/CORE_FOUNDATION/system-status.json` for CORTEX health.

1. Print the following panel:

```
â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
â•‘  CREATIVE LIBERATION ENGINE â€” DISPATCH STATUS              â•‘
â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

ðŸªŸ  LIVE WINDOWS  [From GET /api/agents â€” real-time]
  [For each agent, show:]
  ðŸŸ¢ Window [X]  â”‚  [workstream]  â”‚  [current_task]  â”‚  last seen: [Ns ago]   â† active (<30s)
  ðŸŸ¡ Window [X]  â”‚  [workstream]  â”‚  [current_task]  â”‚  last seen: [Nm ago]   â† idle (30s-5m)
  ðŸ”´ Window [X]  â”‚  [workstream]  â”‚  â€”              â”‚  last seen: [Nm ago]   â† stale (>5m)

ðŸ“¥  TASK QUEUE
  Queued: [n]  â”‚  Active: [n]  â”‚  Done: [n]

âš™ï¸  SYSTEM
  CORTEX: STRATA âœ…  LOGD âœ…  PRISM âœ…
  Health: [status]  â”‚  Boot #[n]

ðŸ—ºï¸  FREE WORKSTREAMS
  [List any workstreams from the pool not currently claimed]
```

1. If no agents are registered (empty registry):
   > All windows unregistered. Send any message in a window to auto-register via heartbeat,
   > or run `/claim <workstream>` to explicitly register.

## Notes

- Reads live `/api/agents` â€” staleness is computed server-side from `last_seen`
- Falls back to `registry.md` if dispatch is offline (note it may be stale)
- This workflow is read-only and safe to run from any window

Prints a compact, scannable overview of the entire multi-window orchestration state. Run this at any time to see what every instance is doing.

## Steps

// turbo

1. Read `.agents/dispatch/registry.md`

// turbo
2. Read `../brainchild-v4/CORE_FOUNDATION/system-status.json`

1. Print the following panel:

```
â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
â•‘  CREATIVE LIBERATION ENGINE â€” DISPATCH STATUS              â•‘
â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

ðŸªŸ  ACTIVE WINDOWS
  [For each row in registry, show:]
  Window [X]  â”‚  [workstream]  â”‚  [status]  â”‚  Last seen: [timestamp]

âš™ï¸  SYSTEM
  CORTEX: STRATA âœ…  LOGD âœ…  PRISM âœ…
  Health: [status]  â”‚  Boot #[n]  â”‚  [success_rate]% success

ðŸ—ºï¸  FREE WORKSTREAMS
  [List any workstreams from the pool not currently claimed]
```

1. If no windows are active, show:
   > All slots idle. Run `/claim <workstream>` to register this window.

## Notes

- This workflow reads only â€” it never writes to any files
- Safe to run at any time, from any window
