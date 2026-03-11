---
description: Release this window's workstream claim and leave a handoff note for the next instance
---

# /handoff

Use this workflow before closing this IDE window or switching to a different project. It releases your workstream claim and writes a brief note so the next instance can pick up exactly where you left off.

## Steps

1. Read `.agents/dispatch/registry.md` to find this window's current row.

2. **Auto-Generate Handoff Note (Article XX):**
   - Synthesize a concise handoff note based on the state of the active files, the recently completed tasks, and current system context.
   - Do NOT ask the user. Zero wait time.

3. Update `.agents/dispatch/registry.md`:
   - Change status from `active` → `handoff`
   - Append a **Handoff Notes** section below the table (or update the existing one):

   ```
   ## Handoff Notes — [workstream] — [timestamp]
   
   **Last Window:** [Window letter]
   **Branch:** [branch]
   **Note:** [user's handoff note]
   **Files touched:** [list any key files modified in this session]
   ```

4. Confirm to the user:
   > ✅ **Handoff complete.** Window [X] has released `[workstream]`.
   > Another window can claim this workstream with `/claim [workstream]`.

## Rules

- Always run `/handoff` before closing if work is mid-flight
- Never just close without handing off — it leaves the registry stale
- The next instance claiming a `handoff` workstream should read the handoff notes before touching any files
