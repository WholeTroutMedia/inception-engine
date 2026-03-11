---
description: Autonomous task polling loop â€” after completing a task, immediately pick up the next suitable one without waiting for human input
---

# /auto-loop

Activates the continuous agent execution loop. Once enabled, this window will automatically
pick up the next available task after completing its current one. No human intervention required
unless a password, terminal command, or explicit human decision is needed.

**Activates on:**

- `/auto-loop`
- "keep going"
- "run until the queue is empty"
- "don't stop between tasks"
- "autonomous mode"

---

## Protocol

### On Task Completion

After every `complete_task` or `force_complete`, immediately run the following sequence before
reporting back to the user:

// turbo
**Step 1 â€” Check for P0/P1 blockers first:**

```
GET http://127.0.0.1:5050/api/blockers?status=OPEN&severity=P0,P1
```

If any exist â†’ surface them (see `/blockers` workflow). Handle P0 before picking up new task.

// turbo
**Step 2 â€” Poll for next task:**

```
GET http://127.0.0.1:5050/api/tasks/next?agent_capability=[my-workstream]&agent_id=[my-agent-id]
```

The server returns the highest-priority unclaimed task matching this agent's capabilities.
Falls back to `GET /api/tasks?status=queued` if `/api/tasks/next` is unavailable.

**Step 3 â€” Claim and execute:**
If a task is returned:

// turbo

```
POST http://127.0.0.1:5050/api/tasks/claim
{ "task_id": "[id]", "agent_id": "[my-agent-id]", "capabilities": ["[workstream]"] }
```

Immediately begin executing. Update heartbeat with new `current_task`.

**Step 4 â€” Report loop status:**

```
ðŸ”„ AUTO-LOOP: Task [prev-id] âœ… â†’ Claimed [new-id] "[title]" (P[n])
```

### On Empty Queue

If no tasks match this window's capabilities:

```
ðŸ˜´ STANDBY â€” Queue empty for [workstream]. Polling again in 5 min.
   Run /pickup to check manually, or /auto-loop off to exit.
```

Do not close the session. Remain registered with the dispatch server.

### On Human-Required Blocker

If the next task has `type: terminal | password | sudo`:

1. File a blocker if browser agent (see `/blockers`)
2. If IDE agent â†’ attempt to execute with approval gate
3. Stop the auto-loop and surface the blocker to the user:

   ```
   â¸ï¸  AUTO-LOOP PAUSED â€” Next task requires: [terminal | password | sudo]
   Task: [id] "[title]"
   Shall I proceed? (yes / skip / stop loop)
   ```

---

## Commands

| Command | Effect |
|---------|--------|
| `/auto-loop` | Enable loop for this session |
| `/auto-loop off` | Disable â€” complete current task then stop |
| `/auto-loop status` | Show current loop state and next task in queue |

---

## Rules

- Never claim a task assigned `assigned_to_agent` that is NOT this window's agent_id
- Always send heartbeat after each task claim with updated `current_task`
- Auto-loop respects workstream affinity â€” only pick tasks matching declared capabilities
- P0/P1 blockers interrupt the loop (with user approval gate)
- Loop is session-scoped â€” does not persist across conversation restarts
