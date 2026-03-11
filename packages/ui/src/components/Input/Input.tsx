// packages/ui/src/components/Input/Input.tsx
// Form text input — Radix Label integration, token-only styling

import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';

const inputVariants = cva(
    [
        'w-full',
        'bg-[var(--inc-color-surface-base)]',
        'border border-[var(--inc-color-border-default)]',
        'rounded-[var(--inc-radius-md)]',
        'text-[var(--inc-color-text-primary)] text-[var(--inc-font-size-base)]',
        'font-[var(--inc-font-family-body)]',
        'placeholder:text-[var(--inc-color-text-tertiary)]',
        'transition-colors duration-[var(--inc-motion-duration-fast)] ease-[var(--inc-motion-easing-ease)]',
        'focus:outline-none focus:ring-2 focus:ring-[var(--inc-color-border-focus)] focus:border-transparent',
        'disabled:opacity-50 disabled:cursor-not-allowed',
    ].join(' '),
    {
        variants: {
            size: {
                sm: 'h-8  px-[var(--inc-spacing-inset-sm)] text-[var(--inc-font-size-sm)]',
                md: 'h-10 px-[var(--inc-spacing-inset-md)]',
                lg: 'h-12 px-[var(--inc-spacing-inset-lg)] text-[var(--inc-font-size-md)]',
            },
            state: {
                default: '',
                error: 'border-[var(--inc-color-feedback-danger)] focus:ring-[var(--inc-color-feedback-danger)]',
                success: 'border-[var(--inc-color-feedback-success)]',
            },
        },
        defaultVariants: { size: 'md', state: 'default' },
    }
);

export interface InputProps
    extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
    label?: string;
    hint?: string;
    error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, size, state, label, hint, error, id, ...props }, ref) => {
        const reactId = React.useId();
        const inputId = id || `input-${reactId}`;
        const derivedState = error ? 'error' : state;

        return (
            <div className="flex flex-col gap-[var(--inc-spacing-stack-xs)]">
                {label && (
                    <LabelPrimitive.Root
                        htmlFor={inputId}
                        className={clsx(
                            'text-[var(--inc-font-size-sm)] font-[var(--inc-font-weight-medium)] leading-[var(--inc-font-line-height-normal)]',
                            error ? 'text-[var(--inc-color-feedback-danger)]' : 'text-[var(--inc-color-text-primary)]'
                        )}
                    >
                        {label}
                    </LabelPrimitive.Root>
                )}
                <input
                    ref={ref}
                    id={inputId}
                    className={clsx(inputVariants({ size, state: derivedState }), className)}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
                    {...props}
                />
                {hint && !error && (
                    <p id={`${inputId}-hint`} className="text-[var(--inc-font-size-xs)] text-[var(--inc-color-text-tertiary)]">
                        {hint}
                    </p>
                )}
                {error && (
                    <p id={`${inputId}-error`} role="alert" className="text-[var(--inc-font-size-xs)] text-[var(--inc-color-feedback-danger)]">
                        {error}
                    </p>
                )}
            </div>
        );
    }
);
Input.displayName = 'Input';
