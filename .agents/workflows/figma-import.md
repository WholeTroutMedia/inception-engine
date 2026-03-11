---
description: Pull a live Figma spec via Figma MCP and implement it directly — reads design tokens, layout, and components then writes production code
---

# /figma-import <figma-url>

Pull a live Figma file or frame directly into code. Extracts design tokens, layout structure, and component specs, then implements them in the target package.

**Activates on:**

- `/figma-import <figma-url>` — full file or specific frame URL
- `/figma-import <fileKey> [nodeId]` — direct key/node reference
- "implement this figma" / "pull from figma" / "import the figma spec"

---

## Steps

// turbo-all

1. **Parse Figma reference.** Extract from the user's input:
   - `fileKey` — the alphanumeric key from the Figma URL: `figma.com/design/<fileKey>/...`
   - `nodeId` — optional node ID from URL param `node-id=<nodeId>` (format: `1234:5678`)

   If a full URL is provided, parse it automatically.

2. **Fetch Figma data.**
   Call `mcp_figma-dev-mode-mcp-server_get_figma_data` with:
   - `fileKey`: extracted from step 1
   - `nodeId`: if provided (omit for full file)

   This returns the complete layout tree, component structure, design tokens, and visual properties.

3. **Extract design tokens.** From the Figma data, identify:
   - Color styles → document the raw hex/rgba values to establish a fresh palette
   - Typography styles → font family, size, weight, line height
   - Spacing / border radius / shadow values
   - Component variants and states

4. **Download assets.** For any image fills or icon nodes found in step 2:
   Call `mcp_figma-dev-mode-mcp-server_download_figma_images` with the relevant `nodeId`s.
   Save to `packages/console-ui/public/assets/figma/`.

5. **Determine target package** from workstream context:
   - `console-ui` → `packages/console-ui/src/`
   - `zero-day` → `packages/zero-day/client-portal/`
   - `comet-browser` → `services/comet/src/`
   - Other → ask once

6. **Implement the spec.** Write production TypeScript/React components:
   - One file per top-level Figma frame or component
   - Define fresh CSS variables/design tokens based purely on the Figma file's exact specifications
   - Add `// figma-import: <fileKey>/<nodeId>` comment at top of each generated file for traceability

7. **Report.**

   ```
   ✅ /figma-import complete

   FILE        <figma file name>
   NODE        <node name or "full file">
   COMPONENTS  <N> generated
   ASSETS      <N> downloaded

   Generated files:
   • <path/to/Component1.tsx>
   • <path/to/Component2.tsx>

   ─────────────────────────────────
   Next: /design to generate missing screens, or /release to ship
   ```

## Token Mapping Reference

When pulling from Figma, generate a fresh set of CSS properties based exactly on the Figma document's local or published styles. Do not attempt to fit them into a pre-existing palette—every design should start blank and fresh. Establish standard naming conventions based on the file's usage (e.g. `--color-primary`, `--color-surface-card`).

---

## Rules

- Always read the full Figma node before writing any code
- Never hardcode hex values if a design system token exists — use CSS variables
- If a Figma component conflicts with existing Creative Liberation Engine components, prefer the existing component and note the deviation
- Figma MCP requires authentication — if it fails with auth error, report: "Ensure Figma MCP is configured with a valid personal access token"
- Downloaded assets go to `public/assets/figma/` — never commit binary files to `src/`
