# Getting Started — Creative Liberation Engine

Get from clone to running agents in under 5 minutes.

---

## 1. Install

```bash
git clone <this-repo>
cd creative-liberation-engine
pnpm install
```

---

## 2. Configure (minimal)

```bash
cp .env.example .env
```

Edit `.env` and set **at least one** AI provider key:

| Key | Where to get it | Notes |
|-----|-----------------|-------|
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) | Free tier, recommended for dev |
| `GOOGLE_API_KEY` | Google Cloud Console | For Vertex AI / production |
| `OPENAI_API_KEY` | OpenAI | GPT-4o, etc. |
| `ANTHROPIC_API_KEY` | Anthropic | Claude |

**Offline mode:** If you have [Ollama](https://ollama.ai) running locally, the engine will use it when no cloud keys are set.

---

## 3. Build

```bash
pnpm run build
```

This builds the Genkit orchestration layer and its dependencies.

---

## 4. Boot the agents

```bash
pnpm run dev
```

This starts the Genkit server. You should see:

```
[GENKIT] Creative Liberation Engine provider runtime initialized
[GENKIT] Server listening on http://localhost:4100
```

---

## 5. Use the agents

### Option A: Genkit Dev UI (recommended)

In a **second terminal**:

```bash
pnpm run genkit:ui
```

Then open **http://localhost:4000** in your browser. You can:

- Run flows (vt100, vt220, xterm, classify-task, etc.)
- Inspect prompts and responses
- Debug agent behavior

### Option B: HTTP API

```bash
# Classify a task
curl -X POST http://localhost:4100/api/flows/classifyTask \
  -H "Content-Type: application/json" \
  -d '{"task": "Build a landing page for a coffee shop"}'

# Chat with vt100 (strategy)
curl -X POST http://localhost:4100/vt100Chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What should I consider when designing a mobile app?"}'
```

---

## What's included

| Component | Description |
|-----------|-------------|
| **TTY Trinity** | vt100 (strategy), vt220 (truth/memory), xterm (execution) |
| **kuid Hive** | kuid (architect), kbuildd (builder), COMET (automator) |
| **kstated Hive** | kstated (knowledge), ARCH (patterns), CODEX (docs) |
| **kdocsd Hive** | LEX (compliance), COMPASS (ethics) |
| **Switchboard** | RELAY, SIGNAL, routing |
| **Validators** | SENTINEL, ARCHON, PROOF, HARBOR |
| **Memory** | klogd (scribe), Living Archive, ChromaDB (optional) |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `pnpm install` fails | Ensure Node 20+ and pnpm 9+ |
| `GEMINI_API_KEY` not found | Copy `.env.example` to `.env` and add your key |
| Port 4100 in use | Set `PORT=4101` in `.env` |
| Genkit UI won't connect | Start `pnpm run dev` first, then `pnpm run genkit:ui` |
| ChromaDB errors | ChromaDB is optional; memory works in-memory without it |

---

## Next steps

- Read [README.md](../README.md) for architecture and Constitution
- Explore flows in the Genkit UI at http://localhost:4000
- Check [packages/genkit/CONTEXT.md](../packages/genkit/CONTEXT.md) for API details
