// packages/ui/src/components/Switch/Switch.tsx
// Radix Switch — toggle, token-only

'use client';

import * as React from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import * as LabelPrimitive from '@radix-ui/react-label';
import { clsx } from 'clsx';

export interface SwitchProps
    extends React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root> {
    label?: string;
}

export const Switch = React.forwardRef<
    React.ElementRef<typeof SwitchPrimitive.Root>,
    SwitchProps
>(({ className, label, id, ...props }, ref) => {
    const switchId = id ?? `switch-${Math.random().toString(36).slice(2, 9)}`;
    return (
        <div className="flex items-center gap-[var(--inc-spacing-inline-sm)]">
            <SwitchPrimitive.Root
                ref={ref}
                id={switchId}
                className={clsx(
                    'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center',
                    'rounded-[var(--inc-radius-full)]',
                    'border-2 border-transparent',
                    'bg-[var(--inc-color-border-strong)]',
                    'transition-colors duration-[var(--inc-motion-duration-normal)] ease-[var(--inc-motion-easing-ease)]',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--inc-color-border-focus)] focus-visible:ring-offset-2',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    'data-[state=checked]:bg-[var(--inc-color-primary)]',
                    className
                )}
                {...props}
            >
                <SwitchPrimitive.Thumb
                    className={clsx(
                        'pointer-events-none block h-5 w-5 rounded-[var(--inc-radius-full)]',
                        'bg-[var(--inc-color-text-on-primary)]',
                        'shadow-[var(--inc-shadow-sm)]',
                        'ring-0',
                        'transition-transform duration-[var(--inc-motion-duration-normal)] ease-[var(--inc-motion-easing-spring)]',
                        'translate-x-0 data-[state=checked]:translate-x-5'
                    )}
                />
            </SwitchPrimitive.Root>
            {label && (
                <LabelPrimitive.Root
                    htmlFor={switchId}
                    className="text-[var(--inc-font-size-sm)] font-[var(--inc-font-weight-medium)] text-[var(--inc-color-text-primary)] cursor-pointer"
                >
                    {label}
                </LabelPrimitive.Root>
            )}
        </div>
    );
});
Switch.displayName = 'Switch';
