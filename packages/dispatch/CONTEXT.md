# CONTEXT â€” @inception/dispatch

The Creative Liberation Engine Universal Agent Dispatch Server.

Any agentic tool â€” Creative Liberation Engine, Cursor, Claude Desktop, scripts â€” connects here to pick up tasks across the entire WholeTrout org. No workspace config needed.

## Endpoints

```
MCP (SSE):  http://127.0.0.1:5050/sse
REST:       http://127.0.0.1:5050/api/status
Health:     http://127.0.0.1:5050/health
```

## MCP Tools (10 total)

**Task Management**
- `list_tasks` â€” filtered task queue
- `claim_task` â€” atomic claim (conflict-safe)
- `complete_task` â€” mark done + attach artifacts
- `add_task` â€” queue new work
- `handoff_task` â€” release with note
- `get_status` â€” full dispatch board
- `list_projects` â€” all WholeTrout org repos

**Agent-to-Agent**
- `delegate_task` â€” assign directly to agent/capability
- `notify_agent` â€” send message to connected agent
- `spawn_subtask` â€” create child task under parent

## Persistence

JSON files at `/volume1/docker/dispatch/` on NAS (Z:\ Docker share):
- `tasks.json` â€” all tasks
- `agents.json` â€” connected agents
- `projects.json` â€” org project registry
- `sessions.json` â€” session log

Auto-migrates from `.agents/dispatch/task-queue.md` on first boot.

## Running

```powershell
# Dev (local)
npm run dev --prefix packages/dispatch

# Production (NAS Docker)
npm run build --prefix packages/dispatch
docker build -t inception-dispatch packages/dispatch
```
