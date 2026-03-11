# Creative Liberation Engine Design System — Master Spec

**Version:** 1.0.0 | **Date:** 2026-03-06 | **Status:** APPROVED FOR IMPLEMENTATION

> This document defines the 8-layer architecture for the Creative Liberation Engine Design System.
> Constitutional principle: No MVPs. Every layer ships complete.

---

## Overview

The design system solves one problem: **creative freedom without visual chaos**. It achieves this through pre-validated combinatory spaces — where every possible choice maps to a token, every token has semantic meaning, and an AI agent watches in real time for drift, regressions, or accessibility failures.

**Core thesis:** Keep the surface area of the system small. Let the combinatory volume be vast. Pre-validate the space instead of policing individual choices.

---

## LAYER 1 — Constraint-Based Token Architecture

**Package:** `packages/design-tokens`
**Standard:** W3C DTCG format (2025.10) + Style Dictionary v4

### Architecture

```
Tier 1: Primitive Tokens (raw values — NEVER consumed directly by components)
  color.blue.500 = #0066cc
  spacing.base = 4px
  radius.sm = 4px | radius.md = 8px | radius.lg = 16px

Tier 2: Semantic Tokens (meaningful roles — theme-swappable)
  color.primary     → ref: color.blue.500
  color.surface     → ref: color.gray.50
  color.danger      → ref: color.red.600
  spacing.inline    → ref: spacing.base * 4
  spacing.stack     → ref: spacing.base * 6
  font.heading      → ref: font-family.display

Tier 3: Component Tokens (strict: only intro when pattern repeats 3+ times)
  button.background → ref: color.primary
  input.border      → ref: color.border.default
```

### Token File Structure

```
packages/design-tokens/
  src/
    primitives/
      color.json      — Full color ramps (9 shades each, ~12 hues)
      spacing.json    — 10-step scale (4px base, powers of 2)
      typography.json — Type scale (9 sizes, modular ratio 1.25)
      radius.json     — 3 values only
      shadow.json     — 4 depth levels
      motion.json     — Duration (6 values) + easings (5 named curves)
    semantic/
      color.json      — Roles: primary, surface, danger, warning, success, info, border, text
      spacing.json    — Roles: inline, stack, inset, squish, stretch
      typography.json — Roles: heading, body, code, label, caption
    component/        — Introduced only via governed PR process
  config/
    style-dictionary.config.ts
  dist/
    css/              — CSS custom properties (web)
    js/               — ESM token object (JS consumers)
    ios/              — Swift constants (future)
    android/          — XML resources (future)
```

### Constraints

- **Max 9 type sizes** — enforced by token schema validation
- **Max 3 border radii** — enforced
- **Max 4 shadow depths** — enforced
- **Spacing values must derive from 4px base unit** (×1, ×2, ×4, ×8, ×16, ×24, ×32, ×48, ×64, ×96)
- **Color ramps: 9 shades only** (50 through 900)
- No raw hex/px values anywhere outside `primitives/`

### Tasks

| ID | Title | Priority |
|----|-------|----------|
| DS-101 | Scaffold `packages/design-tokens` with W3C DTCG structure | P1 |
| DS-102 | Author primitive token files (color, spacing, type, radius, shadow, motion) | P1 |
| DS-103 | Author semantic token files with role mappings | P1 |
| DS-104 | Configure Style Dictionary v4 (CSS + JS + iOS + Android outputs) | P1 |
| DS-105 | Write JSON Schema validator that enforces tier constraints | P1 |
| DS-106 | CI step: validate tokens on every PR (`pnpm tokens:validate`) | P2 |
| DS-107 | Generate token reference documentation page in Storybook | P2 |

---

## LAYER 2 — Component Architecture (Radix + Shadcn Pattern)

**Package:** `packages/ui`
**Pattern:** Radix UI primitives → Shadcn-style compositions → Inception token system

### Architecture

```
packages/ui/
  src/
    primitives/       — Thin re-exports of Radix UI with Inception ARIA overrides
    components/       — Styled compositions (tokens only — zero literal values)
      Button/
        Button.tsx
        Button.stories.tsx
        button.schema.json   — JSON Schema for component API
      Input/
      Modal/
      Card/
      [etc.]
    tokens/           — Local re-export of design-tokens dist
    index.ts
```

### Guardrails

1. **No literal values in components** — ESLint rule `no-literal-css-values` blocks any px/hex/rgb in component files
2. **JSON Schema API definitions** — every component's props validated against schema; Storybook controls auto-generated
3. **Accessibility via Radix** — focus management, keyboard nav, ARIA roles handled at primitive layer, not reimplemented
4. **Token-only theming** — `className` generation via `cva` (Class Variance Authority) with token CSS vars only

### Component Inventory (Phase 1)

