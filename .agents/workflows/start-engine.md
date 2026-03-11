---
description: Boot the Creative Liberation Engine Genkit API server â€” checks status, starts if needed, confirms all CORTEX endpoints are live
---

# /start-engine

Starts the `@inception/genkit` API server. Checks if it's already running first â€” if so, just shows status. Otherwise, boots it in the correct mode and confirms all endpoints are healthy.

**Activates on:**
- `/start-engine`
- "start the genkit server"
- "boot the engine"
- "start the AI server"
- "is the engine running"

---

## Ports & Endpoints (Always True â€” Do Not Ask)

| Service | Port | URL |
|---------|------|-----|
| Genkit API Server (Express) | `4100` | `http://localhost:4100` |
| Genkit CLI Reflection Server | `3100` | `http://localhost:3100` |
| Genkit Dev UI | `4000` | `http://localhost:4000` |

Health check: `GET http://localhost:4100/health`
Expected response: `{ "status": "operational", "service": "inception-genkit", "version": "5.0.0" }`

Project root: `C:\\Creative-Liberation-Engine\`
Package path: `packages/genkit`

---

## Steps

// turbo-all

### Step 1 â€” Check If Already Running

Before starting, check if the server is already up:

```powershell
try {
  $r = Invoke-RestMethod -Uri "http://localhost:4100/health" -Method GET -TimeoutSec 3
  Write-Host "âœ… Engine already running â€” $($r.status) v$($r.version)"
} catch {
  Write-Host "âš¡ Engine offline â€” starting now..."
}
```

If the health check **succeeds** â†’ skip to Step 4 (show status panel). Do not start a second instance.

If the health check **fails** (connection refused) â†’ proceed to Step 2.

---

### Step 2 â€” Choose Mode

Determine startup mode from context:

| Mode | When | Script |
|------|------|--------|
| **dev** (default) | Active development, need hot-reload + Genkit Dev UI | `npm run dev --prefix packages/genkit` |
| **prod** | Production / background / Docker | `npm run start --prefix packages/genkit` |
| **genkit:ui** | Want the Genkit visual flow playground | `npm run genkit:ui --prefix packages/genkit` |

**Default to `dev` mode** unless the user explicitly says "production" or "prod".

Dev mode sets `GENKIT_ENV=dev`, enables `tsx --watch` hot-reload, and registers with the Genkit CLI reflection server at port 3100 so the Dev UI at port 4000 shows live flows.

---

### Step 3 â€” Start the Server

Run the chosen start command in the brainchild-v5 root:

**Dev mode (default):**
```powershell
$proc = Start-Process -FilePath "powershell" `
  -ArgumentList "-NoExit", "-Command", "npm run dev --prefix packages/genkit" `
  -WorkingDirectory "C:\\Creative-Liberation-Engine" `
  -PassThru
Write-Host "âš¡ Starting Genkit engine (PID $($proc.Id))..."
```

Wait up to 15 seconds for the server to become healthy. Poll `GET http://localhost:4100/health` every 500ms. If not healthy after 15s, report the failure and show the last stdout line for diagnosis.

---

### Step 4 â€” Confirm Health & Display Status Panel

Once running (or already running), hit all key endpoints and display:

```
â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
â•‘  CREATIVE LIBERATION ENGINE â€” GENKIT API SERVER                â•‘
â•‘  v5.0.0 | @inception/genkit                          â•‘
â• â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•£
â•‘  STATUS     âœ… operational                           â•‘
â•‘  API        http://localhost:4100                    â•‘
â•‘  HEALTH     GET  /health          âœ…                 â•‘
â•‘  DEV UI     http://localhost:4000 [dev mode only]   â•‘
â• â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•£
â•‘  CORTEX FLOWS                                         â•‘
â•‘    POST /cortex/ideate   â€” IDEATE mode (VAULT+STRATA)â•‘
â•‘    POST /cortex/plan     â€” PLAN mode  (VAULT+STRATA+LOGD) â•‘
â•‘    POST /generate       â€” Unified completion         â•‘
â•‘    POST /stream         â€” SSE streaming              â•‘
â•‘    POST /search         â€” Perplexity / Sonar         â•‘
â•‘    POST /retrieve       â€” ChromaDB vector search     â•‘
â•‘    POST /classify       â€” Task classification        â•‘
â• â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•£
â•‘  NEXT STEPS                                          â•‘
â•‘    /cortex-ideate <topic>  â€” Run IDEATE mode live     â•‘
â•‘    /browser-ideate        â€” Tab context â†’ IDEATE     â•‘
â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
```

Optionally do a quick smoke-test of `/cortex/ideate` with `{ "topic": "ping", "depth": "light" }` to confirm CORTEX flows are wired. Report result inline.

---

### Step 5 â€” Handle Failures

If the server fails to start or stays unhealthy:

5a. Check if the port is already bound by another process:
```powershell
netstat -ano | findstr ":4100"
```
If bound â†’ report "Port 4100 already in use by PID [X]. Kill it with `Stop-Process -Id [X]` or run `/stop-engine`."

5b. Check for missing `.env` file:
```powershell
Test-Path "C:\\Creative-Liberation-Engine\packages\genkit\.env"
```
If missing â†’ warn: "âš ï¸ No `.env` found in packages/genkit. Genkit requires `GOOGLE_GENAI_API_KEY` and optionally `PERPLEXITY_API_KEY`. Copy from `.env.example` or add keys directly."

5c. Check if `node_modules` is installed:
```powershell
Test-Path "C:\\Creative-Liberation-Engine\node_modules"
```
If missing â†’ run `pnpm install` from the workspace root before retrying.

5d. Show the last 20 lines of server output and suggest: "Run `npm run dev --prefix packages/genkit` manually in a terminal to see full error output."

---

### Step 6 â€” Update AGENTS.md Boot Check (T20260305-003 dependency)

Note: T20260305-003 wires this health check directly into the AGENTS.md boot sequence. When that task is claimed, the boot sequence will automatically call `GET http://localhost:4100/health` on every session start and include engine status in the boot panel. This task is a prerequisite.

---

## Rules

- Never ask for the project path â€” it is always `C:\\Creative-Liberation-Engine\`
- Default to `dev` mode â€” only use `prod` if explicitly requested
- Never start a second instance if port 4100 is already healthy
- The Genkit CLI reflection server on port 3100 is started automatically by the `dev` script â€” do not start it separately
- On completion, always display the full status panel with live endpoint list

---

## Quick Reference

| Goal | Command |
|------|---------|
| Start in dev mode | `npm run dev --prefix packages/genkit` |
| Start with Genkit Dev UI | `npm run genkit:ui --prefix packages/genkit` |
| Build production | `npm run build --prefix packages/genkit && npm run start --prefix packages/genkit` |
| Health check | `Invoke-RestMethod http://localhost:4100/health` |
| Audit log | `Invoke-RestMethod http://localhost:4100/audit` |
| Stop | `Stop-Process -Name node` (careful â€” kills all node) |
