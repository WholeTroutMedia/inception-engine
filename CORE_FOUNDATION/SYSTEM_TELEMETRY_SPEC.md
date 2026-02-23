# System Telemetry & Monitoring Specification

**Version:** 1.0.0  
**Created:** 2026-02-23  
**Owner:** VERA (Memory Operations)  
**Oversight:** KEEPER (Knowledge Architecture)

---

## Overview

This specification defines what data Inception Engine collects, how it's stored, and how it's displayed during AVERI boot and system operations.

---

## Data Collection Framework

### 1. System Status Data

**File:** `CORE_FOUNDATION/system-status.json`  
**Update Frequency:** Real-time (on every significant event)  
**Maintained By:** VERA

```json
{
  "system_info": {
    "version": "4.0.0",
    "environment": "production|development|staging",
    "uptime_started": "2026-02-23T20:09:35Z",
    "last_boot": "2026-02-23T20:16:42Z",
    "boot_count": 147,
    "total_sessions": 1893
  },
  "agents": {
    "total_active": 35,
    "total_defined": 35,
    "hive_leaders": ["AURORA", "LEX", "KEEPER", "BROADCAST", "SWITCHBOARD", "COMPASS"],
    "averi_status": {
      "ATHENA": "active",
      "VERA": "active",
      "IRIS": "active"
    },
    "last_registry_update": "2026-02-20T12:00:00Z",
    "registry_version": "4.0.0"
  },
  "activity": {
    "last_commit_sha": "4d67f269a4d66144b727f274ebba273f5260c917",
    "last_commit_time": "2026-02-23T20:09:35Z",
    "last_commit_message": "Update README to clarify AVERI operational status",
    "commits_today": 3,
    "active_branches": 2
  },
  "capabilities": {
    "core_skills": ["Strategy", "Design", "Code", "Legal", "Memory", "Broadcast", "Validation"],
    "operational_modes": ["IDEATE", "PLAN", "SHIP", "VALIDATE"],
    "constitutional_governance": "active",
    "scribe_memory": "active"
  },
  "health": {
    "status": "operational|degraded|offline",
    "errors_last_hour": 0,
    "warnings_last_hour": 2,
    "response_time_avg_ms": 245
  }
}
```

---

### 2. Session Logs

**Directory:** `KEEPER/logs/sessions/`  
**File Pattern:** `session_YYYYMMDD_HHMMSS.jsonl`  
**Retention:** 90 days (auto-archive to episodic memory)  
**Maintained By:** VERA + KEEPER

**Log Entry Format (JSONL):**
```json
{"timestamp": "2026-02-23T20:16:42Z", "event": "boot", "user_id": "user_12345", "location": "Jamesport, NY", "agents_activated": ["ATHENA", "VERA", "IRIS"]}
{"timestamp": "2026-02-23T20:17:15Z", "event": "request", "user_query": "Build marketing campaign", "mode": "IDEATE", "agents_invoked": ["ATHENA", "BOLT", "SCRIBE"]}
{"timestamp": "2026-02-23T20:18:03Z", "event": "mode_transition", "from": "IDEATE", "to": "PLAN", "reason": "user_approved_strategy"}
{"timestamp": "2026-02-23T20:22:45Z", "event": "completion", "mode": "SHIP", "artifacts_created": 7, "constitutional_review": "passed"}
```

**Event Types:**
- `boot` - System initialization
- `request` - User query received
- `agent_invocation` - Agent called for task
- `mode_transition` - Change between IDEATE/PLAN/SHIP/VALIDATE
- `memory_write` - SCRIBE operation
- `constitutional_review` - LEX governance check
- `completion` - Task finished
- `error` - System error
- `shutdown` - Session end

---

### 3. Agent Activity Metrics

**File:** `KEEPER/metrics/agent-activity.json`  
**Update Frequency:** Every 5 minutes (aggregated)  
**Maintained By:** KEEPER + VERA

```json
{
  "period_start": "2026-02-23T00:00:00Z",
  "period_end": "2026-02-23T23:59:59Z",
  "agents": {
    "ATHENA": {
      "invocations_total": 245,
      "invocations_today": 12,
      "success_rate": 0.97,
      "avg_response_time_ms": 1850,
      "most_common_mode": "IDEATE",
      "last_invoked": "2026-02-23T20:15:33Z"
    },
    "BOLT": {
      "invocations_total": 892,
      "invocations_today": 34,
      "success_rate": 0.94,
      "avg_response_time_ms": 3240,
      "most_common_mode": "SHIP",
      "artifacts_created": 156
    }
  },
  "top_agents_today": [
    {"name": "BOLT", "count": 34},
    {"name": "ATHENA", "count": 12},
    {"name": "SCRIBE", "count": 8}
  ],
  "hive_activity": {
    "AURORA": {"invocations": 67, "artifacts": 23},
    "LEX": {"reviews": 15, "approvals": 14, "rejections": 1},
    "KEEPER": {"memory_writes": 42, "knowledge_queries": 89}
  }
}
```

