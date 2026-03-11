---
description: Pull a manual heartbeat to explicitly register or test presence
---

# /heartbeat

// turbo-all

Use this workflow to manually trigger a heartbeat from this IDE window to the dispatch server.
Heartbeats are traditionally sent automatically on every response (as per the `AGENTS.md` boot protocol). Use this manual trigger to debug connectivity or immediately register without working.

## Steps

// turbo

1. Fire a heartbeat to the dispatch server:

   ```
   POST http://127.0.0.1:5050/api/agents/heartbeat
   { "agent_id": "cle-[window]", "window": "[window letter]", "workstream": "[workstream]", "current_task": "Manually testing heartbeat via /heartbeat", "tool": "cle" }
   ```

2. Confirm success:
   > ðŸ’“ Heartbeat manually sent. This window is now registered as `active`.