| Category | Components |
|----------|-----------|
| Actions | Button, IconButton, Link |
| Forms | Input, Textarea, Select, Checkbox, Radio, Switch, Slider |
| Overlay | Modal, Drawer, Tooltip, Popover, ContextMenu |
| Layout | Stack, Inline, Grid, Divider, Container |
| Feedback | Alert, Toast, Badge, Spinner, Skeleton |
| Navigation | Tabs, Breadcrumb, Pagination, Sidebar |
| Data | Table, Card, List, Accordion |
| Typography | Heading, Text, Code, Label |

### Tasks

| ID | Title | Priority |
|----|-------|----------|
| DS-201 | Scaffold `packages/ui` with Radix + CVA + token integration | P1 |
| DS-202 | Implement Phase 1 component inventory (all categories) | P1 |
| DS-203 | Author JSON Schema for every component API | P1 |
| DS-204 | Wire ESLint rule: `no-literal-css-values` in ui package | P1 |
| DS-205 | Configure Storybook with auto-generated controls from JSON Schema | P2 |
| DS-206 | Write Storybook stories for every component (all state variants) | P2 |
| DS-207 | Implement `cva` token-variant mapping for all components | P1 |

---

## LAYER 3 — Theming Engine

**Package:** `packages/theme-engine`
**Pattern:** Token remapping (never duplication) + validated theme playground

### Theme Architecture

```
Theme = { semantic token name → primitive token reference }

Built-in themes:
  - default (Inception primary)
  - dark
  - light
  - high-contrast

User themes:
  - Stored in user preferences (Firestore or local)
  - Must pass validation gate before export
  - Scoped to semantic tokens only (no primitive overrides)
```

### Validation Gates (non-bypassable)

```typescript
interface ThemeValidationResult {
  passed: boolean;
  failures: {
    contrastRatio?: { pair: string; actual: number; required: number }[];
    hierarchyViolation?: string[];
    spacingRhythm?: string[];
  };
}
```

All three gates must pass:

1. **Contrast** — WCAG AA minimum (4.5:1 text, 3:1 UI components)
2. **Hierarchy** — heading scale must be strictly descending
3. **Rhythm** — all spacing values must be on the 4px grid

### Theme Playground UI

- Color palette editor (palettes from pre-validated ramp set only)
- Typography scale preview across sample component assemblies
- Real-time contrast checker (visual + numeric WCAG display)
- One-click export as W3C DTCG JSON
- Live preview on the full component library

### Tasks

| ID | Title | Priority |
|----|-------|----------|
| DS-301 | Scaffold `packages/theme-engine` with theme schema | P1 |
| DS-302 | Implement 4 built-in themes (default, dark, light, high-contrast) | P1 |
| DS-303 | Build theme validation pipeline (contrast + hierarchy + rhythm) | P1 |
| DS-304 | Build Theme Playground UI component | P1 |
| DS-305 | Implement theme export as DTCG JSON | P2 |
| DS-306 | User theme persistence (Firestore or localStorage) | P2 |
| DS-307 | Real-time WCAG contrast checker widget | P2 |

---

## LAYER 4 — AI Design Quality Agent (VERA-DESIGN)

**Agent:** `VERA-DESIGN` (sub-mode of VERA, specialized for design governance)
**Package:** `packages/design-agent`

### Agent Architecture

```
VERA-DESIGN
  ├── Token Compliance Scanner    — Detects literal values in component/style files
  ├── Layout Harmony Scorer       — Validates spacing rhythm against token scale
  ├── Color Validator             — Contrast + palette coherence checks
  ├── Typography Auditor          — Heading levels, line heights, readability
  ├── Component Usage Auditor     — Detects misuse / improper nesting
  └── Quality Score Aggregator    — Weighted heuristic → 0-100 score
```

### Scoring Rubric

| Category | Weight | Checks |
|----------|--------|--------|
| Consistency | 25% | Token adherence, pattern reuse, visual rhythm |
| Accessibility | 25% | Contrast, focus, ARIA, touch targets |
| Hierarchy | 20% | Visual weight ordering, IA |
| Craft | 15% | Alignment, spacing precision, polish |
| Responsiveness | 15% | Breakpoint behavior, reflow |

**Threshold:** Score < 70 → flagged with remediation. Score ≥ 90 → celebration micro-animation.

### Integration Points

- **VS Code / Creative Liberation Engine IDE** — inline lint warnings on literal value detection
- **Storybook** — quality score badge per component story
- **CI/CD** — design quality gate on every PR (configurable threshold, default 70)
- **Sandbox** — live scoring as user experiments
- **Percy/Chromatic** — visual regression companion

### Visual Regression

**Tool:** Chromatic (Storybook-native, free tier available)

