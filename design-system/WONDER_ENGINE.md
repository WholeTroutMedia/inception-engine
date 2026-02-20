# The Wonder Engine

**Generative Design System Architecture**

> Every user explores their own Wonderland. Themes aren't picked - they're dreamed, generated, and evolved. The UI becomes a living canvas that responds to imagination.

---

## The Alice Principle

**Learning through wonder, exploration through play.**

- Every design element is discoverable
- Every interaction teaches through delight
- Every theme is a new world to explore
- Nothing is fixed - everything evolves

---

## Theme Generation

Three ways to create a theme:

### 1. Prompt-Based Generation

Describe a mood, get a complete theme. The AI analyzes your prompt and generates a harmonious color palette, typography selections, motion presets, and atmosphere settings.

```
Input:  "A serene Japanese zen garden at dawn with soft pastels"
Output: Complete theme with colors, motion curves, glass intensity, and typography
```

### 2. Image Upload (Instant Swap)

Upload any image - a photo, artwork, or screenshot. The system extracts dominant colors, analyzes mood and atmosphere, generates a complementary palette, and applies the theme in under 2 seconds.

### 3. Node-Based Theme Builder

A visual playground for exploring color harmonies and material properties:

```
[Base Color] --> [Harmony Generator] --> [Palette]
                                            |
                                    [Mood Selector]
                                            |
                                   [Material Selector]
                                            |
                                    [Motion Preset]
                                            |
                                     [Live Preview]
```

---

## Design Token System

The Wonder Engine uses CSS custom properties (variables) with an HSL color system for easy manipulation.

### Color Tokens

| Token | Purpose | Default |
|-------|---------|--------|
| `--color-primary` | Main brand color | `220 90% 56%` |
| `--color-secondary` | Complementary color | `280 85% 60%` |
| `--color-background` | Main background | `240 10% 8%` |
| `--color-surface` | Cards, panels | `240 8% 12%` |
| `--color-accent` | Highlights, CTAs | `180 100% 50%` |
| `--color-success` | Success states | `142 71% 45%` |
| `--color-warning` | Warning states | `38 92% 50%` |
| `--color-error` | Error states | `0 84% 60%` |
| `--color-info` | Information | `199 89% 48%` |

### Material Tokens

| Token | Purpose |
|-------|--------|
| `--surface-glass` | Frosted glass background |
| `--surface-glass-border` | Glass element borders |
| `--blur-intensity` | Backdrop blur amount |
| `--glow-intensity` | Neon glow effect strength |

### Spacing Scale (8pt Grid)

| Token | Size |
|-------|------|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--space-12` | 48px |
| `--space-16` | 64px |

### Typography Scale

| Token | Size |
|-------|------|
| `--font-xs` | 12px (0.75rem) |
| `--font-sm` | 14px (0.875rem) |
| `--font-base` | 16px (1rem) |
| `--font-lg` | 18px (1.125rem) |
| `--font-xl` | 20px (1.25rem) |
| `--font-2xl` | 24px (1.5rem) |
| `--font-3xl` | 30px (1.875rem) |
| `--font-4xl` | 36px (2.25rem) |

### Border Radius

| Token | Size |
|-------|------|
| `--radius-sm` | 6px |
| `--radius-md` | 8px |
| `--radius-lg` | 12px |
| `--radius-xl` | 16px |
| `--radius-2xl` | 24px |
| `--radius-full` | 9999px |

### Motion Presets

| Token | Curve | Use Case |
|-------|-------|----------|
| `--spring-gentle` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Hover effects, subtle interactions |
| `--spring-snappy` | `cubic-bezier(0.68, -0.55, 0.265, 1.55)` | Button clicks, toggles |
| `--ease-smooth` | `cubic-bezier(0.4, 0, 0.2, 1)` | Page transitions, reveals |

| Duration Token | Value |
|---------------|-------|
| `--duration-fast` | 150ms |
| `--duration-base` | 250ms |
| `--duration-slow` | 400ms |

---

## Component Library

Every component in the Wonder Engine supports:

- Theme inheritance via CSS variables
- Motion presets (gentle, snappy, smooth)
- Glassmorphism variants
- Accessibility (ARIA attributes, keyboard navigation)
- Responsive design

### Component Variants

| Component | Variants |
|-----------|----------|
| **WonderButton** | primary, secondary, glass, ghost, danger |
| **WonderCard** | solid, glass, gradient |
| **WonderInput** | default, glass, outlined |
| **WonderModal** | centered, slide-up, glass |
| **WonderToast** | success, warning, error, info |

### Size Scale

All interactive components support three sizes:

| Size | Padding | Font | Radius |
|------|---------|------|--------|
| `sm` | `px-3 py-1.5` | `--font-sm` | `--radius-md` |
| `md` | `px-4 py-2` | `--font-base` | `--radius-lg` |
| `lg` | `px-6 py-3` | `--font-lg` | `--radius-xl` |

---

## Glassmorphism

Blur, glow, and depth are first-class design primitives in the Wonder Engine.

### Glass Layers

| Layer | Blur | Opacity | Border |
|-------|------|---------|--------|
| **Surface** | 20px | 5% white | 10% white |
| **Elevated** | 30px | 8% white | 15% white |
| **Modal** | 40px | 10% white | 20% white |

### Glow Effects

Neon glow is controlled by `--glow-intensity` (0 to 1). At 0, no glow. At 1, full neon accent glow on interactive elements.

---

## Theme API

The Wonder Engine exposes endpoints for theme generation:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/themes/generate-from-prompt` | POST | Generate theme from text description |
| `/themes/generate-from-image` | POST | Extract theme from uploaded image |
| `/themes` | GET | List saved themes |
| `/themes/{id}/apply` | POST | Apply theme to workspace |

---

## Export Formats

Themes can be exported as:

- **CSS Variables** - Drop into any project
- **Tailwind Config** - Extend your tailwind.config.js
- **JSON Tokens** - See [tokens.json](./tokens.json) for the complete token format
- **Figma Tokens** - Import into Figma for design consistency

---

## Accessibility

The Wonder Engine ensures:

- All generated color palettes meet WCAG 2.1 AA contrast standards
- Focus states are always visible regardless of theme
- Motion can be reduced via `prefers-reduced-motion`
- Screen reader support through semantic HTML and ARIA

---

*Back to [README](../README.md)*
