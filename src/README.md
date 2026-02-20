# 🚀 INCEPTION ENGINE

**The Four-Mode AI Orchestration System**

---

## Overview

Inception Engine is the core orchestration system powering Brainchild V4. It manages the four operational modes (IDEATE, PLAN, SHIP, VALIDATE), coordinates 35+ agents, and enforces constitutional compliance.

---

## Architecture

```
inception_engine/
├── core/                      # Core orchestration
│   ├── orchestrator.py        # Mode-aware orchestration
│   ├── mode_manager.py        # Mode switching logic
│   ├── agent_loader.py        # Dynamic agent activation
│   ├── workflow_engine.py     # Workflow execution
│   ├── checkpoint_system.py   # State persistence
│   ├── gate_validator.py      # SHIP mode gate checking
│   └── constitutional_guard.py # Compliance enforcement
│
├── modes/                     # Mode implementations
│   ├── base_mode.py           # Abstract mode class
│   ├── ideate_mode.py
│   ├── plan_mode.py
│   ├── ship_mode.py
│   └── validate_mode.py
│
├── agents/                    # Agent implementations
│   ├── base_agent.py          # Abstract agent class
│   ├── builders/              # 30 production agents (V3)
│   └── validators/            # 5 review agents (V4)
│
├── memory/                    # Memory system
│   ├── hippocampus.py         # Working memory (Redis)
│   ├── neocortex.py           # Long-term memory (PostgreSQL)
│   └── consolidation.py       # Memory transfer
│
├── api/                       # REST API + WebSocket
├── cli/                       # Command-line interface
├── workflows/                 # Workflow definitions
└── utils/                     # Utilities
```

---

## Quick Start

### Installation

```bash
# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Run the engine
python inception_cli.py
```

### CLI Usage

```bash
# Ideation
inception ideate "Build streaming platform"

# Planning
inception plan --from-last

# Shipping
inception ship --from-last

# Validation
inception validate --from-last
```

### API Usage

```bash
# Start server
python api_server.py

# Generate application
curl -X POST http://localhost:8000/api/modes/ship \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Build blog platform"}'
```

---

## Core Components

### Orchestrator

**File:** `core/orchestrator.py`

**Responsibilities:**
- Mode lifecycle management
- Agent coordination
- Workflow execution
- Constitutional enforcement
- State management

### Mode Manager

**File:** `core/mode_manager.py`

**Responsibilities:**
- Mode activation/deactivation
- Mode transitions
- Agent roster loading
- Configuration management

### Agent Loader

**File:** `core/agent_loader.py`

**Responsibilities:**
- Dynamic agent activation
- Agent initialization
- Constitution loading
- Performance monitoring

### Gate Validator

**File:** `core/gate_validator.py`

**Responsibilities:**
- SHIP mode gate checking
- Exit criteria validation
- Production readiness verification
- Health check monitoring

### Constitutional Guard

**File:** `core/constitutional_guard.py`

**Responsibilities:**
- Article compliance checking
- Violation detection
- Remediation enforcement
- Audit trail maintenance

---

## Mode System

Each mode is implemented as a Python class inheriting from `BaseMode`:

```python
from inception_engine.modes.base_mode import BaseMode

class ShipMode(BaseMode):
    def __init__(self):
        super().__init__("SHIP")
    
    def execute(self, context):
        # Load agents
        agents = self.load_agents()
        
        # Run workflow
        result = self.run_workflow(context)
        
        # Validate gates
        if not self.validate_gates(result):
            raise IncompleteShipmentError()
        
        return result
```

---

## Memory Architecture

### Hippocampus (Working Memory)

**Storage:** Redis  
**Duration:** 7 days  
**Purpose:** Active session context

**Operations:**
- Real-time logging
- Session tracking
- Context management

### Neocortex (Long-Term Memory)

**Storage:** PostgreSQL  
**Duration:** Indefinite  
**Purpose:** Historical learning

**Operations:**
- Pattern storage
- Knowledge graphs
- Cross-session learning

### Consolidation

**Trigger:** Session end  
**Operator:** VERA  
**Process:**
1. Extract from Hippocampus
2. Pattern recognition
3. Store in Neocortex
4. Update knowledge graphs

---

## Constitutional Enforcement

**Pre-Mode Activation:**
- Load constitution
- Initialize compliance checking
- Activate constitutional guard

**During Execution:**
- Real-time compliance monitoring
- Decision validation
- Violation detection

**Post-Mode Completion:**
- Final compliance check
- Audit trail creation
- Report to COMPASS

---

## API Endpoints

### Mode Operations

```
POST   /api/modes/ideate
POST   /api/modes/plan
POST   /api/modes/ship
POST   /api/modes/validate
GET    /api/modes/status/{session_id}
POST   /api/modes/continue/{session_id}
```

### Agent Operations

```
GET    /api/agents/list
GET    /api/agents/{agent_name}/status
POST   /api/agents/activate
POST   /api/agents/deactivate
```

### Workflow Operations

```
GET    /api/workflows/list
POST   /api/workflows/execute
GET    /api/workflows/{workflow_id}/status
```

---

## CLI Commands

```bash
# Mode operations
inception ideate "<prompt>"
inception plan [--from-ideation | --from-last | "<prompt>"]
inception ship [--from-plan | --from-last | "<prompt>"] [--mode=fast|balanced|careful]
inception validate [--from-ship | --from-last | <build_id>]

# Status and management
inception status                    # Current session status
inception history                   # Past sessions
inception agents                    # List all agents
inception modes                     # List available modes
inception config                    # Show configuration
```

---

## Technology Stack

**Backend:**
- Python 3.11+
- FastAPI (REST API)
- WebSockets (real-time updates)
- Redis (working memory)
- PostgreSQL (long-term memory)

**AI Providers:**
- Anthropic Claude (primary)
- OpenAI GPT (secondary)

**Infrastructure:**
- Docker
- Kubernetes (production)
- Prometheus + Grafana (monitoring)

---

## Status

✅ **OPERATIONAL** - Production-ready as of February 19, 2026

**Version:** 4.0.0  
**Constitution:** 18 Articles Active  
**Agents:** 35+ Active  
**Modes:** 4 Operational  

---

**For detailed setup instructions, see [SETUP.md](./SETUP.md)**
**For API documentation, see [docs/api/](../docs/api/)**
**For CLI reference, see [docs/cli/](../docs/cli/)**