- Snapshot every component state on every PR
- AI visual diff — filters noise, highlights true regressions
- Block merges above configurable regression threshold

### Tasks

| ID | Title | Priority |
|----|-------|----------|
| DS-401 | Scaffold `packages/design-agent` with VERA-DESIGN agent definition | P1 |
| DS-402 | Implement Token Compliance Scanner (AST-based, supports TSX/CSS) | P1 |
| DS-403 | Implement Layout Harmony Scorer | P2 |
| DS-404 | Implement Color Validator (contrast + palette coherence) | P1 |
| DS-405 | Implement Typography Auditor | P2 |
| DS-406 | Build Quality Score Aggregator (weighted rubric → 0-100) | P1 |
| DS-407 | CI integration: design quality gate on PR (GitHub Actions step) | P2 |
| DS-408 | Chromatic integration for visual regression testing | P2 |
| DS-409 | Storybook quality score badge plugin | P3 |

---

## LAYER 5 — Safe Exploration Sandbox

**Package:** `packages/design-sandbox`
**Surface:** Standalone React app + embeddable widget

### Sandbox Modes

| Mode | Who | Behavior |
|------|-----|----------|
| **Sandbox** | Anyone | Fully isolated — no production impact |
| **Guided** | Default | AI suggestions inline, soft guardrails active |
| **Freeform** | Advanced | Hard constraints only, minimal friction |

### Guardrail Gradient

| Type | UX | Example |
|------|-----|---------|
| **Hard** | Blocks entirely | Font < 12px, non-token color |
| **Soft** | Warning + friction | WCAG AA fail — confirm to proceed |
| **Nudge** | Suggestion only | "Try `spacing.lg` instead of 30px" |
| **Celebration** | Micro-animation | Score ≥ 90 — confetti burst |

### Technical Requirements

- All sandbox state isolated in `SandboxContext` (never touches production tokens)
- Auto-snapshot before every mutating action (ring buffer, 50 snapshots max)
- Full undo/redo stack (`Ctrl+Z` / `Ctrl+Y`)
- Export sandbox result as DTCG JSON or copy-paste CSS custom properties
- Real-time VERA-DESIGN quality score as user edits

### Tasks

| ID | Title | Priority |
|----|-------|----------|
| DS-501 | Scaffold `packages/design-sandbox` (React + SandboxContext) | P1 |
| DS-502 | Implement three sandbox modes (Sandbox / Guided / Freeform) | P1 |
| DS-503 | Build guardrail gradient system (hard/soft/nudge/celebration) | P1 |
| DS-504 | Auto-snapshot ring buffer + undo/redo stack | P2 |
| DS-505 | Real-time VERA-DESIGN score integration in sandbox | P2 |
| DS-506 | Export to DTCG JSON + CSS variables copy | P2 |
| DS-507 | Celebration micro-animation (score ≥ 90) | P3 |

---

## LAYER 6 — Generative UI with Constitutional Guardrails

**Agent:** `IRIS-GEN` (sub-mode of IRIS, generative UI specialist)
**Package:** `packages/gen-ui`

### Flow

```
1. User: natural language description
2. IRIS-GEN: generates 3-5 component variations
   - Uses ONLY packages/ui components
   - Uses ONLY packages/design-tokens values
   - Never introduces new components or literal values
3. VERA-DESIGN: scores each variation automatically
4. UI presents variations sorted by score descending
5. User selects → Sandbox for refinement → promotes to production only if score ≥ 70
```

### Constitutional Rules (encoded in IRIS-GEN system prompt)

```
1. NEVER generate a literal CSS value — always reference a token
2. NEVER create a new component — check packages/ui first
3. ALWAYS validate contrast before presenting to user
4. ALWAYS preserve responsive behavior across all 5 breakpoints
5. ALWAYS present highest-scoring variation first
6. DO NOT promote any variation scoring below 70
```

### Tasks

| ID | Title | Priority |
|----|-------|----------|
| DS-601 | Scaffold `packages/gen-ui` with IRIS-GEN agent integration | P1 |
| DS-602 | Build natural language → component variation generator (Genkit flow) | P1 |
| DS-603 | Wire VERA-DESIGN scoring into generation pipeline | P1 |
| DS-604 | Build variation comparison UI (side-by-side with score badges) | P2 |
| DS-605 | Implement promotion gate (score < 70 blocked from production export) | P1 |
| DS-606 | Sandbox handoff — selected variation opens in Design Sandbox | P2 |

---

## LAYER 7 — Design Governance & Drift Prevention

**Owner agent:** VERA (memory + review role)
**Package:** `packages/design-governance`

### Automated Monitoring

- **Token usage analytics** — which tokens used, which orphaned, weekly report
- **Component census** — inventory of all component instances + deviation from spec
- **Drift alerts** — VERA flags any component diverging from its schema
- **Deprecation pipeline** — old pattern → flagged → migration PR auto-generated → removed after 2 sprint cycles

