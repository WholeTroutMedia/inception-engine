// packages/ui/src/cva-tokens.ts
// T20260306-257: CVA token-variant mapping for all components
// Maps every CVA variant to the corresponding design token CSS variable

import { type VariantProps, cva } from 'class-variance-authority';

// ─── Base token maps ──────────────────────────────────────────────────────────

export const colorTokens = {
    primary: 'var(--inc-color-primary)',
    secondary: 'var(--inc-color-secondary)',
    success: 'var(--inc-color-status-success)',
    warning: 'var(--inc-color-status-warning)',
    error: 'var(--inc-color-status-error)',
    neutral: 'var(--inc-color-surface-overlay)',
    ghost: 'transparent',
} as const;

export const radiusTokens = {
    none: 'var(--inc-radius-none, 0)',
    sm: 'var(--inc-radius-sm)',
    md: 'var(--inc-radius-md)',
    lg: 'var(--inc-radius-lg)',
    full: 'var(--inc-radius-full)',
} as const;

export const spacingTokens = {
    none: '0',
    xs: 'var(--inc-space-1)',
    sm: 'var(--inc-space-2)',
    md: 'var(--inc-space-3)',
    lg: 'var(--inc-space-4)',
    xl: 'var(--inc-space-6)',
    '2xl': 'var(--inc-space-8)',
} as const;

export const fontSizeTokens = {
    xs: 'var(--inc-font-size-xs)',
    sm: 'var(--inc-font-size-sm)',
    base: 'var(--inc-font-size-base)',
    lg: 'var(--inc-font-size-lg)',
    xl: 'var(--inc-font-size-xl)',
} as const;

export const shadowTokens = {
    none: 'none',
    sm: 'var(--inc-shadow-sm)',
    md: 'var(--inc-shadow-md)',
    lg: 'var(--inc-shadow-lg)',
    glow: 'var(--inc-shadow-glow)',
} as const;

// ─── Button CVA ───────────────────────────────────────────────────────────────

