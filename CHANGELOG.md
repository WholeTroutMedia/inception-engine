# Changelog

## v5.1.0-COMMUNITY — 2026-03-11

### `packages/genkit` — genkit

### ✨ New
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- GTM intake + analytics updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- ship The Transmission — autonomous infinity story (genkit flow + daemon + web app)
- complete the circle — live health prober, intelligent router, dashboard wired to real data
- add innerVoice flow + HTTP route for Sandbar Stream Inner Voice AI
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- sovereign local LLM stack
- add FORGE forgeGetAsset tool + forgeTools barrel [T20260309-492]
- add HTTP API server + Genkit tool bindings for asset economy
- implement zero-day live revenue dashboard and fix auth coupling
- hot-reload capability signal for Inception Engine instruction layer
- ship wire-ingestion-mcp — universal live data layer
- Always-on server management — PM2 ecosystem + start-all.ps1
- Cloud Run antigravity public + registry update
- Wave 32 Design Ingestion Pipeline and Registry
- Wave 32 Design Ingestion Pipeline
- BarnstormStudio TEMPO+FUSER+API + Firebase AuthGuard wired in Console [W26]
- AVERI Mobile PWA — context-enriched iPhone AI interface
- ship NBC NEXUS spatial control room prototype
- AI flow updates — packages/genkit/src/plugins/perplexity.js, packages/genkit/src/plugins/vertex-ai.js, packages/genkit/src/config/model-registry.d.ts, packages/genkit/src/config/model-registry.d.ts.map
- AI flow updates — packages/genkit/src/server.ts
- AI flow updates — packages/genkit/src/config/model-registry.ts
- AI flow updates — packages/genkit/src/flows/birdWatcher.ts, packages/genkit/src/flows/guestIntelligence.ts, packages/genkit/src/flows/strangerAlert.ts
- AI flow updates — packages/genkit/src/index.ts, packages/genkit/src/local-providers.ts
- AI flow updates — packages/genkit/src/middleware/smart-router.ts
- AI flow updates — packages/genkit/src/config/
- AI flow updates — packages/genkit/src/server.ts
- AI flow updates — packages/genkit/src/index.ts
- AI flow updates — packages/genkit/src/middleware/smart-router.ts
- AI flow updates — packages/genkit/src/flows/a2a-orchestration.ts
- AI flow updates — packages/genkit/src/creative-dna-vectors.ts
- DIRA Panel, sensor-mesh barrel, zero-day UI/analytics wiring [window Q]
- wire DIRA tab + Zero-Day intake page into Console
- DIRA dashboard, Zero-Day GTM intake UI, PostHog analytics
- spatial web integration complete
- ORACLE context system + photography phase 3-5
- T20260308-832 Phase 7a MVP implementation
- add productionCaseToScribeInput mapper -- unified DIRA->SCRIBE tag contract (#4)
- implement Airbyte ingestion background worker to Chromadb
- add CreatorSidebar and CreatorProductivityDashboard components
- SC-04 KEEPER v2 boot protocol w/ HANDOFF.md task-aware recall
- SCRIBE v2 memory layer + MCP Autoloader
- 5-helix sprint — MCP-05/06/07 + TOOL-01/02/03 + COMET dispatch
- DIRA auto-resolve engine — DIRA-01, DIRA-02, DIRA-03 [partial]
- SC-05 wire scribe tools into AVERI flows + SC-06 integration tests
- complete SCRIBE v2 + MCP Router epics [SC-01..06, MCP-01..04]
- scaffold MCP Router package + claim tasks [T20260307-772, T20260307-886]
- SCRIBE v2 context-pager + keeper-boot scaffolds, ghost updates, pnpm lockfile sync
- design-agent scanner, god-prompt pipelines, ghost SEO, genkit tsconfig cleanup, linter fixes [multi-helix]
- parallelize inception engine execution
- agent runtime implementations + genkit + css updates
- update flow index exports, inception-core index, EngineStatusGrid component
- director-agent flow, ie-engine flows, task-graph types, engine-registry types, FlowExplorer update
- AJV token tier validator + complete primitive tokens
- complete primitive tokens + scaffold service Dockerfiles
- add genmedia server.ts HTTP layer, fix Dockerfile CMD, fix design-tokens build config, create Dockerfile.antigravity (Task T20260306-706 complete)
- setup antigravity-nas daemon and DinD infrastructure
- compile and integration fixes for daemon and zero-day pub/sub (T20260306-[706,601,328,513])
- ship NAS watcher deploy and TRINITY-1 verification
- vertex-ai plugin, docker-compose expansion, genkit server updates
- wire GDrive MCP brief upload + docker-compose env fixes [T20260306-022]
- TS audit + multi-package shipping pass
- add comet consumer, memory flow, gdrive-client, and stripe publisher
- all-green dashboard — live service health hook, NeuralMonitor real endpoints, CampaignControl live status, dispatch activity feed [T20260306-012]
- Redis pub/sub auto-chain — brief.created fires on intake complete, campaign auto-executes [T20260306-011]
- wire CreativeDirector, generate-media, and score endpoints into genkit server
- AGENTS.md, .agents rules, dispatch board, CONTEXT.md in key packages

### 🔧 Fixes
- inject TRANSMISSION_MODEL via env — Article VI compliance
- clean git state — config/env module, vera-bridge, engine grid, agent-extension; exclude workspace-mcp nested repo
- resolve all CI typecheck failures across 7 packages
- unify tag contract via productionCaseToScribeInput (Issue #4 F3)
- store category/importance as metadata, add where clause to recall (Issue #5 F1/F2)
- use createRequire() for JSON import compat with Node ESM
- eliminate all eslint errors and warnings across console and UI packages
- resolve ts errors in genkit and genmedia flows
- filter undefined/duplicate plugins before genkit() call to prevent Plugin undefined already registered crash
- remove ZeroDayGtmSwarmFlow re-export from index.ts to break ESM circular dependency causing ai TDZ crash loop
- break circular ESM import in circuit-breaker.ts — import LOCAL_MODELS from local-providers.js instead of index.js barrel to resolve TDZ crash
- add @inception/auth to genkit + god-prompt Dockerfiles to resolve ERR_MODULE_NOT_FOUND at runtime
- fix genkit TSX monorepo resolution and ghost missing xml2js dependency

### 🔩 Other
- rename Inception Engine and Antigravity to CLE globally
- miscellaneous updates
- helix: complete A/F/G — AVERI critique, sovereign inference, foley intelligence
- helix: ship 9-helix creative superiority build — tsc clean
- Auto-commit: Getting git down to zero
- trigger full NAS deployment and sync all undeployed changes
- update registry for wave 26 completion
- merge remote genkit changes [W27]
- stage workspace changes — pnpm-lock, ecosystem updates, Wave 24 GTM boot
- stage all pending changes — console, auth, genkit server, memory pkg, pnpm-lock, velocity telemetry page
- restored nbc nexus stashed modifications
- fix all typescript errors and css warnings for genesis stack validation
- clean gitignore + sweep all multi-helix sprint output
- fix console typings and linting issues
- stage console, design-sandbox, and genkit changes
- remove T20260306-A3 from active queue
- sync all active windows — multi-instance batch commit
- update startup banner with campaign endpoints

### `packages/inception-core` — inception-core

### ✨ New
- ship The Transmission — autonomous infinity story (genkit flow + daemon + web app)
- hot-reload capability signal for Inception Engine instruction layer
- final delivery of multi-window warp tasks
- update flow index exports, inception-core index, EngineStatusGrid component
- director-agent flow, ie-engine flows, task-graph types, engine-registry types, FlowExplorer update
- TS audit + multi-package shipping pass
- build system + tests passing (T20260306-015)
- Redis pub/sub auto-chain — brief.created fires on intake complete, campaign auto-executes [T20260306-011]
- add IDEATE, SHIP, VALIDATE, SCRIBE skill files + update dispatch queue
- AGENTS.md, .agents rules, dispatch board, CONTEXT.md in key packages

### 🔧 Fixes
- clean git state — config/env module, vera-bridge, engine grid, agent-extension; exclude workspace-mcp nested repo

### 🔩 Other
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates — packages/inception-core/src/index.ts, packages/mcp-fetch-proxy/src/mcp-server.ts, packages/scribe-mcp/src/mcp-server.ts
- miscellaneous updates — packages/inception-core/tsconfig.json, packages/mcp-fetch-proxy/package.json, packages/mcp-router/package.json, packages/mcp-router/src/mcp-server.ts
- miscellaneous updates — packages/inception-core/src/types/home-mesh.ts, packages/sovereign-home-mesh/
- miscellaneous updates — packages/inception-core/src/index.ts
- miscellaneous updates — packages/inception-core/src/types/psi.ts
- clean gitignore + sweep all multi-helix sprint output
- remove T20260306-A3 from active queue
- sync all active windows — multi-instance batch commit

### `packages/dispatch` — dispatch

### ✨ New
- server + task routing updates
- server + task routing updates
- server + task routing updates
- wire cloud mesh health monitor, auto-boot router from env, FORGE in genesis CI
- add FORGE forgeGetAsset tool + forgeTools barrel [T20260309-492]
- hot-reload capability signal for Inception Engine instruction layer
- server updates — packages/dispatch/package.json
- server updates — packages/dispatch/src/server.ts
- server updates — packages/dispatch/src/fetch-proxy-endpoint.ts
- server updates — packages/dispatch/src/server.ts
- server updates — packages/dispatch/src/server.ts
- server updates — packages/dispatch/src/server.ts
- server updates — packages/dispatch/src/server.ts
- ALFRED chat widget, client gallery, dispatch server
- autonomous agent infrastructure — BLOCKER protocol, auto-loop, /api/tasks/next, Windows multipliers
- ORACLE context system + photography phase 3-5
- TaskQueue with priority routing + agent capability matching #75
- complete multi-helix sprint P1
- add inception-dispatch MCP server — task routing via stdio #30
- FirstMission workflow, Ambient Dashboard, promotion gate
- agent runtime implementations + genkit + css updates
- ServiceScanner, SetupWizard, complete component schemas, new package indexes
- scaffold Dockerfiles for agents, auth, theme-engine service packages
- add genmedia server.ts HTTP layer, fix Dockerfile CMD, fix design-tokens build config, create Dockerfile.antigravity (Task T20260306-706 complete)
- migrate store from JSON files to SQLite (WAL mode)
- add force_complete tool + POST /api/tasks/:id/resolve endpoint
- compile and integration fixes for daemon and zero-day pub/sub (T20260306-[706,601,328,513])
- fix daemon REST dispatch claim & sync server api
- ship NAS watcher deploy and TRINITY-1 verification
- real-time window heartbeat system
- TS audit + multi-package shipping pass
- all-green dashboard — live service health hook, NeuralMonitor real endpoints, CampaignControl live status, dispatch activity feed [T20260306-012]
- add IDEATE, SHIP, VALIDATE, SCRIBE skill files + update dispatch queue
- Universal Agent Dispatch Network - Phase 1+2+3

### 🔧 Fixes
- make Docker build self-contained for NAS deployment
- compile TS in Docker — remove dependency on pre-built /build dir

### 🔩 Other
- Wave 22: Introduce strict unit testing for media engines
- validate(dispatch): 20 vitest cases for TaskQueue #80
- finalize Wave 8 handoff
- clean gitignore + sweep all multi-helix sprint output
- remove T20260306-A3 from active queue
- sync all active windows — multi-instance batch commit

### `packages/auth` — auth

### ✨ New
- implement zero-day live revenue dashboard and fix auth coupling
- 3-helix GTM sprint — PostHog tests + RoleGuard partner role + requireRole [AVERI/W26]
- #93 AVERI Memory Service + #94 Context Compaction + #96 Edge Inference Gateway [W25]
- full creative mobile app — Atelier design language
- firebase singleton init + multi-tenant auth contract tests [AVERI/W25-prep]
- 3-helix parallel test coverage — Chronos + Firebase Auth + MCP Fetch Proxy
- GTM Live Analytics + Chronos VisionOS + VelocityTelemetry
- GTM Live Analytics + Chronos VisionOS + VelocityTelemetry
- Zero-day implementation of BLE tracker and Living Canvas SSE
- 4-helix GTM sprint — Firebase Auth, MCP Fetch Proxy, Gitea Race Fix, Chat Console
- scaffold Dockerfiles for agents, auth, theme-engine service packages
- TS audit + multi-package shipping pass

### 🔩 Other
- miscellaneous updates
- Auto-commit: Getting git down to zero
- miscellaneous updates
- miscellaneous updates
- stage all pending changes — console, auth, genkit server, memory pkg, pnpm-lock, velocity telemetry page
- miscellaneous updates — packages/auth/src/index.ts
- miscellaneous updates — packages/auth/src/index.ts
- miscellaneous updates — packages/claude-agent/src/executor.d.ts, packages/claude-agent/src/index.d.ts, packages/claude-agent/src/types.d.ts, packages/auth/src/hooks/useAuth.d.ts
- miscellaneous updates — packages/auth/package-lock.json, packages/auth/package.json, packages/auth/src/lib/firebase.ts
- miscellaneous updates — packages/auth/src/env.d.ts
- miscellaneous updates — packages/auth/package-lock.json, packages/auth/package.json
- miscellaneous updates — packages/auth/src/lib/firebase.ts, packages/mcp-fetch-proxy/tsconfig.json
- miscellaneous updates — packages/auth/src/lib/firebase.ts, packages/mcp-fetch-proxy/tsconfig.json
- miscellaneous updates — packages/auth/package.json, packages/auth/package-lock.json
- miscellaneous updates — packages/auth/src/index.ts, packages/mcp-router/src/index.ts, packages/mcp-fetch-proxy/docker-compose.yml, packages/mcp-fetch-proxy/tsconfig.json
- miscellaneous updates — packages/auth/src/firebase.ts, packages/auth/src/components/, packages/auth/src/contexts/, packages/auth/src/hooks/
- miscellaneous updates — packages/auth/src/firebase.ts, packages/auth/tsconfig.json, packages/auth/src/lib/, packages/mcp-fetch-proxy/src/
- miscellaneous updates — packages/auth/tsconfig.json
- miscellaneous updates — packages/auth/package.json, packages/mcp-fetch-proxy/
- miscellaneous updates — infra/forgejo/docker-compose.yml, packages/auth/package.json, packages/auth/tsconfig.json
- miscellaneous updates — packages/auth/src/index.ts, packages/mcp-router/src/index.ts, packages/comet/src/proxy-server.ts
- miscellaneous updates — packages/auth/src/AuthGuard.tsx, packages/auth/src/firebase.ts, packages/comet/src/fetch-proxy.ts, packages/mcp-router/src/fetch-proxy.ts
- miscellaneous updates — packages/auth/src/AuthContext.tsx
- miscellaneous updates — packages/auth/src/firebase-auth.ts
- clean gitignore + sweep all multi-helix sprint output

### `packages/mcp-fetch-proxy` — mcp-fetch-proxy

### ✨ New
- GTM Live Analytics + Chronos VisionOS + VelocityTelemetry

### 🔧 Fixes
- make Docker build self-contained for NAS deployment

### 🔩 Other
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- Wave 21: Fix orchestrator AgentRouter test + verify T20260309-216 Wave 18 helices
- miscellaneous updates — packages/inception-core/src/index.ts, packages/mcp-fetch-proxy/src/mcp-server.ts, packages/scribe-mcp/src/mcp-server.ts
- miscellaneous updates — packages/inception-core/tsconfig.json, packages/mcp-fetch-proxy/package.json, packages/mcp-router/package.json, packages/mcp-router/src/mcp-server.ts
- miscellaneous updates — packages/mcp-fetch-proxy/package-lock.json, packages/mcp-router/package-lock.json
- miscellaneous updates — packages/mcp-fetch-proxy/package-lock.json, packages/mcp-fetch-proxy/package.json, packages/mcp-router/package-lock.json, packages/mcp-router/package.json
- miscellaneous updates — packages/mcp-fetch-proxy/src/mcp-server.ts, packages/mcp-router/src/mcp-server.ts, tmp-dna-check.mjs
- miscellaneous updates — packages/mcp-fetch-proxy/src/mcp-server.ts, packages/mcp-router/src/mcp-server.ts, packages/sovereign-home-mesh/src/routes/guests.ts, packages/sovereign-home-mesh/src/routes/intel.ts
- miscellaneous updates — packages/mcp-fetch-proxy/tsconfig.json
- miscellaneous updates — packages/mcp-fetch-proxy/package.json, packages/mcp-fetch-proxy/package-lock.json
- miscellaneous updates — packages/auth/src/lib/firebase.ts, packages/mcp-fetch-proxy/tsconfig.json
- miscellaneous updates — packages/auth/src/lib/firebase.ts, packages/mcp-fetch-proxy/tsconfig.json
- miscellaneous updates — packages/mcp-fetch-proxy/Dockerfile
- miscellaneous updates — packages/auth/src/index.ts, packages/mcp-router/src/index.ts, packages/mcp-fetch-proxy/docker-compose.yml, packages/mcp-fetch-proxy/tsconfig.json
- miscellaneous updates — packages/auth/src/firebase.ts, packages/auth/tsconfig.json, packages/auth/src/lib/, packages/mcp-fetch-proxy/src/
- miscellaneous updates — packages/auth/package.json, packages/mcp-fetch-proxy/

### `packages/sovereign-mesh` — sovereign-mesh

### ✨ New
- Always-on server management — PM2 ecosystem + start-all.ps1
- replace Twilio with Telnyx sovereign SMS + Gmail OAuth2 integration
- Wave 33 — Sovereign Mesh Intelligence Layer (Phase 1 of Sovereign Fabric)

### 🔩 Other
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates

### `packages/sensor-mesh` — sensor-mesh

### ✨ New
- bridge + mesh updates
- bridge + mesh updates
- Wave 30 parallel execution (iPhone Sensor Node, NEXUS Spatial Workspace MCP)
- ZigSimBridge update + ecosystem sync
- ORACLE context system + photography phase 3-5
- ship 4-helix integration tests + UE5 OSC asset generator
- activate cloud layer, MCP dynamic loading, somatic T3, SIGNAL dashboard

### 🔧 Fixes
- install @types/node, restore types config, fix JSDoc regex misparse in BiometricBridge
- clean up tsconfig types array — @types/node resolved via monorepo root

### 🔩 Other
- ﻿feat(wave-12): finalize construction and verification of Wave 12 multi-helix

### `packages/workspace-mcp` — workspace-mcp

### 🔧 Fixes
- rewrite Dashboard.tsx — fix duplicate state, broken checkService, missing refs (tsc clean)

### `packages/scribe-mcp` — scribe-mcp

### ✨ New
- Implement Phase 1 of Math LoRA Autonomous Learning Architecture intercept and training logger
- add package.json with MCP SDK dependency
- add inception-scribe MCP server — remember, recall, context, forget, handoff (Phas

### 🔩 Other
- miscellaneous updates
- miscellaneous updates
- Wave 22: Introduce strict unit testing for media engines
- Wave 21: Fix orchestrator AgentRouter test + verify T20260309-216 Wave 18 helices
- miscellaneous updates — packages/inception-core/src/index.ts, packages/mcp-fetch-proxy/src/mcp-server.ts, packages/scribe-mcp/src/mcp-server.ts
- Add packages/scribe-mcp/tsconfig.json

### `packages/forge` — forge

### ✨ New
- wire cloud mesh health monitor, auto-boot router from env, FORGE in genesis CI
- add FORGE forgeGetAsset tool + forgeTools barrel [T20260309-492]
- ship FORGE API server to genesis stack (T20260309-492)
- add HTTP API server + Genkit tool bindings for asset economy
- ship n8n-bridge, skills, ie-terminal, shard-v2, agent-spawner as MCP servers
- 3-helix execution — FORGE economy + wire ingestion + GTM injection
- init FORGE Real-Time Asset Economy — types, package scaffold
- ship wire-ingestion-mcp — universal live data layer
- Always-on server management — PM2 ecosystem + start-all.ps1

### ⚡ Improvements
- add FORGE .dockerignore — exclude node_modules/.git/models from build context

### 🔧 Fixes
- resolve all CI typecheck failures across 7 packages
- FORGE Dockerfile monorepo-root context — fix cloud-mesh build in NAS CI

### 🔩 Other
- miscellaneous updates
- miscellaneous updates

### `apps/console` — console

### ✨ New
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- complete the circle — live health prober, intelligent router, dashboard wired to real data
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- wire cloud mesh health monitor, auto-boot router from env, FORGE in genesis CI
- add FORGE forgeGetAsset tool + forgeTools barrel [T20260309-492]
- ship GTM Analytics Dashboard + AtlasLiveClient [T20260309-702]
- ship n8n-bridge, skills, ie-terminal, shard-v2, agent-spawner as MCP servers
- implement zero-day live revenue dashboard and fix auth coupling
- Live CRM data in both GTM dashboards — multi-helix wiring
- Financial Command Center — infra cost breakdown + Zero-Day pipeline + next-money actions
- Wave 33 — Sovereign Mesh Intelligence Layer (Phase 1 of Sovereign Fabric)
- Zero-Day GTM 3-helix parallel execution - ProspectPipeline Genkit flow + CRMSyncService + LeadScoringDashboard
- 3-helix parallel execution
- commit all pending changes - console App, zero-day lead-scoring, ecosystem submodules [Zero-Day GTM]
- console App.tsx update + zero-day intelligence layer (lead-scoring + context engine)
- Wave 32 Design Ingestion Pipeline
- BarnstormStudio TEMPO+FUSER+API + Firebase AuthGuard wired in Console [W26]
- [Wave 19 - Helix C] wire PostHog frontend telemetry to client portal UI
- integrate posthog frontend telemetry
- integrate zero-day provisioning dashboard link into client portal
- DIRA + UI wiring — apps/console/src/index.css
- DIRA + UI wiring — apps/console/src/contexts/AuthContext.tsx
- DIRA + UI wiring — apps/console/src/App.tsx, apps/console/src/main.tsx
- DIRA + UI wiring — apps/console/src/components/AuthGuard.tsx, apps/console/src/pages/ChatConsole.tsx
- DIRA + UI wiring — apps/console/src/contexts/
- DIRA + UI wiring — apps/console/src/pages/DispatchCenter.tsx
- DIRA + UI wiring — apps/console/src/components/DIRADashboard.tsx
- DIRA + UI wiring — apps/console/package.json, packages/console/src/components/DiraPanel.tsx -> apps/console/src/components/DiraPanel.tsx
- wire DIRA tab + Zero-Day intake page into Console
- DIRA dashboard, Zero-Day GTM intake UI, PostHog analytics
- PWA + ntfy push notification bridge
- activate cloud layer, MCP dynamic loading, somatic T3, SIGNAL dashboard
- add service worker with push notification + offline support
- add PWA manifest for iOS home screen install
- implement Airbyte ingestion background worker to Chromadb
- parallelize inception engine execution
- integrate recharts into finance dashboard for sparklines
- implement design sandbox live token engine
- complete 4 parallel workstreams
- FirstMission workflow, Ambient Dashboard, promotion gate
- agent runtime implementations + genkit + css updates
- ServiceScanner, SetupWizard, complete component schemas, new package indexes
- scaffold Dockerfiles for agents, auth, theme-engine service packages
- update flow index exports, inception-core index, EngineStatusGrid component
- director-agent flow, ie-engine flows, task-graph types, engine-registry types, FlowExplorer update
- complete primitive tokens + scaffold service Dockerfiles
- complete CVA token layer + fix design-tokens package exports
- NAS daemon execution + docker-compose + onboarding CSS
- multi-stage production Dockerfile for autonomous genesis node
- implement Phase 3-6 onboarding flow
- implement Phase 1 and 2 onboarding selectors
- integrate Phase 0 ambient welcome flow
- add missing UI components, sync tokens, and config updates
- complete JSON schema validator and UI package scaffolding (fixes #T-181, #T-258)
- add genmedia server.ts HTTP layer, fix Dockerfile CMD, fix design-tokens build config, create Dockerfile.antigravity (Task T20260306-706 complete)
- setup antigravity-nas daemon and DinD infrastructure
- ship NAS watcher deploy and TRINITY-1 verification
- console pages, genmedia animation, blueprints deploy infra [TRINITY-1 W1]
- wire 4 unrouted pages — AnimationStudio /animation, Blueprints /blueprints, ClientDashboard /clients/:id, ZeroDayIntake /intake-form — add nav items for Animation + Blueprints
- add scribe-daemon upstream :9100 /scribe/ route + /provision pass-through; all 9 GENESIS services now behind gateway
- all-green dashboard — live service health hook, NeuralMonitor real endpoints, CampaignControl live status, dispatch activity feed [T20260306-012]
- Redis pub/sub auto-chain — brief.created fires on intake complete, campaign auto-executes [T20260306-011]
- Universal Agent Dispatch Network - Phase 1+2+3
- Console deployed to NAS via Docker
- campaign service fully integrated into GENESIS stack
- Creative OS — 4 helices shipped [GENESIS wave]

### 🔧 Fixes
- clean git state — config/env module, vera-bridge, engine grid, agent-extension; exclude workspace-mcp nested repo
- fix all TS compile errors in Dashboard, DiraPanel, ThePanopticon
- fix all TS compile errors — Dashboard, DiraPanel, ThePanopticon
- resolve TS build panics and missing ReactFlow imports
- rewrite Dashboard.tsx — fix duplicate state, broken checkService, missing refs (tsc clean)
- eliminate all eslint errors and warnings across console and UI packages
- resolve ts errors in genkit and genmedia flows
- resolve NOT NULL constraint failures in dispatch server and update better-sqlite3
- align barrel exports with actual source — BriefSubscriber, DAG executor, schema types, runCompassValidation
- correct ZeroDayIntake provision endpoint path + nginx route
- genkit upstream port 4000->4100; feat(console): add Blueprints to Dashboard health monitor
- resolve all pre-existing TS errors in server.ts — notifier API, ECHO types, portal routes, Stripe cast [T20260306-020]
- Dockerfile — use npm directly, not pnpm filter

### 🔩 Other
- stage all pending changes — console, auth, genkit server, memory pkg, pnpm-lock, velocity telemetry page
- scrub simulation nomenclature for zero day production release
- pnpm lockfile sync
- AGENTS.md updates
- merge: inception-engine sync — Dashboard + nas-watcher + zero-day deps
- sync Dashboard, tsconfig, memory package deps
- resolved agent-status conflict
- fix all typescript errors and css warnings for genesis stack validation
- clean gitignore + sweep all multi-helix sprint output
- style: add missing CSS modifier classes extracted from inline styles in CreativeWorkstation
- fix console typings and linting issues
- commit changes before multi-helix sprint
- finalize pending changes for parallel sprint
- [AVERI] Fix strict type and CSS inline style lint errors
- stage dirty working tree before multi-helix sprint
- stage console, design-sandbox, and genkit changes
- integrate theme engine tokens into console app and add pickup helper
- test(design-tokens): add round-trip integration test and fix syntax
-  fix: wrap root App in BrowserRouter to resolve useLocation crash
- remove T20260306-A3 from active queue
- sync all active windows — multi-instance batch commit

### `apps/event-intake` — event-intake

### ✨ New
- ship n8n-bridge, skills, ie-terminal, shard-v2, agent-spawner as MCP servers

### 🔩 Other
- miscellaneous updates
- miscellaneous updates


---

## v5.1.0-COMMUNITY — 2026-03-11

### `packages/genkit` — genkit

### ✨ New
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- GTM intake + analytics updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- ship The Transmission — autonomous infinity story (genkit flow + daemon + web app)
- complete the circle — live health prober, intelligent router, dashboard wired to real data
- add innerVoice flow + HTTP route for Sandbar Stream Inner Voice AI
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- sovereign local LLM stack
- add FORGE forgeGetAsset tool + forgeTools barrel [T20260309-492]
- add HTTP API server + Genkit tool bindings for asset economy
- implement zero-day live revenue dashboard and fix auth coupling
- hot-reload capability signal for Inception Engine instruction layer
- ship wire-ingestion-mcp — universal live data layer
- Always-on server management — PM2 ecosystem + start-all.ps1
- Cloud Run antigravity public + registry update
- Wave 32 Design Ingestion Pipeline and Registry
- Wave 32 Design Ingestion Pipeline
- BarnstormStudio TEMPO+FUSER+API + Firebase AuthGuard wired in Console [W26]
- AVERI Mobile PWA — context-enriched iPhone AI interface
- ship NBC NEXUS spatial control room prototype
- AI flow updates — packages/genkit/src/plugins/perplexity.js, packages/genkit/src/plugins/vertex-ai.js, packages/genkit/src/config/model-registry.d.ts, packages/genkit/src/config/model-registry.d.ts.map
- AI flow updates — packages/genkit/src/server.ts
- AI flow updates — packages/genkit/src/config/model-registry.ts
- AI flow updates — packages/genkit/src/flows/birdWatcher.ts, packages/genkit/src/flows/guestIntelligence.ts, packages/genkit/src/flows/strangerAlert.ts
- AI flow updates — packages/genkit/src/index.ts, packages/genkit/src/local-providers.ts
- AI flow updates — packages/genkit/src/middleware/smart-router.ts
- AI flow updates — packages/genkit/src/config/
- AI flow updates — packages/genkit/src/server.ts
- AI flow updates — packages/genkit/src/index.ts
- AI flow updates — packages/genkit/src/middleware/smart-router.ts
- AI flow updates — packages/genkit/src/flows/a2a-orchestration.ts
- AI flow updates — packages/genkit/src/creative-dna-vectors.ts
- DIRA Panel, sensor-mesh barrel, zero-day UI/analytics wiring [window Q]
- wire DIRA tab + Zero-Day intake page into Console
- DIRA dashboard, Zero-Day GTM intake UI, PostHog analytics
- spatial web integration complete
- ORACLE context system + photography phase 3-5
- T20260308-832 Phase 7a MVP implementation
- add productionCaseToScribeInput mapper -- unified DIRA->SCRIBE tag contract (#4)
- implement Airbyte ingestion background worker to Chromadb
- add CreatorSidebar and CreatorProductivityDashboard components
- SC-04 KEEPER v2 boot protocol w/ HANDOFF.md task-aware recall
- SCRIBE v2 memory layer + MCP Autoloader
- 5-helix sprint — MCP-05/06/07 + TOOL-01/02/03 + COMET dispatch
- DIRA auto-resolve engine — DIRA-01, DIRA-02, DIRA-03 [partial]
- SC-05 wire scribe tools into AVERI flows + SC-06 integration tests
- complete SCRIBE v2 + MCP Router epics [SC-01..06, MCP-01..04]
- scaffold MCP Router package + claim tasks [T20260307-772, T20260307-886]
- SCRIBE v2 context-pager + keeper-boot scaffolds, ghost updates, pnpm lockfile sync
- design-agent scanner, god-prompt pipelines, ghost SEO, genkit tsconfig cleanup, linter fixes [multi-helix]
- parallelize inception engine execution
- agent runtime implementations + genkit + css updates
- update flow index exports, inception-core index, EngineStatusGrid component
- director-agent flow, ie-engine flows, task-graph types, engine-registry types, FlowExplorer update
- AJV token tier validator + complete primitive tokens
- complete primitive tokens + scaffold service Dockerfiles
- add genmedia server.ts HTTP layer, fix Dockerfile CMD, fix design-tokens build config, create Dockerfile.antigravity (Task T20260306-706 complete)
- setup antigravity-nas daemon and DinD infrastructure
- compile and integration fixes for daemon and zero-day pub/sub (T20260306-[706,601,328,513])
- ship NAS watcher deploy and TRINITY-1 verification
- vertex-ai plugin, docker-compose expansion, genkit server updates
- wire GDrive MCP brief upload + docker-compose env fixes [T20260306-022]
- TS audit + multi-package shipping pass
- add comet consumer, memory flow, gdrive-client, and stripe publisher
- all-green dashboard — live service health hook, NeuralMonitor real endpoints, CampaignControl live status, dispatch activity feed [T20260306-012]
- Redis pub/sub auto-chain — brief.created fires on intake complete, campaign auto-executes [T20260306-011]
- wire CreativeDirector, generate-media, and score endpoints into genkit server
- AGENTS.md, .agents rules, dispatch board, CONTEXT.md in key packages

### 🔧 Fixes
- inject TRANSMISSION_MODEL via env — Article VI compliance
- clean git state — config/env module, vera-bridge, engine grid, agent-extension; exclude workspace-mcp nested repo
- resolve all CI typecheck failures across 7 packages
- unify tag contract via productionCaseToScribeInput (Issue #4 F3)
- store category/importance as metadata, add where clause to recall (Issue #5 F1/F2)
- use createRequire() for JSON import compat with Node ESM
- eliminate all eslint errors and warnings across console and UI packages
- resolve ts errors in genkit and genmedia flows
- filter undefined/duplicate plugins before genkit() call to prevent Plugin undefined already registered crash
- remove ZeroDayGtmSwarmFlow re-export from index.ts to break ESM circular dependency causing ai TDZ crash loop
- break circular ESM import in circuit-breaker.ts — import LOCAL_MODELS from local-providers.js instead of index.js barrel to resolve TDZ crash
- add @inception/auth to genkit + god-prompt Dockerfiles to resolve ERR_MODULE_NOT_FOUND at runtime
- fix genkit TSX monorepo resolution and ghost missing xml2js dependency

### 🔩 Other
- rename Inception Engine and Antigravity to CLE globally
- miscellaneous updates
- helix: complete A/F/G — AVERI critique, sovereign inference, foley intelligence
- helix: ship 9-helix creative superiority build — tsc clean
- Auto-commit: Getting git down to zero
- trigger full NAS deployment and sync all undeployed changes
- update registry for wave 26 completion
- merge remote genkit changes [W27]
- stage workspace changes — pnpm-lock, ecosystem updates, Wave 24 GTM boot
- stage all pending changes — console, auth, genkit server, memory pkg, pnpm-lock, velocity telemetry page
- restored nbc nexus stashed modifications
- fix all typescript errors and css warnings for genesis stack validation
- clean gitignore + sweep all multi-helix sprint output
- fix console typings and linting issues
- stage console, design-sandbox, and genkit changes
- remove T20260306-A3 from active queue
- sync all active windows — multi-instance batch commit
- update startup banner with campaign endpoints

### `packages/inception-core` — inception-core

### ✨ New
- ship The Transmission — autonomous infinity story (genkit flow + daemon + web app)
- hot-reload capability signal for Inception Engine instruction layer
- final delivery of multi-window warp tasks
- update flow index exports, inception-core index, EngineStatusGrid component
- director-agent flow, ie-engine flows, task-graph types, engine-registry types, FlowExplorer update
- TS audit + multi-package shipping pass
- build system + tests passing (T20260306-015)
- Redis pub/sub auto-chain — brief.created fires on intake complete, campaign auto-executes [T20260306-011]
- add IDEATE, SHIP, VALIDATE, SCRIBE skill files + update dispatch queue
- AGENTS.md, .agents rules, dispatch board, CONTEXT.md in key packages

### 🔧 Fixes
- clean git state — config/env module, vera-bridge, engine grid, agent-extension; exclude workspace-mcp nested repo

### 🔩 Other
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates — packages/inception-core/src/index.ts, packages/mcp-fetch-proxy/src/mcp-server.ts, packages/scribe-mcp/src/mcp-server.ts
- miscellaneous updates — packages/inception-core/tsconfig.json, packages/mcp-fetch-proxy/package.json, packages/mcp-router/package.json, packages/mcp-router/src/mcp-server.ts
- miscellaneous updates — packages/inception-core/src/types/home-mesh.ts, packages/sovereign-home-mesh/
- miscellaneous updates — packages/inception-core/src/index.ts
- miscellaneous updates — packages/inception-core/src/types/psi.ts
- clean gitignore + sweep all multi-helix sprint output
- remove T20260306-A3 from active queue
- sync all active windows — multi-instance batch commit

### `packages/dispatch` — dispatch

### ✨ New
- server + task routing updates
- server + task routing updates
- server + task routing updates
- wire cloud mesh health monitor, auto-boot router from env, FORGE in genesis CI
- add FORGE forgeGetAsset tool + forgeTools barrel [T20260309-492]
- hot-reload capability signal for Inception Engine instruction layer
- server updates — packages/dispatch/package.json
- server updates — packages/dispatch/src/server.ts
- server updates — packages/dispatch/src/fetch-proxy-endpoint.ts
- server updates — packages/dispatch/src/server.ts
- server updates — packages/dispatch/src/server.ts
- server updates — packages/dispatch/src/server.ts
- server updates — packages/dispatch/src/server.ts
- ALFRED chat widget, client gallery, dispatch server
- autonomous agent infrastructure — BLOCKER protocol, auto-loop, /api/tasks/next, Windows multipliers
- ORACLE context system + photography phase 3-5
- TaskQueue with priority routing + agent capability matching #75
- complete multi-helix sprint P1
- add inception-dispatch MCP server — task routing via stdio #30
- FirstMission workflow, Ambient Dashboard, promotion gate
- agent runtime implementations + genkit + css updates
- ServiceScanner, SetupWizard, complete component schemas, new package indexes
- scaffold Dockerfiles for agents, auth, theme-engine service packages
- add genmedia server.ts HTTP layer, fix Dockerfile CMD, fix design-tokens build config, create Dockerfile.antigravity (Task T20260306-706 complete)
- migrate store from JSON files to SQLite (WAL mode)
- add force_complete tool + POST /api/tasks/:id/resolve endpoint
- compile and integration fixes for daemon and zero-day pub/sub (T20260306-[706,601,328,513])
- fix daemon REST dispatch claim & sync server api
- ship NAS watcher deploy and TRINITY-1 verification
- real-time window heartbeat system
- TS audit + multi-package shipping pass
- all-green dashboard — live service health hook, NeuralMonitor real endpoints, CampaignControl live status, dispatch activity feed [T20260306-012]
- add IDEATE, SHIP, VALIDATE, SCRIBE skill files + update dispatch queue
- Universal Agent Dispatch Network - Phase 1+2+3

### 🔧 Fixes
- make Docker build self-contained for NAS deployment
- compile TS in Docker — remove dependency on pre-built /build dir

### 🔩 Other
- Wave 22: Introduce strict unit testing for media engines
- validate(dispatch): 20 vitest cases for TaskQueue #80
- finalize Wave 8 handoff
- clean gitignore + sweep all multi-helix sprint output
- remove T20260306-A3 from active queue
- sync all active windows — multi-instance batch commit

### `packages/auth` — auth

### ✨ New
- implement zero-day live revenue dashboard and fix auth coupling
- 3-helix GTM sprint — PostHog tests + RoleGuard partner role + requireRole [AVERI/W26]
- #93 AVERI Memory Service + #94 Context Compaction + #96 Edge Inference Gateway [W25]
- full creative mobile app — Atelier design language
- firebase singleton init + multi-tenant auth contract tests [AVERI/W25-prep]
- 3-helix parallel test coverage — Chronos + Firebase Auth + MCP Fetch Proxy
- GTM Live Analytics + Chronos VisionOS + VelocityTelemetry
- GTM Live Analytics + Chronos VisionOS + VelocityTelemetry
- Zero-day implementation of BLE tracker and Living Canvas SSE
- 4-helix GTM sprint — Firebase Auth, MCP Fetch Proxy, Gitea Race Fix, Chat Console
- scaffold Dockerfiles for agents, auth, theme-engine service packages
- TS audit + multi-package shipping pass

### 🔩 Other
- miscellaneous updates
- Auto-commit: Getting git down to zero
- miscellaneous updates
- miscellaneous updates
- stage all pending changes — console, auth, genkit server, memory pkg, pnpm-lock, velocity telemetry page
- miscellaneous updates — packages/auth/src/index.ts
- miscellaneous updates — packages/auth/src/index.ts
- miscellaneous updates — packages/claude-agent/src/executor.d.ts, packages/claude-agent/src/index.d.ts, packages/claude-agent/src/types.d.ts, packages/auth/src/hooks/useAuth.d.ts
- miscellaneous updates — packages/auth/package-lock.json, packages/auth/package.json, packages/auth/src/lib/firebase.ts
- miscellaneous updates — packages/auth/src/env.d.ts
- miscellaneous updates — packages/auth/package-lock.json, packages/auth/package.json
- miscellaneous updates — packages/auth/src/lib/firebase.ts, packages/mcp-fetch-proxy/tsconfig.json
- miscellaneous updates — packages/auth/src/lib/firebase.ts, packages/mcp-fetch-proxy/tsconfig.json
- miscellaneous updates — packages/auth/package.json, packages/auth/package-lock.json
- miscellaneous updates — packages/auth/src/index.ts, packages/mcp-router/src/index.ts, packages/mcp-fetch-proxy/docker-compose.yml, packages/mcp-fetch-proxy/tsconfig.json
- miscellaneous updates — packages/auth/src/firebase.ts, packages/auth/src/components/, packages/auth/src/contexts/, packages/auth/src/hooks/
- miscellaneous updates — packages/auth/src/firebase.ts, packages/auth/tsconfig.json, packages/auth/src/lib/, packages/mcp-fetch-proxy/src/
- miscellaneous updates — packages/auth/tsconfig.json
- miscellaneous updates — packages/auth/package.json, packages/mcp-fetch-proxy/
- miscellaneous updates — infra/forgejo/docker-compose.yml, packages/auth/package.json, packages/auth/tsconfig.json
- miscellaneous updates — packages/auth/src/index.ts, packages/mcp-router/src/index.ts, packages/comet/src/proxy-server.ts
- miscellaneous updates — packages/auth/src/AuthGuard.tsx, packages/auth/src/firebase.ts, packages/comet/src/fetch-proxy.ts, packages/mcp-router/src/fetch-proxy.ts
- miscellaneous updates — packages/auth/src/AuthContext.tsx
- miscellaneous updates — packages/auth/src/firebase-auth.ts
- clean gitignore + sweep all multi-helix sprint output

### `packages/mcp-fetch-proxy` — mcp-fetch-proxy

### ✨ New
- GTM Live Analytics + Chronos VisionOS + VelocityTelemetry

### 🔧 Fixes
- make Docker build self-contained for NAS deployment

### 🔩 Other
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- Wave 21: Fix orchestrator AgentRouter test + verify T20260309-216 Wave 18 helices
- miscellaneous updates — packages/inception-core/src/index.ts, packages/mcp-fetch-proxy/src/mcp-server.ts, packages/scribe-mcp/src/mcp-server.ts
- miscellaneous updates — packages/inception-core/tsconfig.json, packages/mcp-fetch-proxy/package.json, packages/mcp-router/package.json, packages/mcp-router/src/mcp-server.ts
- miscellaneous updates — packages/mcp-fetch-proxy/package-lock.json, packages/mcp-router/package-lock.json
- miscellaneous updates — packages/mcp-fetch-proxy/package-lock.json, packages/mcp-fetch-proxy/package.json, packages/mcp-router/package-lock.json, packages/mcp-router/package.json
- miscellaneous updates — packages/mcp-fetch-proxy/src/mcp-server.ts, packages/mcp-router/src/mcp-server.ts, tmp-dna-check.mjs
- miscellaneous updates — packages/mcp-fetch-proxy/src/mcp-server.ts, packages/mcp-router/src/mcp-server.ts, packages/sovereign-home-mesh/src/routes/guests.ts, packages/sovereign-home-mesh/src/routes/intel.ts
- miscellaneous updates — packages/mcp-fetch-proxy/tsconfig.json
- miscellaneous updates — packages/mcp-fetch-proxy/package.json, packages/mcp-fetch-proxy/package-lock.json
- miscellaneous updates — packages/auth/src/lib/firebase.ts, packages/mcp-fetch-proxy/tsconfig.json
- miscellaneous updates — packages/auth/src/lib/firebase.ts, packages/mcp-fetch-proxy/tsconfig.json
- miscellaneous updates — packages/mcp-fetch-proxy/Dockerfile
- miscellaneous updates — packages/auth/src/index.ts, packages/mcp-router/src/index.ts, packages/mcp-fetch-proxy/docker-compose.yml, packages/mcp-fetch-proxy/tsconfig.json
- miscellaneous updates — packages/auth/src/firebase.ts, packages/auth/tsconfig.json, packages/auth/src/lib/, packages/mcp-fetch-proxy/src/
- miscellaneous updates — packages/auth/package.json, packages/mcp-fetch-proxy/

### `packages/sovereign-mesh` — sovereign-mesh

### ✨ New
- Always-on server management — PM2 ecosystem + start-all.ps1
- replace Twilio with Telnyx sovereign SMS + Gmail OAuth2 integration
- Wave 33 — Sovereign Mesh Intelligence Layer (Phase 1 of Sovereign Fabric)

### 🔩 Other
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates

### `packages/sensor-mesh` — sensor-mesh

### ✨ New
- bridge + mesh updates
- bridge + mesh updates
- Wave 30 parallel execution (iPhone Sensor Node, NEXUS Spatial Workspace MCP)
- ZigSimBridge update + ecosystem sync
- ORACLE context system + photography phase 3-5
- ship 4-helix integration tests + UE5 OSC asset generator
- activate cloud layer, MCP dynamic loading, somatic T3, SIGNAL dashboard

### 🔧 Fixes
- install @types/node, restore types config, fix JSDoc regex misparse in BiometricBridge
- clean up tsconfig types array — @types/node resolved via monorepo root

### 🔩 Other
- ﻿feat(wave-12): finalize construction and verification of Wave 12 multi-helix

### `packages/workspace-mcp` — workspace-mcp

### 🔧 Fixes
- rewrite Dashboard.tsx — fix duplicate state, broken checkService, missing refs (tsc clean)

### `packages/scribe-mcp` — scribe-mcp

### ✨ New
- Implement Phase 1 of Math LoRA Autonomous Learning Architecture intercept and training logger
- add package.json with MCP SDK dependency
- add inception-scribe MCP server — remember, recall, context, forget, handoff (Phas

### 🔩 Other
- miscellaneous updates
- miscellaneous updates
- Wave 22: Introduce strict unit testing for media engines
- Wave 21: Fix orchestrator AgentRouter test + verify T20260309-216 Wave 18 helices
- miscellaneous updates — packages/inception-core/src/index.ts, packages/mcp-fetch-proxy/src/mcp-server.ts, packages/scribe-mcp/src/mcp-server.ts
- Add packages/scribe-mcp/tsconfig.json

### `packages/forge` — forge

### ✨ New
- wire cloud mesh health monitor, auto-boot router from env, FORGE in genesis CI
- add FORGE forgeGetAsset tool + forgeTools barrel [T20260309-492]
- ship FORGE API server to genesis stack (T20260309-492)
- add HTTP API server + Genkit tool bindings for asset economy
- ship n8n-bridge, skills, ie-terminal, shard-v2, agent-spawner as MCP servers
- 3-helix execution — FORGE economy + wire ingestion + GTM injection
- init FORGE Real-Time Asset Economy — types, package scaffold
- ship wire-ingestion-mcp — universal live data layer
- Always-on server management — PM2 ecosystem + start-all.ps1

### ⚡ Improvements
- add FORGE .dockerignore — exclude node_modules/.git/models from build context

### 🔧 Fixes
- resolve all CI typecheck failures across 7 packages
- FORGE Dockerfile monorepo-root context — fix cloud-mesh build in NAS CI

### 🔩 Other
- miscellaneous updates
- miscellaneous updates

### `apps/console` — console

### ✨ New
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- complete the circle — live health prober, intelligent router, dashboard wired to real data
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- wire cloud mesh health monitor, auto-boot router from env, FORGE in genesis CI
- add FORGE forgeGetAsset tool + forgeTools barrel [T20260309-492]
- ship GTM Analytics Dashboard + AtlasLiveClient [T20260309-702]
- ship n8n-bridge, skills, ie-terminal, shard-v2, agent-spawner as MCP servers
- implement zero-day live revenue dashboard and fix auth coupling
- Live CRM data in both GTM dashboards — multi-helix wiring
- Financial Command Center — infra cost breakdown + Zero-Day pipeline + next-money actions
- Wave 33 — Sovereign Mesh Intelligence Layer (Phase 1 of Sovereign Fabric)
- Zero-Day GTM 3-helix parallel execution - ProspectPipeline Genkit flow + CRMSyncService + LeadScoringDashboard
- 3-helix parallel execution
- commit all pending changes - console App, zero-day lead-scoring, ecosystem submodules [Zero-Day GTM]
- console App.tsx update + zero-day intelligence layer (lead-scoring + context engine)
- Wave 32 Design Ingestion Pipeline
- BarnstormStudio TEMPO+FUSER+API + Firebase AuthGuard wired in Console [W26]
- [Wave 19 - Helix C] wire PostHog frontend telemetry to client portal UI
- integrate posthog frontend telemetry
- integrate zero-day provisioning dashboard link into client portal
- DIRA + UI wiring — apps/console/src/index.css
- DIRA + UI wiring — apps/console/src/contexts/AuthContext.tsx
- DIRA + UI wiring — apps/console/src/App.tsx, apps/console/src/main.tsx
- DIRA + UI wiring — apps/console/src/components/AuthGuard.tsx, apps/console/src/pages/ChatConsole.tsx
- DIRA + UI wiring — apps/console/src/contexts/
- DIRA + UI wiring — apps/console/src/pages/DispatchCenter.tsx
- DIRA + UI wiring — apps/console/src/components/DIRADashboard.tsx
- DIRA + UI wiring — apps/console/package.json, packages/console/src/components/DiraPanel.tsx -> apps/console/src/components/DiraPanel.tsx
- wire DIRA tab + Zero-Day intake page into Console
- DIRA dashboard, Zero-Day GTM intake UI, PostHog analytics
- PWA + ntfy push notification bridge
- activate cloud layer, MCP dynamic loading, somatic T3, SIGNAL dashboard
- add service worker with push notification + offline support
- add PWA manifest for iOS home screen install
- implement Airbyte ingestion background worker to Chromadb
- parallelize inception engine execution
- integrate recharts into finance dashboard for sparklines
- implement design sandbox live token engine
- complete 4 parallel workstreams
- FirstMission workflow, Ambient Dashboard, promotion gate
- agent runtime implementations + genkit + css updates
- ServiceScanner, SetupWizard, complete component schemas, new package indexes
- scaffold Dockerfiles for agents, auth, theme-engine service packages
- update flow index exports, inception-core index, EngineStatusGrid component
- director-agent flow, ie-engine flows, task-graph types, engine-registry types, FlowExplorer update
- complete primitive tokens + scaffold service Dockerfiles
- complete CVA token layer + fix design-tokens package exports
- NAS daemon execution + docker-compose + onboarding CSS
- multi-stage production Dockerfile for autonomous genesis node
- implement Phase 3-6 onboarding flow
- implement Phase 1 and 2 onboarding selectors
- integrate Phase 0 ambient welcome flow
- add missing UI components, sync tokens, and config updates
- complete JSON schema validator and UI package scaffolding (fixes #T-181, #T-258)
- add genmedia server.ts HTTP layer, fix Dockerfile CMD, fix design-tokens build config, create Dockerfile.antigravity (Task T20260306-706 complete)
- setup antigravity-nas daemon and DinD infrastructure
- ship NAS watcher deploy and TRINITY-1 verification
- console pages, genmedia animation, blueprints deploy infra [TRINITY-1 W1]
- wire 4 unrouted pages — AnimationStudio /animation, Blueprints /blueprints, ClientDashboard /clients/:id, ZeroDayIntake /intake-form — add nav items for Animation + Blueprints
- add scribe-daemon upstream :9100 /scribe/ route + /provision pass-through; all 9 GENESIS services now behind gateway
- all-green dashboard — live service health hook, NeuralMonitor real endpoints, CampaignControl live status, dispatch activity feed [T20260306-012]
- Redis pub/sub auto-chain — brief.created fires on intake complete, campaign auto-executes [T20260306-011]
- Universal Agent Dispatch Network - Phase 1+2+3
- Console deployed to NAS via Docker
- campaign service fully integrated into GENESIS stack
- Creative OS — 4 helices shipped [GENESIS wave]

### 🔧 Fixes
- clean git state — config/env module, vera-bridge, engine grid, agent-extension; exclude workspace-mcp nested repo
- fix all TS compile errors in Dashboard, DiraPanel, ThePanopticon
- fix all TS compile errors — Dashboard, DiraPanel, ThePanopticon
- resolve TS build panics and missing ReactFlow imports
- rewrite Dashboard.tsx — fix duplicate state, broken checkService, missing refs (tsc clean)
- eliminate all eslint errors and warnings across console and UI packages
- resolve ts errors in genkit and genmedia flows
- resolve NOT NULL constraint failures in dispatch server and update better-sqlite3
- align barrel exports with actual source — BriefSubscriber, DAG executor, schema types, runCompassValidation
- correct ZeroDayIntake provision endpoint path + nginx route
- genkit upstream port 4000->4100; feat(console): add Blueprints to Dashboard health monitor
- resolve all pre-existing TS errors in server.ts — notifier API, ECHO types, portal routes, Stripe cast [T20260306-020]
- Dockerfile — use npm directly, not pnpm filter

### 🔩 Other
- stage all pending changes — console, auth, genkit server, memory pkg, pnpm-lock, velocity telemetry page
- scrub simulation nomenclature for zero day production release
- pnpm lockfile sync
- AGENTS.md updates
- merge: inception-engine sync — Dashboard + nas-watcher + zero-day deps
- sync Dashboard, tsconfig, memory package deps
- resolved agent-status conflict
- fix all typescript errors and css warnings for genesis stack validation
- clean gitignore + sweep all multi-helix sprint output
- style: add missing CSS modifier classes extracted from inline styles in CreativeWorkstation
- fix console typings and linting issues
- commit changes before multi-helix sprint
- finalize pending changes for parallel sprint
- [AVERI] Fix strict type and CSS inline style lint errors
- stage dirty working tree before multi-helix sprint
- stage console, design-sandbox, and genkit changes
- integrate theme engine tokens into console app and add pickup helper
- test(design-tokens): add round-trip integration test and fix syntax
-  fix: wrap root App in BrowserRouter to resolve useLocation crash
- remove T20260306-A3 from active queue
- sync all active windows — multi-instance batch commit

### `apps/event-intake` — event-intake

### ✨ New
- ship n8n-bridge, skills, ie-terminal, shard-v2, agent-spawner as MCP servers

### 🔩 Other
- miscellaneous updates
- miscellaneous updates


---

## v5.1.0-COMMUNITY — 2026-03-11

### `packages/genkit` — genkit

### ✨ New
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- GTM intake + analytics updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- ship The Transmission — autonomous infinity story (genkit flow + daemon + web app)
- complete the circle — live health prober, intelligent router, dashboard wired to real data
- add innerVoice flow + HTTP route for Sandbar Stream Inner Voice AI
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- sovereign local LLM stack
- add FORGE forgeGetAsset tool + forgeTools barrel [T20260309-492]
- add HTTP API server + Genkit tool bindings for asset economy
- implement zero-day live revenue dashboard and fix auth coupling
- hot-reload capability signal for Inception Engine instruction layer
- ship wire-ingestion-mcp — universal live data layer
- Always-on server management — PM2 ecosystem + start-all.ps1
- Cloud Run antigravity public + registry update
- Wave 32 Design Ingestion Pipeline and Registry
- Wave 32 Design Ingestion Pipeline
- BarnstormStudio TEMPO+FUSER+API + Firebase AuthGuard wired in Console [W26]
- AVERI Mobile PWA — context-enriched iPhone AI interface
- ship NBC NEXUS spatial control room prototype
- AI flow updates — packages/genkit/src/plugins/perplexity.js, packages/genkit/src/plugins/vertex-ai.js, packages/genkit/src/config/model-registry.d.ts, packages/genkit/src/config/model-registry.d.ts.map
- AI flow updates — packages/genkit/src/server.ts
- AI flow updates — packages/genkit/src/config/model-registry.ts
- AI flow updates — packages/genkit/src/flows/birdWatcher.ts, packages/genkit/src/flows/guestIntelligence.ts, packages/genkit/src/flows/strangerAlert.ts
- AI flow updates — packages/genkit/src/index.ts, packages/genkit/src/local-providers.ts
- AI flow updates — packages/genkit/src/middleware/smart-router.ts
- AI flow updates — packages/genkit/src/config/
- AI flow updates — packages/genkit/src/server.ts
- AI flow updates — packages/genkit/src/index.ts
- AI flow updates — packages/genkit/src/middleware/smart-router.ts
- AI flow updates — packages/genkit/src/flows/a2a-orchestration.ts
- AI flow updates — packages/genkit/src/creative-dna-vectors.ts
- DIRA Panel, sensor-mesh barrel, zero-day UI/analytics wiring [window Q]
- wire DIRA tab + Zero-Day intake page into Console
- DIRA dashboard, Zero-Day GTM intake UI, PostHog analytics
- spatial web integration complete
- ORACLE context system + photography phase 3-5
- T20260308-832 Phase 7a MVP implementation
- add productionCaseToScribeInput mapper -- unified DIRA->SCRIBE tag contract (#4)
- implement Airbyte ingestion background worker to Chromadb
- add CreatorSidebar and CreatorProductivityDashboard components
- SC-04 KEEPER v2 boot protocol w/ HANDOFF.md task-aware recall
- SCRIBE v2 memory layer + MCP Autoloader
- 5-helix sprint — MCP-05/06/07 + TOOL-01/02/03 + COMET dispatch
- DIRA auto-resolve engine — DIRA-01, DIRA-02, DIRA-03 [partial]
- SC-05 wire scribe tools into AVERI flows + SC-06 integration tests
- complete SCRIBE v2 + MCP Router epics [SC-01..06, MCP-01..04]
- scaffold MCP Router package + claim tasks [T20260307-772, T20260307-886]
- SCRIBE v2 context-pager + keeper-boot scaffolds, ghost updates, pnpm lockfile sync
- design-agent scanner, god-prompt pipelines, ghost SEO, genkit tsconfig cleanup, linter fixes [multi-helix]
- parallelize inception engine execution
- agent runtime implementations + genkit + css updates
- update flow index exports, inception-core index, EngineStatusGrid component
- director-agent flow, ie-engine flows, task-graph types, engine-registry types, FlowExplorer update
- AJV token tier validator + complete primitive tokens
- complete primitive tokens + scaffold service Dockerfiles
- add genmedia server.ts HTTP layer, fix Dockerfile CMD, fix design-tokens build config, create Dockerfile.antigravity (Task T20260306-706 complete)
- setup antigravity-nas daemon and DinD infrastructure
- compile and integration fixes for daemon and zero-day pub/sub (T20260306-[706,601,328,513])
- ship NAS watcher deploy and TRINITY-1 verification
- vertex-ai plugin, docker-compose expansion, genkit server updates
- wire GDrive MCP brief upload + docker-compose env fixes [T20260306-022]
- TS audit + multi-package shipping pass
- add comet consumer, memory flow, gdrive-client, and stripe publisher
- all-green dashboard — live service health hook, NeuralMonitor real endpoints, CampaignControl live status, dispatch activity feed [T20260306-012]
- Redis pub/sub auto-chain — brief.created fires on intake complete, campaign auto-executes [T20260306-011]
- wire CreativeDirector, generate-media, and score endpoints into genkit server
- AGENTS.md, .agents rules, dispatch board, CONTEXT.md in key packages

### 🔧 Fixes
- inject TRANSMISSION_MODEL via env — Article VI compliance
- clean git state — config/env module, vera-bridge, engine grid, agent-extension; exclude workspace-mcp nested repo
- resolve all CI typecheck failures across 7 packages
- unify tag contract via productionCaseToScribeInput (Issue #4 F3)
- store category/importance as metadata, add where clause to recall (Issue #5 F1/F2)
- use createRequire() for JSON import compat with Node ESM
- eliminate all eslint errors and warnings across console and UI packages
- resolve ts errors in genkit and genmedia flows
- filter undefined/duplicate plugins before genkit() call to prevent Plugin undefined already registered crash
- remove ZeroDayGtmSwarmFlow re-export from index.ts to break ESM circular dependency causing ai TDZ crash loop
- break circular ESM import in circuit-breaker.ts — import LOCAL_MODELS from local-providers.js instead of index.js barrel to resolve TDZ crash
- add @inception/auth to genkit + god-prompt Dockerfiles to resolve ERR_MODULE_NOT_FOUND at runtime
- fix genkit TSX monorepo resolution and ghost missing xml2js dependency

### 🔩 Other
- rename Inception Engine and Antigravity to CLE globally
- miscellaneous updates
- helix: complete A/F/G — AVERI critique, sovereign inference, foley intelligence
- helix: ship 9-helix creative superiority build — tsc clean
- Auto-commit: Getting git down to zero
- trigger full NAS deployment and sync all undeployed changes
- update registry for wave 26 completion
- merge remote genkit changes [W27]
- stage workspace changes — pnpm-lock, ecosystem updates, Wave 24 GTM boot
- stage all pending changes — console, auth, genkit server, memory pkg, pnpm-lock, velocity telemetry page
- restored nbc nexus stashed modifications
- fix all typescript errors and css warnings for genesis stack validation
- clean gitignore + sweep all multi-helix sprint output
- fix console typings and linting issues
- stage console, design-sandbox, and genkit changes
- remove T20260306-A3 from active queue
- sync all active windows — multi-instance batch commit
- update startup banner with campaign endpoints

### `packages/inception-core` — inception-core

### ✨ New
- ship The Transmission — autonomous infinity story (genkit flow + daemon + web app)
- hot-reload capability signal for Inception Engine instruction layer
- final delivery of multi-window warp tasks
- update flow index exports, inception-core index, EngineStatusGrid component
- director-agent flow, ie-engine flows, task-graph types, engine-registry types, FlowExplorer update
- TS audit + multi-package shipping pass
- build system + tests passing (T20260306-015)
- Redis pub/sub auto-chain — brief.created fires on intake complete, campaign auto-executes [T20260306-011]
- add IDEATE, SHIP, VALIDATE, SCRIBE skill files + update dispatch queue
- AGENTS.md, .agents rules, dispatch board, CONTEXT.md in key packages

### 🔧 Fixes
- clean git state — config/env module, vera-bridge, engine grid, agent-extension; exclude workspace-mcp nested repo

### 🔩 Other
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates — packages/inception-core/src/index.ts, packages/mcp-fetch-proxy/src/mcp-server.ts, packages/scribe-mcp/src/mcp-server.ts
- miscellaneous updates — packages/inception-core/tsconfig.json, packages/mcp-fetch-proxy/package.json, packages/mcp-router/package.json, packages/mcp-router/src/mcp-server.ts
- miscellaneous updates — packages/inception-core/src/types/home-mesh.ts, packages/sovereign-home-mesh/
- miscellaneous updates — packages/inception-core/src/index.ts
- miscellaneous updates — packages/inception-core/src/types/psi.ts
- clean gitignore + sweep all multi-helix sprint output
- remove T20260306-A3 from active queue
- sync all active windows — multi-instance batch commit

### `packages/dispatch` — dispatch

### ✨ New
- server + task routing updates
- server + task routing updates
- server + task routing updates
- wire cloud mesh health monitor, auto-boot router from env, FORGE in genesis CI
- add FORGE forgeGetAsset tool + forgeTools barrel [T20260309-492]
- hot-reload capability signal for Inception Engine instruction layer
- server updates — packages/dispatch/package.json
- server updates — packages/dispatch/src/server.ts
- server updates — packages/dispatch/src/fetch-proxy-endpoint.ts
- server updates — packages/dispatch/src/server.ts
- server updates — packages/dispatch/src/server.ts
- server updates — packages/dispatch/src/server.ts
- server updates — packages/dispatch/src/server.ts
- ALFRED chat widget, client gallery, dispatch server
- autonomous agent infrastructure — BLOCKER protocol, auto-loop, /api/tasks/next, Windows multipliers
- ORACLE context system + photography phase 3-5
- TaskQueue with priority routing + agent capability matching #75
- complete multi-helix sprint P1
- add inception-dispatch MCP server — task routing via stdio #30
- FirstMission workflow, Ambient Dashboard, promotion gate
- agent runtime implementations + genkit + css updates
- ServiceScanner, SetupWizard, complete component schemas, new package indexes
- scaffold Dockerfiles for agents, auth, theme-engine service packages
- add genmedia server.ts HTTP layer, fix Dockerfile CMD, fix design-tokens build config, create Dockerfile.antigravity (Task T20260306-706 complete)
- migrate store from JSON files to SQLite (WAL mode)
- add force_complete tool + POST /api/tasks/:id/resolve endpoint
- compile and integration fixes for daemon and zero-day pub/sub (T20260306-[706,601,328,513])
- fix daemon REST dispatch claim & sync server api
- ship NAS watcher deploy and TRINITY-1 verification
- real-time window heartbeat system
- TS audit + multi-package shipping pass
- all-green dashboard — live service health hook, NeuralMonitor real endpoints, CampaignControl live status, dispatch activity feed [T20260306-012]
- add IDEATE, SHIP, VALIDATE, SCRIBE skill files + update dispatch queue
- Universal Agent Dispatch Network - Phase 1+2+3

### 🔧 Fixes
- make Docker build self-contained for NAS deployment
- compile TS in Docker — remove dependency on pre-built /build dir

### 🔩 Other
- Wave 22: Introduce strict unit testing for media engines
- validate(dispatch): 20 vitest cases for TaskQueue #80
- finalize Wave 8 handoff
- clean gitignore + sweep all multi-helix sprint output
- remove T20260306-A3 from active queue
- sync all active windows — multi-instance batch commit

### `packages/auth` — auth

### ✨ New
- implement zero-day live revenue dashboard and fix auth coupling
- 3-helix GTM sprint — PostHog tests + RoleGuard partner role + requireRole [AVERI/W26]
- #93 AVERI Memory Service + #94 Context Compaction + #96 Edge Inference Gateway [W25]
- full creative mobile app — Atelier design language
- firebase singleton init + multi-tenant auth contract tests [AVERI/W25-prep]
- 3-helix parallel test coverage — Chronos + Firebase Auth + MCP Fetch Proxy
- GTM Live Analytics + Chronos VisionOS + VelocityTelemetry
- GTM Live Analytics + Chronos VisionOS + VelocityTelemetry
- Zero-day implementation of BLE tracker and Living Canvas SSE
- 4-helix GTM sprint — Firebase Auth, MCP Fetch Proxy, Gitea Race Fix, Chat Console
- scaffold Dockerfiles for agents, auth, theme-engine service packages
- TS audit + multi-package shipping pass

### 🔩 Other
- miscellaneous updates
- Auto-commit: Getting git down to zero
- miscellaneous updates
- miscellaneous updates
- stage all pending changes — console, auth, genkit server, memory pkg, pnpm-lock, velocity telemetry page
- miscellaneous updates — packages/auth/src/index.ts
- miscellaneous updates — packages/auth/src/index.ts
- miscellaneous updates — packages/claude-agent/src/executor.d.ts, packages/claude-agent/src/index.d.ts, packages/claude-agent/src/types.d.ts, packages/auth/src/hooks/useAuth.d.ts
- miscellaneous updates — packages/auth/package-lock.json, packages/auth/package.json, packages/auth/src/lib/firebase.ts
- miscellaneous updates — packages/auth/src/env.d.ts
- miscellaneous updates — packages/auth/package-lock.json, packages/auth/package.json
- miscellaneous updates — packages/auth/src/lib/firebase.ts, packages/mcp-fetch-proxy/tsconfig.json
- miscellaneous updates — packages/auth/src/lib/firebase.ts, packages/mcp-fetch-proxy/tsconfig.json
- miscellaneous updates — packages/auth/package.json, packages/auth/package-lock.json
- miscellaneous updates — packages/auth/src/index.ts, packages/mcp-router/src/index.ts, packages/mcp-fetch-proxy/docker-compose.yml, packages/mcp-fetch-proxy/tsconfig.json
- miscellaneous updates — packages/auth/src/firebase.ts, packages/auth/src/components/, packages/auth/src/contexts/, packages/auth/src/hooks/
- miscellaneous updates — packages/auth/src/firebase.ts, packages/auth/tsconfig.json, packages/auth/src/lib/, packages/mcp-fetch-proxy/src/
- miscellaneous updates — packages/auth/tsconfig.json
- miscellaneous updates — packages/auth/package.json, packages/mcp-fetch-proxy/
- miscellaneous updates — infra/forgejo/docker-compose.yml, packages/auth/package.json, packages/auth/tsconfig.json
- miscellaneous updates — packages/auth/src/index.ts, packages/mcp-router/src/index.ts, packages/comet/src/proxy-server.ts
- miscellaneous updates — packages/auth/src/AuthGuard.tsx, packages/auth/src/firebase.ts, packages/comet/src/fetch-proxy.ts, packages/mcp-router/src/fetch-proxy.ts
- miscellaneous updates — packages/auth/src/AuthContext.tsx
- miscellaneous updates — packages/auth/src/firebase-auth.ts
- clean gitignore + sweep all multi-helix sprint output

### `packages/mcp-fetch-proxy` — mcp-fetch-proxy

### ✨ New
- GTM Live Analytics + Chronos VisionOS + VelocityTelemetry

### 🔧 Fixes
- make Docker build self-contained for NAS deployment

### 🔩 Other
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- Wave 21: Fix orchestrator AgentRouter test + verify T20260309-216 Wave 18 helices
- miscellaneous updates — packages/inception-core/src/index.ts, packages/mcp-fetch-proxy/src/mcp-server.ts, packages/scribe-mcp/src/mcp-server.ts
- miscellaneous updates — packages/inception-core/tsconfig.json, packages/mcp-fetch-proxy/package.json, packages/mcp-router/package.json, packages/mcp-router/src/mcp-server.ts
- miscellaneous updates — packages/mcp-fetch-proxy/package-lock.json, packages/mcp-router/package-lock.json
- miscellaneous updates — packages/mcp-fetch-proxy/package-lock.json, packages/mcp-fetch-proxy/package.json, packages/mcp-router/package-lock.json, packages/mcp-router/package.json
- miscellaneous updates — packages/mcp-fetch-proxy/src/mcp-server.ts, packages/mcp-router/src/mcp-server.ts, tmp-dna-check.mjs
- miscellaneous updates — packages/mcp-fetch-proxy/src/mcp-server.ts, packages/mcp-router/src/mcp-server.ts, packages/sovereign-home-mesh/src/routes/guests.ts, packages/sovereign-home-mesh/src/routes/intel.ts
- miscellaneous updates — packages/mcp-fetch-proxy/tsconfig.json
- miscellaneous updates — packages/mcp-fetch-proxy/package.json, packages/mcp-fetch-proxy/package-lock.json
- miscellaneous updates — packages/auth/src/lib/firebase.ts, packages/mcp-fetch-proxy/tsconfig.json
- miscellaneous updates — packages/auth/src/lib/firebase.ts, packages/mcp-fetch-proxy/tsconfig.json
- miscellaneous updates — packages/mcp-fetch-proxy/Dockerfile
- miscellaneous updates — packages/auth/src/index.ts, packages/mcp-router/src/index.ts, packages/mcp-fetch-proxy/docker-compose.yml, packages/mcp-fetch-proxy/tsconfig.json
- miscellaneous updates — packages/auth/src/firebase.ts, packages/auth/tsconfig.json, packages/auth/src/lib/, packages/mcp-fetch-proxy/src/
- miscellaneous updates — packages/auth/package.json, packages/mcp-fetch-proxy/

### `packages/sovereign-mesh` — sovereign-mesh

### ✨ New
- Always-on server management — PM2 ecosystem + start-all.ps1
- replace Twilio with Telnyx sovereign SMS + Gmail OAuth2 integration
- Wave 33 — Sovereign Mesh Intelligence Layer (Phase 1 of Sovereign Fabric)

### 🔩 Other
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates

### `packages/sensor-mesh` — sensor-mesh

### ✨ New
- bridge + mesh updates
- bridge + mesh updates
- Wave 30 parallel execution (iPhone Sensor Node, NEXUS Spatial Workspace MCP)
- ZigSimBridge update + ecosystem sync
- ORACLE context system + photography phase 3-5
- ship 4-helix integration tests + UE5 OSC asset generator
- activate cloud layer, MCP dynamic loading, somatic T3, SIGNAL dashboard

### 🔧 Fixes
- install @types/node, restore types config, fix JSDoc regex misparse in BiometricBridge
- clean up tsconfig types array — @types/node resolved via monorepo root

### 🔩 Other
- ﻿feat(wave-12): finalize construction and verification of Wave 12 multi-helix

### `packages/workspace-mcp` — workspace-mcp

### 🔧 Fixes
- rewrite Dashboard.tsx — fix duplicate state, broken checkService, missing refs (tsc clean)

### `packages/scribe-mcp` — scribe-mcp

### ✨ New
- Implement Phase 1 of Math LoRA Autonomous Learning Architecture intercept and training logger
- add package.json with MCP SDK dependency
- add inception-scribe MCP server — remember, recall, context, forget, handoff (Phas

### 🔩 Other
- miscellaneous updates
- miscellaneous updates
- Wave 22: Introduce strict unit testing for media engines
- Wave 21: Fix orchestrator AgentRouter test + verify T20260309-216 Wave 18 helices
- miscellaneous updates — packages/inception-core/src/index.ts, packages/mcp-fetch-proxy/src/mcp-server.ts, packages/scribe-mcp/src/mcp-server.ts
- Add packages/scribe-mcp/tsconfig.json

### `packages/forge` — forge

### ✨ New
- wire cloud mesh health monitor, auto-boot router from env, FORGE in genesis CI
- add FORGE forgeGetAsset tool + forgeTools barrel [T20260309-492]
- ship FORGE API server to genesis stack (T20260309-492)
- add HTTP API server + Genkit tool bindings for asset economy
- ship n8n-bridge, skills, ie-terminal, shard-v2, agent-spawner as MCP servers
- 3-helix execution — FORGE economy + wire ingestion + GTM injection
- init FORGE Real-Time Asset Economy — types, package scaffold
- ship wire-ingestion-mcp — universal live data layer
- Always-on server management — PM2 ecosystem + start-all.ps1

### ⚡ Improvements
- add FORGE .dockerignore — exclude node_modules/.git/models from build context

### 🔧 Fixes
- resolve all CI typecheck failures across 7 packages
- FORGE Dockerfile monorepo-root context — fix cloud-mesh build in NAS CI

### 🔩 Other
- miscellaneous updates
- miscellaneous updates

### `apps/console` — console

### ✨ New
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- complete the circle — live health prober, intelligent router, dashboard wired to real data
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- wire cloud mesh health monitor, auto-boot router from env, FORGE in genesis CI
- add FORGE forgeGetAsset tool + forgeTools barrel [T20260309-492]
- ship GTM Analytics Dashboard + AtlasLiveClient [T20260309-702]
- ship n8n-bridge, skills, ie-terminal, shard-v2, agent-spawner as MCP servers
- implement zero-day live revenue dashboard and fix auth coupling
- Live CRM data in both GTM dashboards — multi-helix wiring
- Financial Command Center — infra cost breakdown + Zero-Day pipeline + next-money actions
- Wave 33 — Sovereign Mesh Intelligence Layer (Phase 1 of Sovereign Fabric)
- Zero-Day GTM 3-helix parallel execution - ProspectPipeline Genkit flow + CRMSyncService + LeadScoringDashboard
- 3-helix parallel execution
- commit all pending changes - console App, zero-day lead-scoring, ecosystem submodules [Zero-Day GTM]
- console App.tsx update + zero-day intelligence layer (lead-scoring + context engine)
- Wave 32 Design Ingestion Pipeline
- BarnstormStudio TEMPO+FUSER+API + Firebase AuthGuard wired in Console [W26]
- [Wave 19 - Helix C] wire PostHog frontend telemetry to client portal UI
- integrate posthog frontend telemetry
- integrate zero-day provisioning dashboard link into client portal
- DIRA + UI wiring — apps/console/src/index.css
- DIRA + UI wiring — apps/console/src/contexts/AuthContext.tsx
- DIRA + UI wiring — apps/console/src/App.tsx, apps/console/src/main.tsx
- DIRA + UI wiring — apps/console/src/components/AuthGuard.tsx, apps/console/src/pages/ChatConsole.tsx
- DIRA + UI wiring — apps/console/src/contexts/
- DIRA + UI wiring — apps/console/src/pages/DispatchCenter.tsx
- DIRA + UI wiring — apps/console/src/components/DIRADashboard.tsx
- DIRA + UI wiring — apps/console/package.json, packages/console/src/components/DiraPanel.tsx -> apps/console/src/components/DiraPanel.tsx
- wire DIRA tab + Zero-Day intake page into Console
- DIRA dashboard, Zero-Day GTM intake UI, PostHog analytics
- PWA + ntfy push notification bridge
- activate cloud layer, MCP dynamic loading, somatic T3, SIGNAL dashboard
- add service worker with push notification + offline support
- add PWA manifest for iOS home screen install
- implement Airbyte ingestion background worker to Chromadb
- parallelize inception engine execution
- integrate recharts into finance dashboard for sparklines
- implement design sandbox live token engine
- complete 4 parallel workstreams
- FirstMission workflow, Ambient Dashboard, promotion gate
- agent runtime implementations + genkit + css updates
- ServiceScanner, SetupWizard, complete component schemas, new package indexes
- scaffold Dockerfiles for agents, auth, theme-engine service packages
- update flow index exports, inception-core index, EngineStatusGrid component
- director-agent flow, ie-engine flows, task-graph types, engine-registry types, FlowExplorer update
- complete primitive tokens + scaffold service Dockerfiles
- complete CVA token layer + fix design-tokens package exports
- NAS daemon execution + docker-compose + onboarding CSS
- multi-stage production Dockerfile for autonomous genesis node
- implement Phase 3-6 onboarding flow
- implement Phase 1 and 2 onboarding selectors
- integrate Phase 0 ambient welcome flow
- add missing UI components, sync tokens, and config updates
- complete JSON schema validator and UI package scaffolding (fixes #T-181, #T-258)
- add genmedia server.ts HTTP layer, fix Dockerfile CMD, fix design-tokens build config, create Dockerfile.antigravity (Task T20260306-706 complete)
- setup antigravity-nas daemon and DinD infrastructure
- ship NAS watcher deploy and TRINITY-1 verification
- console pages, genmedia animation, blueprints deploy infra [TRINITY-1 W1]
- wire 4 unrouted pages — AnimationStudio /animation, Blueprints /blueprints, ClientDashboard /clients/:id, ZeroDayIntake /intake-form — add nav items for Animation + Blueprints
- add scribe-daemon upstream :9100 /scribe/ route + /provision pass-through; all 9 GENESIS services now behind gateway
- all-green dashboard — live service health hook, NeuralMonitor real endpoints, CampaignControl live status, dispatch activity feed [T20260306-012]
- Redis pub/sub auto-chain — brief.created fires on intake complete, campaign auto-executes [T20260306-011]
- Universal Agent Dispatch Network - Phase 1+2+3
- Console deployed to NAS via Docker
- campaign service fully integrated into GENESIS stack
- Creative OS — 4 helices shipped [GENESIS wave]

### 🔧 Fixes
- clean git state — config/env module, vera-bridge, engine grid, agent-extension; exclude workspace-mcp nested repo
- fix all TS compile errors in Dashboard, DiraPanel, ThePanopticon
- fix all TS compile errors — Dashboard, DiraPanel, ThePanopticon
- resolve TS build panics and missing ReactFlow imports
- rewrite Dashboard.tsx — fix duplicate state, broken checkService, missing refs (tsc clean)
- eliminate all eslint errors and warnings across console and UI packages
- resolve ts errors in genkit and genmedia flows
- resolve NOT NULL constraint failures in dispatch server and update better-sqlite3
- align barrel exports with actual source — BriefSubscriber, DAG executor, schema types, runCompassValidation
- correct ZeroDayIntake provision endpoint path + nginx route
- genkit upstream port 4000->4100; feat(console): add Blueprints to Dashboard health monitor
- resolve all pre-existing TS errors in server.ts — notifier API, ECHO types, portal routes, Stripe cast [T20260306-020]
- Dockerfile — use npm directly, not pnpm filter

### 🔩 Other
- stage all pending changes — console, auth, genkit server, memory pkg, pnpm-lock, velocity telemetry page
- scrub simulation nomenclature for zero day production release
- pnpm lockfile sync
- AGENTS.md updates
- merge: inception-engine sync — Dashboard + nas-watcher + zero-day deps
- sync Dashboard, tsconfig, memory package deps
- resolved agent-status conflict
- fix all typescript errors and css warnings for genesis stack validation
- clean gitignore + sweep all multi-helix sprint output
- style: add missing CSS modifier classes extracted from inline styles in CreativeWorkstation
- fix console typings and linting issues
- commit changes before multi-helix sprint
- finalize pending changes for parallel sprint
- [AVERI] Fix strict type and CSS inline style lint errors
- stage dirty working tree before multi-helix sprint
- stage console, design-sandbox, and genkit changes
- integrate theme engine tokens into console app and add pickup helper
- test(design-tokens): add round-trip integration test and fix syntax
-  fix: wrap root App in BrowserRouter to resolve useLocation crash
- remove T20260306-A3 from active queue
- sync all active windows — multi-instance batch commit

### `apps/event-intake` — event-intake

### ✨ New
- ship n8n-bridge, skills, ie-terminal, shard-v2, agent-spawner as MCP servers

### 🔩 Other
- miscellaneous updates
- miscellaneous updates


---

## v5.1.0-COMMUNITY — 2026-03-11

### `packages/genkit` — genkit

### ✨ New
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- GTM intake + analytics updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- ship The Transmission — autonomous infinity story (genkit flow + daemon + web app)
- complete the circle — live health prober, intelligent router, dashboard wired to real data
- add innerVoice flow + HTTP route for Sandbar Stream Inner Voice AI
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- sovereign local LLM stack
- add FORGE forgeGetAsset tool + forgeTools barrel [T20260309-492]
- add HTTP API server + Genkit tool bindings for asset economy
- implement zero-day live revenue dashboard and fix auth coupling
- hot-reload capability signal for Inception Engine instruction layer
- ship wire-ingestion-mcp — universal live data layer
- Always-on server management — PM2 ecosystem + start-all.ps1
- Cloud Run antigravity public + registry update
- Wave 32 Design Ingestion Pipeline and Registry
- Wave 32 Design Ingestion Pipeline
- BarnstormStudio TEMPO+FUSER+API + Firebase AuthGuard wired in Console [W26]
- AVERI Mobile PWA — context-enriched iPhone AI interface
- ship NBC NEXUS spatial control room prototype
- AI flow updates — packages/genkit/src/plugins/perplexity.js, packages/genkit/src/plugins/vertex-ai.js, packages/genkit/src/config/model-registry.d.ts, packages/genkit/src/config/model-registry.d.ts.map
- AI flow updates — packages/genkit/src/server.ts
- AI flow updates — packages/genkit/src/config/model-registry.ts
- AI flow updates — packages/genkit/src/flows/birdWatcher.ts, packages/genkit/src/flows/guestIntelligence.ts, packages/genkit/src/flows/strangerAlert.ts
- AI flow updates — packages/genkit/src/index.ts, packages/genkit/src/local-providers.ts
- AI flow updates — packages/genkit/src/middleware/smart-router.ts
- AI flow updates — packages/genkit/src/config/
- AI flow updates — packages/genkit/src/server.ts
- AI flow updates — packages/genkit/src/index.ts
- AI flow updates — packages/genkit/src/middleware/smart-router.ts
- AI flow updates — packages/genkit/src/flows/a2a-orchestration.ts
- AI flow updates — packages/genkit/src/creative-dna-vectors.ts
- DIRA Panel, sensor-mesh barrel, zero-day UI/analytics wiring [window Q]
- wire DIRA tab + Zero-Day intake page into Console
- DIRA dashboard, Zero-Day GTM intake UI, PostHog analytics
- spatial web integration complete
- ORACLE context system + photography phase 3-5
- T20260308-832 Phase 7a MVP implementation
- add productionCaseToScribeInput mapper -- unified DIRA->SCRIBE tag contract (#4)
- implement Airbyte ingestion background worker to Chromadb
- add CreatorSidebar and CreatorProductivityDashboard components
- SC-04 KEEPER v2 boot protocol w/ HANDOFF.md task-aware recall
- SCRIBE v2 memory layer + MCP Autoloader
- 5-helix sprint — MCP-05/06/07 + TOOL-01/02/03 + COMET dispatch
- DIRA auto-resolve engine — DIRA-01, DIRA-02, DIRA-03 [partial]
- SC-05 wire scribe tools into AVERI flows + SC-06 integration tests
- complete SCRIBE v2 + MCP Router epics [SC-01..06, MCP-01..04]
- scaffold MCP Router package + claim tasks [T20260307-772, T20260307-886]
- SCRIBE v2 context-pager + keeper-boot scaffolds, ghost updates, pnpm lockfile sync
- design-agent scanner, god-prompt pipelines, ghost SEO, genkit tsconfig cleanup, linter fixes [multi-helix]
- parallelize inception engine execution
- agent runtime implementations + genkit + css updates
- update flow index exports, inception-core index, EngineStatusGrid component
- director-agent flow, ie-engine flows, task-graph types, engine-registry types, FlowExplorer update
- AJV token tier validator + complete primitive tokens
- complete primitive tokens + scaffold service Dockerfiles
- add genmedia server.ts HTTP layer, fix Dockerfile CMD, fix design-tokens build config, create Dockerfile.antigravity (Task T20260306-706 complete)
- setup antigravity-nas daemon and DinD infrastructure
- compile and integration fixes for daemon and zero-day pub/sub (T20260306-[706,601,328,513])
- ship NAS watcher deploy and TRINITY-1 verification
- vertex-ai plugin, docker-compose expansion, genkit server updates
- wire GDrive MCP brief upload + docker-compose env fixes [T20260306-022]
- TS audit + multi-package shipping pass
- add comet consumer, memory flow, gdrive-client, and stripe publisher
- all-green dashboard — live service health hook, NeuralMonitor real endpoints, CampaignControl live status, dispatch activity feed [T20260306-012]
- Redis pub/sub auto-chain — brief.created fires on intake complete, campaign auto-executes [T20260306-011]
- wire CreativeDirector, generate-media, and score endpoints into genkit server
- AGENTS.md, .agents rules, dispatch board, CONTEXT.md in key packages

### 🔧 Fixes
- inject TRANSMISSION_MODEL via env — Article VI compliance
- clean git state — config/env module, vera-bridge, engine grid, agent-extension; exclude workspace-mcp nested repo
- resolve all CI typecheck failures across 7 packages
- unify tag contract via productionCaseToScribeInput (Issue #4 F3)
- store category/importance as metadata, add where clause to recall (Issue #5 F1/F2)
- use createRequire() for JSON import compat with Node ESM
- eliminate all eslint errors and warnings across console and UI packages
- resolve ts errors in genkit and genmedia flows
- filter undefined/duplicate plugins before genkit() call to prevent Plugin undefined already registered crash
- remove ZeroDayGtmSwarmFlow re-export from index.ts to break ESM circular dependency causing ai TDZ crash loop
- break circular ESM import in circuit-breaker.ts — import LOCAL_MODELS from local-providers.js instead of index.js barrel to resolve TDZ crash
- add @inception/auth to genkit + god-prompt Dockerfiles to resolve ERR_MODULE_NOT_FOUND at runtime
- fix genkit TSX monorepo resolution and ghost missing xml2js dependency

### 🔩 Other
- rename Inception Engine and Antigravity to CLE globally
- miscellaneous updates
- helix: complete A/F/G — AVERI critique, sovereign inference, foley intelligence
- helix: ship 9-helix creative superiority build — tsc clean
- Auto-commit: Getting git down to zero
- trigger full NAS deployment and sync all undeployed changes
- update registry for wave 26 completion
- merge remote genkit changes [W27]
- stage workspace changes — pnpm-lock, ecosystem updates, Wave 24 GTM boot
- stage all pending changes — console, auth, genkit server, memory pkg, pnpm-lock, velocity telemetry page
- restored nbc nexus stashed modifications
- fix all typescript errors and css warnings for genesis stack validation
- clean gitignore + sweep all multi-helix sprint output
- fix console typings and linting issues
- stage console, design-sandbox, and genkit changes
- remove T20260306-A3 from active queue
- sync all active windows — multi-instance batch commit
- update startup banner with campaign endpoints

### `packages/inception-core` — inception-core

### ✨ New
- ship The Transmission — autonomous infinity story (genkit flow + daemon + web app)
- hot-reload capability signal for Inception Engine instruction layer
- final delivery of multi-window warp tasks
- update flow index exports, inception-core index, EngineStatusGrid component
- director-agent flow, ie-engine flows, task-graph types, engine-registry types, FlowExplorer update
- TS audit + multi-package shipping pass
- build system + tests passing (T20260306-015)
- Redis pub/sub auto-chain — brief.created fires on intake complete, campaign auto-executes [T20260306-011]
- add IDEATE, SHIP, VALIDATE, SCRIBE skill files + update dispatch queue
- AGENTS.md, .agents rules, dispatch board, CONTEXT.md in key packages

### 🔧 Fixes
- clean git state — config/env module, vera-bridge, engine grid, agent-extension; exclude workspace-mcp nested repo

### 🔩 Other
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates — packages/inception-core/src/index.ts, packages/mcp-fetch-proxy/src/mcp-server.ts, packages/scribe-mcp/src/mcp-server.ts
- miscellaneous updates — packages/inception-core/tsconfig.json, packages/mcp-fetch-proxy/package.json, packages/mcp-router/package.json, packages/mcp-router/src/mcp-server.ts
- miscellaneous updates — packages/inception-core/src/types/home-mesh.ts, packages/sovereign-home-mesh/
- miscellaneous updates — packages/inception-core/src/index.ts
- miscellaneous updates — packages/inception-core/src/types/psi.ts
- clean gitignore + sweep all multi-helix sprint output
- remove T20260306-A3 from active queue
- sync all active windows — multi-instance batch commit

### `packages/dispatch` — dispatch

### ✨ New
- server + task routing updates
- server + task routing updates
- server + task routing updates
- wire cloud mesh health monitor, auto-boot router from env, FORGE in genesis CI
- add FORGE forgeGetAsset tool + forgeTools barrel [T20260309-492]
- hot-reload capability signal for Inception Engine instruction layer
- server updates — packages/dispatch/package.json
- server updates — packages/dispatch/src/server.ts
- server updates — packages/dispatch/src/fetch-proxy-endpoint.ts
- server updates — packages/dispatch/src/server.ts
- server updates — packages/dispatch/src/server.ts
- server updates — packages/dispatch/src/server.ts
- server updates — packages/dispatch/src/server.ts
- ALFRED chat widget, client gallery, dispatch server
- autonomous agent infrastructure — BLOCKER protocol, auto-loop, /api/tasks/next, Windows multipliers
- ORACLE context system + photography phase 3-5
- TaskQueue with priority routing + agent capability matching #75
- complete multi-helix sprint P1
- add inception-dispatch MCP server — task routing via stdio #30
- FirstMission workflow, Ambient Dashboard, promotion gate
- agent runtime implementations + genkit + css updates
- ServiceScanner, SetupWizard, complete component schemas, new package indexes
- scaffold Dockerfiles for agents, auth, theme-engine service packages
- add genmedia server.ts HTTP layer, fix Dockerfile CMD, fix design-tokens build config, create Dockerfile.antigravity (Task T20260306-706 complete)
- migrate store from JSON files to SQLite (WAL mode)
- add force_complete tool + POST /api/tasks/:id/resolve endpoint
- compile and integration fixes for daemon and zero-day pub/sub (T20260306-[706,601,328,513])
- fix daemon REST dispatch claim & sync server api
- ship NAS watcher deploy and TRINITY-1 verification
- real-time window heartbeat system
- TS audit + multi-package shipping pass
- all-green dashboard — live service health hook, NeuralMonitor real endpoints, CampaignControl live status, dispatch activity feed [T20260306-012]
- add IDEATE, SHIP, VALIDATE, SCRIBE skill files + update dispatch queue
- Universal Agent Dispatch Network - Phase 1+2+3

### 🔧 Fixes
- make Docker build self-contained for NAS deployment
- compile TS in Docker — remove dependency on pre-built /build dir

### 🔩 Other
- Wave 22: Introduce strict unit testing for media engines
- validate(dispatch): 20 vitest cases for TaskQueue #80
- finalize Wave 8 handoff
- clean gitignore + sweep all multi-helix sprint output
- remove T20260306-A3 from active queue
- sync all active windows — multi-instance batch commit

### `packages/auth` — auth

### ✨ New
- implement zero-day live revenue dashboard and fix auth coupling
- 3-helix GTM sprint — PostHog tests + RoleGuard partner role + requireRole [AVERI/W26]
- #93 AVERI Memory Service + #94 Context Compaction + #96 Edge Inference Gateway [W25]
- full creative mobile app — Atelier design language
- firebase singleton init + multi-tenant auth contract tests [AVERI/W25-prep]
- 3-helix parallel test coverage — Chronos + Firebase Auth + MCP Fetch Proxy
- GTM Live Analytics + Chronos VisionOS + VelocityTelemetry
- GTM Live Analytics + Chronos VisionOS + VelocityTelemetry
- Zero-day implementation of BLE tracker and Living Canvas SSE
- 4-helix GTM sprint — Firebase Auth, MCP Fetch Proxy, Gitea Race Fix, Chat Console
- scaffold Dockerfiles for agents, auth, theme-engine service packages
- TS audit + multi-package shipping pass

### 🔩 Other
- miscellaneous updates
- Auto-commit: Getting git down to zero
- miscellaneous updates
- miscellaneous updates
- stage all pending changes — console, auth, genkit server, memory pkg, pnpm-lock, velocity telemetry page
- miscellaneous updates — packages/auth/src/index.ts
- miscellaneous updates — packages/auth/src/index.ts
- miscellaneous updates — packages/claude-agent/src/executor.d.ts, packages/claude-agent/src/index.d.ts, packages/claude-agent/src/types.d.ts, packages/auth/src/hooks/useAuth.d.ts
- miscellaneous updates — packages/auth/package-lock.json, packages/auth/package.json, packages/auth/src/lib/firebase.ts
- miscellaneous updates — packages/auth/src/env.d.ts
- miscellaneous updates — packages/auth/package-lock.json, packages/auth/package.json
- miscellaneous updates — packages/auth/src/lib/firebase.ts, packages/mcp-fetch-proxy/tsconfig.json
- miscellaneous updates — packages/auth/src/lib/firebase.ts, packages/mcp-fetch-proxy/tsconfig.json
- miscellaneous updates — packages/auth/package.json, packages/auth/package-lock.json
- miscellaneous updates — packages/auth/src/index.ts, packages/mcp-router/src/index.ts, packages/mcp-fetch-proxy/docker-compose.yml, packages/mcp-fetch-proxy/tsconfig.json
- miscellaneous updates — packages/auth/src/firebase.ts, packages/auth/src/components/, packages/auth/src/contexts/, packages/auth/src/hooks/
- miscellaneous updates — packages/auth/src/firebase.ts, packages/auth/tsconfig.json, packages/auth/src/lib/, packages/mcp-fetch-proxy/src/
- miscellaneous updates — packages/auth/tsconfig.json
- miscellaneous updates — packages/auth/package.json, packages/mcp-fetch-proxy/
- miscellaneous updates — infra/forgejo/docker-compose.yml, packages/auth/package.json, packages/auth/tsconfig.json
- miscellaneous updates — packages/auth/src/index.ts, packages/mcp-router/src/index.ts, packages/comet/src/proxy-server.ts
- miscellaneous updates — packages/auth/src/AuthGuard.tsx, packages/auth/src/firebase.ts, packages/comet/src/fetch-proxy.ts, packages/mcp-router/src/fetch-proxy.ts
- miscellaneous updates — packages/auth/src/AuthContext.tsx
- miscellaneous updates — packages/auth/src/firebase-auth.ts
- clean gitignore + sweep all multi-helix sprint output

### `packages/mcp-fetch-proxy` — mcp-fetch-proxy

### ✨ New
- GTM Live Analytics + Chronos VisionOS + VelocityTelemetry

### 🔧 Fixes
- make Docker build self-contained for NAS deployment

### 🔩 Other
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- Wave 21: Fix orchestrator AgentRouter test + verify T20260309-216 Wave 18 helices
- miscellaneous updates — packages/inception-core/src/index.ts, packages/mcp-fetch-proxy/src/mcp-server.ts, packages/scribe-mcp/src/mcp-server.ts
- miscellaneous updates — packages/inception-core/tsconfig.json, packages/mcp-fetch-proxy/package.json, packages/mcp-router/package.json, packages/mcp-router/src/mcp-server.ts
- miscellaneous updates — packages/mcp-fetch-proxy/package-lock.json, packages/mcp-router/package-lock.json
- miscellaneous updates — packages/mcp-fetch-proxy/package-lock.json, packages/mcp-fetch-proxy/package.json, packages/mcp-router/package-lock.json, packages/mcp-router/package.json
- miscellaneous updates — packages/mcp-fetch-proxy/src/mcp-server.ts, packages/mcp-router/src/mcp-server.ts, tmp-dna-check.mjs
- miscellaneous updates — packages/mcp-fetch-proxy/src/mcp-server.ts, packages/mcp-router/src/mcp-server.ts, packages/sovereign-home-mesh/src/routes/guests.ts, packages/sovereign-home-mesh/src/routes/intel.ts
- miscellaneous updates — packages/mcp-fetch-proxy/tsconfig.json
- miscellaneous updates — packages/mcp-fetch-proxy/package.json, packages/mcp-fetch-proxy/package-lock.json
- miscellaneous updates — packages/auth/src/lib/firebase.ts, packages/mcp-fetch-proxy/tsconfig.json
- miscellaneous updates — packages/auth/src/lib/firebase.ts, packages/mcp-fetch-proxy/tsconfig.json
- miscellaneous updates — packages/mcp-fetch-proxy/Dockerfile
- miscellaneous updates — packages/auth/src/index.ts, packages/mcp-router/src/index.ts, packages/mcp-fetch-proxy/docker-compose.yml, packages/mcp-fetch-proxy/tsconfig.json
- miscellaneous updates — packages/auth/src/firebase.ts, packages/auth/tsconfig.json, packages/auth/src/lib/, packages/mcp-fetch-proxy/src/
- miscellaneous updates — packages/auth/package.json, packages/mcp-fetch-proxy/

### `packages/sovereign-mesh` — sovereign-mesh

### ✨ New
- Always-on server management — PM2 ecosystem + start-all.ps1
- replace Twilio with Telnyx sovereign SMS + Gmail OAuth2 integration
- Wave 33 — Sovereign Mesh Intelligence Layer (Phase 1 of Sovereign Fabric)

### 🔩 Other
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates

### `packages/sensor-mesh` — sensor-mesh

### ✨ New
- bridge + mesh updates
- bridge + mesh updates
- Wave 30 parallel execution (iPhone Sensor Node, NEXUS Spatial Workspace MCP)
- ZigSimBridge update + ecosystem sync
- ORACLE context system + photography phase 3-5
- ship 4-helix integration tests + UE5 OSC asset generator
- activate cloud layer, MCP dynamic loading, somatic T3, SIGNAL dashboard

### 🔧 Fixes
- install @types/node, restore types config, fix JSDoc regex misparse in BiometricBridge
- clean up tsconfig types array — @types/node resolved via monorepo root

### 🔩 Other
- ﻿feat(wave-12): finalize construction and verification of Wave 12 multi-helix

### `packages/workspace-mcp` — workspace-mcp

### 🔧 Fixes
- rewrite Dashboard.tsx — fix duplicate state, broken checkService, missing refs (tsc clean)

### `packages/scribe-mcp` — scribe-mcp

### ✨ New
- Implement Phase 1 of Math LoRA Autonomous Learning Architecture intercept and training logger
- add package.json with MCP SDK dependency
- add inception-scribe MCP server — remember, recall, context, forget, handoff (Phas

### 🔩 Other
- miscellaneous updates
- miscellaneous updates
- Wave 22: Introduce strict unit testing for media engines
- Wave 21: Fix orchestrator AgentRouter test + verify T20260309-216 Wave 18 helices
- miscellaneous updates — packages/inception-core/src/index.ts, packages/mcp-fetch-proxy/src/mcp-server.ts, packages/scribe-mcp/src/mcp-server.ts
- Add packages/scribe-mcp/tsconfig.json

### `packages/forge` — forge

### ✨ New
- wire cloud mesh health monitor, auto-boot router from env, FORGE in genesis CI
- add FORGE forgeGetAsset tool + forgeTools barrel [T20260309-492]
- ship FORGE API server to genesis stack (T20260309-492)
- add HTTP API server + Genkit tool bindings for asset economy
- ship n8n-bridge, skills, ie-terminal, shard-v2, agent-spawner as MCP servers
- 3-helix execution — FORGE economy + wire ingestion + GTM injection
- init FORGE Real-Time Asset Economy — types, package scaffold
- ship wire-ingestion-mcp — universal live data layer
- Always-on server management — PM2 ecosystem + start-all.ps1

### ⚡ Improvements
- add FORGE .dockerignore — exclude node_modules/.git/models from build context

### 🔧 Fixes
- resolve all CI typecheck failures across 7 packages
- FORGE Dockerfile monorepo-root context — fix cloud-mesh build in NAS CI

### 🔩 Other
- miscellaneous updates
- miscellaneous updates

### `apps/console` — console

### ✨ New
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- complete the circle — live health prober, intelligent router, dashboard wired to real data
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- wire cloud mesh health monitor, auto-boot router from env, FORGE in genesis CI
- add FORGE forgeGetAsset tool + forgeTools barrel [T20260309-492]
- ship GTM Analytics Dashboard + AtlasLiveClient [T20260309-702]
- ship n8n-bridge, skills, ie-terminal, shard-v2, agent-spawner as MCP servers
- implement zero-day live revenue dashboard and fix auth coupling
- Live CRM data in both GTM dashboards — multi-helix wiring
- Financial Command Center — infra cost breakdown + Zero-Day pipeline + next-money actions
- Wave 33 — Sovereign Mesh Intelligence Layer (Phase 1 of Sovereign Fabric)
- Zero-Day GTM 3-helix parallel execution - ProspectPipeline Genkit flow + CRMSyncService + LeadScoringDashboard
- 3-helix parallel execution
- commit all pending changes - console App, zero-day lead-scoring, ecosystem submodules [Zero-Day GTM]
- console App.tsx update + zero-day intelligence layer (lead-scoring + context engine)
- Wave 32 Design Ingestion Pipeline
- BarnstormStudio TEMPO+FUSER+API + Firebase AuthGuard wired in Console [W26]
- [Wave 19 - Helix C] wire PostHog frontend telemetry to client portal UI
- integrate posthog frontend telemetry
- integrate zero-day provisioning dashboard link into client portal
- DIRA + UI wiring — apps/console/src/index.css
- DIRA + UI wiring — apps/console/src/contexts/AuthContext.tsx
- DIRA + UI wiring — apps/console/src/App.tsx, apps/console/src/main.tsx
- DIRA + UI wiring — apps/console/src/components/AuthGuard.tsx, apps/console/src/pages/ChatConsole.tsx
- DIRA + UI wiring — apps/console/src/contexts/
- DIRA + UI wiring — apps/console/src/pages/DispatchCenter.tsx
- DIRA + UI wiring — apps/console/src/components/DIRADashboard.tsx
- DIRA + UI wiring — apps/console/package.json, packages/console/src/components/DiraPanel.tsx -> apps/console/src/components/DiraPanel.tsx
- wire DIRA tab + Zero-Day intake page into Console
- DIRA dashboard, Zero-Day GTM intake UI, PostHog analytics
- PWA + ntfy push notification bridge
- activate cloud layer, MCP dynamic loading, somatic T3, SIGNAL dashboard
- add service worker with push notification + offline support
- add PWA manifest for iOS home screen install
- implement Airbyte ingestion background worker to Chromadb
- parallelize inception engine execution
- integrate recharts into finance dashboard for sparklines
- implement design sandbox live token engine
- complete 4 parallel workstreams
- FirstMission workflow, Ambient Dashboard, promotion gate
- agent runtime implementations + genkit + css updates
- ServiceScanner, SetupWizard, complete component schemas, new package indexes
- scaffold Dockerfiles for agents, auth, theme-engine service packages
- update flow index exports, inception-core index, EngineStatusGrid component
- director-agent flow, ie-engine flows, task-graph types, engine-registry types, FlowExplorer update
- complete primitive tokens + scaffold service Dockerfiles
- complete CVA token layer + fix design-tokens package exports
- NAS daemon execution + docker-compose + onboarding CSS
- multi-stage production Dockerfile for autonomous genesis node
- implement Phase 3-6 onboarding flow
- implement Phase 1 and 2 onboarding selectors
- integrate Phase 0 ambient welcome flow
- add missing UI components, sync tokens, and config updates
- complete JSON schema validator and UI package scaffolding (fixes #T-181, #T-258)
- add genmedia server.ts HTTP layer, fix Dockerfile CMD, fix design-tokens build config, create Dockerfile.antigravity (Task T20260306-706 complete)
- setup antigravity-nas daemon and DinD infrastructure
- ship NAS watcher deploy and TRINITY-1 verification
- console pages, genmedia animation, blueprints deploy infra [TRINITY-1 W1]
- wire 4 unrouted pages — AnimationStudio /animation, Blueprints /blueprints, ClientDashboard /clients/:id, ZeroDayIntake /intake-form — add nav items for Animation + Blueprints
- add scribe-daemon upstream :9100 /scribe/ route + /provision pass-through; all 9 GENESIS services now behind gateway
- all-green dashboard — live service health hook, NeuralMonitor real endpoints, CampaignControl live status, dispatch activity feed [T20260306-012]
- Redis pub/sub auto-chain — brief.created fires on intake complete, campaign auto-executes [T20260306-011]
- Universal Agent Dispatch Network - Phase 1+2+3
- Console deployed to NAS via Docker
- campaign service fully integrated into GENESIS stack
- Creative OS — 4 helices shipped [GENESIS wave]

### 🔧 Fixes
- clean git state — config/env module, vera-bridge, engine grid, agent-extension; exclude workspace-mcp nested repo
- fix all TS compile errors in Dashboard, DiraPanel, ThePanopticon
- fix all TS compile errors — Dashboard, DiraPanel, ThePanopticon
- resolve TS build panics and missing ReactFlow imports
- rewrite Dashboard.tsx — fix duplicate state, broken checkService, missing refs (tsc clean)
- eliminate all eslint errors and warnings across console and UI packages
- resolve ts errors in genkit and genmedia flows
- resolve NOT NULL constraint failures in dispatch server and update better-sqlite3
- align barrel exports with actual source — BriefSubscriber, DAG executor, schema types, runCompassValidation
- correct ZeroDayIntake provision endpoint path + nginx route
- genkit upstream port 4000->4100; feat(console): add Blueprints to Dashboard health monitor
- resolve all pre-existing TS errors in server.ts — notifier API, ECHO types, portal routes, Stripe cast [T20260306-020]
- Dockerfile — use npm directly, not pnpm filter

### 🔩 Other
- stage all pending changes — console, auth, genkit server, memory pkg, pnpm-lock, velocity telemetry page
- scrub simulation nomenclature for zero day production release
- pnpm lockfile sync
- AGENTS.md updates
- merge: inception-engine sync — Dashboard + nas-watcher + zero-day deps
- sync Dashboard, tsconfig, memory package deps
- resolved agent-status conflict
- fix all typescript errors and css warnings for genesis stack validation
- clean gitignore + sweep all multi-helix sprint output
- style: add missing CSS modifier classes extracted from inline styles in CreativeWorkstation
- fix console typings and linting issues
- commit changes before multi-helix sprint
- finalize pending changes for parallel sprint
- [AVERI] Fix strict type and CSS inline style lint errors
- stage dirty working tree before multi-helix sprint
- stage console, design-sandbox, and genkit changes
- integrate theme engine tokens into console app and add pickup helper
- test(design-tokens): add round-trip integration test and fix syntax
-  fix: wrap root App in BrowserRouter to resolve useLocation crash
- remove T20260306-A3 from active queue
- sync all active windows — multi-instance batch commit

### `apps/event-intake` — event-intake

### ✨ New
- ship n8n-bridge, skills, ie-terminal, shard-v2, agent-spawner as MCP servers

### 🔩 Other
- miscellaneous updates
- miscellaneous updates


---

## v5.1.0-COMMUNITY — 2026-03-11

### `packages/genkit` — genkit

### ✨ New
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- GTM intake + analytics updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- ship The Transmission — autonomous infinity story (genkit flow + daemon + web app)
- complete the circle — live health prober, intelligent router, dashboard wired to real data
- add innerVoice flow + HTTP route for Sandbar Stream Inner Voice AI
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- sovereign local LLM stack
- add FORGE forgeGetAsset tool + forgeTools barrel [T20260309-492]
- add HTTP API server + Genkit tool bindings for asset economy
- implement zero-day live revenue dashboard and fix auth coupling
- hot-reload capability signal for Inception Engine instruction layer
- ship wire-ingestion-mcp — universal live data layer
- Always-on server management — PM2 ecosystem + start-all.ps1
- Cloud Run antigravity public + registry update
- Wave 32 Design Ingestion Pipeline and Registry
- Wave 32 Design Ingestion Pipeline
- BarnstormStudio TEMPO+FUSER+API + Firebase AuthGuard wired in Console [W26]
- AVERI Mobile PWA — context-enriched iPhone AI interface
- ship NBC NEXUS spatial control room prototype
- AI flow updates — packages/genkit/src/plugins/perplexity.js, packages/genkit/src/plugins/vertex-ai.js, packages/genkit/src/config/model-registry.d.ts, packages/genkit/src/config/model-registry.d.ts.map
- AI flow updates — packages/genkit/src/server.ts
- AI flow updates — packages/genkit/src/config/model-registry.ts
- AI flow updates — packages/genkit/src/flows/birdWatcher.ts, packages/genkit/src/flows/guestIntelligence.ts, packages/genkit/src/flows/strangerAlert.ts
- AI flow updates — packages/genkit/src/index.ts, packages/genkit/src/local-providers.ts
- AI flow updates — packages/genkit/src/middleware/smart-router.ts
- AI flow updates — packages/genkit/src/config/
- AI flow updates — packages/genkit/src/server.ts
- AI flow updates — packages/genkit/src/index.ts
- AI flow updates — packages/genkit/src/middleware/smart-router.ts
- AI flow updates — packages/genkit/src/flows/a2a-orchestration.ts
- AI flow updates — packages/genkit/src/creative-dna-vectors.ts
- DIRA Panel, sensor-mesh barrel, zero-day UI/analytics wiring [window Q]
- wire DIRA tab + Zero-Day intake page into Console
- DIRA dashboard, Zero-Day GTM intake UI, PostHog analytics
- spatial web integration complete
- ORACLE context system + photography phase 3-5
- T20260308-832 Phase 7a MVP implementation
- add productionCaseToScribeInput mapper -- unified DIRA->SCRIBE tag contract (#4)
- implement Airbyte ingestion background worker to Chromadb
- add CreatorSidebar and CreatorProductivityDashboard components
- SC-04 KEEPER v2 boot protocol w/ HANDOFF.md task-aware recall
- SCRIBE v2 memory layer + MCP Autoloader
- 5-helix sprint — MCP-05/06/07 + TOOL-01/02/03 + COMET dispatch
- DIRA auto-resolve engine — DIRA-01, DIRA-02, DIRA-03 [partial]
- SC-05 wire scribe tools into AVERI flows + SC-06 integration tests
- complete SCRIBE v2 + MCP Router epics [SC-01..06, MCP-01..04]
- scaffold MCP Router package + claim tasks [T20260307-772, T20260307-886]
- SCRIBE v2 context-pager + keeper-boot scaffolds, ghost updates, pnpm lockfile sync
- design-agent scanner, god-prompt pipelines, ghost SEO, genkit tsconfig cleanup, linter fixes [multi-helix]
- parallelize inception engine execution
- agent runtime implementations + genkit + css updates
- update flow index exports, inception-core index, EngineStatusGrid component
- director-agent flow, ie-engine flows, task-graph types, engine-registry types, FlowExplorer update
- AJV token tier validator + complete primitive tokens
- complete primitive tokens + scaffold service Dockerfiles
- add genmedia server.ts HTTP layer, fix Dockerfile CMD, fix design-tokens build config, create Dockerfile.antigravity (Task T20260306-706 complete)
- setup antigravity-nas daemon and DinD infrastructure
- compile and integration fixes for daemon and zero-day pub/sub (T20260306-[706,601,328,513])
- ship NAS watcher deploy and TRINITY-1 verification
- vertex-ai plugin, docker-compose expansion, genkit server updates
- wire GDrive MCP brief upload + docker-compose env fixes [T20260306-022]
- TS audit + multi-package shipping pass
- add comet consumer, memory flow, gdrive-client, and stripe publisher
- all-green dashboard — live service health hook, NeuralMonitor real endpoints, CampaignControl live status, dispatch activity feed [T20260306-012]
- Redis pub/sub auto-chain — brief.created fires on intake complete, campaign auto-executes [T20260306-011]
- wire CreativeDirector, generate-media, and score endpoints into genkit server
- AGENTS.md, .agents rules, dispatch board, CONTEXT.md in key packages

### 🔧 Fixes
- inject TRANSMISSION_MODEL via env — Article VI compliance
- clean git state — config/env module, vera-bridge, engine grid, agent-extension; exclude workspace-mcp nested repo
- resolve all CI typecheck failures across 7 packages
- unify tag contract via productionCaseToScribeInput (Issue #4 F3)
- store category/importance as metadata, add where clause to recall (Issue #5 F1/F2)
- use createRequire() for JSON import compat with Node ESM
- eliminate all eslint errors and warnings across console and UI packages
- resolve ts errors in genkit and genmedia flows
- filter undefined/duplicate plugins before genkit() call to prevent Plugin undefined already registered crash
- remove ZeroDayGtmSwarmFlow re-export from index.ts to break ESM circular dependency causing ai TDZ crash loop
- break circular ESM import in circuit-breaker.ts — import LOCAL_MODELS from local-providers.js instead of index.js barrel to resolve TDZ crash
- add @inception/auth to genkit + god-prompt Dockerfiles to resolve ERR_MODULE_NOT_FOUND at runtime
- fix genkit TSX monorepo resolution and ghost missing xml2js dependency

### 🔩 Other
- rename Inception Engine and Antigravity to CLE globally
- miscellaneous updates
- helix: complete A/F/G — AVERI critique, sovereign inference, foley intelligence
- helix: ship 9-helix creative superiority build — tsc clean
- Auto-commit: Getting git down to zero
- trigger full NAS deployment and sync all undeployed changes
- update registry for wave 26 completion
- merge remote genkit changes [W27]
- stage workspace changes — pnpm-lock, ecosystem updates, Wave 24 GTM boot
- stage all pending changes — console, auth, genkit server, memory pkg, pnpm-lock, velocity telemetry page
- restored nbc nexus stashed modifications
- fix all typescript errors and css warnings for genesis stack validation
- clean gitignore + sweep all multi-helix sprint output
- fix console typings and linting issues
- stage console, design-sandbox, and genkit changes
- remove T20260306-A3 from active queue
- sync all active windows — multi-instance batch commit
- update startup banner with campaign endpoints

### `packages/inception-core` — inception-core

### ✨ New
- ship The Transmission — autonomous infinity story (genkit flow + daemon + web app)
- hot-reload capability signal for Inception Engine instruction layer
- final delivery of multi-window warp tasks
- update flow index exports, inception-core index, EngineStatusGrid component
- director-agent flow, ie-engine flows, task-graph types, engine-registry types, FlowExplorer update
- TS audit + multi-package shipping pass
- build system + tests passing (T20260306-015)
- Redis pub/sub auto-chain — brief.created fires on intake complete, campaign auto-executes [T20260306-011]
- add IDEATE, SHIP, VALIDATE, SCRIBE skill files + update dispatch queue
- AGENTS.md, .agents rules, dispatch board, CONTEXT.md in key packages

### 🔧 Fixes
- clean git state — config/env module, vera-bridge, engine grid, agent-extension; exclude workspace-mcp nested repo

### 🔩 Other
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates — packages/inception-core/src/index.ts, packages/mcp-fetch-proxy/src/mcp-server.ts, packages/scribe-mcp/src/mcp-server.ts
- miscellaneous updates — packages/inception-core/tsconfig.json, packages/mcp-fetch-proxy/package.json, packages/mcp-router/package.json, packages/mcp-router/src/mcp-server.ts
- miscellaneous updates — packages/inception-core/src/types/home-mesh.ts, packages/sovereign-home-mesh/
- miscellaneous updates — packages/inception-core/src/index.ts
- miscellaneous updates — packages/inception-core/src/types/psi.ts
- clean gitignore + sweep all multi-helix sprint output
- remove T20260306-A3 from active queue
- sync all active windows — multi-instance batch commit

### `packages/dispatch` — dispatch

### ✨ New
- server + task routing updates
- server + task routing updates
- server + task routing updates
- wire cloud mesh health monitor, auto-boot router from env, FORGE in genesis CI
- add FORGE forgeGetAsset tool + forgeTools barrel [T20260309-492]
- hot-reload capability signal for Inception Engine instruction layer
- server updates — packages/dispatch/package.json
- server updates — packages/dispatch/src/server.ts
- server updates — packages/dispatch/src/fetch-proxy-endpoint.ts
- server updates — packages/dispatch/src/server.ts
- server updates — packages/dispatch/src/server.ts
- server updates — packages/dispatch/src/server.ts
- server updates — packages/dispatch/src/server.ts
- ALFRED chat widget, client gallery, dispatch server
- autonomous agent infrastructure — BLOCKER protocol, auto-loop, /api/tasks/next, Windows multipliers
- ORACLE context system + photography phase 3-5
- TaskQueue with priority routing + agent capability matching #75
- complete multi-helix sprint P1
- add inception-dispatch MCP server — task routing via stdio #30
- FirstMission workflow, Ambient Dashboard, promotion gate
- agent runtime implementations + genkit + css updates
- ServiceScanner, SetupWizard, complete component schemas, new package indexes
- scaffold Dockerfiles for agents, auth, theme-engine service packages
- add genmedia server.ts HTTP layer, fix Dockerfile CMD, fix design-tokens build config, create Dockerfile.antigravity (Task T20260306-706 complete)
- migrate store from JSON files to SQLite (WAL mode)
- add force_complete tool + POST /api/tasks/:id/resolve endpoint
- compile and integration fixes for daemon and zero-day pub/sub (T20260306-[706,601,328,513])
- fix daemon REST dispatch claim & sync server api
- ship NAS watcher deploy and TRINITY-1 verification
- real-time window heartbeat system
- TS audit + multi-package shipping pass
- all-green dashboard — live service health hook, NeuralMonitor real endpoints, CampaignControl live status, dispatch activity feed [T20260306-012]
- add IDEATE, SHIP, VALIDATE, SCRIBE skill files + update dispatch queue
- Universal Agent Dispatch Network - Phase 1+2+3

### 🔧 Fixes
- make Docker build self-contained for NAS deployment
- compile TS in Docker — remove dependency on pre-built /build dir

### 🔩 Other
- Wave 22: Introduce strict unit testing for media engines
- validate(dispatch): 20 vitest cases for TaskQueue #80
- finalize Wave 8 handoff
- clean gitignore + sweep all multi-helix sprint output
- remove T20260306-A3 from active queue
- sync all active windows — multi-instance batch commit

### `packages/auth` — auth

### ✨ New
- implement zero-day live revenue dashboard and fix auth coupling
- 3-helix GTM sprint — PostHog tests + RoleGuard partner role + requireRole [AVERI/W26]
- #93 AVERI Memory Service + #94 Context Compaction + #96 Edge Inference Gateway [W25]
- full creative mobile app — Atelier design language
- firebase singleton init + multi-tenant auth contract tests [AVERI/W25-prep]
- 3-helix parallel test coverage — Chronos + Firebase Auth + MCP Fetch Proxy
- GTM Live Analytics + Chronos VisionOS + VelocityTelemetry
- GTM Live Analytics + Chronos VisionOS + VelocityTelemetry
- Zero-day implementation of BLE tracker and Living Canvas SSE
- 4-helix GTM sprint — Firebase Auth, MCP Fetch Proxy, Gitea Race Fix, Chat Console
- scaffold Dockerfiles for agents, auth, theme-engine service packages
- TS audit + multi-package shipping pass

### 🔩 Other
- miscellaneous updates
- Auto-commit: Getting git down to zero
- miscellaneous updates
- miscellaneous updates
- stage all pending changes — console, auth, genkit server, memory pkg, pnpm-lock, velocity telemetry page
- miscellaneous updates — packages/auth/src/index.ts
- miscellaneous updates — packages/auth/src/index.ts
- miscellaneous updates — packages/claude-agent/src/executor.d.ts, packages/claude-agent/src/index.d.ts, packages/claude-agent/src/types.d.ts, packages/auth/src/hooks/useAuth.d.ts
- miscellaneous updates — packages/auth/package-lock.json, packages/auth/package.json, packages/auth/src/lib/firebase.ts
- miscellaneous updates — packages/auth/src/env.d.ts
- miscellaneous updates — packages/auth/package-lock.json, packages/auth/package.json
- miscellaneous updates — packages/auth/src/lib/firebase.ts, packages/mcp-fetch-proxy/tsconfig.json
- miscellaneous updates — packages/auth/src/lib/firebase.ts, packages/mcp-fetch-proxy/tsconfig.json
- miscellaneous updates — packages/auth/package.json, packages/auth/package-lock.json
- miscellaneous updates — packages/auth/src/index.ts, packages/mcp-router/src/index.ts, packages/mcp-fetch-proxy/docker-compose.yml, packages/mcp-fetch-proxy/tsconfig.json
- miscellaneous updates — packages/auth/src/firebase.ts, packages/auth/src/components/, packages/auth/src/contexts/, packages/auth/src/hooks/
- miscellaneous updates — packages/auth/src/firebase.ts, packages/auth/tsconfig.json, packages/auth/src/lib/, packages/mcp-fetch-proxy/src/
- miscellaneous updates — packages/auth/tsconfig.json
- miscellaneous updates — packages/auth/package.json, packages/mcp-fetch-proxy/
- miscellaneous updates — infra/forgejo/docker-compose.yml, packages/auth/package.json, packages/auth/tsconfig.json
- miscellaneous updates — packages/auth/src/index.ts, packages/mcp-router/src/index.ts, packages/comet/src/proxy-server.ts
- miscellaneous updates — packages/auth/src/AuthGuard.tsx, packages/auth/src/firebase.ts, packages/comet/src/fetch-proxy.ts, packages/mcp-router/src/fetch-proxy.ts
- miscellaneous updates — packages/auth/src/AuthContext.tsx
- miscellaneous updates — packages/auth/src/firebase-auth.ts
- clean gitignore + sweep all multi-helix sprint output

### `packages/mcp-fetch-proxy` — mcp-fetch-proxy

### ✨ New
- GTM Live Analytics + Chronos VisionOS + VelocityTelemetry

### 🔧 Fixes
- make Docker build self-contained for NAS deployment

### 🔩 Other
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- Wave 21: Fix orchestrator AgentRouter test + verify T20260309-216 Wave 18 helices
- miscellaneous updates — packages/inception-core/src/index.ts, packages/mcp-fetch-proxy/src/mcp-server.ts, packages/scribe-mcp/src/mcp-server.ts
- miscellaneous updates — packages/inception-core/tsconfig.json, packages/mcp-fetch-proxy/package.json, packages/mcp-router/package.json, packages/mcp-router/src/mcp-server.ts
- miscellaneous updates — packages/mcp-fetch-proxy/package-lock.json, packages/mcp-router/package-lock.json
- miscellaneous updates — packages/mcp-fetch-proxy/package-lock.json, packages/mcp-fetch-proxy/package.json, packages/mcp-router/package-lock.json, packages/mcp-router/package.json
- miscellaneous updates — packages/mcp-fetch-proxy/src/mcp-server.ts, packages/mcp-router/src/mcp-server.ts, tmp-dna-check.mjs
- miscellaneous updates — packages/mcp-fetch-proxy/src/mcp-server.ts, packages/mcp-router/src/mcp-server.ts, packages/sovereign-home-mesh/src/routes/guests.ts, packages/sovereign-home-mesh/src/routes/intel.ts
- miscellaneous updates — packages/mcp-fetch-proxy/tsconfig.json
- miscellaneous updates — packages/mcp-fetch-proxy/package.json, packages/mcp-fetch-proxy/package-lock.json
- miscellaneous updates — packages/auth/src/lib/firebase.ts, packages/mcp-fetch-proxy/tsconfig.json
- miscellaneous updates — packages/auth/src/lib/firebase.ts, packages/mcp-fetch-proxy/tsconfig.json
- miscellaneous updates — packages/mcp-fetch-proxy/Dockerfile
- miscellaneous updates — packages/auth/src/index.ts, packages/mcp-router/src/index.ts, packages/mcp-fetch-proxy/docker-compose.yml, packages/mcp-fetch-proxy/tsconfig.json
- miscellaneous updates — packages/auth/src/firebase.ts, packages/auth/tsconfig.json, packages/auth/src/lib/, packages/mcp-fetch-proxy/src/
- miscellaneous updates — packages/auth/package.json, packages/mcp-fetch-proxy/

### `packages/sovereign-mesh` — sovereign-mesh

### ✨ New
- Always-on server management — PM2 ecosystem + start-all.ps1
- replace Twilio with Telnyx sovereign SMS + Gmail OAuth2 integration
- Wave 33 — Sovereign Mesh Intelligence Layer (Phase 1 of Sovereign Fabric)

### 🔩 Other
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates

### `packages/sensor-mesh` — sensor-mesh

### ✨ New
- bridge + mesh updates
- bridge + mesh updates
- Wave 30 parallel execution (iPhone Sensor Node, NEXUS Spatial Workspace MCP)
- ZigSimBridge update + ecosystem sync
- ORACLE context system + photography phase 3-5
- ship 4-helix integration tests + UE5 OSC asset generator
- activate cloud layer, MCP dynamic loading, somatic T3, SIGNAL dashboard

### 🔧 Fixes
- install @types/node, restore types config, fix JSDoc regex misparse in BiometricBridge
- clean up tsconfig types array — @types/node resolved via monorepo root

### 🔩 Other
- ﻿feat(wave-12): finalize construction and verification of Wave 12 multi-helix

### `packages/workspace-mcp` — workspace-mcp

### 🔧 Fixes
- rewrite Dashboard.tsx — fix duplicate state, broken checkService, missing refs (tsc clean)

### `packages/scribe-mcp` — scribe-mcp

### ✨ New
- Implement Phase 1 of Math LoRA Autonomous Learning Architecture intercept and training logger
- add package.json with MCP SDK dependency
- add inception-scribe MCP server — remember, recall, context, forget, handoff (Phas

### 🔩 Other
- miscellaneous updates
- miscellaneous updates
- Wave 22: Introduce strict unit testing for media engines
- Wave 21: Fix orchestrator AgentRouter test + verify T20260309-216 Wave 18 helices
- miscellaneous updates — packages/inception-core/src/index.ts, packages/mcp-fetch-proxy/src/mcp-server.ts, packages/scribe-mcp/src/mcp-server.ts
- Add packages/scribe-mcp/tsconfig.json

### `packages/forge` — forge

### ✨ New
- wire cloud mesh health monitor, auto-boot router from env, FORGE in genesis CI
- add FORGE forgeGetAsset tool + forgeTools barrel [T20260309-492]
- ship FORGE API server to genesis stack (T20260309-492)
- add HTTP API server + Genkit tool bindings for asset economy
- ship n8n-bridge, skills, ie-terminal, shard-v2, agent-spawner as MCP servers
- 3-helix execution — FORGE economy + wire ingestion + GTM injection
- init FORGE Real-Time Asset Economy — types, package scaffold
- ship wire-ingestion-mcp — universal live data layer
- Always-on server management — PM2 ecosystem + start-all.ps1

### ⚡ Improvements
- add FORGE .dockerignore — exclude node_modules/.git/models from build context

### 🔧 Fixes
- resolve all CI typecheck failures across 7 packages
- FORGE Dockerfile monorepo-root context — fix cloud-mesh build in NAS CI

### 🔩 Other
- miscellaneous updates
- miscellaneous updates

### `apps/console` — console

### ✨ New
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- complete the circle — live health prober, intelligent router, dashboard wired to real data
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- wire cloud mesh health monitor, auto-boot router from env, FORGE in genesis CI
- add FORGE forgeGetAsset tool + forgeTools barrel [T20260309-492]
- ship GTM Analytics Dashboard + AtlasLiveClient [T20260309-702]
- ship n8n-bridge, skills, ie-terminal, shard-v2, agent-spawner as MCP servers
- implement zero-day live revenue dashboard and fix auth coupling
- Live CRM data in both GTM dashboards — multi-helix wiring
- Financial Command Center — infra cost breakdown + Zero-Day pipeline + next-money actions
- Wave 33 — Sovereign Mesh Intelligence Layer (Phase 1 of Sovereign Fabric)
- Zero-Day GTM 3-helix parallel execution - ProspectPipeline Genkit flow + CRMSyncService + LeadScoringDashboard
- 3-helix parallel execution
- commit all pending changes - console App, zero-day lead-scoring, ecosystem submodules [Zero-Day GTM]
- console App.tsx update + zero-day intelligence layer (lead-scoring + context engine)
- Wave 32 Design Ingestion Pipeline
- BarnstormStudio TEMPO+FUSER+API + Firebase AuthGuard wired in Console [W26]
- [Wave 19 - Helix C] wire PostHog frontend telemetry to client portal UI
- integrate posthog frontend telemetry
- integrate zero-day provisioning dashboard link into client portal
- DIRA + UI wiring — apps/console/src/index.css
- DIRA + UI wiring — apps/console/src/contexts/AuthContext.tsx
- DIRA + UI wiring — apps/console/src/App.tsx, apps/console/src/main.tsx
- DIRA + UI wiring — apps/console/src/components/AuthGuard.tsx, apps/console/src/pages/ChatConsole.tsx
- DIRA + UI wiring — apps/console/src/contexts/
- DIRA + UI wiring — apps/console/src/pages/DispatchCenter.tsx
- DIRA + UI wiring — apps/console/src/components/DIRADashboard.tsx
- DIRA + UI wiring — apps/console/package.json, packages/console/src/components/DiraPanel.tsx -> apps/console/src/components/DiraPanel.tsx
- wire DIRA tab + Zero-Day intake page into Console
- DIRA dashboard, Zero-Day GTM intake UI, PostHog analytics
- PWA + ntfy push notification bridge
- activate cloud layer, MCP dynamic loading, somatic T3, SIGNAL dashboard
- add service worker with push notification + offline support
- add PWA manifest for iOS home screen install
- implement Airbyte ingestion background worker to Chromadb
- parallelize inception engine execution
- integrate recharts into finance dashboard for sparklines
- implement design sandbox live token engine
- complete 4 parallel workstreams
- FirstMission workflow, Ambient Dashboard, promotion gate
- agent runtime implementations + genkit + css updates
- ServiceScanner, SetupWizard, complete component schemas, new package indexes
- scaffold Dockerfiles for agents, auth, theme-engine service packages
- update flow index exports, inception-core index, EngineStatusGrid component
- director-agent flow, ie-engine flows, task-graph types, engine-registry types, FlowExplorer update
- complete primitive tokens + scaffold service Dockerfiles
- complete CVA token layer + fix design-tokens package exports
- NAS daemon execution + docker-compose + onboarding CSS
- multi-stage production Dockerfile for autonomous genesis node
- implement Phase 3-6 onboarding flow
- implement Phase 1 and 2 onboarding selectors
- integrate Phase 0 ambient welcome flow
- add missing UI components, sync tokens, and config updates
- complete JSON schema validator and UI package scaffolding (fixes #T-181, #T-258)
- add genmedia server.ts HTTP layer, fix Dockerfile CMD, fix design-tokens build config, create Dockerfile.antigravity (Task T20260306-706 complete)
- setup antigravity-nas daemon and DinD infrastructure
- ship NAS watcher deploy and TRINITY-1 verification
- console pages, genmedia animation, blueprints deploy infra [TRINITY-1 W1]
- wire 4 unrouted pages — AnimationStudio /animation, Blueprints /blueprints, ClientDashboard /clients/:id, ZeroDayIntake /intake-form — add nav items for Animation + Blueprints
- add scribe-daemon upstream :9100 /scribe/ route + /provision pass-through; all 9 GENESIS services now behind gateway
- all-green dashboard — live service health hook, NeuralMonitor real endpoints, CampaignControl live status, dispatch activity feed [T20260306-012]
- Redis pub/sub auto-chain — brief.created fires on intake complete, campaign auto-executes [T20260306-011]
- Universal Agent Dispatch Network - Phase 1+2+3
- Console deployed to NAS via Docker
- campaign service fully integrated into GENESIS stack
- Creative OS — 4 helices shipped [GENESIS wave]

### 🔧 Fixes
- clean git state — config/env module, vera-bridge, engine grid, agent-extension; exclude workspace-mcp nested repo
- fix all TS compile errors in Dashboard, DiraPanel, ThePanopticon
- fix all TS compile errors — Dashboard, DiraPanel, ThePanopticon
- resolve TS build panics and missing ReactFlow imports
- rewrite Dashboard.tsx — fix duplicate state, broken checkService, missing refs (tsc clean)
- eliminate all eslint errors and warnings across console and UI packages
- resolve ts errors in genkit and genmedia flows
- resolve NOT NULL constraint failures in dispatch server and update better-sqlite3
- align barrel exports with actual source — BriefSubscriber, DAG executor, schema types, runCompassValidation
- correct ZeroDayIntake provision endpoint path + nginx route
- genkit upstream port 4000->4100; feat(console): add Blueprints to Dashboard health monitor
- resolve all pre-existing TS errors in server.ts — notifier API, ECHO types, portal routes, Stripe cast [T20260306-020]
- Dockerfile — use npm directly, not pnpm filter

### 🔩 Other
- stage all pending changes — console, auth, genkit server, memory pkg, pnpm-lock, velocity telemetry page
- scrub simulation nomenclature for zero day production release
- pnpm lockfile sync
- AGENTS.md updates
- merge: inception-engine sync — Dashboard + nas-watcher + zero-day deps
- sync Dashboard, tsconfig, memory package deps
- resolved agent-status conflict
- fix all typescript errors and css warnings for genesis stack validation
- clean gitignore + sweep all multi-helix sprint output
- style: add missing CSS modifier classes extracted from inline styles in CreativeWorkstation
- fix console typings and linting issues
- commit changes before multi-helix sprint
- finalize pending changes for parallel sprint
- [AVERI] Fix strict type and CSS inline style lint errors
- stage dirty working tree before multi-helix sprint
- stage console, design-sandbox, and genkit changes
- integrate theme engine tokens into console app and add pickup helper
- test(design-tokens): add round-trip integration test and fix syntax
-  fix: wrap root App in BrowserRouter to resolve useLocation crash
- remove T20260306-A3 from active queue
- sync all active windows — multi-instance batch commit

### `apps/event-intake` — event-intake

### ✨ New
- ship n8n-bridge, skills, ie-terminal, shard-v2, agent-spawner as MCP servers

### 🔩 Other
- miscellaneous updates
- miscellaneous updates


---

## v5.1.0-COMMUNITY — 2026-03-11

### `packages/genkit` — genkit

### ✨ New
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- GTM intake + analytics updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- ship The Transmission — autonomous infinity story (genkit flow + daemon + web app)
- complete the circle — live health prober, intelligent router, dashboard wired to real data
- add innerVoice flow + HTTP route for Sandbar Stream Inner Voice AI
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- AI flow updates
- sovereign local LLM stack
- add FORGE forgeGetAsset tool + forgeTools barrel [T20260309-492]
- add HTTP API server + Genkit tool bindings for asset economy
- implement zero-day live revenue dashboard and fix auth coupling
- hot-reload capability signal for Inception Engine instruction layer
- ship wire-ingestion-mcp — universal live data layer
- Always-on server management — PM2 ecosystem + start-all.ps1
- Cloud Run antigravity public + registry update
- Wave 32 Design Ingestion Pipeline and Registry
- Wave 32 Design Ingestion Pipeline
- BarnstormStudio TEMPO+FUSER+API + Firebase AuthGuard wired in Console [W26]
- AVERI Mobile PWA — context-enriched iPhone AI interface
- ship NBC NEXUS spatial control room prototype
- AI flow updates — packages/genkit/src/plugins/perplexity.js, packages/genkit/src/plugins/vertex-ai.js, packages/genkit/src/config/model-registry.d.ts, packages/genkit/src/config/model-registry.d.ts.map
- AI flow updates — packages/genkit/src/server.ts
- AI flow updates — packages/genkit/src/config/model-registry.ts
- AI flow updates — packages/genkit/src/flows/birdWatcher.ts, packages/genkit/src/flows/guestIntelligence.ts, packages/genkit/src/flows/strangerAlert.ts
- AI flow updates — packages/genkit/src/index.ts, packages/genkit/src/local-providers.ts
- AI flow updates — packages/genkit/src/middleware/smart-router.ts
- AI flow updates — packages/genkit/src/config/
- AI flow updates — packages/genkit/src/server.ts
- AI flow updates — packages/genkit/src/index.ts
- AI flow updates — packages/genkit/src/middleware/smart-router.ts
- AI flow updates — packages/genkit/src/flows/a2a-orchestration.ts
- AI flow updates — packages/genkit/src/creative-dna-vectors.ts
- DIRA Panel, sensor-mesh barrel, zero-day UI/analytics wiring [window Q]
- wire DIRA tab + Zero-Day intake page into Console
- DIRA dashboard, Zero-Day GTM intake UI, PostHog analytics
- spatial web integration complete
- ORACLE context system + photography phase 3-5
- T20260308-832 Phase 7a MVP implementation
- add productionCaseToScribeInput mapper -- unified DIRA->SCRIBE tag contract (#4)
- implement Airbyte ingestion background worker to Chromadb
- add CreatorSidebar and CreatorProductivityDashboard components
- SC-04 KEEPER v2 boot protocol w/ HANDOFF.md task-aware recall
- SCRIBE v2 memory layer + MCP Autoloader
- 5-helix sprint — MCP-05/06/07 + TOOL-01/02/03 + COMET dispatch
- DIRA auto-resolve engine — DIRA-01, DIRA-02, DIRA-03 [partial]
- SC-05 wire scribe tools into AVERI flows + SC-06 integration tests
- complete SCRIBE v2 + MCP Router epics [SC-01..06, MCP-01..04]
- scaffold MCP Router package + claim tasks [T20260307-772, T20260307-886]
- SCRIBE v2 context-pager + keeper-boot scaffolds, ghost updates, pnpm lockfile sync
- design-agent scanner, god-prompt pipelines, ghost SEO, genkit tsconfig cleanup, linter fixes [multi-helix]
- parallelize inception engine execution
- agent runtime implementations + genkit + css updates
- update flow index exports, inception-core index, EngineStatusGrid component
- director-agent flow, ie-engine flows, task-graph types, engine-registry types, FlowExplorer update
- AJV token tier validator + complete primitive tokens
- complete primitive tokens + scaffold service Dockerfiles
- add genmedia server.ts HTTP layer, fix Dockerfile CMD, fix design-tokens build config, create Dockerfile.antigravity (Task T20260306-706 complete)
- setup antigravity-nas daemon and DinD infrastructure
- compile and integration fixes for daemon and zero-day pub/sub (T20260306-[706,601,328,513])
- ship NAS watcher deploy and TRINITY-1 verification
- vertex-ai plugin, docker-compose expansion, genkit server updates
- wire GDrive MCP brief upload + docker-compose env fixes [T20260306-022]
- TS audit + multi-package shipping pass
- add comet consumer, memory flow, gdrive-client, and stripe publisher
- all-green dashboard — live service health hook, NeuralMonitor real endpoints, CampaignControl live status, dispatch activity feed [T20260306-012]
- Redis pub/sub auto-chain — brief.created fires on intake complete, campaign auto-executes [T20260306-011]
- wire CreativeDirector, generate-media, and score endpoints into genkit server
- AGENTS.md, .agents rules, dispatch board, CONTEXT.md in key packages

### 🔧 Fixes
- inject TRANSMISSION_MODEL via env — Article VI compliance
- clean git state — config/env module, vera-bridge, engine grid, agent-extension; exclude workspace-mcp nested repo
- resolve all CI typecheck failures across 7 packages
- unify tag contract via productionCaseToScribeInput (Issue #4 F3)
- store category/importance as metadata, add where clause to recall (Issue #5 F1/F2)
- use createRequire() for JSON import compat with Node ESM
- eliminate all eslint errors and warnings across console and UI packages
- resolve ts errors in genkit and genmedia flows
- filter undefined/duplicate plugins before genkit() call to prevent Plugin undefined already registered crash
- remove ZeroDayGtmSwarmFlow re-export from index.ts to break ESM circular dependency causing ai TDZ crash loop
- break circular ESM import in circuit-breaker.ts — import LOCAL_MODELS from local-providers.js instead of index.js barrel to resolve TDZ crash
- add @inception/auth to genkit + god-prompt Dockerfiles to resolve ERR_MODULE_NOT_FOUND at runtime
- fix genkit TSX monorepo resolution and ghost missing xml2js dependency

### 🔩 Other
- rename Inception Engine and Antigravity to CLE globally
- miscellaneous updates
- helix: complete A/F/G — AVERI critique, sovereign inference, foley intelligence
- helix: ship 9-helix creative superiority build — tsc clean
- Auto-commit: Getting git down to zero
- trigger full NAS deployment and sync all undeployed changes
- update registry for wave 26 completion
- merge remote genkit changes [W27]
- stage workspace changes — pnpm-lock, ecosystem updates, Wave 24 GTM boot
- stage all pending changes — console, auth, genkit server, memory pkg, pnpm-lock, velocity telemetry page
- restored nbc nexus stashed modifications
- fix all typescript errors and css warnings for genesis stack validation
- clean gitignore + sweep all multi-helix sprint output
- fix console typings and linting issues
- stage console, design-sandbox, and genkit changes
- remove T20260306-A3 from active queue
- sync all active windows — multi-instance batch commit
- update startup banner with campaign endpoints

### `packages/inception-core` — inception-core

### ✨ New
- ship The Transmission — autonomous infinity story (genkit flow + daemon + web app)
- hot-reload capability signal for Inception Engine instruction layer
- final delivery of multi-window warp tasks
- update flow index exports, inception-core index, EngineStatusGrid component
- director-agent flow, ie-engine flows, task-graph types, engine-registry types, FlowExplorer update
- TS audit + multi-package shipping pass
- build system + tests passing (T20260306-015)
- Redis pub/sub auto-chain — brief.created fires on intake complete, campaign auto-executes [T20260306-011]
- add IDEATE, SHIP, VALIDATE, SCRIBE skill files + update dispatch queue
- AGENTS.md, .agents rules, dispatch board, CONTEXT.md in key packages

### 🔧 Fixes
- clean git state — config/env module, vera-bridge, engine grid, agent-extension; exclude workspace-mcp nested repo

### 🔩 Other
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates — packages/inception-core/src/index.ts, packages/mcp-fetch-proxy/src/mcp-server.ts, packages/scribe-mcp/src/mcp-server.ts
- miscellaneous updates — packages/inception-core/tsconfig.json, packages/mcp-fetch-proxy/package.json, packages/mcp-router/package.json, packages/mcp-router/src/mcp-server.ts
- miscellaneous updates — packages/inception-core/src/types/home-mesh.ts, packages/sovereign-home-mesh/
- miscellaneous updates — packages/inception-core/src/index.ts
- miscellaneous updates — packages/inception-core/src/types/psi.ts
- clean gitignore + sweep all multi-helix sprint output
- remove T20260306-A3 from active queue
- sync all active windows — multi-instance batch commit

### `packages/dispatch` — dispatch

### ✨ New
- server + task routing updates
- server + task routing updates
- server + task routing updates
- wire cloud mesh health monitor, auto-boot router from env, FORGE in genesis CI
- add FORGE forgeGetAsset tool + forgeTools barrel [T20260309-492]
- hot-reload capability signal for Inception Engine instruction layer
- server updates — packages/dispatch/package.json
- server updates — packages/dispatch/src/server.ts
- server updates — packages/dispatch/src/fetch-proxy-endpoint.ts
- server updates — packages/dispatch/src/server.ts
- server updates — packages/dispatch/src/server.ts
- server updates — packages/dispatch/src/server.ts
- server updates — packages/dispatch/src/server.ts
- ALFRED chat widget, client gallery, dispatch server
- autonomous agent infrastructure — BLOCKER protocol, auto-loop, /api/tasks/next, Windows multipliers
- ORACLE context system + photography phase 3-5
- TaskQueue with priority routing + agent capability matching #75
- complete multi-helix sprint P1
- add inception-dispatch MCP server — task routing via stdio #30
- FirstMission workflow, Ambient Dashboard, promotion gate
- agent runtime implementations + genkit + css updates
- ServiceScanner, SetupWizard, complete component schemas, new package indexes
- scaffold Dockerfiles for agents, auth, theme-engine service packages
- add genmedia server.ts HTTP layer, fix Dockerfile CMD, fix design-tokens build config, create Dockerfile.antigravity (Task T20260306-706 complete)
- migrate store from JSON files to SQLite (WAL mode)
- add force_complete tool + POST /api/tasks/:id/resolve endpoint
- compile and integration fixes for daemon and zero-day pub/sub (T20260306-[706,601,328,513])
- fix daemon REST dispatch claim & sync server api
- ship NAS watcher deploy and TRINITY-1 verification
- real-time window heartbeat system
- TS audit + multi-package shipping pass
- all-green dashboard — live service health hook, NeuralMonitor real endpoints, CampaignControl live status, dispatch activity feed [T20260306-012]
- add IDEATE, SHIP, VALIDATE, SCRIBE skill files + update dispatch queue
- Universal Agent Dispatch Network - Phase 1+2+3

### 🔧 Fixes
- make Docker build self-contained for NAS deployment
- compile TS in Docker — remove dependency on pre-built /build dir

### 🔩 Other
- Wave 22: Introduce strict unit testing for media engines
- validate(dispatch): 20 vitest cases for TaskQueue #80
- finalize Wave 8 handoff
- clean gitignore + sweep all multi-helix sprint output
- remove T20260306-A3 from active queue
- sync all active windows — multi-instance batch commit

### `packages/auth` — auth

### ✨ New
- implement zero-day live revenue dashboard and fix auth coupling
- 3-helix GTM sprint — PostHog tests + RoleGuard partner role + requireRole [AVERI/W26]
- #93 AVERI Memory Service + #94 Context Compaction + #96 Edge Inference Gateway [W25]
- full creative mobile app — Atelier design language
- firebase singleton init + multi-tenant auth contract tests [AVERI/W25-prep]
- 3-helix parallel test coverage — Chronos + Firebase Auth + MCP Fetch Proxy
- GTM Live Analytics + Chronos VisionOS + VelocityTelemetry
- GTM Live Analytics + Chronos VisionOS + VelocityTelemetry
- Zero-day implementation of BLE tracker and Living Canvas SSE
- 4-helix GTM sprint — Firebase Auth, MCP Fetch Proxy, Gitea Race Fix, Chat Console
- scaffold Dockerfiles for agents, auth, theme-engine service packages
- TS audit + multi-package shipping pass

### 🔩 Other
- miscellaneous updates
- Auto-commit: Getting git down to zero
- miscellaneous updates
- miscellaneous updates
- stage all pending changes — console, auth, genkit server, memory pkg, pnpm-lock, velocity telemetry page
- miscellaneous updates — packages/auth/src/index.ts
- miscellaneous updates — packages/auth/src/index.ts
- miscellaneous updates — packages/claude-agent/src/executor.d.ts, packages/claude-agent/src/index.d.ts, packages/claude-agent/src/types.d.ts, packages/auth/src/hooks/useAuth.d.ts
- miscellaneous updates — packages/auth/package-lock.json, packages/auth/package.json, packages/auth/src/lib/firebase.ts
- miscellaneous updates — packages/auth/src/env.d.ts
- miscellaneous updates — packages/auth/package-lock.json, packages/auth/package.json
- miscellaneous updates — packages/auth/src/lib/firebase.ts, packages/mcp-fetch-proxy/tsconfig.json
- miscellaneous updates — packages/auth/src/lib/firebase.ts, packages/mcp-fetch-proxy/tsconfig.json
- miscellaneous updates — packages/auth/package.json, packages/auth/package-lock.json
- miscellaneous updates — packages/auth/src/index.ts, packages/mcp-router/src/index.ts, packages/mcp-fetch-proxy/docker-compose.yml, packages/mcp-fetch-proxy/tsconfig.json
- miscellaneous updates — packages/auth/src/firebase.ts, packages/auth/src/components/, packages/auth/src/contexts/, packages/auth/src/hooks/
- miscellaneous updates — packages/auth/src/firebase.ts, packages/auth/tsconfig.json, packages/auth/src/lib/, packages/mcp-fetch-proxy/src/
- miscellaneous updates — packages/auth/tsconfig.json
- miscellaneous updates — packages/auth/package.json, packages/mcp-fetch-proxy/
- miscellaneous updates — infra/forgejo/docker-compose.yml, packages/auth/package.json, packages/auth/tsconfig.json
- miscellaneous updates — packages/auth/src/index.ts, packages/mcp-router/src/index.ts, packages/comet/src/proxy-server.ts
- miscellaneous updates — packages/auth/src/AuthGuard.tsx, packages/auth/src/firebase.ts, packages/comet/src/fetch-proxy.ts, packages/mcp-router/src/fetch-proxy.ts
- miscellaneous updates — packages/auth/src/AuthContext.tsx
- miscellaneous updates — packages/auth/src/firebase-auth.ts
- clean gitignore + sweep all multi-helix sprint output

### `packages/mcp-fetch-proxy` — mcp-fetch-proxy

### ✨ New
- GTM Live Analytics + Chronos VisionOS + VelocityTelemetry

### 🔧 Fixes
- make Docker build self-contained for NAS deployment

### 🔩 Other
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- Wave 21: Fix orchestrator AgentRouter test + verify T20260309-216 Wave 18 helices
- miscellaneous updates — packages/inception-core/src/index.ts, packages/mcp-fetch-proxy/src/mcp-server.ts, packages/scribe-mcp/src/mcp-server.ts
- miscellaneous updates — packages/inception-core/tsconfig.json, packages/mcp-fetch-proxy/package.json, packages/mcp-router/package.json, packages/mcp-router/src/mcp-server.ts
- miscellaneous updates — packages/mcp-fetch-proxy/package-lock.json, packages/mcp-router/package-lock.json
- miscellaneous updates — packages/mcp-fetch-proxy/package-lock.json, packages/mcp-fetch-proxy/package.json, packages/mcp-router/package-lock.json, packages/mcp-router/package.json
- miscellaneous updates — packages/mcp-fetch-proxy/src/mcp-server.ts, packages/mcp-router/src/mcp-server.ts, tmp-dna-check.mjs
- miscellaneous updates — packages/mcp-fetch-proxy/src/mcp-server.ts, packages/mcp-router/src/mcp-server.ts, packages/sovereign-home-mesh/src/routes/guests.ts, packages/sovereign-home-mesh/src/routes/intel.ts
- miscellaneous updates — packages/mcp-fetch-proxy/tsconfig.json
- miscellaneous updates — packages/mcp-fetch-proxy/package.json, packages/mcp-fetch-proxy/package-lock.json
- miscellaneous updates — packages/auth/src/lib/firebase.ts, packages/mcp-fetch-proxy/tsconfig.json
- miscellaneous updates — packages/auth/src/lib/firebase.ts, packages/mcp-fetch-proxy/tsconfig.json
- miscellaneous updates — packages/mcp-fetch-proxy/Dockerfile
- miscellaneous updates — packages/auth/src/index.ts, packages/mcp-router/src/index.ts, packages/mcp-fetch-proxy/docker-compose.yml, packages/mcp-fetch-proxy/tsconfig.json
- miscellaneous updates — packages/auth/src/firebase.ts, packages/auth/tsconfig.json, packages/auth/src/lib/, packages/mcp-fetch-proxy/src/
- miscellaneous updates — packages/auth/package.json, packages/mcp-fetch-proxy/

### `packages/sovereign-mesh` — sovereign-mesh

### ✨ New
- Always-on server management — PM2 ecosystem + start-all.ps1
- replace Twilio with Telnyx sovereign SMS + Gmail OAuth2 integration
- Wave 33 — Sovereign Mesh Intelligence Layer (Phase 1 of Sovereign Fabric)

### 🔩 Other
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates
- miscellaneous updates

### `packages/sensor-mesh` — sensor-mesh

### ✨ New
- bridge + mesh updates
- bridge + mesh updates
- Wave 30 parallel execution (iPhone Sensor Node, NEXUS Spatial Workspace MCP)
- ZigSimBridge update + ecosystem sync
- ORACLE context system + photography phase 3-5
- ship 4-helix integration tests + UE5 OSC asset generator
- activate cloud layer, MCP dynamic loading, somatic T3, SIGNAL dashboard

### 🔧 Fixes
- install @types/node, restore types config, fix JSDoc regex misparse in BiometricBridge
- clean up tsconfig types array — @types/node resolved via monorepo root

### 🔩 Other
- ﻿feat(wave-12): finalize construction and verification of Wave 12 multi-helix

### `packages/workspace-mcp` — workspace-mcp

### 🔧 Fixes
- rewrite Dashboard.tsx — fix duplicate state, broken checkService, missing refs (tsc clean)

### `packages/scribe-mcp` — scribe-mcp

### ✨ New
- Implement Phase 1 of Math LoRA Autonomous Learning Architecture intercept and training logger
- add package.json with MCP SDK dependency
- add inception-scribe MCP server — remember, recall, context, forget, handoff (Phas

### 🔩 Other
- miscellaneous updates
- miscellaneous updates
- Wave 22: Introduce strict unit testing for media engines
- Wave 21: Fix orchestrator AgentRouter test + verify T20260309-216 Wave 18 helices
- miscellaneous updates — packages/inception-core/src/index.ts, packages/mcp-fetch-proxy/src/mcp-server.ts, packages/scribe-mcp/src/mcp-server.ts
- Add packages/scribe-mcp/tsconfig.json

### `packages/forge` — forge

### ✨ New
- wire cloud mesh health monitor, auto-boot router from env, FORGE in genesis CI
- add FORGE forgeGetAsset tool + forgeTools barrel [T20260309-492]
- ship FORGE API server to genesis stack (T20260309-492)
- add HTTP API server + Genkit tool bindings for asset economy
- ship n8n-bridge, skills, ie-terminal, shard-v2, agent-spawner as MCP servers
- 3-helix execution — FORGE economy + wire ingestion + GTM injection
- init FORGE Real-Time Asset Economy — types, package scaffold
- ship wire-ingestion-mcp — universal live data layer
- Always-on server management — PM2 ecosystem + start-all.ps1

### ⚡ Improvements
- add FORGE .dockerignore — exclude node_modules/.git/models from build context

### 🔧 Fixes
- resolve all CI typecheck failures across 7 packages
- FORGE Dockerfile monorepo-root context — fix cloud-mesh build in NAS CI

### 🔩 Other
- miscellaneous updates
- miscellaneous updates

### `apps/console` — console

### ✨ New
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- complete the circle — live health prober, intelligent router, dashboard wired to real data
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- DIRA + console UI updates
- wire cloud mesh health monitor, auto-boot router from env, FORGE in genesis CI
- add FORGE forgeGetAsset tool + forgeTools barrel [T20260309-492]
- ship GTM Analytics Dashboard + AtlasLiveClient [T20260309-702]
- ship n8n-bridge, skills, ie-terminal, shard-v2, agent-spawner as MCP servers
- implement zero-day live revenue dashboard and fix auth coupling
- Live CRM data in both GTM dashboards — multi-helix wiring
- Financial Command Center — infra cost breakdown + Zero-Day pipeline + next-money actions
- Wave 33 — Sovereign Mesh Intelligence Layer (Phase 1 of Sovereign Fabric)
- Zero-Day GTM 3-helix parallel execution - ProspectPipeline Genkit flow + CRMSyncService + LeadScoringDashboard
- 3-helix parallel execution
- commit all pending changes - console App, zero-day lead-scoring, ecosystem submodules [Zero-Day GTM]
- console App.tsx update + zero-day intelligence layer (lead-scoring + context engine)
- Wave 32 Design Ingestion Pipeline
- BarnstormStudio TEMPO+FUSER+API + Firebase AuthGuard wired in Console [W26]
- [Wave 19 - Helix C] wire PostHog frontend telemetry to client portal UI
- integrate posthog frontend telemetry
- integrate zero-day provisioning dashboard link into client portal
- DIRA + UI wiring — apps/console/src/index.css
- DIRA + UI wiring — apps/console/src/contexts/AuthContext.tsx
- DIRA + UI wiring — apps/console/src/App.tsx, apps/console/src/main.tsx
- DIRA + UI wiring — apps/console/src/components/AuthGuard.tsx, apps/console/src/pages/ChatConsole.tsx
- DIRA + UI wiring — apps/console/src/contexts/
- DIRA + UI wiring — apps/console/src/pages/DispatchCenter.tsx
- DIRA + UI wiring — apps/console/src/components/DIRADashboard.tsx
- DIRA + UI wiring — apps/console/package.json, packages/console/src/components/DiraPanel.tsx -> apps/console/src/components/DiraPanel.tsx
- wire DIRA tab + Zero-Day intake page into Console
- DIRA dashboard, Zero-Day GTM intake UI, PostHog analytics
- PWA + ntfy push notification bridge
- activate cloud layer, MCP dynamic loading, somatic T3, SIGNAL dashboard
- add service worker with push notification + offline support
- add PWA manifest for iOS home screen install
- implement Airbyte ingestion background worker to Chromadb
- parallelize inception engine execution
- integrate recharts into finance dashboard for sparklines
- implement design sandbox live token engine
- complete 4 parallel workstreams
- FirstMission workflow, Ambient Dashboard, promotion gate
- agent runtime implementations + genkit + css updates
- ServiceScanner, SetupWizard, complete component schemas, new package indexes
- scaffold Dockerfiles for agents, auth, theme-engine service packages
- update flow index exports, inception-core index, EngineStatusGrid component
- director-agent flow, ie-engine flows, task-graph types, engine-registry types, FlowExplorer update
- complete primitive tokens + scaffold service Dockerfiles
- complete CVA token layer + fix design-tokens package exports
- NAS daemon execution + docker-compose + onboarding CSS
- multi-stage production Dockerfile for autonomous genesis node
- implement Phase 3-6 onboarding flow
- implement Phase 1 and 2 onboarding selectors
- integrate Phase 0 ambient welcome flow
- add missing UI components, sync tokens, and config updates
- complete JSON schema validator and UI package scaffolding (fixes #T-181, #T-258)
- add genmedia server.ts HTTP layer, fix Dockerfile CMD, fix design-tokens build config, create Dockerfile.antigravity (Task T20260306-706 complete)
- setup antigravity-nas daemon and DinD infrastructure
- ship NAS watcher deploy and TRINITY-1 verification
- console pages, genmedia animation, blueprints deploy infra [TRINITY-1 W1]
- wire 4 unrouted pages — AnimationStudio /animation, Blueprints /blueprints, ClientDashboard /clients/:id, ZeroDayIntake /intake-form — add nav items for Animation + Blueprints
- add scribe-daemon upstream :9100 /scribe/ route + /provision pass-through; all 9 GENESIS services now behind gateway
- all-green dashboard — live service health hook, NeuralMonitor real endpoints, CampaignControl live status, dispatch activity feed [T20260306-012]
- Redis pub/sub auto-chain — brief.created fires on intake complete, campaign auto-executes [T20260306-011]
- Universal Agent Dispatch Network - Phase 1+2+3
- Console deployed to NAS via Docker
- campaign service fully integrated into GENESIS stack
- Creative OS — 4 helices shipped [GENESIS wave]

### 🔧 Fixes
- clean git state — config/env module, vera-bridge, engine grid, agent-extension; exclude workspace-mcp nested repo
- fix all TS compile errors in Dashboard, DiraPanel, ThePanopticon
- fix all TS compile errors — Dashboard, DiraPanel, ThePanopticon
- resolve TS build panics and missing ReactFlow imports
- rewrite Dashboard.tsx — fix duplicate state, broken checkService, missing refs (tsc clean)
- eliminate all eslint errors and warnings across console and UI packages
- resolve ts errors in genkit and genmedia flows
- resolve NOT NULL constraint failures in dispatch server and update better-sqlite3
- align barrel exports with actual source — BriefSubscriber, DAG executor, schema types, runCompassValidation
- correct ZeroDayIntake provision endpoint path + nginx route
- genkit upstream port 4000->4100; feat(console): add Blueprints to Dashboard health monitor
- resolve all pre-existing TS errors in server.ts — notifier API, ECHO types, portal routes, Stripe cast [T20260306-020]
- Dockerfile — use npm directly, not pnpm filter

### 🔩 Other
- stage all pending changes — console, auth, genkit server, memory pkg, pnpm-lock, velocity telemetry page
- scrub simulation nomenclature for zero day production release
- pnpm lockfile sync
- AGENTS.md updates
- merge: inception-engine sync — Dashboard + nas-watcher + zero-day deps
- sync Dashboard, tsconfig, memory package deps
- resolved agent-status conflict
- fix all typescript errors and css warnings for genesis stack validation
- clean gitignore + sweep all multi-helix sprint output
- style: add missing CSS modifier classes extracted from inline styles in CreativeWorkstation
- fix console typings and linting issues
- commit changes before multi-helix sprint
- finalize pending changes for parallel sprint
- [AVERI] Fix strict type and CSS inline style lint errors
- stage dirty working tree before multi-helix sprint
- stage console, design-sandbox, and genkit changes
- integrate theme engine tokens into console app and add pickup helper
- test(design-tokens): add round-trip integration test and fix syntax
-  fix: wrap root App in BrowserRouter to resolve useLocation crash
- remove T20260306-A3 from active queue
- sync all active windows — multi-instance batch commit

### `apps/event-intake` — event-intake

### ✨ New
- ship n8n-bridge, skills, ie-terminal, shard-v2, agent-spawner as MCP servers

### 🔩 Other
- miscellaneous updates
- miscellaneous updates


---

