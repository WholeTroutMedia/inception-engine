---
description: Extract living, parameterized React code from Framer
---

# /framer-ingest <url>

Uses the unframer CLI to pull Framer components into the apps/console design system, extracting structural patterns and design tokens in the process.

## Steps

// turbo

1. Output status:
   > ðŸš€ **Ingesting Framer Component** â€” Fetching from `<url>`

// turbo
2. Run the ingest script:

   ```powershell
   npx tsx "C:\\Creative-Liberation-Engine\packages\design-agent\src\ingestion\framer.ts" "<url>" "C:\\Creative-Liberation-Engine\apps\console\src\components\framer"
   ```

1. Verify the output directory has the `.tsx` components and report success to the user:
   > âœ… **Success** â€” The Framer components have been downloaded to `apps/console/src/components/framer` and registered in the IE component registry.
