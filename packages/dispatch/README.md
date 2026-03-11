# Inception Dispatch Server â€” NAS Deployment Guide

The sovereign task orchestration node for the Creative Liberation Engine mesh.  
Runs at `127.0.0.1:5050` on the Synology NAS via Docker.

## Quick Deploy

```bash
# On the NAS (SSH in via Terminal)
cd /volume1/docker/inception-dispatch

# Copy env template
cp .env.example .env
# Edit DISPATCH_VAULT_KEY with a 32-char random key

# Build and start
docker compose up -d --build

# Verify
curl http://127.0.0.1:5050/health
```

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DISPATCH_VAULT_KEY` | âœ… | â€” | 32-char AES key for secret vault encryption |
| `DISPATCH_DATA_PATH` | â€” | `/volume1/docker/inception-dispatch/data` | NAS bind-mount for SQLite |
| `REDIS_ENABLED` | â€” | `false` | Enable Redis pub/sub for multi-instance SSE fanout |
| `REDIS_HOST` | â€” | `127.0.0.1` | Redis host |
| `REDIS_PORT` | â€” | `6379` | Redis port |
| `LOG_LEVEL` | â€” | `info` | `debug` / `info` / `warn` / `error` |

## Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `GET` | `/api/status` | Full dispatch board |
| `GET` | `/api/tasks` | List tasks (filterable) |
| `POST` | `/api/tasks` | Add task |
| `POST` | `/api/tasks/claim` | Claim a task |
| `PATCH` | `/api/tasks/:id` | Update task |
| `POST` | `/api/tasks/:id/resolve` | Force-complete |
| `GET` | `/api/agents` | List agents |
| `POST` | `/api/agents/heartbeat` | Register/update agent |
| `GET` | `/api/events` | SSE stream (live console) |
| `GET` | `/sse` | MCP over SSE (agent connection) |
| `POST` | `/messages` | MCP message relay |

## MCP Connection (any agent)

```json
{
  "mcpServers": {
    "inception-dispatch": {
      "url": "http://127.0.0.1:5050/sse"
    }
  }
}
```

## Update / Redeploy

```bash
docker compose pull
docker compose up -d --build --remove-orphans
```

Data persists across redeploys via the `/data/dispatch` volume bind-mount.
