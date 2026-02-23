# 🔄 Orchestration Patterns Guide

**5 Core Patterns for Multi-Agent Workflows**

---

## Pattern 1: Sequential Pipeline

**Best for:** Content creation, report generation, multi-stage processing

**Structure:**

```
Agent A → Agent B → Agent C → Agent D
```

**Example: Album Campaign**

```python
workflow = {
    "name": "album_campaign",
    "mode": "ideate",
    "nodes": [
        {
            "id": "strategy",
            "agent_id": "ATHENA",
            "prompt": "Create marketing strategy for indie album release"
        },
        {
            "id": "design",
            "agent_id": "BOLT",
            "prompt": "Design landing page based on strategy",
            "dependencies": ["strategy"]
        },
        {
            "id": "copy",
            "agent_id": "SCRIBE",
            "prompt": "Write marketing copy",
            "dependencies": ["strategy"]
        },
        {
            "id": "review",
            "agent_id": "LEX",
            "prompt": "Review all assets for brand alignment",
            "dependencies": ["design", "copy"]
        }
    ]
}
```

**When to use:**
- Clear step-by-step process
- Each step depends on previous
- Linear dependencies

---

## Pattern 2: Hierarchical (AVERI Collective)

**Best for:** Complex strategic decisions, multi-perspective analysis

**Structure:**

```
    Coordinator (ATHENA)
       /          \
      /            \
   VERA          IRIS
  (memory)     (patterns)
```

**Example: Strategic Planning**

```python
workflow = {
    "name": "strategic_planning",
    "mode": "plan",
    "nodes": [
        {
            "id": "athena",
            "agent_id": "ATHENA",
            "prompt": "Coordinate strategic planning for Q1",
            "delegates": ["vera", "iris"]
        },
        {
            "id": "vera",
            "agent_id": "VERA",
            "prompt": "Analyze historical performance data",
            "reports_to": "athena"
        },
        {
            "id": "iris",
            "agent_id": "IRIS",
            "prompt": "Identify market patterns and opportunities",
            "reports_to": "athena"
        }
    ]
}
```

**When to use:**
- Need multiple perspectives
- Coordinator aggregates results
- Clear hierarchy

---

## Pattern 3: Consensus (Constitutional Review)

**Best for:** Decision-making, approval workflows, quality gates

**Structure:**

```
Proposal → [LEX, COMPASS, SENTINEL] → Consensus → Approved
```

**Example: Memory Write Approval**

```python
workflow = {
    "name": "memory_governance",
    "mode": "validate",
    "nodes": [
        {
            "id": "propose",
            "agent_id": "SCRIBE",
            "prompt": "Propose memory write: user preferences"
        },
        {
            "id": "lex_review",
            "agent_id": "LEX",
            "prompt": "Review constitutional compliance",
            "dependencies": ["propose"]
        },
        {
            "id": "compass_review",
            "agent_id": "COMPASS",
            "prompt": "Review mission alignment",
            "dependencies": ["propose"]
        },
        {
            "id": "sentinel_review",
            "agent_id": "SENTINEL",
            "prompt": "Review security implications",
            "dependencies": ["propose"]
        },
        {
            "id": "consensus",
            "agent_id": "KEEPER",
            "prompt": "Aggregate reviews and make decision",
            "dependencies": ["lex_review", "compass_review", "sentinel_review"],
            "consensus_required": 2  # 2/3 approval
        }
    ]
}
```

**When to use:**
- Important decisions
- Need multiple validators
- Democratic/voting mechanism

---

## Pattern 4: MapReduce (Parallel Processing)

**Best for:** Large-scale analysis, multi-entity processing, distributed work

**Structure:**

```
        Task
         │
    ┌───┼───┐
    │   │   │
   A1  A2  A3  (Map: parallel)
    │   │   │
    └───┬───┘
        │
    Aggregator  (Reduce)
```

**Example: Competitive Analysis**

```python
competitors = ["Spotify", "Apple Music", "YouTube Music"]
workflow = {
    "name": "competitor_analysis",
    "mode": "ideate",
    "nodes": [
        # Map phase: analyze each competitor
        *[
            {
                "id": f"analyze_{comp.lower().replace(' ', '_')}",
                "agent_id": "VERA",
                "prompt": f"Analyze {comp}'s features, pricing, and user base",
                "parallel": True
            }
            for comp in competitors
        ],
        # Reduce phase: aggregate insights
        {
            "id": "aggregate",
            "agent_id": "ATHENA",
            "prompt": "Aggregate competitor analyses and identify gaps",
            "dependencies": [f"analyze_{c.lower().replace(' ', '_')}" for c in competitors]
        }
    ]
}
```

**When to use:**
- Multiple independent tasks
- Can parallelize work
- Need aggregated results

---

## Pattern 5: Supervisor (Dynamic Orchestration)

**Best for:** Unpredictable workflows, adaptive processes, agent-to-agent delegation

**Structure:**

```
  Supervisor
      │
      ↓ (selects agents dynamically)
  Agent Pool
```

**Example: Dynamic Content Creation**

```python
workflow = {
    "name": "dynamic_content",
    "mode": "ship",
    "supervisor": {
        "agent_id": "ATHENA",
        "prompt": "Create social media content. Select agents as needed.",
        "available_agents": [
            "BOLT",       # Visual design
            "SCRIBE",     # Copywriting
            "GRAPHICS",   # Image generation
            "BROADCAST",  # Distribution
        ],
        "max_iterations": 5,
        "success_criteria": "All platforms have content ready"
    }
}
# Supervisor dynamically calls:
# 1. GRAPHICS (create image)
# 2. SCRIBE (write caption)
# 3. BROADCAST (schedule posts)
# 4. LEX (review compliance)
```

**When to use:**
- Workflow not predictable upfront
- Agent selects next steps
- Adaptive/iterative process

---

## Decision Tree: Which Pattern?

```
Start
  │
  ├── Clear linear steps?    → YES → Sequential Pipeline
  │
  ├── Need approval/voting?  → YES → Consensus
  │
  ├── Coordinator + workers? → YES → Hierarchical
  │
  ├── Same task, many items? → YES → MapReduce
  │
  └── Unpredictable flow?    → YES → Supervisor
```

---

## Hybrid Patterns

Combine patterns for complex workflows:

### Example: End-to-End Campaign

```
1. Hierarchical (AVERI)     → Strategy
2. MapReduce                → Content for each platform
3. Sequential               → Design → Copy → Review
4. Consensus (LEX)          → Final approval
5. Supervisor (BROADCAST)   → Dynamic distribution
```

---

## Pattern Performance

| Pattern | Parallelism | Complexity | Use Cases |
|---------|-------------|------------|-----------|
| Sequential | Low | Low | Linear workflows |
| Hierarchical | Medium | Medium | Strategic planning |
| Consensus | Medium | High | Approvals, voting |
| MapReduce | High | Medium | Large-scale analysis |
| Supervisor | High | Very High | Adaptive workflows |

---

## Best Practices

1. **Start Simple** - Use Sequential for most workflows
2. **Parallelize When Possible** - Use MapReduce for independent tasks
3. **Governance Gates** - Use Consensus for important decisions
4. **Iterative Refinement** - Use Supervisor for exploratory work
5. **Monitor Performance** - Check execution times, optimize bottlenecks

---

## Next Steps

- Try example workflows in `/examples/`
- Build custom patterns
- Share your patterns with the community
- Read [ARCHITECTURE.md](docs/ARCHITECTURE.md) for system internals
