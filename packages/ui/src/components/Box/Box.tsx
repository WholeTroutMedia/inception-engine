import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { clsx } from 'clsx';

export interface BoxProps extends React.HTMLAttributes<HTMLDivElement> {
    asChild?: boolean;
}

export const Box = React.forwardRef<HTMLDivElement, BoxProps>(
    ({ className, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : 'div';
        return <Comp ref={ref} className={clsx(className)} {...props} />;
    }
);

Box.displayName = 'Box';
