---
description: Re-ingest AGENTS.md, skills, and workflows mid-session without restarting the IDE window â€” triggered manually or in response to a capability_update SSE signal
---

# /capability-reload â€” Mid-Session Context Refresh

Use this workflow when:

- You receive a `capability_update` SSE event from the dispatch server
- You see `âš ï¸ Capabilities updated since boot` in the boot panel
- A Wave sprint just shipped new skills, workflows, or AGENTS.md changes
- You notice behavior that suggests your context is outdated

---

## Step 1 â€” Check Current Capability Version

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:5050/api/capabilities/version" -Method GET | ConvertTo-Json
```

Note the `hash`, `timestamp`, and `changed_files`. Compare to what you loaded at boot.

---

## Step 2 â€” Re-Read Changed Files

Based on `changed_files`, re-read the relevant instruction files:

```
If AGENTS.md changed:
  â†’ Re-read C:\\Creative-Liberation-Engine\AGENTS.md
  â†’ Re-apply boot sequence mentally (CORTEX roles, constitutional laws, turbo policy)

If .agents/skills/* changed:
  â†’ Re-read affected SKILL.md files
  â†’ Update active skill protocols accordingly

If .agents/workflows/* changed:
  â†’ Re-read affected workflow .md files
  â†’ Register any new slash commands
```

### Quick Reload All (when unsure what changed)

Re-read every instruction source:

1. `AGENTS.md` â€” primary boot protocol
2. `.agents/skills/ideate/SKILL.md`
3. `.agents/skills/ship/SKILL.md`
4. `.agents/skills/validate/SKILL.md`
5. `.agents/skills/scribe/SKILL.md`
6. All `.agents/workflows/*.md` files

---

## Step 3 â€” Confirm to User

After re-reading, surface:

```
ðŸ”„ Context refreshed â€” operating on capability version [hash]
   Changed: [list of files]
   Updated: [timestamp]
   CORTEX trinity: STRATA âœ… LOGD âœ… PRISM âœ…
```

---

## Step 4 â€” Resume Work

Continue with the task that was interrupted. No full restart required.

---

## Optional: Manual Broadcast (after shipping new skills)

If you just shipped a new skill or workflow and want other windows to know:

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:5050/api/capabilities/broadcast" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"changed_files": [".agents/skills/new-skill/SKILL.md"], "source": "manual"}'
```

This fires a `capability_update` event to all connected IDE windows and CORTEX Mobile.
