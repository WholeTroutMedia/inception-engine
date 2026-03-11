# IE Google Ecosystem Takeover

> Creative Liberation Engine as the sovereign orchestration layer above every Google service

## The Vision

Every Google service you touch becomes a node in IE's nervous system.
IE doesn't replace Google — it sits above it, orchestrating it.
Google provides compute, storage, and consumer interfaces.
IE provides intelligence, memory, autonomy, and intent.

## Architecture

```
                    YOU (human intent)
                        |
              CREATIVE LIBERATION ENGINE (sovereign layer)
              /    |    |    |    |    \
           AVERI  agents  dispatch  SCRIBE  PRISM
              \    |    |    |    |    /
         Google Workspace MCP Server (unified bridge)
              /    |    |    |    |    \
          Gmail  Drive  Docs  Sheets  Calendar  ...
              \    |    |    |    |    /
         Google Cloud (API + compute layer)
              /    |    |    |    \
         Gemini  Cloud Run  AlloyDB  NotebookLM
              \    |    |    /
         Google Consumer (Ultra plan)
              /    |    \
         Gemini App  NotebookLM  Photos
```

## The Full Surface Map

### TIER 1: WORKSPACE (daily operations)

| Google Service | API | IE Agent | What IE Does |
|---|---|---|---|
| **Gmail** | Gmail API | RELAY | Triage inbox, draft responses, route to agents, auto-label by project |
| **Drive** | Drive API | KEEPER/CODEX | Organize files by constitutional schema, auto-archive, search across everything |
| **Docs** | Docs API | SCRIBE | Auto-generate meeting notes, architecture docs, HANDOFF updates |
| **Sheets** | Sheets API | FLUX | Live dashboards: agent metrics, cost tracking, project status |
| **Slides** | Slides API | STUDIO | Auto-generate client decks, pitch materials from agent output |
| **Calendar** | Calendar API | SWITCHBOARD | Schedule agent work windows, block focus time, sync deadlines |
| **Tasks** | Tasks API | SWITCHBOARD | Sync IE dispatch queue to Google Tasks for mobile visibility |
| **Forms** | Forms API | COMMERCE | Client intake forms, auto-route responses to agents |
| **Chat** | Chat API | RELAY | IE bot in Google Chat — dispatch tasks via chat message |
| **Meet** | Meet API | CONTROL_ROOM | Auto-record, transcribe, generate action items from meetings |
| **Contacts** | People API | ECHO | Artist/client database synced with IE agent intelligence |
| **Keep** | Keep API | SCRIBE | Quick capture -> IE memory pipeline |

### TIER 2: AI SERVICES (intelligence layer)

| Google Service | API | IE Agent | What IE Does |
|---|---|---|---|
| **Gemini API** | Gemini Dev API | PRISM | Model routing, cost optimization, all 40 agents |
| **NotebookLM** | NotebookLM MCP/API | KEEPER | RAG knowledge base — grounded research for all agents |
| **AI Studio** | Gemini API | PRISM | Fine-tuning, prompt testing, model evaluation |
| **Vertex AI** | Vertex API | PRISM | Production model serving, custom models, embeddings |

### TIER 3: CLOUD INFRASTRUCTURE (compute + storage)

| Google Service | API | IE Agent | What IE Does |
|---|---|---|---|
| **Cloud Run** | Cloud Run API | FORGE/SYSTEMS | Deploy agent containers, auto-scale |
| **AlloyDB** | AlloyDB API | SCRIBE | Vector memory, MCP registry, persistent agent state |
| **Cloud Storage** | GCS API | KEEPER | Asset storage, backups, media pipeline |
| **Secret Manager** | Secret Mgr API | SYSTEMS | Rotate keys, manage credentials for all services |
| **Cloud Build** | Cloud Build API | FORGE | CI/CD pipeline for agent deployments |
| **Pub/Sub** | Pub/Sub API | RELAY | Event bus between agents and Google services |
| **Cloud Functions** | Functions API | SYSTEMS | Serverless webhooks, event handlers |

### TIER 4: CONTENT + COMMERCE

| Google Service | API | IE Agent | What IE Does |
|---|---|---|---|
| **YouTube** | YouTube Data API | SHOWRUNNER | Upload, manage, analyze video content |
| **Google Ads** | Google Ads API | COMMERCE | Campaign management, spend optimization |
| **Merchant Center** | Merchant API | COMMERCE | Product feeds, inventory sync |
| **Search Console** | Search Console API | COMMERCE | SEO monitoring, indexing requests |
| **Analytics** | GA4 API | FLUX | Traffic analysis, conversion tracking, agent dashboards |
| **Photos** | Photos API | BOLT/Aurora | Portfolio management, asset library for creative work |
| **Maps** | Maps API | SPATIAL | Location intelligence for events, venues, logistics |

### TIER 5: CONSUMER EXPERIENCE (your personal layer)

| Google Service | Integration | What IE Does |
|---|---|---|
| **Gemini App (Ultra)** | NotebookLM as source | Your personal Gemini grounded in IE knowledge |
| **NotebookLM** | MCP Server | Your research notebooks = IE's long-term memory |
| **Google Home** | Routines + Assistant | Voice commands -> IE dispatch (via mobile-bridge) |
| **Android/iOS Widgets** | Scriptable + mobile-bridge | Agent status, dispatch, system health on home screen |

