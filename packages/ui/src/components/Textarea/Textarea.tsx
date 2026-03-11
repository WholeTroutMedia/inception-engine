// packages/ui/src/components/Textarea/Textarea.tsx
import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';

const textareaVariants = cva(
    [
        'flex w-full min-h-[80px]',
        'bg-[var(--inc-color-surface-base)]',
        'border border-[var(--inc-color-border-default)]',
        'rounded-[var(--inc-radius-md)]',
        'px-[var(--inc-spacing-inset-md)] py-[var(--inc-spacing-inset-sm)]',
        'text-[var(--inc-color-text-primary)] text-[var(--inc-font-size-base)]',
        'font-[var(--inc-font-family-body)] leading-[var(--inc-font-line-height-normal)]',
        'placeholder:text-[var(--inc-color-text-tertiary)]',
        'transition-colors duration-[var(--inc-motion-duration-fast)] ease-[var(--inc-motion-easing-ease)]',
        'focus:outline-none focus:ring-2 focus:ring-[var(--inc-color-border-focus)] focus:border-transparent',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'resize-y',
    ].join(' '),
    {
        variants: {
            state: {
                default: '',
                error: 'border-[var(--inc-color-feedback-danger)] focus:ring-[var(--inc-color-feedback-danger)]',
                success: 'border-[var(--inc-color-feedback-success)]',
            },
        },
        defaultVariants: { state: 'default' },
    }
);

export interface TextareaProps
    extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof textareaVariants> {
    label?: string;
    hint?: string;
    error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, state, label, hint, error, id, ...props }, ref) => {
        const textareaId = id || `textarea-${Math.random().toString(36).slice(2, 9)}`;
        const derivedState = error ? 'error' : state;

        return (
            <div className="flex flex-col gap-[var(--inc-spacing-stack-xs)]">
                {label && (
                    <LabelPrimitive.Root
                        htmlFor={textareaId}
                        className={clsx(
                            'text-[var(--inc-font-size-sm)] font-[var(--inc-font-weight-medium)] leading-[var(--inc-font-line-height-normal)]',
                            error ? 'text-[var(--inc-color-feedback-danger)]' : 'text-[var(--inc-color-text-primary)]'
                        )}
                    >
                        {label}
                    </LabelPrimitive.Root>
                )}
                <textarea
                    ref={ref}
                    id={textareaId}
                    className={clsx(textareaVariants({ state: derivedState }), className)}
                    {...(error ? { 'aria-invalid': true } : {})}
                    aria-describedby={error ? `${textareaId}-error` : hint ? `${textareaId}-hint` : undefined}
                    {...props}
                />
                {hint && !error && (
                    <p id={`${textareaId}-hint`} className="text-[var(--inc-font-size-xs)] text-[var(--inc-color-text-tertiary)]">
                        {hint}
                    </p>
                )}
                {error && (
                    <p id={`${textareaId}-error`} role="alert" className="text-[var(--inc-font-size-xs)] text-[var(--inc-color-feedback-danger)]">
                        {error}
                    </p>
                )}
            </div>
        );
    }
);

Textarea.displayName = 'Textarea';
