// packages/ui/src/components/Tooltip/Tooltip.tsx
// Radix Tooltip — token-styled, keyboard accessible

'use client';

import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { clsx } from 'clsx';

export const TooltipProvider = TooltipPrimitive.Provider;

export interface TooltipProps {
    content: React.ReactNode;
    children: React.ReactNode;
    side?: 'top' | 'right' | 'bottom' | 'left';
    delayDuration?: number;
}

export function Tooltip({ content, children, side = 'top', delayDuration = 300 }: TooltipProps) {
    return (
        <TooltipPrimitive.Root delayDuration={delayDuration}>
            <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
            <TooltipPrimitive.Portal>
                <TooltipPrimitive.Content
                    side={side}
                    sideOffset={6}
                    className={clsx(
                        'z-50 max-w-xs',
                        'rounded-[var(--inc-radius-md)]',
                        'bg-[var(--inc-color-surface-invert)]',
                        'px-[var(--inc-spacing-inset-sm)] py-[var(--inc-spacing-inset-xs)]',
                        'text-[var(--inc-font-size-xs)] font-[var(--inc-font-weight-medium)]',
                        'text-[var(--inc-color-text-on-primary)]',
                        'shadow-[var(--inc-shadow-md)]',
                        'animate-in fade-in-0 zoom-in-95',
                        'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
                        'data-[side=bottom]:slide-in-from-top-2',
                        'data-[side=top]:slide-in-from-bottom-2',
                        'data-[side=left]:slide-in-from-right-2',
                        'data-[side=right]:slide-in-from-left-2',
                    )}
                >
                    {content}
                    <TooltipPrimitive.Arrow className="fill-[var(--inc-color-surface-invert)]" />
                </TooltipPrimitive.Content>
            </TooltipPrimitive.Portal>
        </TooltipPrimitive.Root>
    );
}
