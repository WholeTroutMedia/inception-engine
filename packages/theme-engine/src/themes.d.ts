export type ThemeId = 'default' | 'dark' | 'light' | 'high-contrast' | string;
export interface ThemeTokenOverrides {
    /** Semantic color overrides — token path → new primitive reference or raw validated value */
    color?: Record<string, string>;
    /** Semantic spacing overrides */
    spacing?: Record<string, string>;
    /** Font family overrides */
    fontFamily?: Record<string, string>;
}
export interface Theme {
    id: ThemeId;
    displayName: string;
    description: string;
    overrides: ThemeTokenOverrides;
    metadata: {
        author: string;
        createdAt: string;
        validated: boolean;
        score?: number;
    };
}
export interface ThemeValidationResult {
    passed: boolean;
    failures: {
        contrast?: Array<{
            pair: string;
            actual: number;
            required: number;
        }>;
        hierarchy?: string[];
        spacing?: string[];
    };
    warnings: string[];
}
/**
 * Validate a theme against three non-bypassable gates:
 *  Gate 1 — WCAG AA contrast for critical color pairs
 *  Gate 2 — Heading hierarchy: each heading must be ≥ 1.125× smaller than the one above
 *  Gate 3 — Spacing rhythm: all spacing overrides must be on the 4px grid
 */
export declare function validateTheme(theme: Theme, resolvedColors?: Record<string, string>, resolvedFontSizes?: Record<string, string>): ThemeValidationResult;
export declare const DEFAULT_THEME: Theme;
export declare const DARK_THEME: Theme;
export declare const LIGHT_THEME: Theme;
export declare const HIGH_CONTRAST_THEME: Theme;
export declare const BUILT_IN_THEMES: Record<ThemeId, Theme>;
/**
 * Generate a CSS block that overrides semantic tokens for a given theme.
 * Output is designed to be applied as [data-theme="id"] { ... } or .theme-id { ... }
 */
export declare function generateThemeCSS(theme: Theme, selector?: string): string;
export declare function generateAllThemeCSS(): string;
//# sourceMappingURL=themes.d.ts.map