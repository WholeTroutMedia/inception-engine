// packages/ui/src/components/Table/Table.tsx
// Data table primitives — semantic HTML, token-styled

import * as React from 'react';
import { clsx } from 'clsx';

export const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
    ({ className, ...props }, ref) => (
        <div className="relative w-full overflow-auto rounded-[var(--inc-radius-md)] border border-[var(--inc-color-border-default)]">
            <table ref={ref} className={clsx('w-full caption-bottom text-[var(--inc-font-size-sm)]', className)} {...props} />
        </div>
    )
);
Table.displayName = 'Table';

export const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
    ({ className, ...props }, ref) => (
        <thead ref={ref} className={clsx('bg-[var(--inc-color-surface-overlay)]', className)} {...props} />
    )
);
TableHeader.displayName = 'TableHeader';

export const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
    ({ className, ...props }, ref) => (
        <tbody ref={ref} className={clsx('[&_tr:last-child]:border-0', className)} {...props} />
    )
);
TableBody.displayName = 'TableBody';

export const TableFooter = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
    ({ className, ...props }, ref) => (
        <tfoot ref={ref} className={clsx('border-t border-[var(--inc-color-border-default)] bg-[var(--inc-color-surface-overlay)] font-[var(--inc-font-weight-medium)]', className)} {...props} />
    )
);
TableFooter.displayName = 'TableFooter';

export const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
    ({ className, ...props }, ref) => (
        <tr ref={ref} className={clsx(
            'border-b border-[var(--inc-color-border-subtle)]',
            'transition-colors duration-[var(--inc-motion-duration-fast)]',
            'hover:bg-[var(--inc-color-surface-overlay)]',
            'data-[state=selected]:bg-[var(--inc-color-primary-subtle)]',
            className
        )} {...props} />
    )
);
TableRow.displayName = 'TableRow';

export const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
    ({ className, ...props }, ref) => (
        <th ref={ref} className={clsx(
            'h-10 px-[var(--inc-spacing-inset-md)] text-left align-middle',
            'font-[var(--inc-font-weight-semibold)] text-[var(--inc-color-text-secondary)]',
            'text-[var(--inc-font-size-xs)] tracking-[var(--inc-font-letter-spacing-wide)] uppercase',
            '[&:has([role=checkbox])]:pr-0',
            className
        )} {...props} />
    )
);
TableHead.displayName = 'TableHead';

export const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
    ({ className, ...props }, ref) => (
        <td ref={ref} className={clsx(
            'px-[var(--inc-spacing-inset-md)] py-[var(--inc-spacing-inset-sm)] align-middle',
            'text-[var(--inc-color-text-primary)]',
            '[&:has([role=checkbox])]:pr-0',
            className
        )} {...props} />
    )
);
TableCell.displayName = 'TableCell';

export const TableCaption = React.forwardRef<HTMLTableCaptionElement, React.HTMLAttributes<HTMLTableCaptionElement>>(
    ({ className, ...props }, ref) => (
        <caption ref={ref} className={clsx('mt-[var(--inc-spacing-stack-sm)] text-[var(--inc-font-size-sm)] text-[var(--inc-color-text-tertiary)]', className)} {...props} />
    )
);
TableCaption.displayName = 'TableCaption';
