---
description: NAVD lightweight boot â€” cached dispatch + health check, parallel fetch, <3s target
---

# /comet-boot â€” Lightweight NAVD Boot Protocol

## Goal

Boot NAVD in under 3 seconds. Skip full `AGENTS.md` parse. Use cached dispatch + health.

## Steps

### 1. Parallel health + dispatch fetch (no sequential wait)

```
GET http://127.0.0.1:5050/api/status          (dispatch health)
GET http://127.0.0.1:5050/api/tasks?status=queued&limit=5  (top tasks preview)
```

Fire both simultaneously. Don't wait for one before starting the other.

### 2. Use 30s TTL cache for dispatch result

- Store result in `.agents/dispatch/.boot-cache.json`
- If cache age < 30s â†’ skip re-fetch, use cached value
- Cache schema: `{ fetched_at: ISO, status: {...}, top_tasks: [...] }`

### 3. Skip full AGENTS.md parse on boot

- Don't parse `AGENTS.md` on every boot â€” it's 300+ lines
- Only parse when explicitly asked or when `?force-reload=true` flag set
- Instead: use KI summaries + cached registry

### 4. Render boot panel from cache

```
âš¡ NAVD BOOT â€” GENESIS v5
Dispatch: âœ… online   Queue: 9 tasks
Top P0: Firebase Auth, MCP Fetch Proxy
Boot time: <3s
```

### 5. Register presence

```
POST http://127.0.0.1:5050/api/agents/heartbeat
{ "agent_id": "comet-browser", "window": "NAVD", "workstream": "comet-browser" }
```

## Cache File Location

`.agents/dispatch/.boot-cache.json`

> [!TIP]
> If you need fresh data, add `?bust-cache=1` to your boot query and the cache will be ignored.
