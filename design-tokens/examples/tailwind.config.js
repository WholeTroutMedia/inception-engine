/**
 * tailwind.config.js — Example Tailwind configuration using Inception Engine design tokens
 *
 * After running `npm run build` in /design-tokens, the generated Tailwind
 * theme extension is at: design-tokens/dist/tailwind/tokens.js
 *
 * This file shows how to integrate it into your Tailwind project.
 */

const tokenTheme = require('../dist/tailwind/tokens');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],

  theme: {
    extend: {
      // Pull in all token-generated theme values
      ...tokenTheme,

      // You can also cherry-pick specific categories:
      // colors:             tokenTheme.colors,
      // spacing:            tokenTheme.spacing,
      // fontSize:           tokenTheme.fontSize,
      // borderRadius:       tokenTheme.borderRadius,
      // boxShadow:          tokenTheme.boxShadow,
      // transitionDuration: tokenTheme.transitionDuration,

      // Override or extend individual tokens:
      fontFamily: {
        sans:    ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono:    ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'monospace'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },

  plugins: [],
};

/* ---- Usage in markup ----

<!-- Colors via token-mapped utilities -->
<div class="bg-brand-primary text-text-onBrand">
  Brand banner
</div>

<!-- Spacing -->
<div class="p-4 mt-8">    <!-- 16px padding, 32px margin-top -->

<!-- Typography -->
<h1 class="text-4xl font-bold">Heading</h1>
<p class="text-base font-regular leading-normal">Body text</p>

<!-- Shadows -->
<div class="shadow-sm hover:shadow-md">Card</div>
<button class="shadow-brand">Brand button</button>

<!-- Border radius -->
<div class="rounded-xl">Card (12px)</div>
<img class="rounded-full" />  <!-- Circle avatar -->

<!-- Transitions -->
<button class="transition-all duration-fast ease-easeInOut">
  Animated button
</button>

*/
