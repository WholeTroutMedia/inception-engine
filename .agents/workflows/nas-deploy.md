---
description: Deploy any Creative Liberation Engine Community service to NAS Docker â€” ALWAYS via Gitea CI/CD. Never SSH. Never manual PowerShell.
---

# /nas-deploy

// turbo-all

> **ABSOLUTE RULE**: Deploy via Gitea Actions workflow_dispatch ONLY.
> SSH password prompts are FORBIDDEN. Never ask the user to run terminal commands.
> If the runner is down, file a blocker task. Never fall back to SSH.

## NAS Endpoints

- **NAS IP**: `127.0.0.1`
- **Gitea**: `http://127.0.0.1:3000`
- **Actions**: `http://127.0.0.1:3000/Creative Liberation Engine Community/brainchild-v5/actions`
- **Token env**: `GITEA_TOKEN` (already in `.env`)

## Deploy a Service (Standard Method)

### Step 1: Trigger via Gitea API

```powershell
$headers = @{ Authorization = "token $env:GITEA_TOKEN"; "Content-Type" = "application/json" }
Invoke-RestMethod "http://127.0.0.1:3000/api/v1/repos/Creative Liberation Engine Community/brainchild-v5/actions/workflows/deploy-genesis.yml/dispatches" -Method Post -Headers $headers -Body '{"ref":"main"}'
```

### Step 2: Monitor the run

```powershell
$headers = @{ Authorization = "token $env:GITEA_TOKEN" }
Invoke-RestMethod "http://127.0.0.1:3000/api/v1/repos/Creative Liberation Engine Community/brainchild-v5/actions/tasks?limit=3" -Headers $headers | ConvertTo-Json -Depth 3
```

### Step 3: Verify health

```powershell
Invoke-RestMethod "http://127.0.0.1:9000/health"
```

## Push-to-Deploy (Automatic)

Committing to `main` automatically triggers `deploy-genesis.yml` on the NAS self-hosted runner.
**No additional action needed after a commit.**

## Available Workflows

| Workflow | Trigger | Use for |
|---|---|---|
| `deploy-genesis.yml` | push to main + dispatch | Full GENESIS stack redeploy |
| `wave-33-nas-deploy.yml` | dispatch | Targeted Wave 33 services |
| `deploy-mcp-stack.yml` | dispatch | MCP router + servers only |
| `redeploy-dispatch.yml` | dispatch | Dispatch server only |

## Key Services & Ports

| Service | Port | Health |
|---|---|---|
| zero-day | 9000 | `/health` |
| genkit | 4000/4100 | `/health` |
| dispatch | 5050 | `/health` |
| relay-mcp | 5100 | `/health` |

## âŒ NEVER DO THESE

- `ssh user@127.0.0.1` with password
- `docker save | ssh ...`
- Asking the user to run deploy commands manually
- Using `scp` or `rsync` to copy files
