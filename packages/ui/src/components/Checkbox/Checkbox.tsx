// packages/ui/src/components/Checkbox/Checkbox.tsx
// Radix Checkbox + Label integration

'use client';

import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import * as LabelPrimitive from '@radix-ui/react-label';
import { clsx } from 'clsx';

export interface CheckboxProps
    extends React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> {
    label?: string;
    description?: string;
}

export const Checkbox = React.forwardRef<
    React.ElementRef<typeof CheckboxPrimitive.Root>,
    CheckboxProps
>(({ className, label, description, id, ...props }, ref) => {
    const checkId = id ?? `checkbox-${Math.random().toString(36).slice(2, 9)}`;
    return (
        <div className="flex items-start gap-[var(--inc-spacing-inline-sm)]">
            <CheckboxPrimitive.Root
                ref={ref}
                id={checkId}
                className={clsx(
                    'h-4 w-4 shrink-0 mt-0.5',
                    'rounded-[var(--inc-radius-sm)]',
                    'border border-[var(--inc-color-border-strong)]',
                    'bg-[var(--inc-color-surface-base)]',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--inc-color-border-focus)] focus-visible:ring-offset-2',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    'data-[state=checked]:bg-[var(--inc-color-primary)] data-[state=checked]:border-[var(--inc-color-primary)]',
                    'transition-colors duration-[var(--inc-motion-duration-fast)]',
                    className
                )}
                {...props}
            >
                <CheckboxPrimitive.Indicator className="flex items-center justify-center text-[var(--inc-color-text-on-primary)]">
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">
                        <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </CheckboxPrimitive.Indicator>
            </CheckboxPrimitive.Root>
            {(label || description) && (
                <div className="flex flex-col gap-[var(--inc-spacing-stack-xs)]">
                    {label && (
                        <LabelPrimitive.Root
                            htmlFor={checkId}
                            className="text-[var(--inc-font-size-sm)] font-[var(--inc-font-weight-medium)] text-[var(--inc-color-text-primary)] leading-none cursor-pointer"
                        >
                            {label}
                        </LabelPrimitive.Root>
                    )}
                    {description && (
                        <p className="text-[var(--inc-font-size-xs)] text-[var(--inc-color-text-secondary)]">
                            {description}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
});
Checkbox.displayName = 'Checkbox';
