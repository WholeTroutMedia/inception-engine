---
description: Shadow QA agent â€” automatically runs tests + browser validation after every code change
---

# Shadow QA Workflow

// turbo-all

## What It Does
After any code change is applied (in Surgical Mode or normal ship mode), Shadow QA runs:
1. `pnpm test` in the affected package
2. TypeScript compilation check (`pnpm --filter <package> build`)
3. POST to SPECTRE browser agent for visual regression check (if UI changed)
4. Reports results inline before proceeding to the next file

## Triggering Shadow QA

Shadow QA is triggered automatically in two ways:
1. **Surgical Mode** â€” triggered after every approved change
2. **Manual** â€” use `/qa` slash command or say "run shadow QA"

## Step-by-Step

### Step 1: Identify Affected Package
From the changed file path, determine the package name:
- `packages/genkit/**` â†’ `@inception/genkit`
- `packages/genmedia/**` â†’ `@inception/genmedia`
- `apps/console/**` â†’ `console` (React app)
- `packages/finance-agent/**` â†’ `@inception/finance-agent`
- etc.

// turbo
### Step 2: Run TypeScript Check
```powershell
cd "C:\\Creative-Liberation-Engine"
pnpm --filter <package-name> build 2>&1 | tail -20
```
- PASS â†’ continue to Step 3
- FAIL â†’ enter fix loop (show error, propose fix, apply, re-run)

// turbo
### Step 3: Run Tests (if they exist)
```powershell
pnpm --filter <package-name> test 2>&1 | tail -30
```
- If no test script exists: skip and note "[QA] No tests configured for <package>"
- PASS â†’ continue
- FAIL â†’ enter fix loop

### Step 4: Visual Regression (UI changes only)
If the changed file is in `apps/console/` or any `.tsx`/`.html` file:
- POST to `http://localhost:6000/scan` (SPECTRE QA agent):
  ```json
  { "url": "http://localhost:5173", "changedComponent": "<component name>" }
  ```
- If SPECTRE is not running: skip and note "[QA] SPECTRE unavailable â€” manual visual check recommended"

### Step 5: Report Summary
Output a compact QA summary:
```
[SHADOW QA] âœ“ TypeScript: PASS
[SHADOW QA] âœ“ Tests: 12 passed, 0 failed
[SHADOW QA] âœ“ Visual: SPECTRE scan clean
[SHADOW QA] Ready for next change.
```

Or on failure:
```
[SHADOW QA] âœ— TypeScript: FAIL â€” see errors below
[SHADOW QA] Entering fix loop before proceeding.
```

## Configuration
Shadow QA can be configured per-project via `.agents/qa.config.json`:
```json
{
  "skipPackages": ["packages/atlas-live"],
  "ghostUrl": "http://localhost:6000",
  "consoleDevUrl": "http://localhost:5173",
  "typeCheckOnly": false
}
```
