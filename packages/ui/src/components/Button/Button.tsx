import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';
import { Slot } from '@radix-ui/react-slot';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center whitespace-nowrap',
    'font-[var(--inc-font-weight-medium)] text-[var(--inc-font-size-base)]',
    'rounded-[var(--inc-radius-md)]',
    'transition-colors duration-[var(--inc-motion-duration-fast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--inc-color-border-focus)] focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
  ].join(' '),
  {
    variants: {
      variant: {
        primary: 'bg-[var(--inc-color-primary)] text-[var(--inc-color-text-on-primary)] hover:bg-[var(--inc-color-primary-hover)]',
        secondary: 'bg-[var(--inc-color-surface-sunken)] text-[var(--inc-color-text-primary)] hover:bg-[var(--inc-color-surface-overlay)] border border-[var(--inc-color-border-default)]',
        ghost: 'hover:bg-[var(--inc-color-surface-overlay)] text-[var(--inc-color-text-primary)]',
        danger: 'bg-[var(--inc-color-feedback-danger)] text-white hover:opacity-90',
        link: 'text-[var(--inc-color-primary)] underline-offset-4 hover:underline',
      },
      size: {
        xs: 'h-7 px-2 text-[var(--inc-font-size-xs)]',
        sm: 'h-9 px-3 text-[var(--inc-font-size-sm)]',
        md: 'h-10 px-4 py-2',
        lg: 'h-11 px-8',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={clsx(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={props.disabled || loading}
        {...props}
      >
        {loading ? (
          <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : null}
        {children}
      </Comp>
    );
  }
);
Button.displayName = 'Button';
