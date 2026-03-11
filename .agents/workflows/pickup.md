---
description: Pick up the next available task from the Inception Dispatch Server â€” no workspace, no slash commands, no configuration needed
---

# pickup (natural language â€” trigger phrases)

**Activates on:**

- "pick up a task" / "get to work" / "start" / "what's next"
- "grab a task" / "find me something" / "pick up where we left off"
- Any similar intent to begin work

---

## Steps

// turbo

1. **Check for open blockers first** (P0/P1 interrupt everything):

   ```
   GET http://127.0.0.1:5050/api/blockers?status=OPEN
   ```

   If P0/P1 blockers exist, surface them immediately before claiming a new task.

// turbo
2. **Use the smart next-task endpoint** (server picks the best match for this agent):

   ```
   GET http://127.0.0.1:5050/api/tasks/next?agent_id=cle-[window]&agent_capability=[workstream]
   ```

   Falls back to full queue scan if the endpoint is unavailable:

   ```
   GET http://127.0.0.1:5050/api/tasks?status=queued
   GET http://127.0.0.1:5050/api/status
   ```

   Filter: exclude workstreams already `active` in another agent. Sort P0â†’P3, oldest first.

1. If the server queue is completely empty (`count: 0`), gracefully fallback to checking the `dispatch.json` in the active repository to catch unprocessed backlog, AND open `.agents/dispatch/registry.md` to claim any `open` workstream from the "Workstream Pool".
   - Claim an open workstream from `registry.md` and immediately execute whatever tasks are relevant to that workstream.

2. If a specific task or workstream is named in the user's message, use that instead.

// turbo
4. Claim the task via MCP tool `claim_task`:

   ```json
   { "task_id": "[chosen ID]", "agent_id": "cle-[window-letter]", "tool": "cle" }
   ```

   (Pick the next available window letter based on what's already in the status response.)

// turbo
5. Run `git -C "C:\\Creative-Liberation-Engine" pull origin main --rebase` silently.

1. Announce and begin:

   ```
   âœ… Window [X] â€” Claimed [workstream]
   ðŸ“‹ [Task ID]: [title]
   Priority: [P#]

   Starting now...
   ```

   Then proceed immediately. Do not ask for permission.

2. **On task completion â€” auto-continue** (if `/auto-loop` is active or user said "keep going"):
   Immediately repeat from Step 1 without waiting for the user.

---

## If Queue is Empty

Report: "ðŸ˜´ Queue empty. Add a task with `add_task`, tell me what to work on, or I'll standby."

## Rules

- Project root is always `C:\\Creative-Liberation-Engine\` â€” never ask the user for it
- Dispatch server is always at `http://127.0.0.1:5050` â€” no configuration needed
- Never claim a workstream already held by an active agent in the status response
- Always check blockers before claiming â€” P0/P1 blockers take priority over new task claims