## Implementation: The MCP Bridge

The key enabler is one unified MCP server that bridges IE to all of Google.

**Already exists:** `workspace-mcp` — open source, 12 services, 100+ tools, OAuth 2.1
- Gmail, Drive, Docs, Sheets, Slides, Forms, Calendar, Chat, Tasks, Contacts, Apps Script, Search
- npm: `workspace-mcp`
- Repo: github.com/taylorwilsdon/google_workspace_mcp

**Also exists:** NotebookLM MCP Server
- Query notebooks programmatically
- Repo: github.com/Pantheon-Security/notebooklm-mcp-secure

**Also exists:** Google's official MCP servers
- Workspace, Firebase, Cloud Run, Analytics, Go
- Repo: github.com/google/mcp

### Wiring Plan

```
IE MCP Router (packages/mcp-router)
  |
  |-- workspace-mcp (Gmail, Drive, Docs, Sheets, Calendar, ...)
  |-- notebooklm-mcp (RAG knowledge base)
  |-- google-cloud-mcp (Cloud Run, Firebase)
  |-- google-analytics-mcp (GA4 data)
  |-- gemini-api (direct, via PRISM)
  |
  AlloyDB MCP Registry (self-modifying)
    agents can register new MCP servers at runtime
```

## Agent Responsibilities Post-Takeover

### RELAY (communications)
- Monitors Gmail inbox continuously
- Auto-labels, auto-drafts, escalates to human when needed
- Sends notifications to Google Chat
- Routes meeting transcripts from Meet to SCRIBE

### SCRIBE (memory)
- Every agent interaction -> summarized to Docs
- HANDOFF.md auto-synced to a Google Doc (shared with gf)
- NotebookLM notebooks auto-populated with session context
- Google Keep quick captures -> IE memory pipeline

### KEEPER/CODEX (knowledge)
- Drive organized by constitutional schema
- NotebookLM as curated RAG for deep research
- CODEX maintains documentation in Docs
- Auto-archive old files, maintain folder taxonomy

### SWITCHBOARD (operations)
- Calendar reflects active agent work windows
- Tasks synced with dispatch queue
- Scheduling conflicts detected and resolved
- Daily/weekly summaries auto-generated

### FLUX (data)
- Sheets dashboards: agent costs, API usage, project metrics
- Analytics data pulled into IE for decision-making
- ETL from external sources into Sheets for visibility

### COMMERCE (revenue)
- Merchant Center feeds managed automatically
- Ads campaigns optimized by agent intelligence
- Search Console monitored, indexing issues auto-resolved
- Forms for client intake, auto-routed to agents

### SHOWRUNNER (content)
- YouTube uploads, descriptions, tags managed
- Meet recordings -> transcripts -> content pipeline
- Slides auto-generated for client deliverables

### PRISM (model ops)
- All Gemini API calls metered and optimized
- Route to cheapest model that meets quality threshold
- Track spend across Cloud API vs Ultra plan
- Auto-failover between providers

## Activation Sequence

### Phase 1: Bridge (immediate)
- [ ] Wire `workspace-mcp` into IE MCP Router
- [ ] Wire `notebooklm-mcp` into IE MCP Router  
- [ ] OAuth 2.1 consent flow for Google account
- [ ] Register both in AlloyDB MCP registry
- [ ] Test: SCRIBE reads a Google Doc, RELAY reads Gmail

### Phase 2: Workspace Automation
- [ ] RELAY: Gmail triage rules (auto-label, draft, escalate)
- [ ] SCRIBE: Auto-generate Docs from agent sessions
- [ ] SWITCHBOARD: Calendar sync with dispatch queue
- [ ] FLUX: Sheets dashboard for agent metrics
- [ ] KEEPER: Drive organization by constitutional schema

### Phase 3: Intelligence Layer
- [ ] PRISM: Gemini API routing (Flash for cheap, Pro for heavy)
- [ ] NotebookLM notebooks auto-populated per project
- [ ] KEEPER: Query NotebookLM as RAG for all agents
- [ ] Vertex AI: Custom embeddings for IE memory

### Phase 4: Content + Commerce
- [ ] SHOWRUNNER: YouTube API integration
- [ ] COMMERCE: Merchant Center + Ads API
- [ ] FLUX: GA4 analytics pipeline
- [ ] STUDIO: Slides auto-generation

### Phase 5: Full Autonomy
- [ ] Pub/Sub event bus: Google services -> IE dispatch
- [ ] Cloud Functions: Webhook handlers for all services
- [ ] Workspace Studio Flows triggered by agents
- [ ] Google Chat bot for conversational dispatch
- [ ] Complete feedback loop: every Google action monitored, learned from, optimized

## The End State

You open Gmail — RELAY has already triaged it.
You open Drive — KEEPER has already organized it.
You open Calendar — SWITCHBOARD has already optimized it.
You open Docs — SCRIBE has already drafted it.
You open Sheets — FLUX has already updated it.
You open NotebookLM — KEEPER has already populated it.
You open Gemini — it's grounded in IE's memory via NotebookLM.
You open YouTube — SHOWRUNNER has already prepared uploads.
You say "Hey Siri, dispatch" — it's already being worked on.

Google becomes the substrate. IE is the mind.
Your Ultra plan isn't a subscription — it's a nervous system.