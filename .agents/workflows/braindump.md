---
description: Autonomous Braindump Ingestion & Processing Workflow
---

# `/braindump` â€” Creative Liberation Engine Braindump Processing Workflow

This workflow scans the user's raw braindump directory, applies the **Universal Prompt Engineer** (UPE) skill to the contents, and generates structured, reviewable dispatch tasks or strategy documents.

### Prerequisites

- Assumes the user stores raw notes in `D:\Google Creative Liberation Engine\Creative Liberation Engine Brainchild\apps\braindump`
- Requires the `universal-prompter` skill (`.agents/skills/universal-prompter/SKILL.md`)

---

## Workflow Steps

1. **Scan the Drop Zone**
   Check `D:\Google Creative Liberation Engine\Creative Liberation Engine Brainchild\apps\braindump` for newly added `.txt` or `.md` files. Exclude `v2-instructions.md` and `v2-master-knowledge.md` as they are foundational knowledge, not raw braindumps.

2. **Absorb and Analyze (The LOGD/STRATA phase)**
   Read the contents of the target braindump file. Identify the core intent:
   - Is this a technical architecture idea?
   - Is this a creative project concept?
   - Is this a workflow optimization?

3. **Apply the Universal Prompt Engineer (UPE) Skill**
   Load the UPE `<skills>` (`.agents/skills/universal-prompter/SKILL.md`). Transform the messy, raw braindump into a UPE-compliant artifact:
   - Forge a 4-5 sentence hyper-specific **Primary Directive**.
   - Enforce semantic positive framing and eliminate vague terminology.
   - Generate 4 **Rabbit Holes** (alternative approaches or systemic pivots).

4. **Generate the Handoff Artifact**
   Write the processed UPE output into a new file in `D:\Google Creative Liberation Engine\Creative Liberation Engine Brainchild\apps\braindump\processed\`.
   Name it descriptively: `[YYYYMMDD]-processed-[topic].md`

5. **Create a Dispatch Task**
   Provide the user with the path to the processed artifact. If they approve, use the `universal-prompter` skill to summarize it into a Dispatch queue entry using the `POST http://127.0.0.1:5050/api/tasks` endpoint, assigning it to the relevant workstream.

6. **Cleanup**
   Move the original raw file into `D:\Google Creative Liberation Engine\Creative Liberation Engine Brainchild\apps\braindump\archive\`.
