---
name: SCRIBE Memory
description: SCRIBE is the persistent memory layer of the Creative Liberation Engine. Use this skill when you need to write a significant decision, pattern, or discovery to long-term memory, or when VAULT needs to retrieve relevant prior context for planning or ideation.
---

# SCRIBE Memory — Creative Liberation Engine v5

## When to Use This Skill

SCRIBE activates automatically in two directions:

**Write to memory (SCRIBE OUT) when:**
- A significant architectural decision is made
- A new pattern or convention is established (TypeScript pattern, API design, UI convention)
- A bug is discovered and fixed — document the root cause and fix
- An IDEATE session produces a selected direction
- A PLAN is approved and implementation begins
- A VALIDATE report flags a systemic concern

**Read from memory (VAULT IN) when:**
- Starting IDEATE — retrieve prior sessions on this topic
- Starting PLAN — retrieve relevant architecture decisions and conventions
- Debugging an issue — retrieve prior bug fixes in this area
- User asks "what did we decide about…" or "what's our pattern for…"

---

## Memory Channels

SCRIBE writes to multiple channels depending on content type:

| Channel | Type | Storage |
|---------|------|---------|
| **Episodic** | "What happened" — session logs, decisions, events | ChromaDB `episodic` collection |
| **Semantic** | "How things work" — patterns, conventions, architecture | ChromaDB `semantic` collection |
| **KI (Knowledge Item)** | "What we know" — distilled, long-term reference | Creative Liberation Engine KI system |

---

## Reading from Memory (VAULT Protocol)

### Via Genkit Engine (preferred when online)

```
POST http://localhost:4100/retrieve
{
  "query": "<natural language query>",
  "limit": 5,
  "collection": "semantic"  // or "episodic", or omit for both
}
```

### Via KI System (always available)

The Creative Liberation Engine KI summaries are always present at conversation start. Before calling any search:

1. Scan KI summaries for titles matching your query
2. If a match exists, use `view_file` to read the artifact at the listed path
3. Only call external search if no KI covers the topic

### Via Local Files

If both above are unavailable:
```powershell
# Search the SCRIBE archive in v4
Get-ChildItem "D:\Google Creative Liberation Engine\Creative Liberation Engine Brainchild\brainchild-v4\creative_liberation_engine\memory\scribe_archive\" -Recurse -Filter "*.md" | Select-String "<query>"
```

---

## Writing to Memory (SCRIBE OUT Protocol)

### Step 1 — Classify the Memory

Before writing, determine the correct category:

| What happened | Category | Collection |
|--------------|----------|-----------|
| We decided X over Y | Decision | semantic |
| We built X using pattern Y | Pattern | semantic |
| Bug in X was caused by Y, fixed by Z | Bug/Fix | episodic |
| User wanted X, we explored and chose Y | Session | episodic |
| X is how the system works | Architecture | semantic |

### Step 2 — Write the Memory Entry

**Episodic format:**
```markdown
## [YYYY-MM-DD] [Brief Title]

**Session:** [Conversation topic / task ID]
**Agents:** [Which CORTEX agents were active]
**What happened:** [2–3 sentence summary of the session/event]
**Key decision:** [If applicable: what was decided and why]
**Output:** [Files created, tasks completed, links to artifacts]
```

**Semantic format:**
```markdown
## [Pattern/Convention Name]

**Context:** When to use this pattern.
**Pattern:** The actual convention, code snippet, or decision.
**Rationale:** Why this was chosen over alternatives.
**Example:** A concrete reference in the codebase.
**Last updated:** [YYYY-MM-DD]
```

### Step 3 — Choose the Write Target

**Primary (Genkit engine online):**
```
POST http://localhost:4100/memory/write
{
  "collection": "semantic",
  "content": "<formatted memory entry>",
  "metadata": {
    "tags": ["typescript", "pattern", "zero-day"],
    "source": "cle-session",
    "timestamp": "<ISO 8601>"
  }
}
```

**Fallback (engine offline) — write to local SCRIBE archive:**
```powershell
# Semantic memories
$path = "D:\Google Creative Liberation Engine\Creative Liberation Engine Brainchild\brainchild-v4\creative_liberation_engine\memory\scribe_archive\semantic\"

# Episodic memories
$path = "D:\Google Creative Liberation Engine\Creative Liberation Engine Brainchild\brainchild-v4\creative_liberation_engine\memory\scribe_archive\episodic\"
```

Write the entry as a `.md` file named `[YYYYMMDD]-[slug].md`.

---

## High-Value SCRIBE Triggers

These events should **always** trigger a SCRIBE write:

1. **New Genkit flow added** → Write to semantic: flow name, input/output schema, purpose
2. **New package created** → Write to semantic: package name, responsibility, key exports
3. **Database/schema change** → Write to semantic: what changed and migration notes
4. **Performance optimization** → Write to semantic: problem, solution, measured improvement
5. **Constitutional violation found and fixed** → Write to episodic: what article, what the issue was, how it was resolved
6. **IDEATE direction selected** → Write to episodic: topic, selected direction, rationale
7. **Design system decision** → Write to semantic: component name, design token used, why

---

## LOGD's Memory Quality Gate

Before writing, LOGD checks:

- [ ] Is this worth writing? (Would a future agent thank you for this?) 
- [ ] Is it specific enough? (Vague memories aren't useful)
- [ ] Is it in the right collection? (Episodic vs semantic distinction)
- [ ] Does a more recent memory supersede this? (Check before writing duplicates)
- [ ] Is sensitive information excluded? (No API keys, no client PII)

---

## Memory Hygiene

When VAULT retrieves memories that are clearly outdated (e.g., reference old package names, deprecated patterns, or v4 architecture that's been replaced in v5):

1. Flag the stale memory to the user
2. Write an updated entry superseding it
3. Note: "Supersedes [date] entry on [topic]" in the new entry

---

## Quick Reference: SCRIBE in Other Modes

| Mode | SCRIBE Action |
|------|--------------|
| IDEATE | VAULT retrieves at start; SCRIBE writes direction selection at end |
| PLAN | VAULT retrieves architecture context at start; SCRIBE writes approved plan |
| SHIP | SCRIBE writes new patterns discovered during implementation |
| VALIDATE | SCRIBE writes validation report and any new conventions enforced |
