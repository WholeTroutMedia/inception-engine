# DESIGN CONTRACT TEMPLATE

> Copy this file to `[project-root]/DESIGN_CONTRACT.md` and fill in all fields.
> LOGD locks this file with a timestamp when the user signs off.
> PLAN reads this. SHIP reads this. SIGHT in VALIDATE re-reads this.

---

# DESIGN CONTRACT — [Project Name]

**Date:** [YYYY-MM-DD]
**Session:** [Conversation ID]
**Locked By:** LOGD
**User Sign-Off:** [ ] Pending → [x] Approved on [timestamp]

---

## Approved Visual Direction

**Direction Name:** [e.g., "Dark Command Center", "Warm Editorial", "Surgical Precision"]
**Approved Renders:**

- `design_[direction]_v[N].png` — [brief note]

**Mood (1 sentence):**
> [e.g., "This feels like a cockpit — dense, purposeful, every pixel earns its place."]

---

## Design Tokens (Locked)

These values are the source of truth for all CSS custom properties, Tailwind config, and design system tokens in this project.

| Token | Value |
|-------|-------|
| `--color-primary` | `#______` |
| `--color-accent` | `#______` |
| `--color-bg` | `#______` |
| `--color-surface` | `#______` |
| `--color-text` | `#______` |
| `--font-heading` | [Font name + weight] |
| `--font-body` | [Font name + weight] |
| `--radius` | [px value] |
| `--motion` | micro / reduced / heavy |
| `--density` | compact / default / spacious |

---

## Component Anchors (ATELIER References)

These ATELIER patterns are the structural foundation. BOLT and NAVD implement against these — not against generic patterns.

| Surface | Pattern | Source | Platform |
|---------|---------|--------|----------|
| Navigation | [Pattern name] | [Source] | [Web/iOS] |
| Dashboard | [Pattern name] | [Source] | [Web/iOS] |
| Forms | [Pattern name] | [Source] | [Web/iOS] |
| Auth | [Pattern name] | [Source] | [Web/iOS] |
| [Other] | [Pattern name] | [Source] | [Web/iOS] |

---

## Compiled Visual Prompt (Locked)

```
[Surface type] · [Layout schema] · [Color mood: name + hex anchors] ·
[Typeface + weight] · [Motion character] · [Inspiration ref] · [Constraint]
```

---

## Screens of Highest Concern (User-Flagged)

These screens require explicit design attention during SHIP and visual verification during VALIDATE.

| Screen / State | User Note |
|---------------|-----------|
| [Screen name] | "[User's exact words]" |

---

## SIGHT Gate Record

| Round | Render | Score | Result | Notes |
|-------|--------|-------|--------|-------|
| v1 | `design_[x]_v1.png` | [X/50] | PASS/FAIL | |
| v2 | `design_[x]_v2.png` | [X/50] | PASS/FAIL | |

Final approved render SIGHT score: **[X/50]** — PASS ✅

---

## Confirmation Questions (User Answers)

1. *Does this feel right for your users?*
   > "[User answer]"

2. *Is there a brand element we haven't captured yet?*
   > "[User answer]"

3. *Which screen are you most uncertain about?*
   > "[User answer]"

---

## Lock Certification

```
LOGD: DESIGN_CONTRACT.md locked at [ISO timestamp]
Pipeline cleared for PLAN.
```

---

*This contract is immutable after lock. Any design changes post-lock require a new DESIGN mode session and a new contract.*
