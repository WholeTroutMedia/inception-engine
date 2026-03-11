import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { clsx } from 'clsx';
import { cva, type VariantProps } from 'class-variance-authority';

const textVariants = cva('text-[var(--inc-color-text-primary)] font-[var(--inc-font-family-body)]', {
    variants: {
        size: {
            xs: 'text-[var(--inc-font-size-xs)] leading-[var(--inc-font-line-height-normal)]',
            sm: 'text-[var(--inc-font-size-sm)] leading-[var(--inc-font-line-height-normal)]',
            base: 'text-[var(--inc-font-size-base)] leading-[var(--inc-font-line-height-normal)]',
            lg: 'text-[var(--inc-font-size-lg)] leading-[var(--inc-font-line-height-normal)]',
            xl: 'text-[var(--inc-font-size-xl)] leading-[var(--inc-font-line-height-normal)]',
        },
        weight: {
            normal: 'font-[var(--inc-font-weight-normal)]',
            medium: 'font-[var(--inc-font-weight-medium)]',
            semibold: 'font-[var(--inc-font-weight-semibold)]',
            bold: 'font-[var(--inc-font-weight-bold)]',
        },
        align: {
            left: 'text-left',
            center: 'text-center',
            right: 'text-right',
            justify: 'text-justify',
        },
        muted: {
            true: 'text-[var(--inc-color-text-secondary)]',
        },
    },
    defaultVariants: {
        size: 'base',
        weight: 'normal',
        align: 'left',
    },
});

export interface TextProps
    extends React.HTMLAttributes<HTMLParagraphElement>,
    VariantProps<typeof textVariants> {
    asChild?: boolean;
    as?: React.ElementType;
}

export const Text = React.forwardRef<HTMLParagraphElement, TextProps>(
    ({ className, size, weight, align, muted, asChild = false, as: Tag = 'p', ...props }, ref) => {
        const Comp = asChild ? Slot : Tag;
        return (
            <Comp
                ref={ref}
                className={clsx(textVariants({ size, weight, align, muted }), className)}
                {...props}
            />
        );
    }
);

Text.displayName = 'Text';
