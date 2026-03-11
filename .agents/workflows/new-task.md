---
description: Add a new task to the Creative Liberation Engine dispatch queue from any IDE window â€” works whether the NAS dispatch server is online or offline
---

# /new-task <description>

Adds a new task to the queue. Tries the live NAS dispatch server first; falls back to local `task-queue.md` if offline. Any window can run this at any time.

**Activates on:**

- `/new-task <what needs to be done>`
- "add a task to the queue"
- "queue this up for later"
- "create a task for [X]"

---

## Steps

// turbo-all

### Step 1 â€” Parse Task Details

Extract from the user's message:

| Field | Source | Default |
|-------|--------|---------|
| `description` | User message (required) | â€” |
| `workstream` | Match keywords to pool (see table below) | `free` |
| `priority` | "urgent" / "critical" â†’ P1; "low" / "later" â†’ P3; else â†’ P2 | P2 |

**Workstream auto-detection** (match keywords in description):

| Keywords | Workstream |
|----------|-----------|
| genkit, flow, AI, model, CORTEX, LOGD, STRATA | `genkit-flows` |
| console, UI, dashboard, screen, react, frontend | `console-ui` |
| docker, deploy, CI, NAS, Forgejo, container | `infra-docker` |
| zero-day, GTM, intake, contract, client | `zero-day` |
| browser, tab, comet, playwright | `comet-browser` |
| figma, design, stitch, visual | `console-ui` |
| genkit server, API server, port 4100 | `genkit-server` |
| else | `free` |

**Generate Task ID:** `T[YYYYMMDD]-[NNN]` â€” use today's date. Determine `[NNN]` by reading the current queue and incrementing the highest existing number for today's date.

---

### Step 2 â€” Try Live Dispatch Server

// turbo

```powershell
$body = @{
    title       = "[description]"
    workstream  = "[workstream]"
    priority    = "[P1/P2/P3]"
    added_by    = "Window D"
    status      = "queued"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://127.0.0.1:5050/api/tasks" -Method POST `
    -ContentType "application/json" -Body $body -TimeoutSec 3
```

- **If success (HTTP 201):** task is live on the NAS. Note ID returned. Skip to Step 4.
- **If offline / error:** proceed to Step 3 (local fallback).

---

### Step 3 â€” Offline Fallback: Write to task-queue.md

Add the task row to the Active Tasks table in `.agents/dispatch/task-queue.md`:

```markdown
| [T-ID] | [description] | `[workstream]` | [P#] | â€” | queued | [YYYY-MM-DD] |
```

Insert above the `---` separator that ends the Active Tasks table.

---

### Step 4 â€” Confirm

Output:

```
âœ… Task queued â€” [T-ID]

  [description]
  Workstream:  [workstream]
  Priority:    [P#]
  Status:      queued
  Dispatch:    [ðŸŒ NAS live | ðŸ“‚ local cache]

Any window can claim it with: /claim [workstream]
```

---

### Step 5 â€” Offer to Claim Immediately

If the current window's workstream matches the new task's workstream, or the workstream is `free`:

> "This task matches your current workstream. Want me to claim and start it now?"

If yes â†’ execute the work immediately, updating the task status to `active`.

---

## Task ID Generation Rule

1. Read all existing task IDs from both Active and Completed tables in `task-queue.md`
2. Filter to IDs matching today's date (`T[YYYYMMDD]-*`)
3. Take the highest `NNN`, add 1 â†’ that's your new ID
4. If no tasks exist for today, start at `T[YYYYMMDD]-001`

---

## Rules

- Always attempt live NAS first (`http://127.0.0.1:5050/api/tasks`) â€” it's the source of truth
- Gracefully fall back to local `task-queue.md` without asking
- Never create a duplicate task â€” check if a similar description already exists in the queue
- Generate a properly formatted Task ID â€” never use placeholder values
- This workflow works from any window, any workstream
