---
description: Run inline research using Perplexity Sonar during any task — cite sources, answer questions, pull live web context without leaving your workflow
---

# /research <query>

Runs a live Perplexity Sonar search directly within the current task context. Returns a cited, synthesised answer you can act on immediately. Powered by the Perplexity MCP tool and optionally the Genkit `/search` endpoint.

**Activates on:**
- `/research <query>`
- "look up..." / "search for..." / "what does X do"
- "find examples of..." / "is there a library for..."
- Any question that needs live web context during active work

---

## Steps

// turbo-all

### Step 1 — Parse Query + Determine Depth

Extract the research query. Determine **depth** from context:

| Signal | Model |
|--------|-------|
| Quick lookup, "what is...", "does X support..." | `sonar` |
| Architecture decision, "how does X work", "compare..." | `sonar-pro` |
| Cutting-edge / recent, "latest...", "2025/2026..." | `sonar-pro` |
| Default | `sonar` |

If query is vague, ask once: "What should I search for?"

---

### Step 2 — Execute Search

**Primary:** Use `mcp_perplexity-ask_perplexity_ask`:

```json
{
  "messages": [
    {
      "role": "system",
      "content": "You are a research assistant for the Creative Liberation Engine v5 project (TypeScript/Node.js/Genkit). Focus on technical accuracy, include code examples where relevant, and always cite sources. Be concise. Prioritize recent (2024–2026) information."
    },
    {
      "role": "user",
      "content": "[query]"
    }
  ]
}
```

**Fallback 1 (Perplexity MCP unavailable):** `POST http://localhost:4100/search` with `{ "query": "[query]", "model": "sonar-pro" }`. Note: "⚠️ Perplexity MCP offline — used Genkit /search endpoint"

**Fallback 2 (both unavailable):** Use `search_web` tool directly.

---

### Step 3 — Present Results

```
🔍 /research — [query, truncated to 60 chars]
Model: sonar[-pro]

──────────────────────────────────────────────────────
[Synthesised answer — lead with direct answer, then
 supporting detail. Code blocks where applicable.]

SOURCES
  [1] [title] — [URL]
  [2] [title] — [URL]

──────────────────────────────────────────────────────
```

If mid-task: append `"↩ Resuming [task name]..."` then continue immediately — no re-confirmation needed.

---

### Step 4 — Auto-Apply (mid-task)

If research was triggered during active work:
- Inject finding as context and continue immediately
- Do NOT ask "does this help?" — just use it and move on

If research was standalone:
- Present results, then ask: "Want me to act on this?"

---

### Step 5 — Store to SCRIBE (significant findings only)

If the finding affects architecture, library choices, or security, write a SCRIBE memory note via `scribeMemoryTool` (if engine is running). Skip silently if unavailable.

---

## Quick Chains

| Chain | Trigger |
|-------|---------|
| → `/design` | "Design a screen based on what you just found" |
| → implementation | "Implement this using the approach you just found" |
| → `/browser-ideate` | Research feeds into creative direction |
| IDEATE → `/research` | STRATA directs research to fill knowledge gaps |

---

## Rules

- Always cite at least one source URL
- Default to `sonar`; escalate to `sonar-pro` only when needed
- If mid-task, return to the task after results — never stall
- Works in any workstream; does not own any specific workstream files
- If no relevant results: "No clear answer found — try narrowing the query"

---

## Examples

```
/research best TypeScript patterns for Genkit flow error handling
/research how does ChromaDB handle concurrent writes
/research latest Perplexity Sonar model pricing 2026
/research how to implement SSE streaming in Express 4
```