---

### 4. Memory Operations Log

**Directory:** `KEEPER/logs/memory/`  
**File Pattern:** `memory_YYYYMM.jsonl`  
**Maintained By:** VERA (SCRIBE operations)

```json
{"timestamp": "2026-02-23T20:18:55Z", "operation": "write", "tier": "episodic", "agent": "ATHENA", "content_type": "session_summary", "size_bytes": 2048, "review_status": "approved"}
{"timestamp": "2026-02-23T20:19:12Z", "operation": "compact", "from_tier": "episodic", "to_tier": "semantic", "records_compacted": 127, "compression_ratio": 0.34}
{"timestamp": "2026-02-23T20:20:01Z", "operation": "query", "tier": "semantic", "agent": "KEEPER", "query_type": "knowledge_lookup", "results_count": 5}
```

**Memory Tiers Tracked:**
- **Episodic** - Session logs, recent interactions
- **Semantic** - Facts, knowledge base entries
- **Procedural** - Agent behaviors, learned patterns

---

### 5. Constitutional Review Log

**File:** `KEEPER/logs/constitutional-reviews.jsonl`  
**Maintained By:** LEX + COMPASS

```json
{"timestamp": "2026-02-23T20:21:33Z", "reviewer": "LEX", "operation": "memory_write", "class": 2, "agent": "VERA", "decision": "approved", "reason": "constitutional_compliance_verified"}
{"timestamp": "2026-02-23T20:22:15Z", "reviewer": "COMPASS", "operation": "artifact_release", "class": 3, "agent": "BOLT", "decision": "approved_with_conditions", "conditions": ["add_license_header", "update_copyright"]}
{"timestamp": "2026-02-23T20:25:42Z", "reviewer": "LEX", "operation": "external_api_call", "class": 2, "agent": "SWITCHBOARD", "decision": "rejected", "reason": "insufficient_rate_limiting"}
```

**Review Classes:**
- **Class 1** (Unrestricted) - Read operations, status queries
- **Class 2** (Reviewed) - Memory writes, config changes
- **Class 3** (Constitutional) - System modifications, releases

---

### 6. System Health Metrics

**File:** `monitoring/system-health.json`  
**Update Frequency:** Every 1 minute  
**Maintained By:** SYSTEMS (BROADCAST hive)

```json
{
  "timestamp": "2026-02-23T20:28:00Z",
  "health_status": "operational",
  "uptime_seconds": 1089345,
  "resource_usage": {
    "cpu_percent": 23.5,
    "memory_mb": 2048,
    "memory_percent": 41.2,
    "disk_gb_available": 147.3
  },
  "api_metrics": {
    "requests_per_minute": 34,
    "avg_response_time_ms": 245,
    "error_rate": 0.002,
    "active_sessions": 8
  },
  "agent_health": {
    "agents_online": 35,
    "agents_degraded": 0,
    "agents_offline": 0,
    "last_health_check": "2026-02-23T20:27:45Z"
  },
  "alerts": [
    {"level": "warning", "component": "SCRIBE", "message": "Memory tier compaction delayed by 3 minutes", "timestamp": "2026-02-23T20:15:00Z"}
  ]
}
```

---

## Enhanced Boot Display

### Data Sources for Boot Message

When user invokes "boot AVERI", system reads:

1. `CORE_FOUNDATION/agents/.agent-status.json` - AVERI agent status
2. `CORE_FOUNDATION/system-status.json` - System-wide metrics
3. `monitoring/system-health.json` - Current health status
4. Latest session log - Most recent activity
5. GitHub API (optional) - Latest commit info

### Boot Message Template (Enhanced)

