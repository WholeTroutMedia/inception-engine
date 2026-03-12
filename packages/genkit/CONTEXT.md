# CONTEXT — @cle/genkit

The AI orchestration layer for Creative Liberation Engine v5 GENESIS. Provides typed Genkit flows for all AVERI agents and exposes them as an HTTP API.

## Purpose

Wraps Google Firebase Genkit to provide:

- Constitutional middleware (all prompts reviewed before execution)
- Multi-provider support (cloud, web research tier, local models)
- Typed flows for each AVERI agent (kstrigd, kstated, ARCH-CODEX, etc.)
- A standalone HTTP API server for other services to invoke flows

## Key Exports (src/index.ts)

- `veraFlow` — kstrigd analysis and memory operations
- `keeperFlow` — Knowledge retrieval and pattern matching
- `archCodexFlow` — Code archaeology and architecture analysis
- `generateProxies()` — Generates typed proxy stubs for all flows

## Key Files

```
src/flows/kstrigd.ts        — kstrigd agent flow
src/flows/kstated.ts      — kstated agent flow  
src/flows/arch-codex.ts  — ARCH-CODEX agent flow
src/server.ts            — HTTP API server (Express + Genkit)
generate_proxies.ts      — Proxy generation script
```

## API Server

- Port: `4001` (default)
- Base route: `/api/flows/`
- Each flow available at: `POST /api/flows/[flowName]`
- Health check: `GET /health`

## Running

```powershell
# Dev mode
npm run dev --prefix packages/genkit

# Generate proxy stubs
npx ts-node packages/genkit/generate_proxies.ts
```

## Dependencies

- `@genkit-ai/core` — Genkit framework
- `@genkit-ai/googleai` — Gemini provider
- `@cle/cle-core` — Shared types
