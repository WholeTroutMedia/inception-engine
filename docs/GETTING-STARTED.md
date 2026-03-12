# Getting Started — Creative Liberation Engine

First boot. Sovereign ownership. Get from clone to running in under 5 minutes.

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

| Key | Notes |
|-----|-------|
| `GEMINI_API_KEY` | Recommended for dev |
| `GOOGLE_API_KEY` | For Vertex AI / production |
| `OPENAI_API_KEY` | GPT-4o, etc. |
| `ANTHROPIC_API_KEY` | Claude |

**Offline mode:** A local model server works when no cloud keys are set.

---

## 3. Build

```bash
pnpm run build
```

---

## 4. Boot

```bash
pnpm run dev
```

You should see:

```
[GENKIT] Creative Liberation Engine provider runtime initialized
[GENKIT] Server listening on http://localhost:4100
```

---

## 5. Explore

In a **second terminal**:

```bash
pnpm run genkit:ui
```

Open **http://localhost:4000**. Run flows. Inspect prompts and responses. Find what's there.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `pnpm install` fails | Ensure Node 20+ and pnpm 9+ |
| `GEMINI_API_KEY` not found | Copy `.env.example` to `.env` and add your key |
| Port 4100 in use | Set `PORT=4101` in `.env` |
| Genkit UI won't connect | Start `pnpm run dev` first, then `pnpm run genkit:ui` |

---

## Next steps

Explore the flows. Read the Constitution. The rest you discover.
