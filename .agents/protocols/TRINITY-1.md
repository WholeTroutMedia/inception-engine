# TRINITY-1 Protocol — Inter-Tool Handoff Standard

> **Version:** 2.0.0 | **Status:** Active | **Owner:** LOGD (CORTEX Collective)

The Trinity protocol defines how four specialized AI tools — **NAVD** (sovereign browser), **Perplexity** (research), **Creative Liberation Engine** (IDE/planning/shipping), and **Claude Code** (deep implementation) — coordinate on a single task without re-communicating via human messages.

As of 2026-03-07, **NAVD is a full active dispatch participant**: it claims `comet-browser` workstream tasks directly from the dispatch queue, performs autonomous PROBE research, and hands off to Creative Liberation Engine via HANDOFF.md.

---

## 🏗️ Architecture

```
NAVD/PERPLEXITY (PROBE) ──► ANTIGRAVITY (PLAN) ──► ANTIGRAVITY/CLAUDE-CODE (SHIP) ──► ALL (VERIFY)
       │                           │                            │                            │
  Research brief              Impl. plan                  Committed code               QA + audit
  written to                  + task.md                   + HANDOFF.md                 loop back
  HANDOFF.md                  written to                  update                       if issues
  (from: NAVD)               HANDOFF.md

NAVD autonomously:
  Dispatch Queue ──► claim comet-browser task ──► browse/research ──► HANDOFF.md (PROBE) ──► Creative Liberation Engine picks up
```

Each tool reads `HANDOFF.md`, performs its phase, then writes the updated state back to `HANDOFF.md` before exiting.

---

## 📋 Phases

| Phase | Performed By | Description |
|-------|-------------|-------------|
| `PROBE` | **NAVD** or Perplexity | Research: browse web, scrape docs, gather competitive intel, technical specs. NAVD claims from dispatch queue autonomously. |
| `PLAN` | Creative Liberation Engine | Architecture: design data contracts, file structure, acceptance criteria |
| `SHIP` | Creative Liberation Engine or Claude Code | Implementation: write and commit code |
| `VERIFY` | Any | QA: run tests, validate outputs, constitutional review |

---

## 📄 HANDOFF.md Schema

```typescript
interface HandoffState {
  from: 'NAVD' | 'PERPLEXITY' | 'ANTIGRAVITY' | 'CLAUDE-CODE'
  phase: 'PROBE' | 'PLAN' | 'SHIP' | 'VERIFY'
  task: string           // Human-readable task description
  taskId?: string        // Links to dispatch server task ID
  workstream?: string    // Dispatch workstream (e.g. 'comet-browser')
  agent_id?: string      // Reporting agent ID (e.g. 'comet-C0')
  outputs: string[]      // File paths or URLs produced in this phase
  next: string           // EXACT imperative directive for the next tool
  context: string        // What was decided, abandoned, and why
  timestamp: string      // ISO 8601
  veraMemoryRef?: string // Section in MEMORY.md where LOGD stored context
  qa_status?: string     // Shadow QA status (pass/fail/pending)
}
```

> **NAVD writes:** `from: "NAVD"`, `phase: "PROBE"`, `workstream: "comet-browser"`, `agent_id: "comet-C0"`

**Rules:**

- `next` must be **imperative and specific** — not "continue work" but "Write `packages/auth/src/agent-identity.ts` implementing the AgentIdentity interface defined in the plan."
- `context` must include: what was decided, what was abandoned, and why.
- `outputs` must be **absolute paths or full URLs** — never relative.

---

## 🔄 Auto-Resume Detection

Creative Liberation Engine reads `HANDOFF.md` on every boot (Step 2c in `AGENTS.md`).

**Auto-resume triggers:**

- `phase === 'PROBE'` from `NAVD` → Creative Liberation Engine moves to `PLAN` immediately (NAVD research complete)
- `phase === 'PROBE'` from `PERPLEXITY` → Creative Liberation Engine moves to `PLAN`
- `phase === 'PLAN'` from `ANTIGRAVITY` → Creative Liberation Engine moves to `SHIP` (plan approved)
- `phase === 'SHIP'` from `CLAUDE-CODE` → Creative Liberation Engine moves to `VERIFY`

**Non-resume states:**

- `phase === 'VERIFY'` → task is done; all agents wait for new dispatch task
- `phase === 'PROBE'` from `ANTIGRAVITY` → self-dispatched research; NAVD or Perplexity should pick up

---

## 📁 Handoff Log

Every state transition is appended to `.agents/handoff-log/` as:

```
{timestamp}_{from}_{phase}.json
```

The log is **append-only** and maintained by VAULT. It serves as the institutional memory of inter-tool coordination.

---

## ✅ Example Handoff Lifecycle

```json
// PROBE (Perplexity → Creative Liberation Engine)
{
  "from": "PERPLEXITY",
  "phase": "PROBE",
  "task": "Add Finance Blueprint to Creative Liberation Engine",
  "outputs": [".agents/research/finance-blueprint-research.md"],
  "next": "Design the Finance Blueprint using the NVIDIA Nemotron pattern. Key finding: Gemini 2.5 Pro outperforms GPT-4o on financial reasoning benchmarks by 23% (Bloomberg eval). Build: packages/blueprints/src/verticals/finance.ts",
  "context": "Researched Bloomberg, Two Sigma, and Citigroup AI agent implementations. All use domain-specific reasoning traces. HIPAA not applicable here (finance). SOX compliance is the key regulatory check.",
  "timestamp": "2026-03-06T10:00:00Z"
}

// PLAN (Creative Liberation Engine → Claude-Code)
{
  "from": "ANTIGRAVITY",
  "phase": "PLAN",
  "task": "Add Finance Blueprint to Creative Liberation Engine",
  "taskId": "T20260306-W3",
  "outputs": [".agents/brain/implementation_plan.md"],
  "next": "Implement packages/blueprints/src/verticals/finance.ts with 4-step reasoning trace: market signal → risk assessment → position recommendation → compliance check. See plan for full type signatures.",
  "context": "Plan approved. Mock the live price feed tool with historical data stub — no Bloomberg API key available yet. BlueprintRunner already exists in runner.ts.",
  "timestamp": "2026-03-06T10:25:00Z"
}
```

---

## 🔑 Constitutional Compliance

All HANDOFF.md writes pass through NORTHSTAR constitutional review:

- `context` must not contain PHI, PII, or credential strings
- `outputs` must not reference production secrets
- `next` must not direct a tool to skip LEX review on regulated-domain tasks

VAULT enforces these checks via `packages/constitution/src/middleware.ts`.
