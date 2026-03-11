---
description: Activate SHIP mode â€” PRISM + builders implement a PLAN spec with full type safety, Article IX quality standards, and auto dispatch resolution
---

# /ship [task-id or topic]

Enters **SHIP** operational mode. Reads the approved HANDOFF.md, implements atomic file by file, runs type check and tests, marks the dispatch task done, and writes HANDOFF.md for VALIDATE mode.

## When to Use

- User says "ship it", "build this", "implement", "write the code"
- A `/plan` has been approved and HANDOFF.md is in `phase: "PLAN"` state
- A task is claimed from the dispatch queue
- After `/pickup` returns a task that requires code changes

---

## Steps

// turbo
0. **Heartbeat** (fire-and-forget):

   ```powershell
   Invoke-RestMethod -Method POST -Uri "http://127.0.0.1:5050/api/agents/heartbeat" -ContentType "application/json" -Body '{"agent_id":"cle-a","workstream":"ship","current_task":"SHIP mode active"}'
   ```

// turbo

1. **Read HANDOFF.md** at repo root. Verify `phase: "PLAN"`. If HANDOFF is missing or in wrong phase, ask the user which task to implement or run `/plan <topic>` first.

// turbo
2. **Sync** â€” pull latest before touching any files:

   ```powershell
   git -C "C:\\Creative-Liberation-Engine" pull origin main --rebase
   ```

1. **Check dispatch registry** â€” read `.agents/dispatch/registry.md`. Confirm no other active window owns the files you're about to touch. If conflict: stop, leave a note in registry.md, pick a different task.

2. **Display task decomposition** from HANDOFF.md as a live checklist:

   ```
   ðŸ“‹ SHIP: <topic>
   Branch: feat/<slug>

   [ ] 1. <atomic unit 1>
   [ ] 2. <atomic unit 2>
   ...
   ```

3. **Implement â€” file by file:**
   - Complete implementation only â€” no stubs, no `// TODO`, no `any` types
   - All imports must resolve
   - All return types must be explicit
   - Use type imports for type-only imports: `import type { Foo } from '...'`
   - Mark each checklist item `[x]` as it's completed and update the display

4. **Type check** â€” must be zero errors before continuing:

   ```powershell
   # Per package
   npx tsc --noEmit -p packages/<package>/tsconfig.json

   # Or workspace-wide
   pnpm --filter "@inception/*" type-check
   ```

   Fix ALL errors before proceeding. Never mark a task done with TS errors.

5. **Run tests** â€” if tests exist for affected package:

   ```powershell
   pnpm --filter @inception/<package> test
   ```

   If no tests exist for new code, write them. Article IX: no untested new logic.

6. **Update dispatch** â€” mark task done:
   - Update `.agents/dispatch/task-queue.md` â€” move task to Completed table
   - Update `.agents/dispatch/registry.md` â€” update last-seen timestamp

// turbo
9. **Write HANDOFF.md** â€” pass the baton to VALIDATE:

   ```json
   {
     "phase": "SHIP",
     "from": "ANTIGRAVITY",
     "timestamp": "<ISO timestamp>",
     "topic": "<topic>",
     "files_changed": ["<list of modified files>"],
     "next": "Validate: run /validate to confirm launch readiness"
   }
   ```

1. **Offer release pipeline:**

    ```
    âœ… SHIP complete â€” <topic>

    Ready to:
    1. `/validate` â€” LOGD + NORTHSTAR full quality gate (recommended)
    2. `/release` â€” commit + PR + deploy in one command
    3. `/pr` â€” open a PR for human review
    4. Continue with next task from queue
    ```

---

## TypeScript Standards (Non-Negotiable)

```typescript
// âœ… Required
import type { Foo }          // type-only imports
const result: ResultType = {} // explicit return types
export interface Foo { ... }  // interfaces for domain objects

// âŒ Never
const x: any = ...           // no any â€” use unknown + type narrowing
// @ts-ignore                // no suppression â€” fix the type
```

## Design System Rule

Start with a blank canvas. Never force a legacy palette (Warm Trichromatic, Glassmorphism, etc.).
Read the spec or Figma precisely. Build design tokens local to the feature context.

## Circuit Breaker

| Blocker | Action |
|---------|--------|
| Missing type from another package | Add to `engine-core` first |
| Missing dependency | Check workspace packages first |
| File owned by another window | Stop â€” note in registry.md, pick different task |
| Test infrastructure missing | Add `vitest.config.ts` + test file first |

## Notes

- Lead agents: PRISM (Executor) + FORGE (Builder)
- Support: LOGD (Quality gate), NORTHSTAR (Constitutional review)
- Strict mode is ON â€” `tsconfig.json` has `"strict": true` across all packages
- Article IX: No MVPs. Ship complete or don't ship.
