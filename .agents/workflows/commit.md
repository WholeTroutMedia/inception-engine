---
description: Lightweight git commit for the current workstream â€” runs validate first, stages files, writes a constitutional commit message, and pushes
---

# /commit <message>

A fast, constitutional commit. Lighter than `/release` (no PR, no deploy) â€” just validate â†’ stage â†’ commit â†’ push. Use this for incremental progress during a session. Chain into `/pr` or `/release` when ready to ship.

**Activates on:**

- `/commit "[message]"`
- "commit this"
- "save my progress"
- "commit and push"

---

## Steps

// turbo-all

### Step 1 â€” Pre-flight Validate

Run `/validate` inline (abbreviated â€” Steps 1-2 only: diff check + TypeScript).

- If TypeScript has errors: warn the user. Ask once: "TypeScript errors detected. Commit anyway? (yes/no)"
- If user says no â†’ stop. Fix errors first.
- If user says yes, or validate passes â†’ proceed.
- If no changes detected: "Nothing to commit. Make some changes first."

---

### Step 2 â€” Stage Changes

Stage all changes in the current workstream's scope:

// turbo

```powershell
$root = "C:\\Creative-Liberation-Engine"
git -C $root add -A
```

Show what's being staged:

// turbo

```powershell
git -C $root diff --cached --stat
```

---

### Step 3 â€” Build Commit Message

Use the message provided by the user. If no message was given, generate one from the diff:

**Constitutional commit format:**

```
[type]([scope]): [description]

[optional body â€” if changes are complex]
```

**Type rules:**

| Change type | Prefix |
|-------------|--------|
| New feature / workflow | `feat` |
| Bug fix | `fix` |
| Docs / AGENTS.md / README | `docs` |
| Refactor (no behavior change) | `refactor` |
| Tests | `test` |
| Config / build / CI | `chore` |

**Scope** = workstream name (e.g. `comet-browser`, `genkit-flows`, `console-ui`)

**Examples:**

```
feat(comet-browser): add /validate workflow with LOGD review
docs(agents): add /commit + /validate to AGENTS.md workflow table
fix(genkit-server): correct GENKIT_URL env var default to port 4100
```

---

### Step 4 â€” Commit

// turbo

```powershell
git -C $root commit -m "[message]"
```

Capture and display the commit hash.

---

### Step 5 â€” Push

// turbo

```powershell
git -C $root push origin HEAD
```

- **If push succeeds:** show remote URL + commit hash
- **If push fails (diverged branch):** run `git pull --rebase origin HEAD` then retry push once
- **If rebase has conflicts:** report: "âš ï¸ Merge conflict â€” resolve manually then run `/commit` again"

---

### Step 6 â€” Confirm + Suggest Next

```
âœ… Committed + pushed

  Hash:      [short SHA]
  Branch:    [branch]
  Message:   [commit message]
  Files:     [N] changed, [+N] insertions, [-N] deletions

â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
NEXT STEPS
  /pr "[title]"     â€” open a pull request
  /release          â€” full deploy pipeline  
  keep working      â€” commit again when ready
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
```

---

## Rules

- Always run a quick validate first (Step 1) â€” never commit blind
- Never force-push â€” if push fails, only try rebase, never `--force`
- Always display the commit hash on success
- Scope must match the current workstream name from `registry.md`
- This is the middle link: SHIP â†’ `/commit` â†’ `/pr` â†’ `/release`
