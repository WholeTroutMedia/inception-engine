# Zero Day Execution â€” Full Audit

**Doctrine:** A person who has never heard of Creative Liberation Engine can use the thing right now, from their phone, without any setup.

**Rules:** Requires specific network â†’ not shipped. API calls use 192.168.x.x â†’ not shipped. nginx not applied â†’ not shipped. Only works on build machine â†’ not shipped.

---

## Client-facing (must never ship 192.168 or unreachable localhost)

| Location | Issue | Remediation |
|----------|--------|-------------|
| `apps/console/src/pages/CreativeWorkstation.tsx` | `NAS_CAMPAIGN_URL = 'http://127.0.0.1:4006'` | Use `VITE_CAMPAIGN_URL` only; remove NAS hardcode. Prod build must set public URL. |
| `apps/console/src/pages/FlowExplorer.tsx` | `VITE_GENKIT_URL ?? 'http://localhost:4100'` | Keep; document that prod sets VITE_GENKIT_URL to public Genkit URL. |
| `apps/console/src/pages/CometPage.tsx` | `VITE_GATEWAY_URL ?? 'http://localhost:3080'` | Same; prod env required. |
| `apps/console/src/pages/Settings.tsx` | Defaults localhost:4000, localhost:8080 | Persist user override; prod defaults from env. |
| `apps/threshold/src/nexus.js` | `DISPATCH_BASE = 'http://127.0.0.1:5050'` | **FIX:** `process.env.VITE_DISPATCH_URL` or `import.meta.env.VITE_DISPATCH_URL`; no 192.168 default. |
| `packages/inception-agent-extension/public/manifest.json` | `host_permissions: ["http://127.0.0.1:5050/*"]` | **FIX:** Build-time env injects public dispatch URL; or add `https://*dispatch*/*` and read URL from storage. |
| `packages/inception-agent-extension/src/popup.ts` | `DISPATCH_BASE = 'http://127.0.0.1:5050'` | **FIX:** From storage or build env (e.g. `import.meta.env.VITE_DISPATCH_URL`). |
| `packages/inception-agent-extension/src/background.ts` | `DISPATCH_BASE = 'http://127.0.0.1:5050'` | **FIX:** Same. |
| `packages/inception-agent-extension/dist-firefox/background.js` | Hardcoded 192.168 (built artifact) | Rebuild with env; do not commit built dist with private IP. |
| `packages/inception-browser/src/dispatch-heartbeat.ts` | `DISPATCH_URL = 'http://127.0.0.1:5050'` | **FIX:** `process.env.DISPATCH_URL ?? 'http://localhost:5050'` (server-side only; client never runs this). |
| `packages/inception-browser/src/intelligence/action-planner.ts` | `GENKIT_NAS_URL = "http://127.0.0.1:4100"` | **FIX:** `process.env.GENKIT_URL ?? 'http://localhost:4100'`. |
| `packages/zero-day/src/ui/IntakePage.tsx` | `NEXT_PUBLIC_GENKIT_URL ?? 'http://localhost:4100'` | OK; prod must set NEXT_PUBLIC_GENKIT_URL to public URL. |
| `ecosystem/jaymee-app` | Uses NEXT_PUBLIC_ZERO_DAY_URL (Cloud Run) | OK. |
| `ecosystem/creative-liberation-engine/apps/console` | DispatchCenter.tsx hardcodes 127.0.0.1:5050 | **FIX:** Env-based; sync from brainchild-v5. |
| `ecosystem/creative-liberation-engine/apps/console Walkthrough.tsx` | Forgejo links 127.0.0.1 | Internal only or replace with public git URL for public build. |

---

## Server-side (env required for public deploy; 192.168 OK for internal/NAS)

