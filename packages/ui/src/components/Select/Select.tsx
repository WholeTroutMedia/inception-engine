// packages/ui/src/components/Select/Select.tsx
// Radix Select — custom styled dropdown, token-only

'use client';

import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { clsx } from 'clsx';

export const Select = SelectPrimitive.Root;
export const SelectValue = SelectPrimitive.Value;
export const SelectGroup = SelectPrimitive.Group;

export const SelectTrigger = React.forwardRef<
    React.ElementRef<typeof SelectPrimitive.Trigger>,
    React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
    <SelectPrimitive.Trigger
        ref={ref}
        className={clsx(
            'flex h-10 w-full items-center justify-between',
            'rounded-[var(--inc-radius-md)]',
            'border border-[var(--inc-color-border-default)]',
            'bg-[var(--inc-color-surface-base)]',
            'px-[var(--inc-spacing-inset-md)]',
            'text-[var(--inc-font-size-base)] text-[var(--inc-color-text-primary)]',
            'placeholder:text-[var(--inc-color-text-tertiary)]',
            'focus:outline-none focus:ring-2 focus:ring-[var(--inc-color-border-focus)] focus:border-transparent',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'transition-colors duration-[var(--inc-motion-duration-fast)]',
            '[&>span]:line-clamp-1',
            className
        )}
        {...props}
    >
        {children}
        <SelectPrimitive.Icon asChild>
            <svg width="12" height="8" viewBox="0 0 12 8" fill="none" aria-hidden="true" className="opacity-50 shrink-0">
                <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = 'SelectTrigger';

export const SelectContent = React.forwardRef<
    React.ElementRef<typeof SelectPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', ...props }, ref) => (
    <SelectPrimitive.Portal>
        <SelectPrimitive.Content
            ref={ref}
            position={position}
            sideOffset={4}
            className={clsx(
                'relative z-50 min-w-32 overflow-hidden',
                'rounded-[var(--inc-radius-md)]',
                'border border-[var(--inc-color-border-default)]',
                'bg-[var(--inc-color-surface-card)]',
                'shadow-[var(--inc-shadow-md)]',
                'animate-in fade-in-0 zoom-in-95',
                'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
                position === 'popper' && 'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2',
                className
            )}
            {...props}
        >
            <SelectPrimitive.Viewport className={clsx('p-1', position === 'popper' && 'w-full min-w-[var(--radix-select-trigger-width)]')}>
                {children}
            </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
));
SelectContent.displayName = 'SelectContent';

export const SelectLabel = React.forwardRef<
    React.ElementRef<typeof SelectPrimitive.Label>,
    React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
    <SelectPrimitive.Label
        ref={ref}
        className={clsx(
            'px-[var(--inc-spacing-inset-sm)] py-[var(--inc-spacing-inset-xs)]',
            'text-[var(--inc-font-size-xs)] font-[var(--inc-font-weight-semibold)]',
            'text-[var(--inc-color-text-tertiary)] tracking-[var(--inc-font-letter-spacing-wide)]',
            className
        )}
        {...props}
    />
));
SelectLabel.displayName = 'SelectLabel';

export const SelectItem = React.forwardRef<
    React.ElementRef<typeof SelectPrimitive.Item>,
    React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
    <SelectPrimitive.Item
        ref={ref}
        className={clsx(
            'relative flex w-full cursor-pointer select-none items-center',
            'rounded-[var(--inc-radius-sm)]',
            'px-[var(--inc-spacing-inset-sm)] py-[var(--inc-spacing-inset-xs)] pr-8',
            'text-[var(--inc-font-size-sm)] text-[var(--inc-color-text-primary)]',
            'outline-none',
            'focus:bg-[var(--inc-color-primary-subtle)] focus:text-[var(--inc-color-primary)]',
            'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
            'transition-colors duration-[var(--inc-motion-duration-fast)]',
            className
        )}
        {...props}
    >
        <span className="absolute right-2 flex h-4 w-4 items-center justify-center">
            <SelectPrimitive.ItemIndicator>
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">
                    <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </SelectPrimitive.ItemIndicator>
        </span>
        <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
));
SelectItem.displayName = 'SelectItem';

export const SelectSeparator = React.forwardRef<
    React.ElementRef<typeof SelectPrimitive.Separator>,
    React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
    <SelectPrimitive.Separator
        ref={ref}
        className={clsx('-mx-1 my-1 h-px bg-[var(--inc-color-border-subtle)]', className)}
        {...props}
    />
));
SelectSeparator.displayName = 'SelectSeparator';
