# The Wonder Engine

**Generative Design System - Your Canvas, Your Rules**

> Every user explores their own Wonderland. Every design element is discoverable. Every interaction teaches through delight.

The Wonder Engine is a design system framework that ships as a blank canvas. No opinions about what your project should look like - just the tools to make it look like anything you want.

---

## Philosophy

### The Alice Principle

**Learning through wonder, exploration through play.**

The Wonder Engine doesn't impose a style. It provides:

- A complete **token architecture** you can fill with any values
- **Theme generation** that creates from your vision, not ours
- **Components** that inherit whatever identity you give them
- An **evolution system** where themes grow and change over time

What you see out of the box is intentionally minimal. The system comes alive when you feed it your creative direction.

---

## How It Works

The Wonder Engine is built on three layers:

```
1. TOKENS        (raw values - colors, spacing, type, motion)
       |
2. THEMES        (tokens assembled into a coherent identity)
       |
3. COMPONENTS    (UI elements that consume the active theme)
```

Change the tokens, the theme updates. Change the theme, every component updates. This is the cascade - one source of truth flows everywhere.

---

## Theme Generation

You can create themes three ways:

### 1. Prompt-Based Generation

Describe what you want. The AI interprets your description and produces a complete token set - colors, typography feel, spacing density, motion character, and surface treatments.

```
"A clean medical dashboard with lots of white space"
"Brutalist portfolio with raw concrete textures"
"Warm indie bookstore with handwritten character"
"High-contrast accessibility-first dark mode"
"Playful children's education app with rounded everything"
```

Each prompt produces a different system. The engine doesn't default to any single aesthetic.

### 2. Image Extraction

Upload any image - a photograph, painting, screenshot, mood board. The system extracts:

- Dominant and accent colors
- Perceived mood and energy level
- Suggested surface treatment (flat, textured, layered, etc.)
- Motion character (calm, energetic, precise, organic)

### 3. Manual Token Builder

Set every value yourself. Start from the vanilla token file ([tokens.json](./tokens.json)) and make it yours:

- Pick your own color primitives
- Set your spacing scale
- Choose your type ramp
- Define your motion curves
- Build your surface system

---

## The Token System

All design decisions live in tokens. Tokens are organized by category and use CSS custom properties for runtime flexibility.

### Color Tokens

Colors use HSL format so you can manipulate hue, saturation, and lightness independently.

| Token | Purpose |
|-------|--------|
| `--color-primary` | Your main brand or action color |
| `--color-secondary` | Supporting color |
| `--color-background` | Page/app background |
| `--color-surface` | Cards, panels, elevated areas |
| `--color-accent` | Highlights, focus states, emphasis |
| `--color-success` | Positive feedback |
| `--color-warning` | Caution states |
| `--color-error` | Error states |
| `--color-info` | Informational |
| `--color-text` | Primary text |
| `--color-text-muted` | Secondary/caption text |

The defaults ship neutral. You define the palette.

### Spacing Scale

Based on a configurable base unit (default: 8pt grid, but you can change it).

| Token | Default | Notes |
|-------|---------|-------|
| `--space-1` | 4px | Half unit |
| `--space-2` | 8px | Base unit |
| `--space-3` | 12px | 1.5x |
| `--space-4` | 16px | 2x |
| `--space-6` | 24px | 3x |
| `--space-8` | 32px | 4x |
| `--space-12` | 48px | 6x |
| `--space-16` | 64px | 8x |

### Typography Scale

| Token | Default | Approx |
|-------|---------|--------|
| `--font-xs` | 0.75rem | 12px |
| `--font-sm` | 0.875rem | 14px |
| `--font-base` | 1rem | 16px |
| `--font-lg` | 1.125rem | 18px |
| `--font-xl` | 1.25rem | 20px |
| `--font-2xl` | 1.5rem | 24px |
| `--font-3xl` | 1.875rem | 30px |
| `--font-4xl` | 2.25rem | 36px |

Font families, weights, and line heights are also tokenized. Swap in any typeface.

### Border Radius

| Token | Default |
|-------|--------|
| `--radius-none` | 0 |
| `--radius-sm` | 6px |
| `--radius-md` | 8px |
| `--radius-lg` | 12px |
| `--radius-xl` | 16px |
| `--radius-2xl` | 24px |
| `--radius-full` | 9999px |

Want sharp corners? Set them all to 0. Want pill shapes? Crank them up. Your call.

### Motion Tokens

