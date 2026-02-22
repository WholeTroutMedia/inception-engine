# Wonder Engine — Design System

**Your canvas. Your rules. No opinions imposed.**

> Every user explores their own Wonderland. Every design element is discoverable. Every interaction teaches through delight.
>
> *The Alice Principle* — Learning through wonder, exploration through play.

---

## What Is This?

The Wonder Engine is Inception Engine's design language. It ships as a **blank canvas** — a complete token architecture with intentionally neutral starting values. You describe a mood, upload an image, or set values by hand. The system generates everything your UI needs.

No Figma files. No component library to install. Just a universal design language that any agent can read and any framework can consume.

---

## What's Inside

| File | What It Does |
|------|-------------|
| [`tokens.json`](./tokens.json) | The complete design token set — colors, typography, spacing, motion, surfaces, breakpoints, z-index, grid, borders, shadows, and opacity |
| [`WONDER_ENGINE.md`](./WONDER_ENGINE.md) | The design philosophy, how the three-layer system works (Tokens → Themes → Components), and how to generate custom themes |

---

## Token Categories

The design language covers every dimension of visual design:

### Colors
- **Primitives** — Primary, secondary, background, surface, accent, text, muted text
- **Semantic** — Success, warning, error, info
- All values in HSL format for easy manipulation

### Typography
- **Font families** — Sans-serif system stack + monospace
- **Scale** — 8 sizes from `xs` (12px) to `4xl` (36px)
- **Line heights** — Tight, normal, relaxed
- **Font weights** — Normal, medium, semibold, bold

### Spacing
- **Base unit** — 8px grid system
- **Scale** — 10 stops from 4px to 96px

### Motion
- **Durations** — Instant (0ms) to slow (500ms)
- **Easings** — Default, in, out, in-out, bounce, spring
- **Reduced motion** — Built-in accessibility support

### Surfaces
- **Variants** — Flat, raised, overlay, sunken
- **Blur** — Small, medium, large backdrop blur

### Layout
- **Breakpoints** — Mobile, tablet, desktop, wide, ultrawide
- **Z-index** — Semantic layers from base to toast
- **Grid** — 12-column with configurable gap and max-width

### Visual Polish
- **Border radius** — None through full (circular)
- **Shadows** — 5 elevation levels
- **Opacity** — Semantic levels from disabled to full

---

## How It Works

The Wonder Engine operates on three layers:

```
1. TOKENS      (raw values — this file)
       |
2. THEMES      (tokens assembled into a coherent identity)
       |
3. COMPONENTS  (UI elements that consume the active theme)
```

Change the tokens, the theme updates. Change the theme, every component updates. One source of truth flows everywhere.

---

## Using the Tokens

### With AURORA (AI-Generated Themes)

Tell AURORA what you want:

```
@AURORA generate tokens for a dark meditation app — calm, deep blues, soft glows
```

AURORA will generate a complete token override based on your description.

### Manual Override

Edit `tokens.json` directly. Every value has a description field explaining what it controls. The neutral defaults are designed to be overridden — that's the whole point.

### In Your Framework

Tokens translate to CSS custom properties:

```css
:root {
  --color-primary: hsl(220, 13%, 46%);
  --color-accent: hsl(220, 90%, 56%);
  --spacing-4: 1rem;
  --font-size-base: 1rem;
  --radius-md: 0.375rem;
  --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.1);
}
```

Every framework (React, Next.js, Vue, Svelte, vanilla CSS) can consume these. The tokens are framework-agnostic by design.

---

## Design Principles

1. **No opinions** — The system doesn't decide what looks good. You do.
2. **Complete from day one** — Every token category is populated. Nothing is "coming soon."
3. **Prompt-ready** — Describe a mood and get a theme. No design skills required.
4. **Accessible** — Reduced motion support, semantic color naming, readable defaults.
5. **Cascading** — Change one value, watch it flow through the entire system.

---

## Further Reading

- [Wonder Engine Philosophy](./WONDER_ENGINE.md) — The Alice Principle, three-layer architecture, theme generation
- [Agent Registry](../docs/AGENTS.md) — AURORA handles design direction
- [Getting Started](../docs/GETTING_STARTED.md) — Set up Inception Engine and start building

---

*Wonder Engine — Inception Engine Light Edition*
*Built by [Whole Trout Media](https://github.com/WholeTroutMedia). Liberating artists everywhere.*
