// packages/ui/src/components/RadioGroup/RadioGroup.tsx
'use client';

import * as React from 'react';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { clsx } from 'clsx';
import { cva, type VariantProps } from 'class-variance-authority';

const radioGroupVariants = cva('grid gap-[var(--inc-spacing-stack-sm)]');

export interface RadioGroupProps
    extends React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>,
    VariantProps<typeof radioGroupVariants> { }

export const RadioGroup = React.forwardRef<
    React.ElementRef<typeof RadioGroupPrimitive.Root>,
    RadioGroupProps
>(({ className, ...props }, ref) => {
    return (
        <RadioGroupPrimitive.Root
            className={clsx(radioGroupVariants(), className)}
            {...props}
            ref={ref}
        />
    );
});
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;

export const RadioGroupItem = React.forwardRef<
    React.ElementRef<typeof RadioGroupPrimitive.Item>,
    React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => {
    return (
        <RadioGroupPrimitive.Item
            ref={ref}
            className={clsx(
                'aspect-square h-4 w-4 rounded-full border border-[var(--inc-color-border-default)] text-[var(--inc-color-primary)] ring-offset-[var(--inc-color-surface-base)]',
                'focus:outline-none focus:ring-2 focus:ring-[var(--inc-color-border-focus)] focus:ring-offset-2',
                'disabled:cursor-not-allowed disabled:opacity-50',
                className
            )}
            {...props}
        >
            <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-current" />
            </RadioGroupPrimitive.Indicator>
        </RadioGroupPrimitive.Item>
    );
});
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;
