import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { clsx } from 'clsx';
import { cva, type VariantProps } from 'class-variance-authority';

const avatarVariants = cva(
    'relative flex shrink-0 overflow-hidden rounded-full',
    {
        variants: {
            size: {
                sm: 'h-8 w-8',
                md: 'h-10 w-10',
                lg: 'h-12 w-12',
                xl: 'h-16 w-16',
            },
        },
        defaultVariants: {
            size: 'md',
        },
    }
);

export interface AvatarProps
    extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>,
    VariantProps<typeof avatarVariants> { }

export const Avatar = React.forwardRef<
    React.ElementRef<typeof AvatarPrimitive.Root>,
    AvatarProps
>(({ className, size, ...props }, ref) => (
    <AvatarPrimitive.Root
        ref={ref}
        className={clsx(avatarVariants({ size }), className)}
        {...props}
    />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

export const AvatarImage = React.forwardRef<
    React.ElementRef<typeof AvatarPrimitive.Image>,
    React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
    <AvatarPrimitive.Image
        ref={ref}
        className={clsx('aspect-square h-full w-full object-cover', className)}
        {...props}
    />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

export const AvatarFallback = React.forwardRef<
    React.ElementRef<typeof AvatarPrimitive.Fallback>,
    React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
    <AvatarPrimitive.Fallback
        ref={ref}
        className={clsx(
            'flex h-full w-full items-center justify-center rounded-full bg-[var(--inc-color-surface-overlay)] text-[var(--inc-color-text-primary)] font-[var(--inc-font-weight-medium)]',
            className
        )}
        {...props}
    />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;
