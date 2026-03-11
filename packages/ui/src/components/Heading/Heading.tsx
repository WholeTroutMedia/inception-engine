// packages/ui/src/components/Heading/Heading.tsx
// Typography — semantically correct, token-only heading component

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';

const headingVariants = cva('', {
    variants: {
        level: {
            display: [
                'font-[var(--inc-font-family-display)]',
                'font-[var(--inc-font-weight-extrabold)]',
                'text-[var(--inc-font-size-4xl)]',
                'leading-[var(--inc-font-line-height-tight)]',
                'tracking-[var(--inc-font-letter-spacing-tight)]',
                'text-[var(--inc-color-text-primary)]',
            ].join(' '),
            h1: [
                'font-[var(--inc-font-family-display)]',
                'font-[var(--inc-font-weight-bold)]',
                'text-[var(--inc-font-size-3xl)]',
                'leading-[var(--inc-font-line-height-tight)]',
                'tracking-[var(--inc-font-letter-spacing-tight)]',
                'text-[var(--inc-color-text-primary)]',
            ].join(' '),
            h2: [
                'font-[var(--inc-font-family-display)]',
                'font-[var(--inc-font-weight-bold)]',
                'text-[var(--inc-font-size-2xl)]',
                'leading-[var(--inc-font-line-height-snug)]',
                'tracking-[var(--inc-font-letter-spacing-tight)]',
                'text-[var(--inc-color-text-primary)]',
            ].join(' '),
            h3: [
                'font-[var(--inc-font-family-display)]',
                'font-[var(--inc-font-weight-semibold)]',
                'text-[var(--inc-font-size-xl)]',
                'leading-[var(--inc-font-line-height-snug)]',
                'text-[var(--inc-color-text-primary)]',
            ].join(' '),
            h4: [
                'font-[var(--inc-font-family-display)]',
                'font-[var(--inc-font-weight-semibold)]',
                'text-[var(--inc-font-size-lg)]',
                'leading-[var(--inc-font-line-height-normal)]',
                'text-[var(--inc-color-text-primary)]',
            ].join(' '),
            h5: [
                'font-[var(--inc-font-family-body)]',
                'font-[var(--inc-font-weight-semibold)]',
                'text-[var(--inc-font-size-base)]',
                'leading-[var(--inc-font-line-height-normal)]',
                'text-[var(--inc-color-text-primary)]',
            ].join(' '),
        },
        muted: {
            true: 'text-[var(--inc-color-text-secondary)]',
        },
    },
    defaultVariants: {
        level: 'h2',
    },
});

export interface HeadingProps
    extends React.HTMLAttributes<HTMLHeadingElement>,
    VariantProps<typeof headingVariants> {
    /** The semantic HTML element — must match or be higher than visual level */
    as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span';
    level?: 'display' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5';
}

export const Heading = React.forwardRef<HTMLHeadingElement, HeadingProps>(
    ({ className, level = 'h2', as, muted, children, ...props }, ref) => {
        const Tag = (as ?? (level === 'display' ? 'h1' : level)) as React.ElementType;
        return (
            <Tag
                ref={ref}
                className={clsx(headingVariants({ level, muted }), className)}
                {...props}
            >
                {children}
            </Tag>
        );
    }
);

Heading.displayName = 'Heading';