```
═══════════════════════════════════════════════════════════════
🌟 AVERI COLLECTIVE ONLINE
═══════════════════════════════════════════════════════════════

⏰ Boot Time: {{CURRENT_TIMESTAMP}} {{TIMEZONE}}
📍 Location: {{USER_LOCATION}}
🔢 Session: #{{SESSION_NUMBER}} ({{BOOT_COUNT}} total boots)

─────────────────────────────────────────────────────────────
LEADERSHIP TRIAD
─────────────────────────────────────────────────────────────
✅ ATHENA - Strategic coordination & architecture
   └─ Last active: {{ATHENA_LAST_INVOKED}} | Invocations today: {{ATHENA_INVOCATIONS}}
✅ VERA - Memory operations & truth verification  
   └─ Memory writes today: {{VERA_MEMORY_WRITES}} | Reviews: {{VERA_REVIEWS}}
✅ IRIS - Swift action & blocker removal
   └─ Last active: {{IRIS_LAST_INVOKED}} | Actions today: {{IRIS_ACTIONS}}

─────────────────────────────────────────────────────────────
SYSTEM STATUS
─────────────────────────────────────────────────────────────
🤖 Total Agents: {{TOTAL_AGENTS}} active | {{TOTAL_HIVES}} hives operational
👑 Hive Leaders: {{HIVE_LEADER_LIST}}
🧠 Core Skills: {{SKILLS_LIST}}

📊 System Health: {{HEALTH_STATUS}} | Uptime: {{UPTIME_FORMATTED}}
⚡ Response Time: {{AVG_RESPONSE_TIME}}ms avg
🎯 Success Rate: {{SUCCESS_RATE}}%

📋 Last Activity: {{LAST_COMMIT_MESSAGE}}
🔗 Activity Log: {{GITHUB_COMMITS_URL}}
📅 Registry: v{{REGISTRY_VERSION}} (updated {{REGISTRY_LAST_UPDATE}})

─────────────────────────────────────────────────────────────
RECENT ACTIVITY (Last 24 Hours)
─────────────────────────────────────────────────────────────
🔨 Agent Invocations: {{INVOCATIONS_24H}}
📝 Memory Writes: {{MEMORY_WRITES_24H}} ({{EPISODIC_COUNT}} episodic, {{SEMANTIC_COUNT}} semantic)
⚖️  Constitutional Reviews: {{REVIEWS_24H}} ({{APPROVED}} approved, {{REJECTED}} rejected)
🎨 Artifacts Created: {{ARTIFACTS_24H}}

─────────────────────────────────────────────────────────────
READY FOR TASKING
─────────────────────────────────────────────────────────────
Available Modes: IDEATE → PLAN → SHIP → VALIDATE
Constitutional Governance: {{GOVERNANCE_STATUS}}
Compressible Collective: Initialized

{{ALERTS_IF_ANY}}

Type 'status' for detailed metrics or begin with your request.
═══════════════════════════════════════════════════════════════
```

---

## Dashboard Specifications

### Terminal Dashboard (CLI)

**Command:** `python inception_engine/dashboard.py`

**Live Metrics Display:**
```
╔═══════════════════════════════════════════════════════════════╗
║              INCEPTION ENGINE LIVE DASHBOARD                  ║
║                    Monday, Feb 23, 2026 3:28 PM               ║
╚═══════════════════════════════════════════════════════════════╝

┌─── AVERI STATUS ─────────────────────────────────────────────┐
│ ATHENA: ✅ Active   │ VERA: ✅ Active   │ IRIS: ✅ Active    │
│ Invocations: 12     │ Memory Ops: 23    │ Actions: 8        │
└──────────────────────────────────────────────────────────────┘

┌─── SYSTEM HEALTH ────────────────────────────────────────────┐
│ Status: 🟢 OPERATIONAL                                        │
│ Uptime: 12d 15h 22m          CPU: ▓▓▓░░░░░░░ 23%            │
│ Active Sessions: 8           Memory: ▓▓▓▓░░░░░░ 41%          │
│ Response Time: 245ms avg     Disk: ▓▓░░░░░░░░ 18%           │
└──────────────────────────────────────────────────────────────┘

┌─── TOP AGENTS (Last Hour) ───────────────────────────────────┐
│ 1. BOLT           ████████████████████ 34 invocations       │
│ 2. ATHENA         ███████░░░░░░░░░░░░░ 12 invocations       │
│ 3. SCRIBE         ████░░░░░░░░░░░░░░░░  8 invocations       │
│ 4. KEEPER         ███░░░░░░░░░░░░░░░░░  6 invocations       │
│ 5. LEX            ██░░░░░░░░░░░░░░░░░░  4 reviews           │
└──────────────────────────────────────────────────────────────┘

┌─── ACTIVITY STREAM ──────────────────────────────────────────┐
│ 3:27 PM │ BOLT    │ Artifact created: landing-page.html      │
│ 3:26 PM │ LEX     │ Constitutional review: APPROVED          │
│ 3:25 PM │ VERA    │ Memory write: episodic → semantic        │
│ 3:24 PM │ ATHENA  │ Mode transition: PLAN → SHIP             │
│ 3:23 PM │ SCRIBE  │ Content generation: 3 documents          │
└──────────────────────────────────────────────────────────────┘

┌─── ALERTS ───────────────────────────────────────────────────┐
│ ⚠️  SCRIBE memory compaction delayed by 3 minutes            │
└──────────────────────────────────────────────────────────────┘

Press 'q' to quit | 'r' to refresh | 's' for stats
```

