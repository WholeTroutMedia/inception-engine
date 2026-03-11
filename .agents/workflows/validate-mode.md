---
description: Activate VALIDATE mode â€” LOGD + NORTHSTAR run full quality assurance, constitutional compliance, and launch readiness checks. The 4th mode in the IDEATEâ†’PLANâ†’SHIPâ†’VALIDATE cycle. Final gate before /release.
---

# /validate-mode [feature]

The full **VALIDATE** operational mode â€” distinct from `/validate` (pre-commit diff review). This is the launch readiness gate after SHIP completes. LOGD + NORTHSTAR run all 6 quality sections and produce a structured verdict report.

## When to Use

- After `/ship` completes a significant feature (HANDOFF.md in `phase: "SHIP"`)
- Before running `/release` on any multi-package or service-level change
- When a new service is added to the GENESIS stack
- User says "is this ready?", "run full QA", "launch ready check"

---

## Steps

// turbo
0. **Heartbeat** (fire-and-forget):

   ```powershell
   Invoke-RestMethod -Method POST -Uri "http://127.0.0.1:5050/api/agents/heartbeat" -ContentType "application/json" -Body '{"agent_id":"cle-a","workstream":"validate","current_task":"VALIDATE mode â€” launch readiness gate"}'
   ```

1. **Read HANDOFF.md** â€” verify `phase: "SHIP"`. If missing/wrong phase, ask user which feature to validate.

2. **Determine scope:**
   - Single package / small change â†’ Quick VALIDATE (Sections 1 + 3 only)
   - Full feature / new service / multi-package â†’ Full VALIDATE (all 6 sections)

   State explicitly: `"Running Full VALIDATE"` or `"Running Quick VALIDATE"`.

3. **Run all applicable sections:**

---

### Section 1 â€” Structural Integrity

```powershell
# TypeScript â€” must be zero errors
npx tsc --noEmit -p packages/<package>/tsconfig.json
# Or workspace-wide:
pnpm --filter "@inception/*" type-check
```

- **Pass:** Zero errors. Zero `// @ts-ignore` / `// @ts-expect-error`.
- For Genkit flows: input/output schemas defined with Zod, flow registered in `server.ts`
- All new public APIs exported from `index.ts`

---

### Section 2 â€” Test Coverage

```powershell
pnpm test
```

- All tests pass. Zero skipped without documented reason.
- New core logic: happy path + â‰¥ 2 edge case tests
- New REST endpoints: success + error response integration tests
- New Genkit flows: at least one end-to-end invocation test
- If gaps exist: write missing tests, then re-run

---

### Section 3 â€” Constitutional Review (NORTHSTAR)

| Article | Check |
|---------|-------|
| **I** (Sovereignty) | No new cloud deps that could be self-hosted? |
| **IV** (Quality) | TypeScript strict, no `any`? |
| **IX** (No MVP) | Feature complete? No stubs or `// TODO`? |
| **XX** (Automation) | Any manual steps that could be automated? |
| **XIV** (Memory) | Should this be written to SCRIBE? |

**If any article fails:** Stop. Return to SHIP, fix violation, re-run `/validate-mode`.

---

### Section 4 â€” UI / Design System Audit *(skip if no UI changes)*

```powershell
# Zero hardcoded colors allowed (exceptions: token definitions in index.css only)
Select-String -Path "packages/*/src/**/*.tsx","packages/*/src/**/*.css" -Pattern "#[0-9a-fA-F]{3,6}|rgb\(|hsl\("
```

- Responsive: renders correctly at 1440px, 768px, 375px
- Accessibility (BEACON): aria-labels, WCAG AA contrast (4.5:1), keyboard nav, no bare onClick on divs

---

### Section 5 â€” API Contract Verification *(skip if no API changes)*

- No breaking changes to existing consumers (console, other services)
- All endpoints use the standard try/catch error pattern:

  ```typescript
  res.json({ success: true, data: result });
  // or
  res.status(500).json({ success: false, error: message });
  ```

---

### Section 6 â€” Launch Readiness Checklist

```
[ ] TypeScript: zero errors
[ ] Tests: all pass, new code covered
[ ] Constitutional: all articles pass
[ ] UI: design tokens, responsive, accessible (if applicable)
[ ] API: backward compatible, errors handled (if applicable)
[ ] Exports: all public APIs in index.ts
[ ] Dispatch: task marked done in task-queue.md
[ ] SCRIBE: memory written if significant pattern or decision
```

---

1. **Produce VALIDATE Report:**

   ```
   ## VALIDATE Report â€” [Feature] â€” [Timestamp]

   **Verdict:** âœ… LAUNCH READY | âš ï¸ CONDITIONALLY READY | âŒ BLOCKED

   ### Passed
   - [checks with âœ…]

   ### Warnings (non-blocking)
   - [concerns that don't block launch]

   ### Blockers (fix before /release)
   - [failures with file:line references]

   ### Recommended SCRIBE Write
   [What LOGD should commit to memory]
   ```

// turbo
5. **On LAUNCH READY** â€” write SCRIBE memory:

   ```
   POST http://127.0.0.1:4100/remember
   {
     "type": "episodic",
     "content": "VALIDATED LAUNCH READY: <feature>. All constitutional and quality checks passed.",
     "tags": ["validate", "<topic-slug>", "launch-ready"]
   }
   ```

1. **On LAUNCH READY** â€” Action Chain (Article XX):

   - **Do not offer options or wait for user input.**
   - If the feature involves a deployable service: Run `/release` (commit + PR + deploy) automatically.
   - Otherwise: Run `/commit "<message>"` to secure the code.
   - Immediately run `/pickup` or process the next task from the dispatch queue. Zero wait.

   **On BLOCKED:** Return to SHIP mode. Fix blockers. Re-run `/validate-mode`.

---

## Notes

- Lead: LOGD (Analyst) + NORTHSTAR (Constitutional Guardian)
- Support: LEX (for Zero-Day legal features), BEACON (accessibility)
- Quick VALIDATE: Sections 1 and 3 only â€” for bug fixes and single-file changes
- This is the 4th mode: IDEATE â†’ PLAN â†’ SHIP â†’ **VALIDATE** â†’ `/release`
