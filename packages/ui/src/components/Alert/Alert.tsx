// packages/ui/src/components/Alert/Alert.tsx
// Feedback alert banner with semantic variants

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';

const alertVariants = cva(
    [
        'relative w-full rounded-[var(--inc-radius-md)]',
        'border px-[var(--inc-spacing-inset-md)] py-[var(--inc-spacing-inset-sm)]',
        'text-[var(--inc-font-size-sm)]',
    ].join(' '),
    {
        variants: {
            variant: {
                info: 'border-[var(--inc-color-feedback-info)] bg-[var(--inc-color-feedback-info-subtle)] text-[var(--inc-color-text-primary)]',
                success: 'border-[var(--inc-color-feedback-success)] bg-[var(--inc-color-feedback-success-subtle)] text-[var(--inc-color-feedback-success)]',
                warning: 'border-[var(--inc-color-feedback-warning)] bg-[var(--inc-color-feedback-warning-subtle)] text-[var(--inc-color-feedback-warning)]',
                danger: 'border-[var(--inc-color-feedback-danger)] bg-[var(--inc-color-feedback-danger-subtle)] text-[var(--inc-color-feedback-danger)]',
            },
        },
        defaultVariants: { variant: 'info' },
    }
);

export interface AlertProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
    title?: string;
}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
    ({ className, variant, title, children, ...props }, ref) => (
        <div ref={ref} role="alert" className={clsx(alertVariants({ variant }), className)} {...props}>
            {title && (
                <p className="font-[var(--inc-font-weight-semibold)] mb-[var(--inc-spacing-stack-xs)]">
                    {title}
                </p>
            )}
            <div>{children}</div>
        </div>
    )
);
Alert.displayName = 'Alert';
