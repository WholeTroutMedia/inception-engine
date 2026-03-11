import React, { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

const gridVariants = cva('grid', {
    variants: {
        cols: {
            1: 'grid-cols-1',
            2: 'grid-cols-2',
            3: 'grid-cols-3',
            4: 'grid-cols-4',
            5: 'grid-cols-5',
            6: 'grid-cols-6',
            12: 'grid-cols-12',
            auto: 'auto-cols-auto',
        },
        gap: {
            none: 'gap-0',
            xs: 'gap-[--inc-space-1]',
            sm: 'gap-[--inc-space-2]',
            md: 'gap-[--inc-space-3]',
            lg: 'gap-[--inc-space-4]',
            xl: 'gap-[--inc-space-6]',
        },
        align: {
            start: 'items-start',
            center: 'items-center',
            end: 'items-end',
            stretch: 'items-stretch',
        },
        justify: {
            start: 'justify-items-start',
            center: 'justify-items-center',
            end: 'justify-items-end',
            stretch: 'justify-items-stretch',
        },
    },
    defaultVariants: {
        cols: 1,
        gap: 'none',
    },
});

export interface GridProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof gridVariants> {
    as?: React.ElementType;
}

export const Grid = forwardRef<HTMLDivElement, GridProps>(
    ({ className, as: Component = 'div', cols, gap, align, justify, ...props }, ref) => {
        return (
            <Component
                ref={ref}
                className={gridVariants({ cols, gap, align, justify, className })}
                {...props}
            />
        );
    }
);

Grid.displayName = 'Grid';
