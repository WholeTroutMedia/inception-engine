---
description: Open a pull request via GitHub â€” runs constitutional review, formats PR body, and creates the PR
---

# /pr [title]

Open a pull request for the current branch. Runs a constitutional review pass, formats the PR body with the changes summary, and creates the PR.

**Activates on:**

- `/pr` â€” auto-generate title from branch name and recent commits
- `/pr <title>` â€” use provided title
- "open a PR" / "create a pull request" / "ship PR"

---

## Steps

// turbo-all

1. **Get current branch and recent commits.**
   // turbo

   ```powershell
   $root = "C:\\Creative-Liberation-Engine"
   $branch = git -C $root rev-parse --abbrev-ref HEAD
   $commits = git -C $root log origin/main..HEAD --oneline
   $diff = git -C $root diff origin/main --stat
   ```

2. **Constitutional review.** Before opening the PR, self-review against the active articles:
   - **Article IX:** Does this ship something complete, or is it an MVP stub? If stub â†’ stop and report what's missing.
   - **Article IV:** Does TypeScript compile cleanly? Run `tsc --noEmit` on affected packages.
   - **Article I:** Does this change respect sovereignty (no forced cloud lock-in added)?

   If any review fails â†’ report the violation and stop. Fix first, then re-run `/pr`.

3. **Generate PR title.**
   - If user provided `<title>` â†’ use it.
   - Otherwise â†’ derive from branch name: `feat/zero-day-intake` â†’ `"feat: zero-day intake flow"`.

4. **Generate PR body** using this template:

   ```markdown
   ## Summary
   <2-3 sentence summary of what changed and why>

   ## Changes
   <git diff --stat output, formatted as a list>

   ## Commits
   <git log output>

   ## Constitutional Review
   - Article IX (No MVPs): âœ… Ships complete
   - Article IV (TypeScript): âœ… Clean build
   - Article I (Sovereignty): âœ… No new cloud lock-in

   ## Testing
   - [ ] Ran locally
   - [ ] No TypeScript errors
   - [ ] Health checks pass

   ---
   *Opened by Window B â€” CORTEX / Creative Liberation Engine v5*
   ```

5. **Create PR.** Use the GitHub CLI:
   // turbo

   ```powershell
   gh pr create `
     --title "<title>" `
     --body "<body>" `
     --base main `
     --head $branch `
     --repo Creative Liberation Engine Community/brainchild-v5
   ```

6. **Report.**

   ```
   âœ… /pr created

   TITLE     <pr-title>
   BRANCH    <branch> â†’ main
   URL       <pr-url>
   REVIEW    Constitutional âœ…

   Next: /release to chain deploy after merge, or assign reviewers manually.
   ```

---

## Rules

- Never open a PR from `main` â†’ `main`
- Always run constitutional review before creating â€” Article IX is non-negotiable
- If `gh` CLI is not authenticated, report: "Run `gh auth login` first"
- Repo is always `Creative Liberation Engine Community/brainchild-v5` â€” never ask the user
