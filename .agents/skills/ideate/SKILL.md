---
name: IDEATE Mode
description: Activate IDEATE mode — VAULT + STRATA explore a topic, map the possibility space, generate creative directions, and compile visual prompts for DESIGN mode. Use when user asks to explore, brainstorm, ideate, or generate creative directions.
---

# IDEATE Mode — Creative Liberation Engine v5

> Pipeline: **IDEATE → DESIGN → PLAN → SHIP → VALIDATE**
> IDEATE produces named directions + compiled visual prompts. DESIGN renders them.

## When to Use This Skill

Activate IDEATE when the user says:

- "ideate on…", "explore…", "brainstorm…", "what are some directions for…"
- "I want to think about…", "vision for…", "possibilities for…"
- After `/browser-ideate` has run and a creative brief is primed
- When a PLAN task surfaces open design questions

---

## Operating Principals

**Lead agents:** STRATA (Strategist) + PRISM (Visionary)
**Support agents:** VAULT (Memory retrieval), LOGD (Truth-check on proposals)

---

## Step-by-Step Protocol

### Step 0 — Project Intent Gate (MANDATORY — always first)

Before any creative work begins, STRATA asks the user one question:

> **"Is this a permanent project or a brainstorm?"**
>
> - **Permanent** → This becomes a registered app in `ecosystem.manifest.json`. A Gitea repo will be created under `Creative Liberation Engine Community/`. Full IDEATE → DESIGN → PLAN → SHIP pipeline activates.
> - **Brainstorm** → Temporary exploration. Ask: "How long would you like to keep this? **30 days / 60 days / 90 days**?"

**Based on the answer:**

**If Permanent:**
1. Add the project to `ecosystem.manifest.json` under `"type": "permanent"`.
2. Note the app name and intended repo slug for PLAN mode to register later.
3. Proceed to Step 1.

**If Brainstorm:**
1. Add the project to `ecosystem.manifest.json` under `"brainstorms"` with:
   ```json
   { "name": "<slug>", "description": "<intent>", "createdAt": "<ISO date>", "expiresAt": "<ISO date + 30|60|90 days>" }
   ```
2. Inform the user: *"Got it — I'll keep this for {N} days. Running `pnpm ecosystem:sync` will automatically remove it when it expires."*
3. Proceed to Step 1.

> [!NOTE]
> This gate may be skipped if the user's initial request already includes explicit intent (e.g. "build me a new app called X" = permanent, "let's just think out loud about Y" = brainstorm).

---

### Step 1 — Orient & Retrieve Context

Before generating anything, pull relevant memory:

1. **Browser context:** Check if open browser tabs are listed in the conversation context. If yes, read the 3–5 most relevant ones using the browser tool. Extract themes, visual references, and intent signals.
2. **SCRIBE memory:** If the Genkit engine is online (`localhost:4100`), invoke the `keeper` flow:

   ```
   POST http://localhost:4100/retrieve
   { "query": "<topic>", "limit": 5 }
   ```

   Surface any prior IDEATE sessions, brand decisions, or relevant KIs.
3. **Knowledge Items:** Check KI summaries for relevant prior work on this topic before generating fresh directions.
4. **ATELIER Retrieval:** Check `ecosystem/brainchild-v4/ATELIER/pattern-index.md` for the 3 closest UI patterns to the user's surface type and use case. These anchors seed the visual directions — IDEATE should not start blank when established patterns exist.

### Step 2 — Define the Possibility Space

STRATA maps the terrain:

- **What is this really about?** (underlying need, not surface request)
- **Who is it for?** (user archetype, access tier: Studio / Client / Merch)
- **What constraints exist?** (tech stack, design system, sovereignty policy)
- **What's adjacent?** (related Creative Liberation Engine projects, existing components)

Output: A 2–3 sentence "Possibility Frame" that scopes the ideation.

### Step 3 — Generate 5 Directions

PRISM generates 5 named creative directions. Each direction must include:

```
## [Direction Name] — [Evocative Subtitle]

**The Bet:** One sentence on what this direction is optimizing for.
**Visual Language:** Color, motion, density, metaphor.
**Key Feature / Mechanic:** The defining interaction or capability.
**Inspiration:** Real-world reference (product, art, architecture, etc.)
**Risk:** What could go wrong or what's unproven here.
```

Directions should span a spectrum: safe/familiar → ambitious/novel.

### Step 4 — STRATA's Pick (with reasoning)

After generating all 5, STRATA selects the strongest direction and explains why:

- Why this direction best serves the underlying need
- Which elements from other directions to borrow
- What to validate before committing

### Step 4.5 — Prompt Compiler (PRISM)

For the top 2 directions (STRATA's pick + runner-up), compile a structured visual prompt using this template:

```
[Surface type] · [Layout schema] · [Color mood: name + 2-3 hex anchors] ·
[Primary typeface + weight] · [Motion character: micro/reduced/heavy] ·
[1 real-world inspiration reference] · [1 constraint or differentiator]
```

This compiled prompt travels into DESIGN mode and is the basis for image generation. If PRISM cannot compile a specific color palette or typography choice from the direction description alone, flag it — DESIGN mode will ask the user before generating.

### Step 5 — Auto-Proceed to DESIGN (Article XX)

Immediately transition to DESIGN mode with:

- STRATA's chosen direction + compiled prompt
- The runner-up direction + compiled prompt
- The 3 ATELIER pattern anchors retrieved in Step 1

Do NOT wait for the user to select a direction. Execute `/design` automatically.

> [!NOTE]
> IDEATE no longer proceeds directly to PLAN. The pipeline is IDEATE → **DESIGN** → PLAN. DESIGN is where the user sees and approves renders before any spec is written.

---

## Creative Freedom

There is no rigid global UI system forced upon the applications. Every IDEATE sequence should start blank and fresh.

- Encourage full creative freedom.
- Provide wildly different aesthetic palettes, layout schemas, and typographic combinations across your 5 directions.
- Do not default to legacy styles like "Warm Trichromatic" or "Glassmorphism" unless specific to the user's request.

---

## Genkit Engine Integration

If `localhost:4100` is online, augment IDEATE with AI flows:

| Flow | Purpose | Endpoint |
|------|---------|---------|
| `iris` | Creative direction generation | `POST /generate` `{ "flow": "iris", "input": { "topic": "..." } }` |
| `keeper` | Memory retrieval | `POST /retrieve` `{ "query": "...", "limit": 5 }` |
| `athena` | Strategic framing | `POST /generate` `{ "flow": "athena", "input": { "context": "..." } }` |

If engine is offline, proceed with built-in CORTEX reasoning — never block IDEATE on engine availability.

---

## Output Format

Always use rich markdown. Use `##` headers for each direction. Bold key terms. Never end with an open question and never wait for user input — immediately execute the auto-proceed step.

---

## Constitutional Constraints

- **Article IX:** Never generate a minimal or half-formed direction. All 5 must be complete.
- **Article I:** Prefer sovereign/self-hosted designs over cloud-dependent ones when relevant.
- Every direction must be buildable within the Creative Liberation Engine ecosystem.
