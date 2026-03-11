// packages/ui/src/components/Spinner/Spinner.tsx
// Loading indicator — CSS-only, token-driven

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';

const spinnerVariants = cva(
    'inline-block animate-spin rounded-[var(--inc-radius-full)] border-2 border-solid border-current border-t-transparent',
    {
        variants: {
            size: {
                sm: 'h-4 w-4',
                md: 'h-6 w-6',
                lg: 'h-8 w-8',
            },
            color: {
                primary: 'text-[var(--inc-color-primary)]',
                inherit: 'text-current',
                muted: 'text-[var(--inc-color-text-tertiary)]',
            },
        },
        defaultVariants: { size: 'md', color: 'primary' },
    }
);

export interface SpinnerProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'color'>, VariantProps<typeof spinnerVariants> {
    label?: string;
}

export const Spinner = React.forwardRef<HTMLSpanElement, SpinnerProps>(
    ({ className, size, color, label = 'Loading…', ...props }, ref) => (
        <span ref={ref} role="status" aria-label={label} className={clsx(spinnerVariants({ size, color }), className)} {...props}>
            <span className="sr-only">{label}</span>
        </span>
    )
);
Spinner.displayName = 'Spinner';
