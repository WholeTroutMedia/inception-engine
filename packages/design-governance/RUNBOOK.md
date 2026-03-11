# Design Governance Runbook

*Version 1.0 — Creative Liberation Engine v5 GENESIS | March 2026*

---

## Purpose

This runbook defines the council process for making changes to the Creative Liberation Engine design system — covering token mutations, component schema changes, theme additions, and any deviation from the established tier constraints.

All design changes follow the **VERA-DESIGN review chain**: automated CI gates → peer review → council approval (for breaking changes).

---

## Token Change Process

### 1. Minor Token Changes (values only, no new tokens)

- Open a PR with your changes
- CI runs automatically: `pnpm tokens:validate` + VERA-DESIGN compliance scan
- Minimum: 1 SHIP review approval
- Merge when CI green + approved

### 2. New Primitive Token Addition

**Requires:** `CHANGE-FORM-TOKEN-PRIMITIVE` in PR body (see template below)

Review chain:

1. CI gates pass (token validation, quality gate ≥ 70, typecheck)
2. VERA council member reviews: Is this truly a new primitive, or should it be composed from existing tokens?
3. Check: Does it fit the constraints? (Max 9 type sizes, max 4 shadows, 4px spacing grid)
4. Approve or redirect to semantic tier

### 3. New Semantic Token Addition

- Must reference only primitive tokens, never raw values
- PR description must explain the role/intent of the token
- Requires 1 reviewer from the design system council
- CI quality gate must pass (score ≥ 70)

### 4. Breaking Token Rename / Removal

**Requires:** `CHANGE-FORM-TOKEN-BREAKING` in PR body

Review chain:

1. Deprecation PR filed first — adds `$deprecated: true` + migration hint to the token
2. Wait minimum 1 sprint before removal
3. Removal PR must include migration evidence (search showing zero usages)
4. Council sign-off required (minimum 2 approvals)

---

## Component Schema Change Process

### Additive Changes (new optional prop)

- Standard PR process
- CI and design quality gate must pass
- Storybook story must be updated to include the new variant

### Breaking Changes (renamed/removed prop, behavior change)

**Requires:** `CHANGE-FORM-COMPONENT-BREAKING` in PR body

Review chain:

1. Migration guide written in PR description (what to change and why)
2. Codemod script provided if >3 call sites affected
3. VERA-DESIGN audit: Does the change reduce or maintain compliance score?
4. Council approval required (minimum 2)

---

## Theme Addition Process

1. Scaffold the theme in `packages/theme-engine/src/themes.ts`
2. All token values must reference existing semantic tokens (no new primitives without the token primitive process above)
3. Run contrast validation: `pnpm --filter @inception/theme-engine validate`
4. All text/background pairs must meet WCAG AA (4.5:1) minimum
5. Submit PR with Storybook ThemePlayground screenshot showing all 4 tabs (tokens, contrast, live preview, export)
6. 1 reviewer approval required

---

## Change Form Templates

### `CHANGE-FORM-TOKEN-PRIMITIVE`

```
## Primitive Token Change Form

**Token name(s):** 
**Proposed value(s):** 
**Tier:** [ ] color [ ] spacing [ ] typography [ ] radius [ ] shadow [ ] motion

### Justification
Why is this a primitive, not a semantic token?

### Constraint check
- [ ] Spacing values are on the 4px grid
- [ ] Typography: total sizes ≤ 9 after this change
- [ ] Shadows: total set ≤ 4 after this change
- [ ] No semantic meaning encoded in the primitive name

### Affected tokens (semantic/component that reference this)
_List any semantic or component tokens that will need updating_
```

---

### `CHANGE-FORM-TOKEN-BREAKING`

```
## Breaking Token Change Form

**Token name being changed/removed:** 
**Type of change:** [ ] rename [ ] removal [ ] value type change

### Migration Path
How should consumers update their code?

### Search evidence (zero usages)
Paste output of: `grep -r "TOKEN_NAME" packages/ apps/`

### Deprecation period
This token was first deprecated in PR #_____ on ____-__-__.
```

---

### `CHANGE-FORM-COMPONENT-BREAKING`

```
## Breaking Component Change Form

**Component:** 
**Props affected:** 
**Change type:** [ ] rename [ ] removal [ ] behavior change

### Migration guide
Before:
```ts
// old usage
```

After:

```ts
// new usage
```

### Codemod (if applicable)

_Link to codemod script or "Manual migration required"*

### VERA-DESIGN score impact

- Before: ___/100
- After: ___/100

```

---

## CI Gate Thresholds

| Gate | Threshold | Action on failure |
|------|-----------|-------------------|
| Token validation | All tiers pass | Block merge |
| VERA-DESIGN quality | ≥ 70/100 | Block merge |
| WCAG contrast (AA) | 4.5:1 minimum | Block merge |
| Drift score | < 30 | Block merge |
| Component compliance | ≥ 70% | Warn (not blocking in PR, blocking in release) |
| TypeScript strict | 0 errors | Block merge |
| Chromatic visual diff | Reviewed | Block merge if unreviewed |

---

## Escalation

If a change requires urgent bypass of any gate:
1. Add `DESIGN-EMERGENCY` label to PR
2. Post in `#creative-liberation-engine` Slack with justification
3. Get explicit approval from AVERI council (ATHENA for strategy, VERA for truth-check, IRIS for build sign-off)
4. Document in the decision log at `packages/design-governance/DECISION_LOG.md`

---

## Contacts

| Role | Responsible Agent |
|------|------------------|
| Design system strategy | ATHENA |
| Quality gating + truth-check | VERA |
| Build + release | IRIS |
| Design tools (Penpot sync) | ATLAS |
