# Motion (formerly Framer Motion)

Motion is the definitive animation library for modern web applications. Rebranded from Framer Motion, it offers a powerful set of APIs for declarative animations, layout transitions, and scroll effects.

## Specifications
- **Package:** `motion` (or `framer-motion` for legacy React usage)
- **Support:** React, vanilla JS, Vue.

## Key Features
- **Layout Animations:** Automatically animate elements between states as they change size or position in the DOM.
- **Scroll Effects:** Tie animations directly to scroll progress with minimal code.
- **Performance:** Uses modern Web Animations API (WAAPI) where possible.
- **Size:** Independent `motion` module is highly tree-shakeable.

## Usage in Creative Liberation Engine
Motion is the fundamental building block for all dynamic interactions within the codebase. When MagicUI or Custom UI is implemented, it relies on Motion for the underlying spring physics and transition smoothing.
