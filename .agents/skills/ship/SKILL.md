---
name: SHIP Mode
description: Activate SHIP mode — PRISM + builders implement a technical spec with full type safety, design system enforcement, and Article IX quality standards. Use when user says 'ship', 'build', 'implement', 'write the code for', or when a PLAN has been approved.
---

# SHIP Mode — Creative Liberation Engine v5

## When to Use This Skill

Activate SHIP when:

- User says "ship it", "build this", "implement", "write the code"
- A PLAN artifact has been approved and execution begins
- A task is claimed from the dispatch queue (`.agents/dispatch/task-queue.md`)
- A `/pickup` workflow completes and the task requires code changes

---

## Operating Principals

**Lead agents:** PRISM (Executor) + FORGE (Builder)
**Support agents:** LOGD (Quality gate), NORTHSTAR (Constitutional review)

---

## Pre-Flight Checklist (Always Run First)

Before writing a single line of code:

1. **Read the spec** — If a PLAN artifact exists, read it fully. Never ship without a spec.
2. **Check dispatch registry** — Read `.agents/dispatch/registry.md` to confirm no other window owns files you're about to touch.
3. **Sync** — Run `/sync` to pull latest from remote before implementing.
4. **Identify package scope** — Determine which package(s) this affects:

   ```
   packages/genkit/       — AI flows, server, Genkit integration
   packages/engine-core/ — Shared types, utilities
   packages/zero-day/     — GTM engine, intake, contracts
   packages/synology-media-mcp/ — NAS MCP server
   services/              — Docker microservices
   ```

---

## TypeScript Standards (Non-Negotiable)

All v5 code must meet these requirements:

```typescript
// ✅ Required patterns
import type { ... }           // Use type imports for type-only imports
const result: ResultType = {} // Always annotate return types explicitly
export interface Foo { ... }  // Prefer interfaces for domain objects
export type Bar = ...         // Use types for unions/intersections

// ❌ Never do this
const x: any = ...            // No any — use unknown + type narrowing
// @ts-ignore                 // No suppression — fix the type
let foo                       // No implicit any from missing annotations
```

**Strict mode is active** — `tsconfig.json` has `"strict": true`. All code must pass with zero errors.

---

## Design System Enforcement

There is no rigid global UI system forced upon the applications. Start with a blank, creative canvas. Establish new, unique design tokens and local CSS variables tailored to the specific context of the feature being built.

- Never assume a legacy color palette or style guide (like Warm Trichromatic).
- Read the creative vision from the spec/Figma precisely.
- If a shared primitive does not exist in the local package, build it cleanly without relying on hardcoded constraints.

---

## Step-by-Step SHIP Protocol

### Step 1 — Decompose the Task

Break the implementation into atomic units. Each unit = one file or one function change.
Write the decomposition to the task artifact before coding. Example:

```
1. [ ] Create types in engine-core/src/types/
2. [ ] Implement service class in zero-day/src/services/
3. [ ] Add REST route in zero-day/src/server.ts
4. [ ] Write unit test in zero-day/src/__tests__/
5. [ ] Update exports in zero-day/src/index.ts
```

### Step 2 — Implement (File by File)

For each file:

- Write the complete implementation — no stubs, no TODOs left behind
- All imports must resolve
- All types must be explicit
- Run mental type-check before saving

### Step 3 — Type Check

After implementation:

```powershell
# Check the affected package
npx tsc --noEmit -p packages/<package>/tsconfig.json

# Or check from workspace root
pnpm --filter @inception/<package> type-check
```

Fix all errors before proceeding. Never mark a task done with TS errors.

### Step 4 — Run Tests (If Applicable)

```powershell
# Run tests for the affected package
pnpm --filter @inception/<package> test

# Or from root
pnpm test
```

If no tests exist for the new code, write them. Article IX: no untested new code.

### Step 5 — Update Dispatch

- Mark the task as `done` in `.agents/dispatch/task-queue.md`
- Move it to the Completed Tasks table
- Update registry last-seen timestamp

### Step 6 — AUTO-VALIDATE (Mandatory — Never Skip)

**VALIDATE is not optional. It runs automatically at the end of every SHIP regardless of task size.**

Immediately after implementation, activate the VALIDATE skill:

```powershell
# 1. TypeScript check on affected package
npx tsc --noEmit

# 2. If the project has an /api/validate-env endpoint, call it:
curl http://localhost:3000/api/validate-env

# 3. Run the full VALIDATE pipeline per VALIDATE/SKILL.md
```

- If VALIDATE returns **BLOCKED** → do NOT mark complete. Fix blockers, re-run.
- If VALIDATE returns **DEGRADED** → mark complete but surface warnings to user.
- If VALIDATE returns **OK** → proceed to Step 7.

> **Article XX Mandate:** No human should have to manually trigger a quality check.
> LOGD runs VALIDATE silently and surfaces failures—not the user.

### Step 7 — Auto-Release & Action Chain

**Do not offer options or wait for user input.** Always end SHIP + VALIDATE with immediate ACTION:

1. If the work involves a deployable service: Run `/release` (commit + PR + deploy) automatically.
2. Otherwise: Run `/commit "<message>"` to secure the implementation.
3. Immediately process the next task from the queue or run `/pickup`. Zero wait.

---

## Genkit Package Specifics

When working in `packages/genkit`:

```typescript
// Flow pattern — always use defineFlow with typed schemas
import { defineFlow } from '@genkit-ai/flow';
import { z } from 'zod';

export const myFlow = defineFlow(
  {
    name: 'my-flow',
    inputSchema: z.object({ topic: z.string() }),
    outputSchema: z.object({ result: z.string() }),
  },
  async (input) => {
    // implementation
  }
);
```

Server endpoints live in `packages/genkit/src/server.ts`.
All new flows must be registered there and exposed via HTTP.

---

## Zero-Day Package Specifics

When working in `packages/zero-day`:

- `src/services/` — Business logic (pure functions, no Express deps)
- `src/routes/` — Express route handlers (thin, delegate to services)
- `src/types/` — Domain types shared across the package
- `src/index.ts` — Public exports

The `IntakeSessionManager` is the core session class. All new intake features extend it.

---

## Circuit Breaker Patterns

If you hit a blocker during SHIP:

| Blocker Type | Action |
|-------------|--------|
| Missing type from another package | Add to `engine-core` first, then import |
| Missing dependency | Check if it's in workspace packages first; add external only if not |
| File owned by another window | Stop — leave a note in registry.md, pick a different task |
| Test infrastructure missing | Add `vitest.config.ts` + test file before main implementation |

---

## Constitutional Compliance

Before marking any task complete, LOGD runs a silent check:

- **Article IX:** Is the implementation complete? No stubs, no `// TODO`, no `any` types.
- **Article IV:** TypeScript strict mode passing?
- **Article I:** Does this add cloud dependencies that could be self-hosted?
- **Article XX:** Does this require manual human steps that could be automated?

If any check fails, do not mark complete — fix first.
