import React, { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

const flexVariants = cva('flex', {
    variants: {
        direction: {
            row: 'flex-row',
            col: 'flex-col',
            rowReverse: 'flex-row-reverse',
            colReverse: 'flex-col-reverse',
        },
        wrap: {
            nowrap: 'flex-nowrap',
            wrap: 'flex-wrap',
            wrapReverse: 'flex-wrap-reverse',
        },
        align: {
            start: 'items-start',
            center: 'items-center',
            end: 'items-end',
            baseline: 'items-baseline',
            stretch: 'items-stretch',
        },
        justify: {
            start: 'justify-start',
            center: 'justify-center',
            end: 'justify-end',
            between: 'justify-between',
            around: 'justify-around',
            evenly: 'justify-evenly',
        },
        gap: {
            none: 'gap-0',
            xs: 'gap-[--inc-space-1]',
            sm: 'gap-[--inc-space-2]',
            md: 'gap-[--inc-space-3]',
            lg: 'gap-[--inc-space-4]',
            xl: 'gap-[--inc-space-6]',
        },
    },
    defaultVariants: {
        direction: 'row',
        align: 'stretch',
        justify: 'start',
        gap: 'none',
    },
});

export interface FlexProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof flexVariants> {
    as?: React.ElementType;
}

export const Flex = forwardRef<HTMLDivElement, FlexProps>(
    ({ className, as: Component = 'div', direction, wrap, align, justify, gap, ...props }, ref) => {
        return (
            <Component
                ref={ref}
                className={flexVariants({ direction, wrap, align, justify, gap, className })}
                {...props}
            />
        );
    }
);

Flex.displayName = 'Flex';
