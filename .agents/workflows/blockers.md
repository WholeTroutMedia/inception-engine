---
description: File or claim a blocker â€” allows browser agents to hand off terminal/sudo/password tasks to an IDE window
---

# /blockers

The BLOCKER protocol bridges browser agents (NAVD, Perplexity, Chrome) and IDE windows.
When a browser agent hits a terminal wall, it writes a blocker. Any open IDE window picks it up.

**Activates on:**

- `/blockers`
- "I'm blocked on a terminal task"
- "need someone to run this"
- "file a blocker"
- "check for blockers"

---

## For BROWSER Agents â€” Filing a Blocker

When you cannot proceed because the task requires a terminal, SSH, sudo, or password:

### Step 1 â€” Write the blocker

Append a row to `.agents/dispatch/blockers.md`:

```
| BLK-[YYYYMMDD]-[NNN] | [P0|P1|P2] | [terminal|password|sudo|human|blocking-deploy] | [your-agent-id] | [task-id or description] | [What you need done â€” be specific] | â€” | OPEN |
```

> **P0** = deploy is broken NOW. **P1** = blocking current task. **P2** = needed but not urgent.

### Step 2 â€” Notify via dispatch

// turbo

```
POST http://127.0.0.1:5050/api/blockers
{
  "id": "BLK-[YYYYMMDD]-[NNN]",
  "severity": "P1",
  "type": "terminal",
  "filed_by": "[your-agent-id]",
  "task_id": "[related task ID]",
  "description": "[exactly what command or action is needed]"
}
```

### Step 3 â€” Enter standby

Report: `ðŸš§ Blocker filed [BLK-ID]. Waiting for an IDE agent to claim it.`
Continue any other work that is not blocked. Do not halt the dispatch session.

---

## For IDE Agents â€” Checking & Claiming Blockers

// turbo

### Step 1 â€” Check for open blockers (run on every boot and heartbeat)

```
GET http://127.0.0.1:5050/api/blockers?status=OPEN
```

Fall back to reading `.agents/dispatch/blockers.md` if dispatch is offline.

### Step 2 â€” Surface P0/P1 immediately

If any `OPEN` blockers exist with severity `P0` or `P1`:

```
âš¡ BLOCKER DETECTED
  ID:          [BLK-ID]
  Severity:    [P0|P1]
  Filed by:    [agent-id]
  Task:        [task-id]
  Needs:       [description]

  Shall I handle this first? (yes / skip)
```

P2 blockers are shown but don't interrupt the current task.

### Step 3 â€” Claim the blocker

// turbo

```
POST http://127.0.0.1:5050/api/blockers/[BLK-ID]/claim
{ "agent_id": "[your-agent-id]" }
```

Update `.agents/dispatch/blockers.md` â€” change status to `CLAIMED`, set `Claimed By`.

### Step 4 â€” Execute and resolve

Run the terminal command, perform the SSH action, enter the password (if stored in Vault), or execute the blocker task.

### Step 5 â€” Resolve

// turbo

```
POST http://127.0.0.1:5050/api/blockers/[BLK-ID]/resolve
{ "agent_id": "[your-agent-id]", "note": "[what was done]" }
```

Update the blocker row: status â†’ `RESOLVED`.
Notify the original filing agent via `POST /api/agents/heartbeat` or dispatch `notify_agent`.

---

## Blocker Types Reference

| Type | When to use |
|------|-------------|
| `terminal` | Needs SSH, shell command, or local process |
| `password` | Needs credential not in Vault |
| `sudo` | Needs elevated privileges on NAS or server |
| `human` | Needs a human decision or physical action |
| `blocking-deploy` | CI/CD pipeline is broken, unblocks multiple agents |

---

## Rules

- Browser agents NEVER block silently â€” always file a blocker and continue other work
- IDE agents ALWAYS check blockers on boot â€” P0/P1 override current task if user approves
- File blockers in dispatch server first, `.agents/dispatch/blockers.md` as offline fallback
- Resolved blockers stay in the file (never delete rows) â€” change status to `RESOLVED`