| Location | Current default | Zero-day note |
|----------|-----------------|---------------|
| `packages/genkit/src/flows/a2a-orchestration.ts` | DISPATCH_URL 127.0.0.1:5050 | Set DISPATCH_URL in Cloud Run / public deploy. |
| `packages/genkit/src/server.ts` | CHROMADB_URL 127.0.0.1:8000 | Internal; public deploy uses own Chroma or env. |
| `packages/claude-agent` | DISPATCH_SERVER 127.0.0.1:5050 | Dev/NAS default; public runner sets env. |
| `packages/capability-watcher` | DISPATCH_URL 127.0.0.1:5050 | Same. |
| `packages/cowork-bridge` | DISPATCH_URL 127.0.0.1:5050 | Same. |
| `packages/director` | DISPATCH_URL 127.0.0.1:5050 | Same. |
| `packages/genkit/src/dira/metrics.ts` | DISPATCH_URL 127.0.0.1:5050 | Same. |
| `packages/mcp-fetch-proxy` | DISPATCH_URL, GENKIT_URL 192.168 | Same. |
| `packages/zero-day/src/server.ts` | DISPATCH_URL 127.0.0.1:5050 | Same. |
| `packages/agents/src/scribe.ts` | 127.0.0.1:4100 | Server-side; set GENKIT_URL for public. |
| `packages/forge/src/ledger.ts` | REDIS 127.0.0.1:6379 | Internal; public deploy sets REDIS_URL. |
| `packages/wire-ingestion-mcp` | REDIS 127.0.0.1:6379 | Same. |
| `packages/zero-day/src/contracts/retainer-acceptance.ts` | NAS_MCP_URL 127.0.0.1:3001 | Internal or env. |
| `packages/mcp-servers/inception-dispatch` | IE_DISPATCH_API 127.0.0.1:4800 | Same. |
| `packages/mcp-servers/inception-registry` | IE_DISPATCH_URL 127.0.0.1:5050 | Same. |
| `packages/sovereign-mesh` | DISPATCH_BASE 127.0.0.1:5050 | Same. |
| `packages/ie-terminal` | GENKIT_URL 127.0.0.1:4100 | CLI; user or env. |

---

## Validation commands

```bash
# 1. No 192.168 in client bundles (after build)
grep -r "192\.168" apps/console/dist packages/inception-agent-extension/dist* 2>/dev/null && echo "FAIL: 192.168 in client bundle" || echo "PASS"

# 2. TypeScript
pnpm -r exec -- npx tsc --noEmit 2>/dev/null; echo $?

# 3. Zero-day checklist (manual)
# - [ ] Static app on Firebase or nginx; curl from external
# - [ ] All API URLs in JS point to public URLs in prod build
# - [ ] Verified from 5G / outside LAN
```

---

## Execution log (2026-03-10)

- **docs/ZERO_DAY.md** â€” Added: deployment checklist, public URL table, client env matrix, validation commands.
- **apps/console** â€” Introduced `config/env.ts` (DISPATCH_URL, GENKIT_URL, CAMPAIGN_URL, GATEWAY_URL, FORGE_URL, API_BASE, FORGEJO_SOURCE_URL). Replaced all 192.168 and hardcoded NAS URLs in Dashboard, DispatchCenter, ServiceScanner, DIRADashboard, CampaignControl, CreativeWorkstation, EngineStatusGrid, PipelineGraph, CloudMeshPage, Walkthrough, Welcome, useServiceHealth.
- **apps/threshold** â€” nexus.js: DISPATCH_BASE from `window.__DISPATCH_URL__` or localhost.
- **packages/inception-browser** â€” dispatch-heartbeat, action-planner, vera-bridge, vision-model: DISPATCH_URL / GENKIT_URL from env; no 192.168.
- **packages/inception-agent-extension** â€” manifest.json & manifest.firefox.json: host_permissions use localhost + https patterns; popup/background use localhost defaults; Open Console link â†’ localhost:3000. **Rebuild dist-firefox** so built artifacts no longer contain 192.168.

*Last updated: 2026-03-10. Re-run audit after any new client app or package.*
