// packages/ui/src/components/Modal/Modal.tsx
// Radix Dialog — accessible modal with token-only styling

'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';

const overlayClass = [
    'fixed inset-0 z-50',
    'bg-[rgba(0,0,0,0.6)]',
    'backdrop-blur-sm',
    'data-[state=open]:animate-in data-[state=closed]:animate-out',
    'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
].join(' ');

const contentVariants = cva(
    [
        'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
        'w-full',
        'bg-[var(--inc-color-surface-card)]',
        'border border-[var(--inc-color-border-default)]',
        'rounded-[var(--inc-radius-lg)]',
        'shadow-[var(--inc-shadow-xl)]',
        'focus:outline-none',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        'data-[state=closed]:slide-out-to-left-1/2 data-[state=open]:slide-in-from-left-1/2',
        'data-[state=closed]:slide-out-to-top-1/2 data-[state=open]:slide-in-from-top-1/2',
        'duration-[var(--inc-motion-duration-normal)]',
    ].join(' '),
    {
        variants: {
            size: {
                sm: 'max-w-sm  p-[var(--inc-spacing-inset-md)]',
                md: 'max-w-lg  p-[var(--inc-spacing-inset-lg)]',
                lg: 'max-w-2xl p-[var(--inc-spacing-inset-lg)]',
                full: 'max-w-[calc(100vw-2rem)] p-[var(--inc-spacing-inset-lg)]',
            },
        },
        defaultVariants: { size: 'md' },
    }
);

export interface ModalProps
    extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root>,
    VariantProps<typeof contentVariants> {
    trigger?: React.ReactNode;
    title?: string;
    description?: string;
    children: React.ReactNode;
}

export function Modal({ children, trigger, title, description, size, ...props }: ModalProps) {
    return (
        <DialogPrimitive.Root {...props}>
            {trigger && <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>}
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className={overlayClass} />
                <DialogPrimitive.Content className={clsx(contentVariants({ size }))}>
                    {title && (
                        <DialogPrimitive.Title className="text-[var(--inc-font-size-lg)] font-[var(--inc-font-weight-semibold)] text-[var(--inc-color-text-primary)] mb-[var(--inc-spacing-stack-xs)]">
                            {title}
                        </DialogPrimitive.Title>
                    )}
                    {description && (
                        <DialogPrimitive.Description className="text-[var(--inc-font-size-sm)] text-[var(--inc-color-text-secondary)] mb-[var(--inc-spacing-stack-md)]">
                            {description}
                        </DialogPrimitive.Description>
                    )}
                    {children}
                    <DialogPrimitive.Close
                        className={[
                            'absolute right-[var(--inc-spacing-inset-md)] top-[var(--inc-spacing-inset-md)]',
                            'h-6 w-6 rounded-[var(--inc-radius-sm)]',
                            'text-[var(--inc-color-text-tertiary)] hover:text-[var(--inc-color-text-primary)]',
                            'focus:outline-none focus:ring-2 focus:ring-[var(--inc-color-border-focus)]',
                            'transition-colors duration-[var(--inc-motion-duration-fast)]',
                        ].join(' ')}
                        aria-label="Close"
                    >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                            <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </DialogPrimitive.Close>
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}
