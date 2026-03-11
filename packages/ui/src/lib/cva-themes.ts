// packages/ui/src/lib/cva-themes.ts
// Creative Liberation Engine Design System — Centralized CVA Variant Maps
// Import these into component files rather than inlining raw token CSS class strings.
// All class values use --inc-* CSS custom properties compiled from @inception/design-tokens.

import { cva } from 'class-variance-authority';

// ─────────────────────────────────────────────────────────────────────────────
// FOCUS RING — shared focus-visible ring applied across interactive elements
// ─────────────────────────────────────────────────────────────────────────────
export const focusRing =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--inc-color-border-focus)] focus-visible:ring-offset-2';

// ─────────────────────────────────────────────────────────────────────────────
// INTENT — semantic color intent for any interactive surface (button, badge, alert, etc.)
// ─────────────────────────────────────────────────────────────────────────────
export const intentVariants = {
    primary: [
        'bg-[var(--inc-color-primary)]',
        'text-[var(--inc-color-text-on-primary)]',
        'hover:bg-[var(--inc-color-primary-hover)]',
    ].join(' '),
    secondary: [
        'bg-[var(--inc-color-surface-sunken)]',
        'text-[var(--inc-color-text-primary)]',
        'border border-[var(--inc-color-border-default)]',
        'hover:bg-[var(--inc-color-surface-overlay)]',
    ].join(' '),
    ghost: [
        'bg-transparent',
        'text-[var(--inc-color-text-primary)]',
        'hover:bg-[var(--inc-color-surface-overlay)]',
    ].join(' '),
    danger: [
        'bg-[var(--inc-color-feedback-danger)]',
        'text-white',
        'hover:opacity-90',
    ].join(' '),
    warning: [
        'bg-[var(--inc-color-feedback-warning)]',
        'text-white',
        'hover:opacity-90',
    ].join(' '),
    success: [
        'bg-[var(--inc-color-feedback-success)]',
        'text-white',
        'hover:opacity-90',
    ].join(' '),
    info: [
        'bg-[var(--inc-color-feedback-info)]',
        'text-white',
        'hover:opacity-90',
    ].join(' '),
    link: [
        'bg-transparent',
        'text-[var(--inc-color-primary)]',
        'underline-offset-4 hover:underline',
    ].join(' '),
} as const;

export type Intent = keyof typeof intentVariants;

// ─────────────────────────────────────────────────────────────────────────────
// SUBTLE INTENT — subdued tinted backgrounds (badge, alert, toast)
// ─────────────────────────────────────────────────────────────────────────────
export const subtleIntentVariants = {
    default: [
        'bg-[var(--inc-color-surface-overlay)]',
        'text-[var(--inc-color-text-secondary)]',
        'border border-[var(--inc-color-border-default)]',
    ].join(' '),
    primary: 'bg-[var(--inc-color-primary-subtle)] text-[var(--inc-color-primary)]',
    success: 'bg-[var(--inc-color-feedback-success-subtle)] text-[var(--inc-color-feedback-success)]',
    warning: 'bg-[var(--inc-color-feedback-warning-subtle)] text-[var(--inc-color-feedback-warning)]',
    danger: 'bg-[var(--inc-color-feedback-danger-subtle)] text-[var(--inc-color-feedback-danger)]',
    info: 'bg-[var(--inc-color-feedback-info-subtle)] text-[var(--inc-color-feedback-info)]',
} as const;

export type SubtleIntent = keyof typeof subtleIntentVariants;

// ─────────────────────────────────────────────────────────────────────────────
// SIZE — standard component sizes (height + horizontal padding)
// ─────────────────────────────────────────────────────────────────────────────
export const sizeVariants = {
    xs: 'h-7 px-2 text-[var(--inc-font-size-xs)]',
    sm: 'h-9 px-3 text-[var(--inc-font-size-sm)]',
    md: 'h-10 px-4 py-2 text-[var(--inc-font-size-base)]',
    lg: 'h-11 px-6 text-[var(--inc-font-size-lg)]',
    xl: 'h-14 px-8 text-[var(--inc-font-size-xl)]',
} as const;

export type Size = keyof typeof sizeVariants;

// ─────────────────────────────────────────────────────────────────────────────
// RADIUS — border radius shapes
// ─────────────────────────────────────────────────────────────────────────────
export const radiusVariants = {
    none: 'rounded-none',
    sm: 'rounded-[var(--inc-radius-sm)]',
    md: 'rounded-[var(--inc-radius-md)]',
    lg: 'rounded-[var(--inc-radius-lg)]',
    xl: 'rounded-[var(--inc-radius-xl)]',
    full: 'rounded-[var(--inc-radius-full)]',
} as const;

