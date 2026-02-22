# API Reference

**Inception Engine Light Edition** - Python API

---

## Core Modules

### BootSystem

`src.core.boot_system.BootSystem`

Manages the boot process, agent discovery, and welcome experience.

```python
from src.core.boot_system import BootSystem

boot = BootSystem()

# Full boot with welcome message
boot_info = boot.boot(
    package_name="Inception Engine",
    show_agents=True,
    show_session_options=True
)

# Query a specific agent
agent = boot.get_agent_info("ATHENA")
# Returns: {"name": "ATHENA", "type": "leader", "function": "...", ...}

# Find agents by capability
design_agents = boot.list_agents_by_capability("design")
# Returns: ["AURORA"]
```

**Methods:**

| Method | Args | Returns | Description |
|---|---|---|---|
| `boot()` | `package_name`, `show_agents`, `show_session_options` | `Dict` | Execute boot sequence |
| `get_agent_info()` | `agent_name: str` | `Optional[Dict]` | Get details about one agent |
| `list_agents_by_capability()` | `capability: str` | `List[str]` | Search agents by keyword |

**Boot Info Dict:**

```python
{
    "package_name": str,
    "boot_time": str,       # ISO 8601
    "version": str,          # e.g. "4.0.0-light"
    "total_agents": int,     # 15 in Light Edition
    "available_agents": List[Dict],
    "session_options": Dict,
    "operational_mode": str, # "interoperable"
    "helix_mode": str        # "available_on_request"
}
```

---

### SessionManager

`src.core.session_config.SessionManager`

Manages session lifecycle, operational modes, and workflow patterns.

```python
from src.core.session_config import SessionManager, OperationalMode

manager = SessionManager()

# Start an express session (default)
session = manager.start_session(
    operational_mode=OperationalMode.INTEROPERABLE,
    workflow_pattern="express"
)

# Switch to HELIX mode mid-session
manager.switch_operational_mode(OperationalMode.HELIX)
manager.configure_helix({
    "frontend_helix": ["Aurora", "BOLT"],
    "backend_helix": ["COMET", "SYSTEMS"]
})

# Get current configuration
config = manager.get_current_config()

# End session
summary = manager.end_session()
```

**Methods:**

| Method | Args | Returns | Description |
|---|---|---|---|
| `start_session()` | `operational_mode`, `workflow_pattern`, `auto_validate`, `show_agent_thoughts`, `excluded_agents` | `Dict` | Start new session |
| `switch_operational_mode()` | `new_mode: OperationalMode` | `None` | Change operational mode |
| `configure_helix()` | `helix_assignments: Dict[str, List[str]]` | `None` | Set HELIX agent assignments |
| `enter_mode()` | `mode: InceptionMode` | `None` | Enter specific inception mode |
| `get_current_config()` | - | `Dict` | Get full session state |
| `end_session()` | - | `Optional[Dict]` | End session, return summary |
| `is_active` | property | `bool` | Whether session is active |

---

### Enums

**OperationalMode:**

| Value | Description |
|---|---|
| `INTEROPERABLE` | All agents work together fluidly (default) |
| `HELIX` | Agents organized into parallel workstreams |
| `PLAN_DETERMINED` | Agents self-organize during PLAN mode |

**InceptionMode:**

| Value | Description |
|---|---|
| `IDEATE` | Strategic vision and alignment |
| `PLAN` | Technical specification and design |
| `SHIP` | Implementation to production |
| `VALIDATE` | Quality assurance and review |

---

### Orchestrator

`src.core.orchestrator.InceptionOrchestrator`

Coordinates modes and agents through workflow execution.

```python
from src.core.orchestrator import InceptionOrchestrator

orchestrator = InceptionOrchestrator()

# Express workflow: prompt to production
result = orchestrator.execute_express_workflow(
    "Build a task management app"
)

# Full lifecycle
result = orchestrator.execute_full_lifecycle(
    "Build an e-commerce platform"
)
```

---

### ModeManager

`src.core.mode_manager.ModeManager`

Handles mode lifecycle and transitions between IDEATE, PLAN, SHIP, VALIDATE.

---

### GateValidator

`src.core.gate_validator.GateValidator`

Enforces SHIP mode production gates. Cannot exit SHIP until all gates pass:
- Code complete
- Tests passing
- Deployed
- Live and accessible

---

### ConstitutionalGuard

`src.core.constitutional_guard.ConstitutionalGuard`

Enforces the 19-article Agent Constitution on every operation.

---

## Agents

### BaseAgent

`src.agents.base_agent.BaseAgent`

All agents inherit from BaseAgent. To create a custom agent:

```python
from src.agents.base_agent import BaseAgent

class MyAgent(BaseAgent):
    name = "MY_AGENT"
    modes = [InceptionMode.SHIP, InceptionMode.VALIDATE]

    def execute(self, context):
        # Your agent logic
        return result
```

### Agent Categories

**AVERI Triad (Strategic Leaders):**
- `ATHENA` - Strategic planning, architecture, risk assessment
- `VERA` - Truth verification, registry management, compliance
- `IRIS` - Swift action, blocker removal, pattern recognition

**Builders:**
- `BOLT` - Frontend engineering, iOS development
- `COMET` - Backend systems, browser automation
- `SYSTEMS` - Infrastructure and deployment

**Hive Leaders:**
- `AURORA` - Design and engineering coordination
- `KEEPER` - Knowledge organization, pattern library
- `ATLAS` - Broadcast infrastructure
- `COMPASS` - Constitutional review, North Star guardian
- `LEX` - Legal and constitutional compliance
- `SWITCHBOARD` - Operations routing

**Validators:**
- `SENTINEL` - Security vulnerability scanning
- `ARCHON` - Architecture compliance
- `PROOF` - Behavioral correctness
- `HARBOR` - Test coverage

**Coordination:**
- `SCRIBE` - Institutional memory, cross-agent coordination

---

## Workflow Patterns

| Pattern | Modes | Use Case |
|---|---|---|
| `"full"` | IDEATE > PLAN > SHIP > VALIDATE | Enterprise, maximum quality |
| `"rapid"` | IDEATE > SHIP > VALIDATE | Fast prototypes |
| `"express"` | SHIP > VALIDATE | Prompt to production |
| `"continuous"` | VALIDATE > SHIP | Maintenance cycles |

---

## Configuration

See `.env.example` for environment variable reference.

See `examples/agent-config.json` for full agent and neural system configuration.

---

## Related Documentation

- [Getting Started](GETTING_STARTED.md) - Setup and first steps
- [Four Modes](FOUR_MODES.md) - Deep dive into IDEATE/PLAN/SHIP/VALIDATE
- [Agent Registry](AGENTS.md) - Full agent profiles and capabilities
- [Neural Architecture](NEURAL_ARCHITECTURE.md) - Brain-inspired coordination
- [Constitution](../CONSTITUTION.md) - The 19-article governance framework
