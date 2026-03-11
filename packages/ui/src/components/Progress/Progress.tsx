import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { clsx } from 'clsx';
import { cva, type VariantProps } from 'class-variance-authority';

export interface ProgressProps
    extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
    indicatorColor?: string;
}

export const Progress = React.forwardRef<
    React.ElementRef<typeof ProgressPrimitive.Root>,
    ProgressProps
>(({ className, value, indicatorColor = 'bg-[var(--inc-color-primary)]', ...props }, ref) => (
    <ProgressPrimitive.Root
        ref={ref}
        className={clsx(
            'relative h-2 w-full overflow-hidden rounded-full bg-[var(--inc-color-surface-overlay)]',
            className
        )}
        {...props}
    >
        <ProgressPrimitive.Indicator
            className={clsx('h-full w-full flex-1 transition-all duration-[var(--inc-motion-duration-normal)]', indicatorColor)}
            style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
        />
    </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;
