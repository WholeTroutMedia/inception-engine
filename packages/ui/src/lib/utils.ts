import { type ClassValue, clsx } from 'clsx';

/**
 * Utility for merging conditional Tailwind/class strings.
 * Works with CVA variants and arbitrary clsx inputs.
 */
export function cn(...inputs: ClassValue[]): string {
    return clsx(inputs);
}
