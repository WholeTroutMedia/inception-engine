/**
 * @inception/toolbox — Design Utilities
 * TOOL-02: Pure TypeScript design utility functions — zero external dependencies
 *
 * Functions: colorHexToHsl, contrastRatio, paletteGenerator, gradientString
 */
export interface HslColor {
    h: number;
    s: number;
    l: number;
    /** CSS string: hsl(h, s%, l%) */
    css: string;
}
export interface RgbColor {
    r: number;
    g: number;
    b: number;
}
export interface ContrastResult {
    ratio: number;
    ratioFormatted: string;
    wcagAA: boolean;
    wcagAAA: boolean;
    wcagAALarge: boolean;
    recommendation: string;
}
export interface ColorPalette {
    base: string;
    shades: Record<string, string>;
    tints: Record<string, string>;
    complementary: string;
    analogous: [string, string];
}
export interface GradientConfig {
    type: 'linear' | 'radial' | 'conic';
    direction?: string;
    stops: Array<{
        color: string;
        position?: string;
    }>;
}
/**
 * Converts a hex color (#RGB or #RRGGBB) to HSL.
 */
export declare function colorHexToHsl(hex: string): HslColor;
/**
 * Computes the WCAG 2.1 contrast ratio between two hex colors.
 * Returns WCAG AA/AAA pass/fail for both normal and large text.
 */
export declare function contrastRatio(hex1: string, hex2: string): ContrastResult;
/**
 * Generates a harmonious color palette from a base hex color.
 * Returns shades (darker), tints (lighter), complementary, and analogous colors.
 */
export declare function paletteGenerator(baseHex: string): ColorPalette;
/**
 * Generates a CSS gradient string from a gradient configuration.
 * @example
 * gradientString({ type: 'linear', direction: '135deg',
 *   stops: [{ color: '#667eea' }, { color: '#764ba2' }] })
 * // → 'linear-gradient(135deg, #667eea, #764ba2)'
 */
export declare function gradientString(config: GradientConfig): string;
