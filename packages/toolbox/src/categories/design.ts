/**
 * @inception/toolbox — Design Utilities
 * TOOL-02: Pure TypeScript design utility functions — zero external dependencies
 *
 * Functions: colorHexToHsl, contrastRatio, paletteGenerator, gradientString
 */

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface HslColor {
  h: number;   // 0–360
  s: number;   // 0–100
  l: number;   // 0–100
  /** CSS string: hsl(h, s%, l%) */
  css: string;
}

export interface RgbColor {
  r: number;  // 0–255
  g: number;
  b: number;
}

export interface ContrastResult {
  ratio: number;
  ratioFormatted: string;
  wcagAA: boolean;      // >= 4.5:1 for normal text
  wcagAAA: boolean;     // >= 7:1 for normal text
  wcagAALarge: boolean; // >= 3:1 for large text
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
  direction?: string;  // e.g., '135deg', 'to top right'
  stops: Array<{ color: string; position?: string }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// HEX → HSL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts a hex color (#RGB or #RRGGBB) to HSL.
 */
export function colorHexToHsl(hex: string): HslColor {
  const rgb = hexToRgb(hex);
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  const H = Math.round(h * 360);
  const S = Math.round(s * 100);
  const L = Math.round(l * 100);

  return { h: H, s: S, l: L, css: `hsl(${H}, ${S}%, ${L}%)` };
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTRAST RATIO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computes the WCAG 2.1 contrast ratio between two hex colors.
 * Returns WCAG AA/AAA pass/fail for both normal and large text.
 */
export function contrastRatio(hex1: string, hex2: string): ContrastResult {
  const l1 = relativeLuminance(hexToRgb(hex1));
  const l2 = relativeLuminance(hexToRgb(hex2));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  const ratio = (lighter + 0.05) / (darker + 0.05);

  return {
    ratio,
    ratioFormatted: `${ratio.toFixed(2)}:1`,
    wcagAA: ratio >= 4.5,
    wcagAAA: ratio >= 7,
    wcagAALarge: ratio >= 3,
    recommendation: ratio >= 7
      ? 'Excellent — WCAG AAA passes for all text sizes'
      : ratio >= 4.5
      ? 'Good — WCAG AA passes for normal + large text'
      : ratio >= 3
      ? 'Acceptable for large text only (18pt+ or 14pt bold)'
      : 'Insufficient contrast — fails WCAG for all text sizes',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PALETTE GENERATOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a harmonious color palette from a base hex color.
 * Returns shades (darker), tints (lighter), complementary, and analogous colors.
 */
export function paletteGenerator(baseHex: string): ColorPalette {
  const { h, s } = colorHexToHsl(baseHex);

  const shades: Record<string, string> = {};
  const tints: Record<string, string> = {};

  // Shades: darker (lower lightness)
  [90, 80, 70, 60, 50].forEach((l, i) => {
    shades[`${(i + 1) * 100}`] = `hsl(${h}, ${s}%, ${l}%)`;
  });

  // Tints: lighter (higher lightness)
  [40, 30, 20, 10, 5].forEach((l, i) => {
    tints[`${600 + i * 100}`] = `hsl(${h}, ${s}%, ${l}%)`;
  });

  const complementary = `hsl(${(h + 180) % 360}, ${s}%, 50%)`;
  const analogous: [string, string] = [
    `hsl(${(h + 30) % 360}, ${s}%, 50%)`,
    `hsl(${(h - 30 + 360) % 360}, ${s}%, 50%)`,
  ];

  return { base: baseHex, shades, tints, complementary, analogous };
}

// ─────────────────────────────────────────────────────────────────────────────
// GRADIENT STRING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a CSS gradient string from a gradient configuration.
 * @example
 * gradientString({ type: 'linear', direction: '135deg',
 *   stops: [{ color: '#667eea' }, { color: '#764ba2' }] })
 * // → 'linear-gradient(135deg, #667eea, #764ba2)'
 */
export function gradientString(config: GradientConfig): string {
  const stops = config.stops
    .map((s) => (s.position ? `${s.color} ${s.position}` : s.color))
    .join(', ');

  switch (config.type) {
    case 'linear': {
      const dir = config.direction ?? '180deg';
      return `linear-gradient(${dir}, ${stops})`;
    }
    case 'radial': {
      const shape = config.direction ?? 'circle at center';
      return `radial-gradient(${shape}, ${stops})`;
    }
    case 'conic': {
      const from = config.direction ?? 'from 0deg';
      return `conic-gradient(${from}, ${stops})`;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): RgbColor {
  const clean = hex.replace(/^#/, '');
  const full = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean;

  const n = parseInt(full, 16);
  return {
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255,
  };
}

function relativeLuminance({ r, g, b }: RgbColor): number {
  const linearize = (c: number): number => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}