export const buttonVariants = cva(
    // Base styles (non-token values intentionally minimal)
    [
        'inline-flex items-center justify-center gap-2',
        'font-semibold cursor-pointer transition-all',
        'border border-transparent',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
        'disabled:opacity-50 disabled:pointer-events-none',
    ],
    {
        variants: {
            intent: {
                primary: [
                    'bg-[--inc-color-primary]',
                    'text-[--inc-color-on-primary]',
                    'hover:bg-[--inc-color-primary-hover]',
                    'focus-visible:outline-[--inc-color-primary]',
                ],
                secondary: [
                    'bg-[--inc-color-surface-overlay]',
                    'text-[--inc-color-text-primary]',
                    'border-[--inc-color-border-default]',
                    'hover:bg-[--inc-color-surface-raised]',
                ],
                ghost: [
                    'bg-transparent',
                    'text-[--inc-color-text-primary]',
                    'hover:bg-[--inc-color-surface-overlay]',
                ],
                danger: [
                    'bg-[--inc-color-status-error]',
                    'text-white',
                    'hover:brightness-90',
                ],
                success: [
                    'bg-[--inc-color-status-success]',
                    'text-white',
                    'hover:brightness-90',
                ],
            },
            size: {
                xs: ['text-[--inc-font-size-xs]', 'px-[--inc-space-2]', 'py-[--inc-space-1]', 'rounded-[--inc-radius-sm]', 'h-6'],
                sm: ['text-[--inc-font-size-sm]', 'px-[--inc-space-3]', 'py-[--inc-space-1]', 'rounded-[--inc-radius-sm]', 'h-8'],
                md: ['text-[--inc-font-size-base]', 'px-[--inc-space-4]', 'py-[--inc-space-2]', 'rounded-[--inc-radius-md]', 'h-10'],
                lg: ['text-[--inc-font-size-lg]', 'px-[--inc-space-6]', 'py-[--inc-space-3]', 'rounded-[--inc-radius-md]', 'h-12'],
                xl: ['text-[--inc-font-size-xl]', 'px-[--inc-space-8]', 'py-[--inc-space-4]', 'rounded-[--inc-radius-lg]', 'h-14'],
            },
            fullWidth: {
                true: 'w-full',
                false: 'w-auto',
            },
        },
        defaultVariants: {
            intent: 'primary',
            size: 'md',
            fullWidth: false,
        },
    }
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;

// ─── Badge CVA ────────────────────────────────────────────────────────────────

export const badgeVariants = cva(
    ['inline-flex items-center gap-1', 'font-semibold', 'border'],
    {
        variants: {
            intent: {
                primary: ['bg-[--inc-color-primary-subtle]', 'text-[--inc-color-primary]', 'border-[--inc-color-primary]'],
                success: ['bg-[--inc-color-status-success-subtle]', 'text-[--inc-color-status-success]', 'border-[--inc-color-status-success]'],
                warning: ['bg-[--inc-color-status-warning-subtle]', 'text-[--inc-color-status-warning]', 'border-[--inc-color-status-warning]'],
                error: ['bg-[--inc-color-status-error-subtle]', 'text-[--inc-color-status-error]', 'border-[--inc-color-status-error]'],
                neutral: ['bg-[--inc-color-surface-overlay]', 'text-[--inc-color-text-secondary]', 'border-[--inc-color-border-default]'],
            },
            size: {
                sm: ['text-[--inc-font-size-xs]', 'px-[--inc-space-1]', 'py-px', 'rounded-[--inc-radius-sm]'],
                md: ['text-[--inc-font-size-xs]', 'px-[--inc-space-2]', 'py-0.5', 'rounded-[--inc-radius-md]'],
                lg: ['text-[--inc-font-size-sm]', 'px-[--inc-space-3]', 'py-1', 'rounded-[--inc-radius-full]'],
            },
            dot: {
                true: 'pl-1',
                false: '',
            },
        },
        defaultVariants: { intent: 'neutral', size: 'md', dot: false },
    }
);

export type BadgeVariants = VariantProps<typeof badgeVariants>;

// ─── Card CVA ─────────────────────────────────────────────────────────────────

export const cardVariants = cva(
    ['relative', 'transition-all'],
    {
        variants: {
            elevation: {
                flat: ['bg-[--inc-color-surface-base]', 'border border-[--inc-color-border-subtle]', 'rounded-[--inc-radius-md]'],
                raised: ['bg-[--inc-color-surface-raised]', 'shadow-[--inc-shadow-sm]', 'rounded-[--inc-radius-lg]'],
                floating: ['bg-[--inc-color-surface-overlay]', 'shadow-[--inc-shadow-md]', 'rounded-[--inc-radius-lg]'],
                modal: ['bg-[--inc-color-surface-base]', 'shadow-[--inc-shadow-lg]', 'rounded-[--inc-radius-xl]'],
            },
            padding: {
                none: 'p-0',
                sm: 'p-[--inc-space-3]',
                md: 'p-[--inc-space-4]',
                lg: 'p-[--inc-space-6]',
                xl: 'p-[--inc-space-8]',
            },
            interactive: {
                true: ['cursor-pointer', 'hover:shadow-[--inc-shadow-md]', 'hover:-translate-y-0.5'],
                false: '',
            },
        },
        defaultVariants: { elevation: 'raised', padding: 'md', interactive: false },
    }
);

export type CardVariants = VariantProps<typeof cardVariants>;

// ─── Input CVA ────────────────────────────────────────────────────────────────

export const inputVariants = cva(
    [
        'w-full bg-[--inc-color-surface-base]',
        'text-[--inc-color-text-primary]',
        'transition-all outline-none',
        'placeholder:text-[--inc-color-text-placeholder]',
        'disabled:opacity-50 disabled:cursor-not-allowed',
    ],
    {
        variants: {
            variant: {
                outline: [
                    'border border-[--inc-color-border-default]',
                    'focus:border-[--inc-color-primary]',
                    'focus:ring-2 focus:ring-[--inc-color-primary-subtle]',
                ],
                filled: [
                    'bg-[--inc-color-surface-overlay]',
                    'border border-transparent',
                    'focus:border-[--inc-color-primary]',
                ],
                ghost: [
                    'border-0 border-b border-[--inc-color-border-default]',
                    'rounded-none bg-transparent',
                    'focus:border-[--inc-color-primary]',
                ],
            },
            inputSize: {
                sm: ['text-[--inc-font-size-sm]', 'px-[--inc-space-2]', 'py-[--inc-space-1]', 'rounded-[--inc-radius-sm]', 'h-8'],
                md: ['text-[--inc-font-size-base]', 'px-[--inc-space-3]', 'py-[--inc-space-2]', 'rounded-[--inc-radius-md]', 'h-10'],
                lg: ['text-[--inc-font-size-lg]', 'px-[--inc-space-4]', 'py-[--inc-space-3]', 'rounded-[--inc-radius-md]', 'h-12'],
            },
            status: {
                default: '',
                error: ['border-[--inc-color-status-error]', 'focus:ring-[--inc-color-status-error-subtle]'],
                success: ['border-[--inc-color-status-success]', 'focus:ring-[--inc-color-status-success-subtle]'],
            },
        },
        defaultVariants: { variant: 'outline', inputSize: 'md', status: 'default' },
    }
);

export type InputVariants = VariantProps<typeof inputVariants>;

// ─── Spinner CVA ─────────────────────────────────────────────────────────────

export const spinnerVariants = cva(
    ['animate-spin border-2 rounded-full border-[--inc-color-border-default]'],
    {
        variants: {
            size: {
                xs: 'w-3 h-3',
                sm: 'w-4 h-4',
                md: 'w-6 h-6',
                lg: 'w-8 h-8',
                xl: 'w-12 h-12',
            },
            color: {
                primary: 'border-t-[--inc-color-primary]',
                white: 'border-t-white',
                current: 'border-t-current',
            },
        },
        defaultVariants: { size: 'md', color: 'primary' },
    }
);

export type SpinnerVariants = VariantProps<typeof spinnerVariants>;

// ─── Alert CVA ────────────────────────────────────────────────────────────────

export const alertVariants = cva(
    ['relative w-full flex gap-3 p-4 rounded-[--inc-radius-md]', 'border'],
    {
        variants: {
            intent: {
                info: ['bg-[--inc-color-feedback-info-subtle]', 'border-[--inc-color-feedback-info]', 'text-[--inc-color-feedback-info]'],
                success: ['bg-[--inc-color-feedback-success-subtle]', 'border-[--inc-color-feedback-success]', 'text-[--inc-color-feedback-success]'],
                warning: ['bg-[--inc-color-feedback-warning-subtle]', 'border-[--inc-color-feedback-warning]', 'text-[--inc-color-feedback-warning]'],
                error: ['bg-[--inc-color-feedback-danger-subtle]', 'border-[--inc-color-feedback-danger]', 'text-[--inc-color-feedback-danger]'],
                neutral: ['bg-[--inc-color-surface-overlay]', 'border-[--inc-color-border-default]', 'text-[--inc-color-text-primary]'],
            },
        },
        defaultVariants: { intent: 'info' },
    }
);

export type AlertVariants = VariantProps<typeof alertVariants>;

// ─── Progress CVA ─────────────────────────────────────────────────────────────

export const progressTrackVariants = cva(
    ['relative overflow-hidden w-full', 'bg-[--inc-color-surface-overlay]', 'rounded-[--inc-radius-full]'],
    {
        variants: {
            size: {
                xs: 'h-1',
                sm: 'h-2',
                md: 'h-3',
                lg: 'h-4',
            },
        },
        defaultVariants: { size: 'sm' },
    }
);

export const progressFillVariants = cva(
    ['h-full rounded-[--inc-radius-full]', 'transition-all duration-[--inc-motion-duration-medium]'],
    {
        variants: {
            intent: {
                primary: 'bg-[--inc-color-primary]',
                success: 'bg-[--inc-color-status-success]',
                warning: 'bg-[--inc-color-status-warning]',
                error: 'bg-[--inc-color-status-error]',
            },
        },
        defaultVariants: { intent: 'primary' },
    }
);

export type ProgressTrackVariants = VariantProps<typeof progressTrackVariants>;
export type ProgressFillVariants = VariantProps<typeof progressFillVariants>;

// ─── Tabs CVA ─────────────────────────────────────────────────────────────────

export const tabsListVariants = cva(
    ['inline-flex items-center'],
    {
        variants: {
            variant: {
                underline: ['border-b border-[--inc-color-border-default]', 'gap-0'],
                pill: ['gap-1', 'bg-[--inc-color-surface-overlay]', 'p-1', 'rounded-[--inc-radius-full]'],
                enclosed: ['gap-0', 'border border-[--inc-color-border-default]', 'rounded-[--inc-radius-md]', 'p-1'],
            },
        },
        defaultVariants: { variant: 'underline' },
    }
);

export const tabsTriggerVariants = cva(
    [
        'inline-flex items-center justify-center whitespace-nowrap',
        'text-[--inc-font-size-sm] font-semibold',
        'transition-all cursor-pointer select-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--inc-color-primary]',
        'disabled:pointer-events-none disabled:opacity-50',
    ],
    {
        variants: {
            variant: {
                underline: [
                    'px-3 py-2 border-b-2 border-transparent -mb-px',
                    'text-[--inc-color-text-secondary]',
                    'data-[state=active]:border-[--inc-color-primary]',
                    'data-[state=active]:text-[--inc-color-primary]',
                ],
                pill: [
                    'px-4 py-1.5 rounded-[--inc-radius-full]',
                    'text-[--inc-color-text-secondary]',
                    'data-[state=active]:bg-[--inc-color-primary]',
                    'data-[state=active]:text-white',
                ],
                enclosed: [
                    'px-3 py-1.5 rounded-[--inc-radius-sm]',
                    'text-[--inc-color-text-secondary]',
                    'data-[state=active]:bg-[--inc-color-surface-base]',
                    'data-[state=active]:text-[--inc-color-text-primary]',
                    'data-[state=active]:shadow-sm',
                ],
            },
        },
        defaultVariants: { variant: 'underline' },
    }
);

export type TabsListVariants = VariantProps<typeof tabsListVariants>;
export type TabsTriggerVariants = VariantProps<typeof tabsTriggerVariants>;

// ─── Avatar CVA ──────────────────────────────────────────────────────────────

export const avatarVariants = cva(
    ['relative inline-flex items-center justify-center overflow-hidden', 'font-semibold shrink-0'],
    {
        variants: {
            size: {
                xs: ['w-6 h-6', 'text-[--inc-font-size-xs]', 'rounded-[--inc-radius-sm]'],
                sm: ['w-8 h-8', 'text-[--inc-font-size-xs]', 'rounded-[--inc-radius-sm]'],
                md: ['w-10 h-10', 'text-[--inc-font-size-sm]', 'rounded-[--inc-radius-md]'],
                lg: ['w-14 h-14', 'text-[--inc-font-size-base]', 'rounded-[--inc-radius-md]'],
                xl: ['w-20 h-20', 'text-[--inc-font-size-lg]', 'rounded-[--inc-radius-lg]'],
            },
            shape: {
                square: '',
                circle: '!rounded-[--inc-radius-full]',
            },
            color: {
                primary: ['bg-[--inc-color-primary-subtle]', 'text-[--inc-color-primary]'],
                secondary: ['bg-[--inc-color-surface-overlay]', 'text-[--inc-color-text-secondary]'],
                success: ['bg-[--inc-color-status-success-subtle]', 'text-[--inc-color-status-success]'],
                warning: ['bg-[--inc-color-status-warning-subtle]', 'text-[--inc-color-status-warning]'],
                error: ['bg-[--inc-color-status-error-subtle]', 'text-[--inc-color-status-error]'],
            },
        },
        defaultVariants: { size: 'md', shape: 'circle', color: 'secondary' },
    }
);

export type AvatarVariants = VariantProps<typeof avatarVariants>;

// ─── Toast CVA ────────────────────────────────────────────────────────────────

export const toastVariants = cva(
    [
        'group pointer-events-auto relative flex items-start gap-3 overflow-hidden',
        'w-full rounded-[--inc-radius-md] border p-4 shadow-[--inc-shadow-lg]',
        'transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]',
        'data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full',
    ],
    {
        variants: {
            intent: {
                default: ['bg-[--inc-color-surface-base]', 'border-[--inc-color-border-default]', 'text-[--inc-color-text-primary]'],
                info: ['bg-[--inc-color-feedback-info-subtle]', 'border-[--inc-color-feedback-info]'],
                success: ['bg-[--inc-color-feedback-success-subtle]', 'border-[--inc-color-feedback-success]'],
                warning: ['bg-[--inc-color-feedback-warning-subtle]', 'border-[--inc-color-feedback-warning]'],
                error: ['bg-[--inc-color-feedback-danger-subtle]', 'border-[--inc-color-feedback-danger]'],
            },
        },
        defaultVariants: { intent: 'default' },
    }
);

export type ToastVariants = VariantProps<typeof toastVariants>;

// ─── Tooltip CVA ─────────────────────────────────────────────────────────────

export const tooltipContentVariants = cva(
    [
        'z-50 overflow-hidden max-w-xs',
        'bg-[--inc-color-text-primary] text-[--inc-color-background-default]',
        'text-[--inc-font-size-xs] font-medium',
        'px-3 py-1.5 rounded-[--inc-radius-sm]',
        'shadow-[--inc-shadow-md]',
        'animate-in fade-in-0 zoom-in-95',
        'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
        'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2',
        'data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
    ],
    {
        variants: {
            size: {
                sm: 'max-w-[200px]',
                md: 'max-w-xs',
                lg: 'max-w-sm',
            },
        },
        defaultVariants: { size: 'md' },
    }
);

export type TooltipContentVariants = VariantProps<typeof tooltipContentVariants>;

// ─── Exports ──────────────────────────────────────────────────────────────────

export const cvaTokenMap = {
    button: buttonVariants,
    badge: badgeVariants,
    card: cardVariants,
    input: inputVariants,
    spinner: spinnerVariants,
    alert: alertVariants,
    progressTrack: progressTrackVariants,
    progressFill: progressFillVariants,
    tabsList: tabsListVariants,
    tabsTrigger: tabsTriggerVariants,
    avatar: avatarVariants,
    toast: toastVariants,
    tooltipContent: tooltipContentVariants,
} as const;

export type CvaTokenMap = typeof cvaTokenMap;

