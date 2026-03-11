// VERA-DESIGN — Color Contrast Validator
// DS-404: WCAG AA/AAA contrast ratio checking

export interface ContrastResult {
    foreground: string;
    background: string;
    context: string;
    ratio: number;
    passesAA: boolean;    // 4.5:1 for text, 3:1 for UI
    passesAAA: boolean;   // 7:1 for text
    level: 'AAA' | 'AA' | 'fail';
}

/**
 * Calculate relative luminance per WCAG 2.1 spec
 */
function relativeLuminance(hex: string): number {
    const clean = hex.replace('#', '');
    const r = parseInt(clean.substring(0, 2), 16) / 255;
    const g = parseInt(clean.substring(2, 4), 16) / 255;
    const b = parseInt(clean.substring(4, 6), 16) / 255;

    const linearize = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/**
 * WCAG contrast ratio: (L1 + 0.05) / (L2 + 0.05) where L1 > L2
 */
function contrastRatio(hex1: string, hex2: string): number {
    const l1 = relativeLuminance(hex1);
    const l2 = relativeLuminance(hex2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
}

export function validateColorContrast(
    foreground: string,
    background: string,
    context: string,
    isUIComponent = false
): ContrastResult {
    const ratio = contrastRatio(foreground, background);
    const aaThreshold = isUIComponent ? 3.0 : 4.5;
    const aaaThreshold = 7.0;

    return {
        foreground,
        background,
        context,
        ratio,
        passesAA: ratio >= aaThreshold,
        passesAAA: ratio >= aaaThreshold,
        level: ratio >= aaaThreshold ? 'AAA' : ratio >= aaThreshold ? 'AA' : 'fail',
    };
}

/**
 * Validate a full palette of color pairs
 */
export function validatePalette(
    pairs: Array<{ fg: string; bg: string; label: string; isUI?: boolean }>
): { results: ContrastResult[]; passRate: number; allPass: boolean } {
    const results = pairs.map((p) => validateColorContrast(p.fg, p.bg, p.label, p.isUI));
    const passing = results.filter((r) => r.passesAA).length;
    return {
        results,
        passRate: passing / results.length,
        allPass: passing === results.length,
    };
}

/**
 * Pre-validate the default Inception theme pairs
 */
export const INCEPTION_THEME_PAIRS = [
    { fg: '#111827', bg: '#f9fafb', label: 'body text on surface.base' },
    { fg: '#4b5563', bg: '#f9fafb', label: 'secondary text on surface.base' },
    { fg: '#ffffff', bg: '#0066cc', label: 'white on color.primary' },
    { fg: '#ffffff', bg: '#7c3aed', label: 'white on color.secondary' },
    { fg: '#b91c1c', bg: '#fef2f2', label: 'danger text on danger subtle bg' },
    { fg: '#15803d', bg: '#f0fdf4', label: 'success text on success subtle bg' },
    { fg: '#92400e', bg: '#fffbeb', label: 'warning text on warning subtle bg' },
    { fg: '#1d4ed8', bg: '#eff6ff', label: 'info text on info subtle bg' },
    { fg: '#111827', bg: '#ffffff', label: 'body text on white' },
    { fg: '#60a5fa', bg: '#111827', label: 'primary on dark surface (dark mode)' },
];
