import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { clsx } from 'clsx';
import { cva, type VariantProps } from 'class-variance-authority';

const flexVariants = cva('flex', {
    variants: {
        direction: {
            row: 'flex-row',
            col: 'flex-col',
            'row-reverse': 'flex-row-reverse',
            'col-reverse': 'flex-col-reverse',
        },
        wrap: {
            nowrap: 'flex-nowrap',
            wrap: 'flex-wrap',
            'wrap-reverse': 'flex-wrap-reverse',
        },
        align: {
            start: 'items-start',
            center: 'items-center',
            end: 'items-end',
            stretch: 'items-stretch',
            baseline: 'items-baseline',
        },
        justify: {
            start: 'justify-start',
            center: 'justify-center',
            end: 'justify-end',
            between: 'justify-between',
            around: 'justify-around',
            evenly: 'justify-evenly',
        },
    },
    defaultVariants: {
        direction: 'row',
        wrap: 'nowrap',
        align: 'stretch',
        justify: 'start',
    },
});

export interface FlexProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof flexVariants> {
    asChild?: boolean;
}

export const Flex = React.forwardRef<HTMLDivElement, FlexProps>(
    ({ className, direction, wrap, align, justify, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : 'div';
        return (
            <Comp
                ref={ref}
                className={clsx(flexVariants({ direction, wrap, align, justify }), className)}
                {...props}
            />
        );
    }
);

Flex.displayName = 'Flex';