### Governance Process

**New token/component proposal must answer:**

1. Why is this needed? (Use case evidence)
2. What existing token/component does it replace or complement?
3. How many screens/components will use it? (volume impact)
4. What existing token/component could handle this with a minor modification?

**Change velocity rule:** No more than 3 new semantic tokens per sprint cycle without a governance review.

### Design System Council

- ATHENA (strategy sign-off)
- VERA (memory + drift audit)
- Minimum 1 human review on any new tier-3 component token

### Tasks

| ID | Title | Priority |
|----|-------|----------|
| DS-701 | Build token usage analytics dashboard (orphan detection, usage heat) | P2 |
| DS-702 | Build component census reporter (deviation from schema) | P2 |
| DS-703 | Implement drift detection CI job (VERA review on schema mismatch) | P2 |
| DS-704 | Build deprecation pipeline (flag → migration PR → removal) | P3 |
| DS-705 | Write Design Governance Runbook (council process, change form template) | P2 |

---

## LAYER 8 — Technology Stack & Integration

### Full Stack

| Layer | Tool | Notes |
|-------|------|-------|
| Token Definition | W3C DTCG JSON | Standard format, tooling-agnostic |
| Token Compilation | Style Dictionary v4 | CSS/JS/iOS/Android outputs |
| CSS Foundation | Open Props + CSS Custom Props | Pre-validated scale, no Tailwind required |
| Primitives | Radix UI | Accessible, unstyled behavioral layer |
| Styled Components | Shadcn-pattern (CVA) | Copy-ownable, token-consuming |
| Design Tool | Penpot (self-hosted on NAS) | Open-source, SVG/HTML/CSS native |
| Generative UI | IRIS-GEN (Genkit flow) | v0.dev-inspired, token-constrained |
| Quality Agent | VERA-DESIGN | Heuristic scoring, real-time lint |
| Visual Testing | Chromatic | Storybook-native, free tier |
| Documentation | Storybook + kickstartDS | Interactive token playground |
| Sandbox | packages/design-sandbox | Isolated exploration environment |

### Tasks

| ID | Title | Priority |
|----|-------|----------|
| DS-801 | Spin up Penpot on NAS Docker stack (self-hosted design tool) | P2 |
| DS-802 | Configure Penpot → DTCG token sync pipeline | P2 |
| DS-803 | Set up Chromatic in Forgejo CI pipeline | P2 |
| DS-804 | Configure Open Props as CSS foundation in `packages/ui` | P1 |
| DS-805 | Write integration test: token → component → theme round-trip | P1 |
| DS-806 | Build kickstartDS-style token playground in Storybook | P2 |

---

## Monorepo Integration Map

```
brainchild-v5/
  packages/
    design-tokens/      ← Layer 1 (foundation — all packages depend on this)
    ui/                 ← Layer 2 (consumes design-tokens)
    theme-engine/       ← Layer 3 (consumes design-tokens)
    design-agent/       ← Layer 4 (consumes design-tokens + ui)
    design-sandbox/     ← Layer 5 (consumes ui + design-agent + theme-engine)
    gen-ui/             ← Layer 6 (consumes ui + design-agent + genkit)
    design-governance/  ← Layer 7 (consumes design-agent + design-tokens)
  services/
    design-service/     ← HTTP API wrapping design-agent for CI integrations
  apps/
    storybook/          ← Documentation surface (consumes ui + theme-engine)
    theme-playground/   ← Standalone theming UI
```

## Dependency Order (Build + Ship Sequence)

```
1. design-tokens (no deps)
2. ui (design-tokens)
3. theme-engine (design-tokens)
4. design-agent (design-tokens + ui)
5. design-sandbox (ui + design-agent + theme-engine)
6. gen-ui (ui + design-agent + genkit)
7. design-governance (design-agent + design-tokens)
8. design-service + storybook + theme-playground (integration layer)
```

---

## Task Summary Count

| Layer | Tasks | P1 | P2 | P3 |
|-------|-------|----|----|-----|
| L1 Token Architecture | 7 | 5 | 2 | 0 |
| L2 Component Architecture | 7 | 5 | 2 | 0 |
| L3 Theming Engine | 7 | 3 | 4 | 0 |
| L4 Design Quality Agent | 9 | 4 | 4 | 1 |
| L5 Safe Exploration Sandbox | 7 | 3 | 3 | 1 |
| L6 Generative UI | 6 | 4 | 2 | 0 |
| L7 Governance | 5 | 0 | 4 | 1 |
| L8 Stack Integration | 6 | 2 | 4 | 0 |
| **Total** | **54** | **26** | **25** | **3** |
