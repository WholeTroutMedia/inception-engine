// packages/ui/src/components/Accordion/Accordion.tsx
'use client';

import * as React from 'react';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { clsx } from 'clsx';

export const Accordion = AccordionPrimitive.Root;

export const AccordionItem = React.forwardRef<
    React.ElementRef<typeof AccordionPrimitive.Item>,
    React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
    <AccordionPrimitive.Item
        ref={ref}
        className={clsx('border-b border-[var(--inc-color-border-default)]', className)}
        {...props}
    />
));
AccordionItem.displayName = 'AccordionItem';

export const AccordionTrigger = React.forwardRef<
    React.ElementRef<typeof AccordionPrimitive.Trigger>,
    React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
    <AccordionPrimitive.Header className="flex">
        <AccordionPrimitive.Trigger
            ref={ref}
            className={clsx(
                'flex flex-1 items-center justify-between py-[var(--inc-spacing-inset-md)] text-[var(--inc-font-size-md)] font-[var(--inc-font-weight-medium)]',
                'transition-all duration-[var(--inc-motion-duration-fast)]',
                'hover:text-[var(--inc-color-text-primary)] hover:underline',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--inc-color-border-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--inc-color-surface-base)]',
                '[&[data-state=open]>svg]:rotate-180',
                className
            )}
            {...props}
        >
            {children}
            <svg
                width="15"
                height="15"
                viewBox="0 0 15 15"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 shrink-0 transition-transform duration-[var(--inc-motion-duration-normal)] ml-[var(--inc-spacing-stack-sm)] text-[var(--inc-color-text-tertiary)]"
                aria-hidden="true"
            >
                <path d="M3.13523 6.15803C3.3241 5.95657 3.64052 5.94637 3.84197 6.13523L7.5 9.56464L11.158 6.13523C11.3595 5.94637 11.6759 5.95657 11.8648 6.15803C12.0536 6.35949 12.0434 6.67591 11.842 6.86477L7.84197 10.6148C7.64964 10.7951 7.35036 10.7951 7.15803 10.6148L3.15803 6.86477C2.95657 6.67591 2.94637 6.35949 3.13523 6.15803Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd" />
            </svg>
        </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
));
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName;

export const AccordionContent = React.forwardRef<
    React.ElementRef<typeof AccordionPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
    <AccordionPrimitive.Content
        ref={ref}
        className={clsx(
            'overflow-hidden text-[var(--inc-font-size-sm)] text-[var(--inc-color-text-secondary)] transition-all data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out data-[state=open]:fade-in data-[state=closed]:slide-out-to-top-1 data-[state=open]:slide-in-from-top-1',
            className
        )}
        {...props}
    >
        <div className="pb-[var(--inc-spacing-inset-md)] pt-[var(--inc-spacing-inset-xs)]">
            {children}
        </div>
    </AccordionPrimitive.Content>
));
AccordionContent.displayName = AccordionPrimitive.Content.displayName;
