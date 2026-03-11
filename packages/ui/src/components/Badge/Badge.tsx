// packages/ui/src/components/Badge/Badge.tsx
// Status/label badge component

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';

const badgeVariants = cva(
    [
        'inline-flex items-center gap-[var(--inc-spacing-inline-xs)]',
        'px-[var(--inc-spacing-inset-xs)] py-0.5',
        'rounded-[var(--inc-radius-full)]',
        'font-[var(--inc-font-weight-medium)] text-[var(--inc-font-size-xs)]',
        'leading-[var(--inc-font-line-height-normal)]',
        'tracking-[var(--inc-font-letter-spacing-wide)]',
        'border border-transparent',
        'whitespace-nowrap',
    ].join(' '),
    {
        variants: {
            variant: {
                default: 'bg-[var(--inc-color-surface-overlay)] text-[var(--inc-color-text-secondary)] border-[var(--inc-color-border-default)]',
                primary: 'bg-[var(--inc-color-primary-subtle)] text-[var(--inc-color-primary)]',
                success: 'bg-[var(--inc-color-feedback-success-subtle)] text-[var(--inc-color-feedback-success)]',
                warning: 'bg-[var(--inc-color-feedback-warning-subtle)] text-[var(--inc-color-feedback-warning)]',
                danger: 'bg-[var(--inc-color-feedback-danger-subtle)] text-[var(--inc-color-feedback-danger)]',
                info: 'bg-[var(--inc-color-feedback-info-subtle)] text-[var(--inc-color-feedback-info)]',
            },
        },
        defaultVariants: { variant: 'default' },
    }
);

export interface BadgeProps
    extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> { }

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
    ({ className, variant, children, ...props }, ref) => (
        <span ref={ref} className={clsx(badgeVariants({ variant }), className)} {...props}>
            {children}
        </span>
    )
);

Badge.displayName = 'Badge';
