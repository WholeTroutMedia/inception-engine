---
description: NAVD operational protocol â€” how the Perplexity sovereign browser participates as an active dispatch agent in the Creative Liberation Engine mesh
---

# NAVD Agent Protocol

> **Tool:** Perplexity (browser / Sonar)
> **Window:** C0
> **Workstream:** `comet-browser`
> **Role:** Autonomous PROBE agent â€” web research, GitHub browsing, API discovery, competitive intel

NAVD is a **full dispatch mesh participant**, not a passive tool. It claims tasks from the queue, executes them, and hands off results via HANDOFF.md.

---

## ðŸ”„ NAVD Boot Sequence

On every Perplexity session start:

1. **Heartbeat** (fire-and-forget):

   ```
   POST http://127.0.0.1:5050/api/agents/heartbeat
   { "agent_id": "comet-C0", "window": "C0", "workstream": "comet-browser", "tool": "perplexity", "current_task": "boot" }
   ```

2. **Check dispatch queue** for `comet-browser` workstream tasks:

   ```
   GET http://127.0.0.1:5050/api/status
   ```

3. **Check HANDOFF.md** â€” if `phase === 'PROBE'` from `ANTIGRAVITY`, it means Creative Liberation Engine self-dispatched research that NAVD should pick up.

4. **Announce presence** with a compact boot panel (same style as Creative Liberation Engine).

---

## ðŸ“‹ Task Pickup Rules

NAVD autonomously picks up tasks that match **any** of these criteria:

- Workstream is `comet-browser`
- Title/description contains: `PROBE`, `research`, `scrape`, `browse`, `API discovery`, `competitive intel`, `documentation`, `GitHub`
- Task was created with `assigned_to_capability: "browser"`

**NAVD does NOT pick up:**

- TypeScript build tasks
- File write / code implementation tasks
- Docker / infra tasks
- Tasks in any other workstream unless explicitly assigned

---

## ðŸ“¤ NAVD Handoff Format

When NAVD completes a PROBE, write to `HANDOFF.md` at repo root:

```json
{
  "from": "NAVD",
  "phase": "PROBE",
  "task": "[task title]",
  "taskId": "[dispatch task ID]",
  "workstream": "comet-browser",
  "agent_id": "comet-C0",
  "outputs": [
    "URL or .agents/research/[filename].md path where findings were written"
  ],
  "next": "[EXACT imperative directive for Creative Liberation Engine â€” what to build, which files]",
  "context": "[Key facts, decisions, what was abandoned and why]",
  "timestamp": "[ISO 8601]",
  "veraMemoryRef": null,
  "qa_status": "pass"
}
```

Then **resolve the task** in dispatch:

// turbo

```
PATCH http://127.0.0.1:5050/api/tasks/:id/resolve
{ "status": "done", "agent_id": "comet-C0", "handoff_note": "[short summary]" }
```

---

## ðŸ§  Research Output Format

Save research artifacts to: `.agents/research/[taskId]-[slug].md`

Each research file must include:

- **Task** reference
- **Sources** (with URLs and retrieval date)
- **Key Findings** (bulleted, LOGD-ready for memory write)
- **Recommended Next Step** (the exact `next` directive for HANDOFF.md)
- **What was NOT found / abandoned**

---

## ðŸ¤ Collaboration Rules

| Scenario | Action |
|----------|--------|
| NAVD finds a task needs code work | Write HANDOFF.md (PROBE) â†’ Creative Liberation Engine picks up for PLAN |
| NAVD finds a task is already in PLAN | Skip â€” Creative Liberation Engine has it |
| NAVD and Creative Liberation Engine overlap on `comet-browser` | NAVD owns it; Creative Liberation Engine defers |
| Task requires both web research + code | NAVD does PROBE â†’ hands off â†’ Creative Liberation Engine does PLAN+SHIP |

---

## ðŸ”‘ Key URLs (always available, no config needed)

```
Dispatch server:  http://127.0.0.1:5050
Status API:       http://127.0.0.1:5050/api/status
Task queue:       http://127.0.0.1:5050/api/tasks?status=queued
Heartbeat:        POST http://127.0.0.1:5050/api/agents/heartbeat
Genkit engine:    http://127.0.0.1:4100/health
Repo root:        C:\\Creative-Liberation-Engine\
HANDOFF.md:       C:\\Creative-Liberation-Engine\HANDOFF.md
Research dir:     C:\\Creative-Liberation-Engine\.agents\research\
```