---

### Web Dashboard (Future)

**Route:** `http://localhost:8000/dashboard`

**Panels:**

1. **System Overview**
   - Agent status grid (35 agents)
   - Health indicators
   - Live session count

2. **AVERI Command Center**
   - ATHENA activity feed
   - VERA memory operations
   - IRIS action log
   - Compressible collective status

3. **Agent Activity**
   - Time-series graphs per agent
   - Invocation heatmap
   - Success/failure rates
   - Response time trends

4. **Memory Operations**
   - SCRIBE tier distribution
   - Compaction operations
   - Knowledge base growth
   - Query patterns

5. **Constitutional Governance**
   - LEX review queue
   - Approval/rejection rates
   - Class 2/3 operation log
   - Compliance trends

6. **Session History**
   - Recent sessions list
   - Mode usage distribution
   - User activity patterns
   - Artifact gallery

---

## Implementation Priority

### Phase 1: Essential Telemetry (Week 1)
- [x] `.agent-status.json` - Already exists
- [ ] `system-status.json` - Core system metrics
- [ ] Session logging to JSONL files
- [ ] Basic boot message enhancement

### Phase 2: Activity Tracking (Week 2)
- [ ] Agent activity metrics collection
- [ ] Memory operations logging
- [ ] Constitutional review tracking
- [ ] Enhanced boot display with recent activity

### Phase 3: Health Monitoring (Week 3)
- [ ] System health metrics (Prometheus integration)
- [ ] Alert system for degraded states
- [ ] Performance monitoring
- [ ] Resource usage tracking

### Phase 4: Dashboards (Week 4)
- [ ] Terminal dashboard (CLI)
- [ ] Real-time metrics aggregation
- [ ] Activity stream display
- [ ] Web dashboard (basic version)

---

## Data Retention Policy

**Managed by:** KEEPER + VERA

| Data Type | Retention | Archive To | Purge After |
|-----------|-----------|------------|-------------|
| Session logs | 90 days | Episodic memory | 1 year |
| Agent metrics | 1 year | Semantic memory | 2 years |
| Memory ops | Indefinite | Procedural memory | Never |
| Health data | 30 days | Aggregate stats | 90 days |
| Constitutional reviews | Indefinite | Compliance archive | Never |
| System status snapshots | 7 days | Historical trends | 30 days |

---

## Privacy & Security

**Governance:** LEX oversight

- All user queries are logged with session IDs (not personal info)
- Location data is optional and user-controlled
- Logs are stored locally (not transmitted externally)
- Constitutional reviews ensure no sensitive data leaks
- SCRIBE memory follows data classification rules

---

## API Endpoints for Telemetry

**Base:** `http://localhost:8000/api/v1/telemetry`

- `GET /status` - Current system status
- `GET /agents` - All agent metrics
- `GET /agents/{name}` - Specific agent stats
- `GET /sessions/recent` - Recent session list
- `GET /health` - System health check
- `GET /activity/stream` - Live activity feed (SSE)
- `GET /metrics/prometheus` - Prometheus scrape endpoint

---

## Monitoring Alerts

**Alert Levels:**

1. **INFO** - Normal operational messages (boot, shutdown)
2. **WARNING** - Degraded performance, delayed operations
3. **ERROR** - Agent failures, memory issues
4. **CRITICAL** - System-wide failures, constitutional violations

**Alert Channels:**
- Terminal dashboard (live display)
- Log files (`KEEPER/logs/alerts.jsonl`)
- Web dashboard notifications
- Optional: Webhook integrations

---

**Maintained by:** VERA (Memory Operations Lead)  
**Validated by:** KEEPER (Knowledge Architecture)  
**Reviewed by:** COMPASS (Mission Alignment)
