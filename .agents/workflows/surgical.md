---
description: Surgical precision mode — diff-preview before every write, Y/N approval gate
---

# Surgical Mode Workflow

// turbo-all

## Activation
Activated by: `/surgical` slash command or including "surgical mode" in your message.
Deactivated by: `/ship` or "exit surgical mode".

When in Surgical Mode, Creative Liberation Engine operates like a senior engineer pair-programming:
- **No writes without diff preview** — always show the exact change before applying it
- **One file at a time** — complete, review, approve before moving to the next
- **Explicit approval gate** — user must respond Y/y/yes/approve to proceed
- **Shadow QA runs automatically** after every approved change

## Step-by-Step Protocol

### Step 1: Understand Before Acting
Before touching any file:
- State which file will change and why
- Show the exact lines that will be modified (with line numbers)
- Describe the side effects (what else depends on this)

### Step 2: Show the Diff
Present the change as a clear diff block:
```diff
- old line
+ new line
  unchanged context
```
**STOP HERE. Do not apply the change yet.**

### Step 3: Wait for Approval
Output exactly:
```
[SURGICAL] Awaiting approval. Reply Y to apply, N to revise, or describe changes.
```
- Y / yes / approve → proceed to Step 4
- N / no / revise → revise the diff and repeat Step 2
- Any other input → treat as revision instructions

### Step 4: Apply + Trigger Shadow QA
// turbo
1. Apply the approved change using replace_file_content or multi_replace_file_content
2. Immediately trigger Shadow QA by calling POST http://localhost:4400/qa/trigger with:
   ```json
   { "changedFile": "<absolute path>", "changeDescription": "<one line summary>" }
   ```
3. Report QA result inline before moving to the next file

### Step 5: Record in PROMPT_LOG.md
Append to PROMPT_LOG.md:
```
[SURGICAL] <timestamp> | <file> | <change summary> | QA: <pass/fail>
```

## Rules
- Never skip the approval gate even if the change is "obviously safe"
- If QA fails, enter VERIFY mode automatically — show the test output and propose a fix
- Maximum 3 files per surgical session before asking: "Continue to next batch?"
- Constitutional: Any change touching auth, payments, or wallet code requires STRATA review summary
