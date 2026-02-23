# 🚀 INCEPTION ENGINE - Core Implementation

**The Four-Mode AI Orchestration System**

<p align="center">
  <img src="https://img.shields.io/badge/Status-Scaffolding%20Complete-yellow?style=flat-square" alt="Status" />
  <img src="https://img.shields.io/badge/Implementation-In%20Progress-orange?style=flat-square" alt="Implementation" />
</p>

---

## ⚠️ Current Implementation Status

### ✅ What's Built
- Core orchestration classes (orchestrator.py, mode_manager.py, agent_loader.py)
- Constitutional enforcement system (constitutional_guard.py, gate_validator.py)
- Base agent framework (base_agent.py)
- Validator agents (7 agents: sentinel, archon, proof, harbor, coverage, logic, patterns)
- FastAPI server structure (src/api/server.py)
- Docker/docker-compose setup
- Test infrastructure (src/tests/)

### 🔨 In Active Development (COMETs)
- Mode implementations (src/modes/ currently only has __init__.py)
- Memory system (src/memory/ does not exist yet)
- Working example scripts (examples/ only has agent-config.json)
- Full CLI functionality (src/cli/inception_cli.py needs mode implementations)
- Scripts directory (src/scripts/ does not exist)

### 📋 Planned
- REST API with tested endpoints
- WebSocket real-time updates
- Redis/PostgreSQL memory integration
- Production deployment templates
- Cross-session learning

---

## Overview

This is the core orchestration system for Inception Engine. It manages the four operational modes (IDEATE, PLAN, SHIP, VALIDATE), coordinates 15 agents (Light Edition), and enforces constitutional compliance.

---

## Architecture

```
src/inception_engine/
├── core/                      # Core orchestration ✅
│   ├── orchestrator.py        # Mode-aware orchestration
│   ├── mode_manager.py        # Mode switching logic
│   ├── agent_loader.py        # Dynamic agent activation
│   ├── gate_validator.py      # SHIP mode gate checking
│   ├── constitutional_guard.py # Compliance enforcement
│   ├── boot_system.py         # System initialization
│   └── session_config.py      # Session management
│
├── modes/                     # Mode implementations 🔨
│   └── __init__.py            # (Implementations needed)
│
├── agents/                    # Agent implementations ✅
│   ├── base_agent.py          # Abstract agent class
│   ├── builders/              # Builder agents (incomplete)
│   ├── validators/            # 7 validator agents (complete)
│   └── masters/               # ⚠️ Legacy naming (needs rename)
│
├── api/                       # REST API + WebSocket ⚠️
│   ├── server.py              # FastAPI structure (needs fixes)
│   └── README.md              # API documentation
│
├── cli/                       # Command-line interface ⚠️
│   └── inception_cli.py       # CLI scaffolding (needs mode implementations)
│
└── tests/                     # Test suite ✅
    ├── test_orchestrator.py
    └── test_security/
```

---

## Quick Start (When Modes Are Implemented)

### Installation

```bash
# Install from repository root
cd inception-engine
pip install -r src/requirements.txt

# Or install as package
pip install -e .
```

### Configuration

```bash
# Copy example config
cp .env.example .env
# Edit .env with your API keys
```

### CLI Usage (Planned)

```bash
# Once mode implementations are complete:
inception ideate "Build streaming platform"
inception plan --from-last
inception ship --from-last
inception validate --from-last
```

### API Usage (In Development)

```bash
# Start server (requires mode implementations)
python -m inception_engine.api.server

# Test health endpoint
curl http://localhost:8000/health
```

---

## Core Components

### Orchestrator ✅

**File:** `core/orchestrator.py`

**Status:** Scaffolding complete, needs mode implementations

**Responsibilities:**
- Mode lifecycle management
- Agent coordination
- Constitutional enforcement
- State management

### Mode Manager ✅

**File:** `core/mode_manager.py`

**Status:** Scaffolding complete

**Responsibilities:**
- Mode activation/deactivation
- Mode transitions
- Agent roster loading
- Configuration management

### Agent Loader ✅

**File:** `core/agent_loader.py`

**Status:** Working

**Responsibilities:**
- Dynamic agent activation
- Agent initialization
- Constitution loading
- Performance monitoring

### Gate Validator ✅

**File:** `core/gate_validator.py`

**Status:** Scaffolding complete

**Responsibilities:**
- SHIP mode gate checking
- Exit criteria validation
- Production readiness verification

### Constitutional Guard ✅

**File:** `core/constitutional_guard.py`

**Status:** Scaffolding complete

**Responsibilities:**
- Article compliance checking
- Violation detection
- Remediation enforcement
- Audit trail maintenance

---

## Mode System (Needs Implementation)

Each mode will be implemented as a Python class inheriting from `BaseMode`:

```python
# Target implementation (not yet built)
from inception_engine.modes.base_mode import BaseMode

class ShipMode(BaseMode):
    def __init__(self):
        super().__init__("SHIP")
    
    def execute(self, context):
        agents = self.load_agents()
        result = self.run_workflow(context)
        
        if not self.validate_gates(result):
            raise IncompleteShipmentError()
        
        return result
```

**Current Status:** Only `__init__.py` exists in `src/modes/`

**Needed Files:**
- `base_mode.py`
- `ideate_mode.py`
- `plan_mode.py`
- `ship_mode.py`
- `validate_mode.py`

---

## Memory Architecture (Planned)

### Hippocampus (Working Memory)

**Storage:** Redis  
**Status:** 📋 Planned

### Neocortex (Long-Term Memory)

**Storage:** PostgreSQL  
**Status:** 📋 Planned

### Consolidation

**Status:** 📋 Planned

---

## API Endpoints (Structure Defined)

### Mode Operations

```
POST   /api/v1/modes/ideate
POST   /api/v1/modes/plan
POST   /api/v1/modes/ship
POST   /api/v1/modes/validate
```

### Agent Operations

```
GET    /api/v1/agents
```

**Note:** Server structure exists but requires mode implementations to function.

---

## Development

### Running Tests

```bash
# From repository root
pytest src/tests/ -v
```

### Contributing

**High-priority needs:**
1. Implement mode classes in `src/modes/`
2. Build memory system in `src/memory/`
3. Create working example scripts
4. Fix API server import chain
5. Complete CLI implementation

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

---

## Technology Stack

**Backend:**
- Python 3.11+
- FastAPI (REST API structure)
- Pydantic (data validation)

**Planned Infrastructure:**
- Redis (working memory)
- PostgreSQL (long-term memory)
- Docker (containerization)
- Kubernetes (production orchestration)

**AI Providers:**
- Anthropic Claude (primary)
- OpenAI GPT (secondary)

---

## Known Issues

1. **Mode implementations missing** - `src/modes/` only has `__init__.py`
2. **Memory system not built** - No `src/memory/` directory
3. **Scripts directory missing** - No `src/scripts/`
4. **Example scripts missing** - Only `agent-config.json` exists
5. **API server import chain needs fixes** - References non-existent modules
6. **CLI needs mode implementations** - Can't execute commands without modes

---

## Version

**Version:** 0.2.0-alpha  
**Status:** 🚧 In Active Development  
**Constitution:** 19 Articles (complete)  
**Agents:** 15 agents (Light Edition)  
**Modes:** 4 designed (implementation in progress)  

---

**For architecture overview, see [../README.md](../README.md)**  
**For contributing, see [../CONTRIBUTING.md](../CONTRIBUTING.md)**  
**For agent documentation, see [../docs/AGENTS.md](../docs/AGENTS.md)**
