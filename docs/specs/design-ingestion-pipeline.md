# Design Ingestion Pipeline Specification

**Version:** 1.0.0
**Workstream:** `console-ui`
**Reference Task:** `T20260309-787`

## 1. Executive Summary

Traditional AI-driven UI generation relies heavily on the LLM's internal (and often outdated) representation of what "good design" looks like. This leads to generic, "bootstrap-flavored" interfaces (e.g., standard Tailwind outputs).

The **Design Ingestion Pipeline** introduces a "Design RAG" (Retrieval-Augmented Generation) approach. Instead of generating from scratch, Creative Liberation Engine agents ground their generations in structured, high-quality reference patterns pulled dynamically from external sources like Framer, Mobbin, and live Figma files.

## 2. Ingestion Vectors

### 2.1 The Framer Vector (Phase 1)

- **Mechanism:** Integrates with the `unframer` CLI and React export plugins.
- **Objective:** Extract living, parameterized, framer-motion backed React code.
- **MCP Tool:** `design.extract_framer`
- **Output:** Fully isolated React components that can be mapped to Creative Liberation Engine design tokens.

### 2.2 The Mobbin Vector

- **Mechanism:** Pulls structured JSON metadata directly from the Mobbin API.
- **Objective:** Extract structural patterns (spacing, visual hierarchy, microcopy, component compositions) from world-class iOS and Web apps.
- **MCP Tool:** `design.extract_mobbin`
- **Output:** Generates a `HelixDescriptor` defining a UI composition layout.

### 2.3 The Vision Vector

- **Mechanism:** Utilizes the sovereign Comet browser combined with Gemini 2.5 Pro Multimodal.
- **Objective:** Reverse-engineer live URLs. The browser navigates to the target, captures semantic DOM state + screenshots, and the LLM maps it to our internal Component Registry.
- **MCP Tool:** `design.vision_reconstruct`
- **Output:** Skeletal React code matching the visual hierarchy.

## 3. Component Registry Integration

All ingested components flow into the native registry at `apps/console/src/registry`. This is not a headless CMS, but a strict TypeScript catalog that enforces our local design system onto the ingested vectors.

### 3.1 Flow

1. **Agent** calls `design.extract_framer`
2. **MCP Server** resolves the Framer asset into raw JSX/TSX.
3. **Agent** processes the raw JSX, stripping inline styles and mapping them to `@inception/design-tokens`.
4. **Agent** writes the finalized `IngestedComponent` into `apps/console`.
