// packages/ui/src/components/Stack/Stack.tsx
// Primitive layout — vertical/horizontal stacking with token spacing

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';

const stackVariants = cva('flex', {
    variants: {
        direction: {
            vertical: 'flex-col',
            horizontal: 'flex-row flex-wrap',
        },
        gap: {
            none: 'gap-0',
            xs: 'gap-[var(--inc-spacing-stack-xs)]',
            sm: 'gap-[var(--inc-spacing-stack-sm)]',
            md: 'gap-[var(--inc-spacing-stack-md)]',
            lg: 'gap-[var(--inc-spacing-stack-lg)]',
            xl: 'gap-[var(--inc-spacing-stack-xl)]',
        },
        align: {
            start: 'items-start',
            center: 'items-center',
            end: 'items-end',
            stretch: 'items-stretch',
        },
        justify: {
            start: 'justify-start',
            center: 'justify-center',
            end: 'justify-end',
            between: 'justify-between',
            around: 'justify-around',
        },
    },
    defaultVariants: {
        direction: 'vertical',
        gap: 'md',
        align: 'stretch',
        justify: 'start',
    },
});

export interface StackProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof stackVariants> {
    as?: React.ElementType;
}

export const Stack = React.forwardRef<HTMLDivElement, StackProps>(
    ({ className, direction, gap, align, justify, as: Tag = 'div', ...props }, ref) => (
        <Tag
            ref={ref}
            className={clsx(stackVariants({ direction, gap, align, justify }), className)}
            {...props}
        />
    )
);
Stack.displayName = 'Stack';

// Inline = horizontal Stack alias
export const Inline = React.forwardRef<HTMLDivElement, Omit<StackProps, 'direction'>>(
    (props, ref) => <Stack ref={ref} direction="horizontal" {...props} />
);
Inline.displayName = 'Inline';
