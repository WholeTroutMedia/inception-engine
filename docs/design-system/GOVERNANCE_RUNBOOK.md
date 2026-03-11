# VERA-DESIGN Governance Runbook

# DS-705: Design System Governance & Drift Prevention

_Last updated: 2026-03-06_

---

## Purpose

This runbook defines how the Creative Liberation Engine design system remains healthy over time —
preventing drift, detecting regressions, and maintaining creative freedom within constraints.

---

## 1. Weekly Governance Review

**Owner:** VERA-DESIGN agent · **Trigger:** Every Monday 09:00 UTC (automated)

```bash
pnpm --filter @inception/design-governance scan
pnpm --filter @inception/design-agent scan:typography
pnpm --filter @inception/design-agent scan:layout
```

**Thresholds**

| Metric             | 🟢 Healthy | 🟡 Warning | 🔴 Critical |
|--------------------|-----------|-----------|------------|
| Drift score        | ≥ 90      | 70–89     | < 70       |
| Typography score   | ≥ 85      | 65–84     | < 65       |
| Layout harmony     | ≥ 80      | 60–79     | < 60       |
| Orphan tokens      | ≤ 5       | 6–15      | > 15       |
| Literal violations | 0         | 1–5       | > 5        |

**Action matrix**

- 🟢 No action required
- 🟡 Open `design-debt` issue, assign to responsible team within 3 business days
- 🔴 Block deploys from affected packages, escalate to ATHENA

---

## 2. Token Lifecycle Policy

### Adding New Tokens

1. **Primitive first.** Only add a semantic token if a primitive exists.
2. **W3C DTCG format.** Use `$value`, `$type` structure in JSON.
3. **Name must follow schema:** `[category].[variant].[state]` (e.g., `color.primary.hover`)
4. **CI gate:** `pnpm tokens:validate` must pass — enforces 4px grid, max sizes, tier rules.
5. **Penpot sync:** After merge, run `pnpm penpot:push` to sync to design tool.

### Deprecating Tokens

1. Add `$deprecated: true` and `$deprecationMessage` fields.
2. Run `pnpm --filter @inception/design-governance report` — shows all usages.
3. Replace all usages in a single PR.
4. Remove after 2 sprint cycles (grace period).

### Renaming Tokens

- **Never rename without alias.** Always keep old name pointing to new via `$value: "{new.path}"`.
- Grace period: 4 weeks.
- Document in `CHANGELOG.md` with breaking change marker.

---

## 3. VERA-DESIGN Score Gates

### PR Gates (CI — must pass to merge)

| Check                         | Tool                       | Threshold |
|-------------------------------|----------------------------|-----------|
| Token validation              | `validate-tokens.mjs`      | 0 errors  |
| Compliance scan               | `design-agent` scanner     | score ≥ 70 |
| Typography audit              | `auditors/typography.ts`   | score ≥ 70 |
| Layout harmony                | `auditors/layout.ts`       | score ≥ 70 |
| Build verification            | `tsup` all packages        | 0 errors  |
| TypeScript strict             | `tsc --noEmit`             | 0 errors  |

### Promotion Gate (gen-ui IRIS-GEN)

- AI-generated UI variations must score ≥ 70 to escape the sandbox.
- Variations scoring 70–89 get a `WARN: review recommended` label.
- Variations scoring ≥ 90 are auto-marked `production-ready`.

---

## 4. Component Change Protocol

When modifying an existing component:

1. **Story update** — update Storybook story to reflect new behavior.
2. **Chromatic snapshot** — CI runs visual regression; review diffs before merge.
3. **Accessibility check** — `@storybook/addon-a11y` must show 0 violations.
4. **Token audit** — confirm no new literal values were introduced.
5. **PR description** — include VERA score before/after.

---

## 5. New Component Checklist

- [ ] Uses only `var(--inc-*)` token references — zero literal values
- [ ] Built on Radix UI primitive (if interactive)
- [ ] Uses `class-variance-authority` for variant management
- [ ] `forwardRef` implemented
- [ ] `displayName` set
- [ ] Exported from `packages/ui/src/index.ts`
- [ ] Storybook story with `autodocs` tag written
- [ ] All variants in `AllVariants` story
- [ ] Passes `@storybook/addon-a11y` (0 violations)
- [ ] TypeScript strict — no `any`
- [ ] Added to component count in this runbook

---

## 6. Current Component Inventory

**Phase 1 (shipped):** Button, Heading, Badge, Card, Input, Stack/Inline, Alert

**Phase 2 (shipped):** Modal, Tabs, Checkbox, Switch, Tooltip, Separator, Spinner, Select, Table suite

**Phase 3 (planned):** Accordion, Popover, Command/Palette, DatePicker, Toast, Progress, Slider, Avatar

---

## 7. Penpot Sync Protocol (DS-801 / DS-802)

Penpot runs on NAS at `http://nas.local:9001`.

```bash
# Pull current design tokens from Penpot → DTCG JSON
pnpm --filter @inception/design-tokens penpot:pull

# Push compiled tokens to Penpot library
pnpm --filter @inception/design-tokens penpot:push
```

The sync script (`scripts/penpot-sync.mjs`) maps:

- `color.*` → Penpot color library
- `spacing.*` → Penpot grid styles
- `typography.*` → Penpot text styles
- `shadow.*` → Penpot shadow styles

Sync runs automatically on every merge to `main` via CI job `penpot-sync`.

---

## 8. Chromatic Visual Regression (DS-803)

Chromatic is integrated in Forgejo CI (`.gitea/workflows/design-system.yml`).

```yaml
chromatic:
  run: npx chromatic --project-token=$CHROMATIC_PROJECT_TOKEN --exit-once-uploaded
```

- Runs on every PR that touches `packages/ui/**`
- Baselines auto-accepted on `main`
- Visual diffs require human approval before merge
- Component stories are the source of truth for visual state

---

## 9. Escalation Path

```
Developer → ESLint rule (instant feedback in IDE)
         → CI gate (blocks PR)
         → VERA-DESIGN weekly scan (tracks trends)
         → ATHENA governance review (critical violations)
         → Codebase-wide refactor (if drift > 30%)
```

---

## 10. Reference

- Design token source: `packages/design-tokens/src/`
- Token validator: `packages/design-tokens/scripts/validate-tokens.mjs`
- VERA-DESIGN agent: `packages/design-agent/src/`
- Governance runner: `packages/design-governance/src/`
- CI workflow: `.github/workflows/design-system.yml`
- Penpot: `http://nas.local:9001`
- Chromatic: configured via `CHROMATIC_PROJECT_TOKEN` secret