export type Radius = keyof typeof radiusVariants;

// ─────────────────────────────────────────────────────────────────────────────
// SURFACE — background layers
// ─────────────────────────────────────────────────────────────────────────────
export const surfaceVariants = {
    default: 'bg-[var(--inc-color-background-default)]',
    subtle: 'bg-[var(--inc-color-background-subtle)]',
    sunken: 'bg-[var(--inc-color-surface-sunken)]',
    overlay: 'bg-[var(--inc-color-surface-overlay)]',
    card: 'bg-[var(--inc-color-surface-card)]',
} as const;

export type Surface = keyof typeof surfaceVariants;

// ─────────────────────────────────────────────────────────────────────────────
// TEXT SIZE — typography scale
// ─────────────────────────────────────────────────────────────────────────────
export const textSizeVariants = {
    xs: 'text-[var(--inc-font-size-xs)]',
    sm: 'text-[var(--inc-font-size-sm)]',
    base: 'text-[var(--inc-font-size-base)]',
    lg: 'text-[var(--inc-font-size-lg)]',
    xl: 'text-[var(--inc-font-size-xl)]',
    '2xl': 'text-[var(--inc-font-size-2xl)]',
    '3xl': 'text-[var(--inc-font-size-3xl)]',
    '4xl': 'text-[var(--inc-font-size-4xl)]',
} as const;

export type TextSize = keyof typeof textSizeVariants;

// ─────────────────────────────────────────────────────────────────────────────
// TEXT WEIGHT
// ─────────────────────────────────────────────────────────────────────────────
export const textWeightVariants = {
    normal: 'font-[var(--inc-font-weight-normal)]',
    medium: 'font-[var(--inc-font-weight-medium)]',
    semibold: 'font-[var(--inc-font-weight-semibold)]',
    bold: 'font-[var(--inc-font-weight-bold)]',
    extrabold: 'font-[var(--inc-font-weight-extrabold)]',
} as const;

export type TextWeight = keyof typeof textWeightVariants;

// ─────────────────────────────────────────────────────────────────────────────
// TRANSITION — standard motion durations
// ─────────────────────────────────────────────────────────────────────────────
export const transitionVariants = {
    fast: 'transition-all duration-[var(--inc-motion-duration-fast)] ease-[var(--inc-motion-easing-standard)]',
    medium: 'transition-all duration-[var(--inc-motion-duration-medium)] ease-[var(--inc-motion-easing-standard)]',
    slow: 'transition-all duration-[var(--inc-motion-duration-slow)] ease-[var(--inc-motion-easing-standard)]',
    spring: 'transition-all duration-[var(--inc-motion-duration-medium)] ease-[var(--inc-motion-easing-spring)]',
} as const;

export type Transition = keyof typeof transitionVariants;

// ─────────────────────────────────────────────────────────────────────────────
// PRE-BUILT CVA COMPOSITES
// These are ready-to-spread into component cva() calls.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Base interactive element: button, anchor, trigger.
 * Provides baseline layout, transitions, focus ring, and disabled state.
 */
export const interactiveBase = [
    'inline-flex items-center justify-center whitespace-nowrap',
    'font-[var(--inc-font-weight-medium)]',
    'rounded-[var(--inc-radius-md)]',
    transitionVariants.fast,
    focusRing,
    'disabled:pointer-events-none disabled:opacity-50',
].join(' ');

/**
 * Card base: elevated surface with border and shadow
 */
export const cardBase = [
    'bg-[var(--inc-color-surface-card)]',
    'border border-[var(--inc-color-border-default)]',
    'rounded-[var(--inc-radius-lg)]',
    'shadow-[var(--inc-shadow-sm)]',
].join(' ');

/**
 * Input base: form control baseline
 */
export const inputBase = [
    'flex w-full',
    'bg-[var(--inc-color-surface-sunken)]',
    'text-[var(--inc-color-text-primary)]',
    'placeholder:text-[var(--inc-color-text-tertiary)]',
    'border border-[var(--inc-color-border-default)]',
    'rounded-[var(--inc-radius-md)]',
    'px-[var(--inc-spacing-inset-md)] py-[var(--inc-spacing-inset-sm)]',
    'text-[var(--inc-font-size-base)]',
    transitionVariants.fast,
    focusRing,
    'disabled:cursor-not-allowed disabled:opacity-50',
].join(' ');

// ─────────────────────────────────────────────────────────────────────────────
// CONVENIENCE EXPORTS — re-export cva for co-located use
// ─────────────────────────────────────────────────────────────────────────────
export { cva };
export type { VariantProps } from 'class-variance-authority';
