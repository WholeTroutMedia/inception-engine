# Flow Studio–Inspired Implementation Plan

**Source:** Ideation from Autodesk Flow Studio research (March 2026).  
**Goal:** Plan fully and ship learnings that benefit Creative Liberation Engine.  
**Status:** Plan complete; ship tasks defined.

---

## 1. Summary of Learnings (from research)

| Flow Studio pattern | Inception benefit |
|---------------------|-------------------|
| Credit/capacity model (tiers, credits per generation) | Per-flow or per-agent capacity/credits; visible usage; throttle/tier by agent or workflow |
| "Concept → production" as product shape | Name and productize IDEATE → PLAN → SHIP (e.g. Zero Day pipeline, Café workflow); document stages and handoffs |
| USD/FBX as single interchange | One canonical interchange for artifacts (e.g. HANDOFF + task.md + branch; or JSON schema for brief → execution plan) |
| Markerless / low-friction capture | Double down on zero-day intake: voice (CORTEX Mobile), email, one form; document as differentiator |
| Cloud vs sovereign | Position "sovereign creative engine" vs "cloud creative studio" |
| Free tier with core AI | Define free/low-friction tier (e.g. IDEATE + PLAN only, or read-only VAULT, or single-agent mode) |

---

## 2. Scope for this ship

- **In scope:** Capacity/credit model (design + minimal implementation), concept→production productization (docs + naming), canonical interchange schema, free-tier definition.
- **Out of scope for this pass:** Full billing, full tier enforcement in runtime, public repo naming overhaul (handled separately).

---

## 3. Tasks (SHIP order)

### Phase A — Productization & docs

| ID | Task | Owner | Artifacts |
|----|------|--------|-----------|
| A1 | **Name the pipeline** — Pick and document one official name for IDEATE→PLAN→SHIP→VALIDATE (e.g. "Zero Day pipeline", "Concept→Ship pipeline"). Use consistently in README, AGENTS.md, HANDOFF. | PRISM | `docs/PIPELINE.md`, updates to `AGENTS.md` / `CLAUDE.md` |
| A2 | **Concept→production one-pager** — Single doc (e.g. `docs/CONCEPT_TO_PRODUCTION.md`) that describes stages, handoffs, and what gets automated at each step. Public-repo friendly. | PRISM | `docs/CONCEPT_TO_PRODUCTION.md` |
| A3 | **Free tier definition** — Document what "free" or "low-friction" tier includes (e.g. IDEATE+PLAN only, read-only VAULT, or single-agent mode). No enforcement yet, just spec. | STRATA/LOGD | `docs/TIERS.md` or section in existing tier doc |

### Phase B — Interchange & schema

| ID | Task | Owner | Artifacts |
|----|------|--------|-----------|
| B1 | **Canonical handoff schema** — JSON schema (or Zod) for HANDOFF.md JSON block + task.md structure so every consumer (Claude, Genkit, dispatch) uses same shape. | PRISM | `packages/engine-core/src/schemas/handoff.ts` (or equivalent), schema JSON |
| B2 | **Brief → execution plan schema** — Optional schema for "creative brief → execution plan" that CORTEX/IDEATE/PLAN produce and SHIP consumes. | PRISM | Same package, `brief-execution.ts` or similar |
| B3 | **Wire HANDOFF to schema** — Ensure HANDOFF.md generator (in handoff workflow) and any parser use the schema. | PRISM | `.agents/workflows/handoff.md`, Genkit or executor that reads HANDOFF |

### Phase C — Capacity / credit model (minimal)

| ID | Task | Owner | Artifacts |
|----|------|--------|-----------|
| C1 | **Capacity model spec** — Define "generation" or "run" units per flow/agent (e.g. 1 credit per IDEATE run, 1 per PLAN, N per SHIP step). Document in TIERS.md. | STRATA | `docs/TIERS.md` (extend), `docs/CAPACITY_MODEL.md` |
| C2 | **Capacity types + config** — Add types and config for per-flow or per-agent capacity (e.g. in `engine-core` or genkit config). No billing, just structure. | PRISM | `packages/engine-core` or `packages/genkit` config types |
| C3 | **Optional: usage logging** — If time allows, log "runs" per flow/agent to a minimal store (e.g. JSONL or Redis key) for future throttling/tiering. | PRISM | Small logger in genkit middleware or dispatch |

### Phase D — Positioning & public repo

| ID | Task | Owner | Artifacts |
|----|------|--------|-----------|
| D1 | **Sovereign vs cloud one-liner** — Add a single "Positioning" or "Why Inception" line to public README: sovereign creative engine vs cloud creative studio. | PRISM | `ecosystem/creative-liberation-engine/README.md` |
| D2 | **Revisit public repo naming and details** — Separate pass: reconsider all naming and copy in `ecosystem/creative-liberation-engine` (product name, agent names, tier names, clone URL, etc.). | — | Follow-up session |

---

## 4. Success criteria

- Pipeline has one official name and one concept→production doc.
- HANDOFF (and optionally brief→plan) has a canonical schema and is wired.
- Tiers doc includes free tier + capacity model (design only; enforcement optional).
- Public README has a clear sovereign vs cloud positioning line.
- Naming/details pass for public repo is scheduled (not blocked by this ship).

---

## 5. Dependencies

- `packages/engine-core` exists and can hold shared types/schemas.
- Public repo lives at `ecosystem/creative-liberation-engine`; changes there stay consistent with brainchild-v5 (or sync process defined).

---

## 6. Out of scope (explicit)

- Full billing or payment integration.
- Runtime enforcement of tiers (only config and docs).
- Renaming of agents/hives/product in public repo (Phase D2).
- Changes to Constitution text.

---

*Next: Execute Phase A → B → C → D1; then schedule D2 (naming/details) with user.*
