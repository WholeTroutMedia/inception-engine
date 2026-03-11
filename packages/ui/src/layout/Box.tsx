import React, { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

const boxVariants = cva('', {
    variants: {
        display: {
            block: 'block',
            inline: 'inline',
            inlineBlock: 'inline-block',
        },
        position: {
            static: 'static',
            relative: 'relative',
            absolute: 'absolute',
            fixed: 'fixed',
            sticky: 'sticky',
        },
        padding: {
            none: 'p-0',
            xs: 'p-[--inc-space-1]',
            sm: 'p-[--inc-space-2]',
            md: 'p-[--inc-space-3]',
            lg: 'p-[--inc-space-4]',
            xl: 'p-[--inc-space-6]',
        },
        margin: {
            none: 'm-0',
            xs: 'm-[--inc-space-1]',
            sm: 'm-[--inc-space-2]',
            md: 'm-[--inc-space-3]',
            lg: 'm-[--inc-space-4]',
            xl: 'm-[--inc-space-6]',
        },
    },
});

export interface BoxProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof boxVariants> {
    as?: React.ElementType;
}

export const Box = forwardRef<HTMLDivElement, BoxProps>(
    ({ className, as: Component = 'div', display, position, padding, margin, ...props }, ref) => {
        return (
            <Component
                ref={ref}
                className={boxVariants({ display, position, padding, margin, className })}
                {...props}
            />
        );
    }
);

Box.displayName = 'Box';