| Token | Default Curve | Character |
|-------|--------------|----------|
| `--ease-default` | `cubic-bezier(0.4, 0, 0.2, 1)` | Neutral, smooth |
| `--ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | Accelerating |
| `--ease-out` | `cubic-bezier(0, 0, 0.2, 1)` | Decelerating |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Bouncy, playful |
| `--ease-snappy` | `cubic-bezier(0.68, -0.55, 0.265, 1.55)` | Quick, decisive |

| Duration | Default |
|----------|--------|
| `--duration-fast` | 150ms |
| `--duration-base` | 250ms |
| `--duration-slow` | 400ms |

Motion is optional. Set durations to 0 for instant transitions. The system respects `prefers-reduced-motion` automatically.

### Surface Tokens

Surfaces describe how elements sit in space. The system supports multiple approaches - use whichever fits your design:

| Token | Purpose |
|-------|--------|
| `--surface-elevation-1` | Subtle lift (cards, dropdowns) |
| `--surface-elevation-2` | Medium lift (popovers, dialogs) |
| `--surface-elevation-3` | High lift (modals, overlays) |
| `--surface-blur` | Background blur amount (0 for none) |
| `--surface-opacity` | Surface transparency (1 for fully opaque) |
| `--surface-border` | Border treatment |

You can build flat designs (no shadows, no blur), material/elevated designs (shadow stacks), frosted glass effects (blur + transparency), or anything in between. The tokens don't assume which approach you'll take.

---

## Components

Components consume the active theme automatically. They don't carry their own opinions about color or style - they inherit from tokens.

Every component supports:

- **Variants** - Different visual treatments per context
- **Sizes** - Consistent sm / md / lg scale
- **States** - hover, focus, active, disabled, loading
- **Accessibility** - ARIA attributes, keyboard navigation, focus management
- **Responsive** - Adapts to viewport

### Available Components

| Component | Variants | Notes |
|-----------|----------|-------|
| **Button** | primary, secondary, outline, ghost, danger | All inherit from color tokens |
| **Card** | default, outlined, elevated | Surface treatment from surface tokens |
| **Input** | default, outlined, filled | Border and focus from tokens |
| **Modal** | centered, drawer, fullscreen | Overlay uses surface tokens |
| **Toast** | success, warning, error, info | Uses semantic color tokens |
| **Badge** | solid, outlined, subtle | |
| **Tabs** | underline, pills, enclosed | |
| **Avatar** | circle, rounded, square | Uses radius tokens |

### Size Scale

| Size | Padding | Font | Radius |
|------|---------|------|--------|
| `sm` | `--space-1` x `--space-3` | `--font-sm` | `--radius-sm` |
| `md` | `--space-2` x `--space-4` | `--font-base` | `--radius-md` |
| `lg` | `--space-3` x `--space-6` | `--font-lg` | `--radius-lg` |

---

## Example Themes

To show the range of what's possible, here are themes generated from different prompts. Each one uses the same token architecture and components - only the values change.

### Midnight Neon

```
Prompt: "Cyberpunk Tokyo at 3am"
Background: deep blue-black (#0A0E27)
Primary: hot pink (#FF006E)
Accent: cyan (#00F5FF)
Surfaces: blur + transparency
Motion: slow drift, subtle pulse
Radius: rounded (12-16px)
```

### Nordic Birch

```
Prompt: "Scandinavian minimalism, warm wood, lots of air"
Background: warm white (#FAFAF7)
Primary: charcoal (#2D2D2D)
Accent: muted sage (#7D8C6E)
Surfaces: flat, no shadows, thin borders
Motion: smooth, understated
Radius: subtle (4-6px)
```

### Desert Sandstone

```
Prompt: "Southwest desert at golden hour"
Background: warm sand (#F5E6D3)
Primary: terracotta (#C75B39)
Accent: turquoise (#40B5AD)
Surfaces: textured, soft shadows
Motion: gentle, organic
Radius: mixed (0 for headers, rounded for buttons)
```

### Clinical Precision

```
Prompt: "Medical dashboard, high contrast, zero ambiguity"
Background: pure white (#FFFFFF)
Primary: deep navy (#003366)
Accent: alert red (#D32F2F)
Surfaces: sharp borders, no blur, strong shadows
Motion: instant (0ms transitions)
Radius: none (0px everywhere)
```

### Forest Canopy

```
Prompt: "Deep forest, moss and fern, organic warmth"
Background: dark green-black (#0D1A0D)
Primary: moss green (#4A7C59)
Accent: amber (#E8A838)
Surfaces: layered, medium depth
Motion: spring curves, natural bounce
Radius: organic (mixed, asymmetric)
```

### Paper & Ink

```
Prompt: "Newspaper editorial, old-school typography"
Background: cream (#FFF8E7)
Primary: pure black (#000000)
Accent: red (#CC0000)
Surfaces: flat, ruled lines instead of shadows
Motion: none - static layout
Radius: none (0px)
```

These are starting points. Every value is yours to override.

---

## Theme API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/themes/generate-from-prompt` | POST | Generate complete token set from text |
| `/themes/generate-from-image` | POST | Extract tokens from uploaded image |
| `/themes` | GET | List saved themes |
| `/themes/{id}/apply` | POST | Apply theme to active workspace |
| `/themes/{id}/export` | GET | Export as CSS, Tailwind, or JSON |

---

## Export Formats

Themes export to whatever your stack needs:

- **CSS Custom Properties** - Drop into any project, framework-agnostic
- **Tailwind Config** - Extend your tailwind.config.js directly
- **JSON Tokens** - See [tokens.json](./tokens.json) for the raw format
- **SCSS Variables** - For Sass-based projects
- **Figma Tokens** - Sync with your design tool

---

## Accessibility

- Generated palettes are checked against WCAG 2.1 AA contrast minimums
- Focus indicators are always visible regardless of theme
- `prefers-reduced-motion` is respected automatically
- `prefers-color-scheme` can trigger light/dark variants
- Semantic HTML and ARIA support throughout all components
- Color is never the only indicator of state

---

## Getting Started

1. Start with the vanilla [tokens.json](./tokens.json)
2. Generate a theme from a prompt, image, or build manually
3. Apply the theme - every component picks it up automatically
4. Iterate - themes are saved, versioned, and remixable

The Wonder Engine gives you the architecture. You give it the soul.

---

*Back to [README](../README.md)*
