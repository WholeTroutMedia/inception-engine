# Creative Liberation Engine v5 — Architecture Overview

## System Summary

Creative Liberation Engine v5 is a **36-agent constitutional AI system** built on a sovereign-first architecture. All agents operate under a 20-article constitution with an immutable Article 0 (Artist Liberation). The system runs on a NAS-hosted Docker stack with Gitea for sovereign version control.

## Agent Hive Structure (36 agents)

| Hive | Agents | Function |
|------|--------|----------|
| AVERI | ATHENA, IRIS, VERA | Strategy, UI, truth |
| Advisory | BUDDHA, COSMOS, LEONARDO, SAGE, SUN_TZU, WARREN_BUFFETT | Expertise |
| Coordination | SCRIBE | Memory |
| Aurora | AURORA, BOLT, COMET, COMMERCE, BROWSER | Execution |
| Broadcast | ATLAS, CONTROL_ROOM, GRAPHICS, SHOWRUNNER, SIGNAL, STUDIO, SYSTEMS | Media |
| Compass | ARCHON, COMPASS, HARBOR, PROOF, SENTINEL | Security, QA |
| Keeper | ARCH, CODEX, ECHO, KEEPER | Knowledge |
| Lex | LEX | Legal |
| Switchboard | RAM_CREW, RELAY, SWITCHBOARD | Comms |
| Enhancement | LANGUAGE, MATH | Processing |

## Key Components

- **ANTIGRAVITY**: Dispatch engine, reads HANDOFF.md, routes to hives
- **MCP Router (MCP-03)**: Two-stage classifier (keyword + injectable LLM)
- **SCRIBE v2**: Memory layer with context paging
- **Dispatch**: Task queue and agent routing
- **Ghost/Shadow QA**: Testing framework

## Infrastructure

- Sovereign Git: Gitea on NAS
- Docker Stack: 30 services via docker-compose.genesis.yml
- Database: PostgreSQL + Redis + ChromaDB
- AI: Genkit (Gemini), Ollama (local), vLLM (GPU)
- Session continuity: HANDOFF.md (TRINITY-1 protocol)
- Cloud (planned): Cloud Run + AlloyDB pgvector (see HANDOFF.md)

## Further Reading

- HANDOFF.md, boot.json, CONSTITUTION.md
- packages/mcp-router/src/capability-manifest.json
- docs/design-system/
- [Tunneling Decision (Cloudflare vs. Tailscale)](tunneling-decision.md)
