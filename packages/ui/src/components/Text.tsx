import React, { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

const textVariants = cva('m-0', {
    variants: {
        variant: {
            d1: 'text-5xl font-extrabold tracking-tight',
            d2: 'text-4xl font-bold tracking-tight',
            h1: 'text-3xl font-bold tracking-tight',
            h2: 'text-2xl font-semibold tracking-tight',
            h3: 'text-xl font-semibold',
            h4: 'text-lg font-semibold',
            p: 'text-base leading-relaxed',
            small: 'text-sm leading-normal',
            xs: 'text-xs leading-none',
        },
        color: {
            default: 'text-[--inc-color-text-primary]',
            muted: 'text-[--inc-color-text-secondary]',
            primary: 'text-[--inc-color-primary]',
            success: 'text-[--inc-color-status-success]',
            error: 'text-[--inc-color-status-error]',
            warning: 'text-[--inc-color-status-warning]',
        },
        weight: {
            normal: 'font-normal',
            medium: 'font-medium',
            semibold: 'font-semibold',
            bold: 'font-bold',
        },
        align: {
            left: 'text-left',
            center: 'text-center',
            right: 'text-right',
            justify: 'text-justify',
        },
    },
    defaultVariants: {
        variant: 'p',
        color: 'default',
        align: 'left',
    },
});

export interface TextProps
    extends Omit<React.HTMLAttributes<HTMLParagraphElement | HTMLHeadingElement | HTMLSpanElement>, 'color'>,
    VariantProps<typeof textVariants> {
    as?: React.ElementType;
}

export const Text = forwardRef<HTMLParagraphElement | HTMLHeadingElement | HTMLSpanElement, TextProps>(
    ({ className, as, variant, color, weight, align, ...props }, ref) => {

        // Auto-select semantic element if not overridden
        let Component = as || 'p';
        if (!as && variant) {
            if (variant === 'h1' || variant === 'd1') Component = 'h1';
            else if (variant === 'h2' || variant === 'd2') Component = 'h2';
            else if (variant === 'h3') Component = 'h3';
            else if (variant === 'h4') Component = 'h4';
            else if (variant === 'small' || variant === 'xs') Component = 'span';
        }

        return (
            <Component
                ref={ref}
                className={textVariants({ variant, color, weight, align, className })}
                {...props}
            />
        );
    }
);

Text.displayName = 'Text';
