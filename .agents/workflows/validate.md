---
description: Run LOGD truth-check on current changes before committing â€” constitutional compliance review, TypeScript check, and confidence score
---

# /validate

Runs the VALIDATE mode pipeline on your current changes. LOGD reviews the diff for constitutional compliance, logic consistency, and quality before any commit. Non-blocking â€” presents findings and lets you decide.

**Activates on:**
- `/validate`
- "check this before I commit"
- "does this pass LOGD?"
- "review my changes"
- "run validation"

---

## Steps

// turbo-all

### Step 1 â€” Gather Diff

Get the current git diff of staged + unstaged changes:

```powershell
$root = "C:\\Creative-Liberation-Engine"
$staged   = git -C $root diff --cached
$unstaged = git -C $root diff
$diff = "$staged`n$unstaged".Trim()
```

If `$diff` is empty â†’ report "No changes detected. Make some edits and run `/validate` again." and stop.

Count changed files:
```powershell
git -C $root diff --name-only
git -C $root diff --cached --name-only
```

---

### Step 2 â€” TypeScript Check

Run a fast non-emitting TypeScript check:

```powershell
npx -y tsc --noEmit --project "$root\tsconfig.json" 2>&1
```

- **If clean:** note `âœ… TypeScript clean`
- **If errors:** extract error list, note `âŒ TypeScript errors â€” [N] errors` and list them

TypeScript errors do NOT block the workflow â€” they are reported, not enforced. User decides.

---

### Step 3 â€” LOGD Constitutional Review

If the Genkit engine is running (`GET http://localhost:4100/health` succeeds):

```
POST http://localhost:4100/cortex/plan
{
  "topic": "Constitutional review of the following code changes",
  "context": "[diff, truncated to 6000 chars]",
  "depth": "light"
}
```

Extract from LOGD's response:
- `vera.verdict` â€” `approved` | `flagged` | `rejected`
- `vera.confidence` â€” 0.0â€“1.0
- `vera.contradictions` â€” array of constitutional violations
- `vera.pattern` â€” pattern classification

**If engine is offline:** perform a local constitutional check instead â€” scan the diff for:
- `any` type usage (Article IV violation)
- Hardcoded secrets / API keys (sovereignty violation)
- `console.log` left in production paths (quality standard)
- TODO/FIXME left in shipped code (Article IX â€” no MVPs)

---

### Step 4 â€” Present Validation Report

```
â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
â•‘  VALIDATE â€” LOGD REVIEW                              â•‘
â• â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•£
â•‘  Files changed:   [N]                                â•‘
â•‘  TypeScript:      âœ… clean  OR  âŒ [N] errors        â•‘
â•‘  LOGD verdict:    âœ… approved  OR  âš ï¸ flagged  OR âŒ rejected â•‘
â•‘  Confidence:      [XX]%                              â•‘
â• â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•£
â•‘  [If flagged or rejected:]                           â•‘
â•‘  CONSTITUTIONAL FLAGS                                â•‘
â•‘    âš ï¸  [article + description]                       â•‘
â•‘    âš ï¸  [article + description]                       â•‘
â• â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•£
â•‘  NEXT                                                â•‘
â•‘    /commit "[message]"   â€” commit anyway             â•‘
â•‘    fix issues            â€” address flags first       â•‘
â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
```

- **`approved` + TypeScript clean** â†’ suggest `/commit` immediately
- **`flagged`** â†’ list issues, let user decide whether to proceed
- **`rejected`** â†’ strongly recommend fixing â€” but never block the user

---

## Rules

- Never refuse to commit on behalf of the user â€” validate and report, don't gatekeep
- LOGD's verdict is advisory, not blocking
- TypeScript errors are reported, not enforced
- Engine offline = local scan mode (always works, no network required)
- Works in any workstream
