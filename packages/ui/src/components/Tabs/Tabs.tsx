// packages/ui/src/components/Tabs/Tabs.tsx
// Radix Tabs — keyboard-navigable, token-styled

'use client';

import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { clsx } from 'clsx';

export const Tabs = TabsPrimitive.Root;

export const TabsList = React.forwardRef<
    React.ElementRef<typeof TabsPrimitive.List>,
    React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
    <TabsPrimitive.List
        ref={ref}
        className={clsx(
            'inline-flex items-center',
            'h-10 rounded-[var(--inc-radius-md)]',
            'bg-[var(--inc-color-surface-overlay)]',
            'p-1 gap-[var(--inc-spacing-inline-xs)]',
            className
        )}
        {...props}
    />
));
TabsList.displayName = 'TabsList';

export const TabsTrigger = React.forwardRef<
    React.ElementRef<typeof TabsPrimitive.Trigger>,
    React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
    <TabsPrimitive.Trigger
        ref={ref}
        className={clsx(
            'inline-flex items-center justify-center',
            'px-[var(--inc-spacing-inset-md)] h-8',
            'rounded-[var(--inc-radius-sm)]',
            'text-[var(--inc-font-size-sm)] font-[var(--inc-font-weight-medium)]',
            'text-[var(--inc-color-text-secondary)]',
            'ring-offset-[var(--inc-color-surface-base)]',
            'transition-all duration-[var(--inc-motion-duration-fast)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--inc-color-border-focus)] focus-visible:ring-offset-2',
            'disabled:pointer-events-none disabled:opacity-50',
            'data-[state=active]:bg-[var(--inc-color-surface-base)]',
            'data-[state=active]:text-[var(--inc-color-text-primary)]',
            'data-[state=active]:shadow-[var(--inc-shadow-sm)]',
            className
        )}
        {...props}
    />
));
TabsTrigger.displayName = 'TabsTrigger';

export const TabsContent = React.forwardRef<
    React.ElementRef<typeof TabsPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
    <TabsPrimitive.Content
        ref={ref}
        className={clsx(
            'mt-[var(--inc-spacing-stack-md)]',
            'ring-offset-[var(--inc-color-surface-base)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--inc-color-border-focus)] focus-visible:ring-offset-2',
            className
        )}
        {...props}
    />
));
TabsContent.displayName = 'TabsContent';
