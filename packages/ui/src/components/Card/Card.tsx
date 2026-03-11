// packages/ui/src/components/Card/Card.tsx
// Surface container — semantic sectioning with depth tokens

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';

const cardVariants = cva(
    [
        'rounded-[var(--inc-radius-lg)]',
        'border border-[var(--inc-color-border-default)]',
        'bg-[var(--inc-color-surface-card)]',
        'text-[var(--inc-color-text-primary)]',
    ].join(' '),
    {
        variants: {
            padding: {
                none: '',
                sm: 'p-[var(--inc-spacing-inset-sm)]',
                md: 'p-[var(--inc-spacing-inset-md)]',
                lg: 'p-[var(--inc-spacing-inset-lg)]',
            },
            shadow: {
                none: '',
                sm: 'shadow-[var(--inc-shadow-sm)]',
                md: 'shadow-[var(--inc-shadow-md)]',
                lg: 'shadow-[var(--inc-shadow-lg)]',
            },
        },
        defaultVariants: { padding: 'md', shadow: 'sm' },
    }
);

export interface CardProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> { }

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
    ({ className, padding, shadow, children, ...props }, ref) => (
        <div ref={ref} className={clsx(cardVariants({ padding, shadow }), className)} {...props}>
            {children}
        </div>
    )
);
Card.displayName = 'Card';

// ─── Card sub-components ─────────────────────────────────────────────────────
export const CardHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={clsx('flex flex-col gap-[var(--inc-spacing-stack-xs)] pb-[var(--inc-spacing-stack-sm)]', className)} {...props} />
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className={clsx(
        'font-[var(--inc-font-family-display)] font-[var(--inc-font-weight-semibold)] text-[var(--inc-font-size-lg)] leading-[var(--inc-font-line-height-snug)]',
        className
    )} {...props} />
);
CardTitle.displayName = 'CardTitle';

export const CardBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={clsx('text-[var(--inc-font-size-base)] text-[var(--inc-color-text-secondary)]', className)} {...props} />
);
CardBody.displayName = 'CardBody';

export const CardFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={clsx('flex items-center gap-[var(--inc-spacing-inline-md)] pt-[var(--inc-spacing-stack-sm)]', className)} {...props} />
);
CardFooter.displayName = 'CardFooter';
