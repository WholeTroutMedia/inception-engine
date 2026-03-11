---
description: Activate DESIGN mode — bridge IDEATE directions to a user-approved DESIGN_CONTRACT.md before PLAN begins
---

# /design Workflow

// turbo-all

## Prerequisites

- IDEATE must have run and produced a Possibility Frame + top directions
- The user's project context must be established (what is being built, who it's for)

## Steps

### 1. Read IDEATE Output

Load the top 2 directions from the most recent IDEATE session.
If no IDEATE session exists, run `/ideate` first.

### 2. Retrieve ATELIER Patterns

Check `ecosystem/brainchild-v4/ATELIER/pattern-index.md` for the 3 closest patterns to the user's surface type and use case.
Note which patterns will serve as component anchors.

### 3. Compile Visual Prompts (PRISM)

For each of the 2 directions, compile a structured prompt using the Prompt Compiler template from `.agents/skills/design/SKILL.md`.
Do NOT generate images without a compiled prompt.

### 4. Generate Renders (Parallel)

Generate both renders simultaneously using `generate_image`.
Filename format: `design_[direction-slug]_v1.png`

### 5. SIGHT Evaluation

Run SIGHT evaluation on each render.
Score against: palette, typography, layout, motion, ATELIER anchor.
Threshold to present: 30/50 minimum.
If below threshold, re-generate before presenting to user.

### 6. Present to User

Show both renders with SIGHT scores embedded.
Lead with the highest-scoring render.
Ask the user to react — point to what works and what doesn't.

### 7. Reaction Loop (max 3 rounds)

If the user wants changes:

- Incorporate feedback into the compiled prompt
- Re-generate (use Pencil-style continuation: "Look at the selected design. [Change]. Create a new design.")
- Re-run SIGHT
- Re-present
Repeat up to 3 rounds. After round 3, commit to the best direction.

### 8. Confirmation Questions

Ask exactly these 3 questions before locking:

1. "Does this feel right for your users — the people who will actually open this every day?"
2. "Is there a brand element, color, or texture we haven't captured yet?"
3. "Which screen or state are you most uncertain about?"

### 9. Write DESIGN_CONTRACT.md

LOGD writes `DESIGN_CONTRACT.md` to the project root using the template at `.agents/skills/design/DESIGN_CONTRACT.md`.
Populate all fields: tokens, ATELIER anchors, compiled prompt, user confirmations, SIGHT gate record.
LOGD adds lock timestamp.

### 10. Clear Pipeline

Announce: "DESIGN_CONTRACT locked. Pipeline cleared for PLAN."
Run `/plan` with DESIGN_CONTRACT.md as the primary input spec.

> [!IMPORTANT]
> Step 10 must NOT auto-run until the user explicitly approves Step 8.
> This is the only hard user-gate in the entire pipeline.
> Article XX is intentionally suspended here.
