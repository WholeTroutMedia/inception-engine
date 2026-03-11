// packages/ui/src/components/Separator/Separator.tsx
import * as React from 'react';
import * as SeparatorPrimitive from '@radix-ui/react-separator';
import { clsx } from 'clsx';

export interface SeparatorProps extends React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root> { }

export const Separator = React.forwardRef<
    React.ElementRef<typeof SeparatorPrimitive.Root>,
    SeparatorProps
>(({ className, orientation = 'horizontal', decorative = true, ...props }, ref) => (
    <SeparatorPrimitive.Root
        ref={ref}
        decorative={decorative}
        orientation={orientation}
        className={clsx(
            'shrink-0 bg-[var(--inc-color-border-default)]',
            orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
            className
        )}
        {...props}
    />
));
Separator.displayName = 'Separator';
