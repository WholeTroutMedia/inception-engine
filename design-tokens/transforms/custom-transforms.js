/**
 * Custom Style Dictionary Transforms
 * Inception Engine Design Token System
 *
 * These transforms extend Style Dictionary's built-in transform
 * capabilities for project-specific needs.
 */

'use strict';

/**
 * Register all custom transforms with Style Dictionary
 * @param {import('style-dictionary')} StyleDictionary
 */
function registerCustomTransforms(StyleDictionary) {

  // ─── px → rem conversion ───────────────────────────────────
  StyleDictionary.registerTransform({
    name: 'size/pxToRem',
    type: 'value',
    matcher: (token) => {
      const pxCategories = ['fontSize', 'spacing', 'borderRadius', 'size'];
      return (
        pxCategories.includes(token.attributes?.category) &&
        typeof token.value === 'string' &&
        token.value.endsWith('px')
      );
    },
    transformer: (token) => {
      const baseFontSize = 16;
      const pxValue = parseFloat(token.value);
      if (isNaN(pxValue)) return token.value;
      return `${pxValue / baseFontSize}rem`;
    },
  });

  // ─── Shadow object → CSS box-shadow string ─────────────────
  StyleDictionary.registerTransform({
    name: 'shadow/css',
    type: 'value',
    matcher: (token) => {
      return token.attributes?.category === 'shadow' || token.type === 'boxShadow';
    },
    transformer: (token) => {
      const val = token.value;
      if (typeof val === 'string') return val;
      if (typeof val === 'object' && val !== null) {
        const x = val.x || val.offsetX || '0px';
        const y = val.y || val.offsetY || '0px';
        const blur = val.blur || '0px';
        const spread = val.spread || '0px';
        const color = val.color || 'rgba(0,0,0,0.1)';
        const inset = val.inset ? 'inset ' : '';
        return `${inset}${x} ${y} ${blur} ${spread} ${color}`;
      }
      return token.value;
    },
  });

  // ─── Font weight name → numeric value ──────────────────────
  StyleDictionary.registerTransform({
    name: 'fontWeight/number',
    type: 'value',
    matcher: (token) => {
      return (
        token.attributes?.category === 'font' &&
        token.attributes?.type === 'weight'
      );
    },
    transformer: (token) => {
      const weightMap = {
        thin: 100,
        hairline: 100,
        extralight: 200,
        ultralight: 200,
        light: 300,
        normal: 400,
        regular: 400,
        medium: 500,
        semibold: 600,
        demibold: 600,
        bold: 700,
        extrabold: 800,
        ultrabold: 800,
        black: 900,
        heavy: 900,
      };
      const lookup = String(token.value).toLowerCase().replace(/[\s-_]/g, '');
      return weightMap[lookup] !== undefined ? weightMap[lookup] : token.value;
    },
  });

  // ─── Color opacity helper ──────────────────────────────────
  StyleDictionary.registerTransform({
    name: 'color/hexToRgba',
    type: 'value',
    matcher: (token) => {
      return (
        token.type === 'color' &&
        typeof token.value === 'string' &&
        token.value.startsWith('#') &&
        token.opacity !== undefined
      );
    },
    transformer: (token) => {
      const hex = token.value.replace('#', '');
      let r, g, b;
      if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16);
        g = parseInt(hex[1] + hex[1], 16);
        b = parseInt(hex[2] + hex[2], 16);
      } else {
        r = parseInt(hex.substring(0, 2), 16);
        g = parseInt(hex.substring(2, 4), 16);
        b = parseInt(hex.substring(4, 6), 16);
      }
      const a = parseFloat(token.opacity);
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    },
  });

  // ─── Custom transform group for CSS ────────────────────────
  StyleDictionary.registerTransformGroup({
    name: 'custom/css',
    transforms: [
      'attribute/cti',
      'name/cti/kebab',
      'size/pxToRem',
      'shadow/css',
      'fontWeight/number',
      'color/hexToRgba',
      'color/css',
    ],
  });

  // ─── Custom transform group for JS ─────────────────────────
  StyleDictionary.registerTransformGroup({
    name: 'custom/js',
    transforms: [
      'attribute/cti',
      'name/cti/camel',
      'shadow/css',
      'fontWeight/number',
      'color/hex',
    ],
  });
}

module.exports = { registerCustomTransforms };
