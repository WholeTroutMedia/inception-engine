# Inception Engine V4 - Architecture Documentation

## System Overview

Inception Engine V4 is a mode-based AI development system that coordinates 35+ specialized agents through four operational modes to deliver production-ready applications.

## Core Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    ORCHESTRATOR                         │
│  (Main coordination and workflow management)            │
└────────────────┬────────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
┌──────────────┐  ┌──────────────────┐
│ MODE MANAGER │  │  AGENT LOADER    │
└──────┬───────┘  └────────┬─────────┘
       │                   │
       │                   │
       ▼                   ▼
┌─────────────────────────────────┐
│        FOUR MODES               │
│  • IDEATE  (Vision)             │
│  • PLAN    (Specification)      │
│  • SHIP    (Implementation)     │
│  • VALIDATE (Quality Assurance) │
└─────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│    CONSTITUTIONAL GUARD         │
│  • Article 0: No Stealing       │
│  • Article XVII: Zero Day       │
│  • Article XVIII: Generative    │
└─────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│      GATE VALIDATOR             │
│  (SHIP mode exit gates)         │
│  1. Code Complete               │
│  2. Tests Passing               │
│  3. Deployment Live             │
│  4. Health Check Passing        │
└─────────────────────────────────┘
```

## Component Breakdown

### 1. Orchestrator (`orchestrator.py`)

**Purpose**: Central coordination system

**Responsibilities**:
- Execute mode workflows
- Manage agent lifecycle
- Enforce constitutional compliance
- Validate SHIP mode gates
- Track session state
- Handle mode transitions

**Key Methods**:
```python
execute_mode(mode, input_data) -> output_data
execute_full_lifecycle(prompt) -> complete_result
execute_rapid_workflow(prompt) -> result
execute_express_workflow(prompt) -> result
```

### 2. Mode Manager (`mode_manager.py`)

**Purpose**: Mode lifecycle and transition management

**Responsibilities**:
- Load mode configurations
- Start/complete mode sessions
- Validate entry/exit criteria
- Track session history
- Manage mode transitions

**Key Classes**:
- `ModeType`: Enum of four modes
- `ModeStatus`: Session status tracking
- `ModeSession`: Session data container
- `ModeConfig`: Mode configuration from JSON

### 3. Agent Loader (`agent_loader.py`)

**Purpose**: Dynamic agent activation and management

**Responsibilities**:
- Load agent registry
- Activate/deactivate agents by mode
- Track active agents
- Manage agent dependencies
- Organize agents by hive

**Agent Organization**:
- **Builders** (V3): Production/creation agents
- **Validators** (V4): Quality assurance agents  
- **Leaders**: AVERI, VERA, etc.
- **Hive Leaders**: AURORA, LEX, KEEPER, BROADCAST, SWITCHBOARD

### 4. Gate Validator (`gate_validator.py`)

**Purpose**: SHIP mode exit gate enforcement

**The Four Gates**:
1. **Code Complete**: All planned code written, no critical TODOs
2. **Tests Passing**: Test suite passes with coverage threshold
3. **Deployment Live**: Application deployed to production
4. **Health Check Passing**: Application accessible via HTTP

**Constitutional Principle**:
Implements Article XVII (Zero Day Creativity) - cannot exit SHIP until production-ready.

### 5. Constitutional Guard (`constitutional_guard.py`)

**Purpose**: Enforce Agent Constitution compliance

**Sacred Articles Enforced**:

**Article 0 (No Stealing)**:
- Detects forbidden language (steal, copy, rip off)
- Requires attribution for references
- Scans for copied code patterns
- Zero tolerance - instant failure

**Article XVII (Zero Day Creativity)**:
- Detects MVP/incomplete language
- Prevents deadline pressure patterns
- Enforces complete solution commitment
- Validates SHIP gate passage

**Article XVIII (Generative Agency)**:
- Detects lock-in/extraction patterns
- Validates open format support
- Checks export capabilities
- Ensures educational transparency

**Compliance Requirements**:
- Minimum 70/100 score
- Zero Article 0 violations
- Max 1 violation-level check

### 6. Base Agent (`base_agent.py`)

**Purpose**: Foundation for all agents

**Agent Types**:
- Builder: Production/creation (V3 agents)
- Validator: Quality assurance (V4 agents)
- Leader: Strategic coordination
- Hive Leader: Team coordination

**Required Methods**:
```python
execute(context) -> result
get_capabilities() -> AgentCapabilities
```

### 7. Validator Agents

**SENTINEL** (`validators/sentinel.py`):
- Security vulnerability scanning
- SQL injection detection
- XSS vulnerability detection
- Hardcoded secrets detection

**PATTERNS** (`validators/patterns.py`):
- Architecture compliance validation
- SOLID principles checking
- Design pattern evaluation
- Code organization review
- Scalability assessment

**LOGIC** (`validators/logic.py`):
- Behavioral correctness validation
- Edge case coverage
- Error handling review
- State management analysis
- Input validation checking

**COVERAGE** (`validators/coverage.py`):
- Test completeness evaluation
- Unit test coverage
- Integration test coverage
- E2E test coverage
- Test quality assessment

## Workflow Patterns

### 1. Full Lifecycle
```
IDEATE → PLAN → SHIP → VALIDATE
```
- All 35+ agents participate in IDEATE
- Focused team in PLAN
- Implementation team in SHIP
- Fresh eyes in VALIDATE
- Best for complex projects

### 2. Rapid Workflow
```
IDEATE → SHIP → VALIDATE
```
- Skip detailed planning
- Faster than full lifecycle
- Good for well-understood problems

### 3. Express Workflow
```
SHIP → VALIDATE
```
- Prompt-to-product
- Fastest option
- Perfect for simple applications
- Ideal for prototyping

## Mode Details

### IDEATE Mode

**Purpose**: Strategic vision and alignment

**Participants**: All 35+ agents

**Process**:
1. All agents contribute from specialties
2. VERA synthesizes perspectives
3. KEEPER extracts patterns
4. COMPASS validates alignment

**Outputs**:
- Vision document
- Strategic alignment
- Success criteria
- Risk assessment
- Opportunity identification

### PLAN Mode

**Purpose**: Technical specification and breakdown

**Participants**: Focused team (builders)

**Process**:
1. ARCH loads relevant patterns
2. Hive leaders break down tasks
3. RELAY maps dependencies
4. COMPASS reviews ethics

**Outputs**:
- Technical specification
- Architecture diagrams
- Task breakdown
- Resource estimates
- Timeline projection

### SHIP Mode

**Purpose**: Implementation through production

**Participants**: Implementation team

**Process**:
1. BOLT writes and tests code
2. SYSTEMS provisions infrastructure
3. SIGNAL deploys to production
4. CODEX generates documentation
5. Aurora validates completeness
6. ALL FOUR GATES MUST PASS

**Outputs**:
- Production-ready application
- Live production URL
- Complete documentation
- Active monitoring
- Health check endpoint

**Critical Rule**: Cannot exit until all gates pass

### VALIDATE Mode

**Purpose**: Independent quality assurance

**Participants**: Validator agents (fresh eyes)

**Process**:
1. SENTINEL scans security
2. PATTERNS validates architecture
3. LOGIC tests edge cases
4. COVERAGE evaluates tests
5. COMPASS checks constitution

**Outputs**:
- Validation report
- Security scan results
- Architecture score
- Logic validation
- Test coverage analysis
- Constitutional compliance

## Data Flow

```
User Input (Prompt)
       ↓
   Orchestrator
       ↓
  Mode Manager (validate entry)
       ↓
Constitutional Guard (pre-check)
       ↓
  Agent Loader (activate agents)
       ↓
 Mode Execution (workflow)
       ↓
 Gate Validator (SHIP only)
       ↓
Constitutional Guard (post-check)
       ↓
  Mode Manager (complete session)
       ↓
    Output (results)
```

## Session Management

**Session Lifecycle**:
1. `PENDING` - Session created, not started
2. `ACTIVE` - Session in progress
3. `COMPLETE` - Session finished successfully
4. `FAILED` - Session encountered error
5. `CHECKPOINTED` - Session paused for transition

**Session Data**:
- Unique session ID
- Mode type
- Start/end timestamps
- Input data
- Output data
- Checkpoints
- Error log

## CLI Architecture

**Command Structure**:
```
inception <command> [options]
```

**Commands**:
- `ideate` - Execute IDEATE mode
- `plan` - Execute PLAN mode
- `ship` - Execute SHIP mode
- `validate` - Execute VALIDATE mode
- `full` - Full lifecycle workflow
- `rapid` - Rapid workflow
- `express` - Express workflow
- `status` - System status
- `history` - Workflow history
- `agents` - List agents

**Key Features**:
- Workflow chaining with `--from-last`
- Speed modes for SHIP
- Auto-validation option
- JSON output support

## API Architecture

**Framework**: FastAPI

**Endpoints**:
- `POST /api/modes/{mode}` - Execute mode
- `POST /api/workflows/execute` - Execute workflow
- `GET /api/status` - System status
- `GET /api/agents` - List agents
- `WS /ws/mode/{session_id}` - Real-time updates

**Features**:
- CORS enabled
- JSON request/response
- WebSocket support
- Error handling
- Status codes

## Testing Architecture

**Framework**: pytest

**Test Organization**:
```
tests/
  test_mode_manager.py
  test_gate_validator.py
  test_constitutional_guard.py
  test_orchestrator.py
```

**Coverage**:
- Unit tests for all core components
- Integration tests for workflows
- Validator agent tests
- End-to-end workflow tests

**Target**: 80%+ code coverage

## Configuration

**Mode Configs** (`MODES/*/MODE_CONFIG.json`):
```json
{
  "version": "4.0",
  "objective": "...",
  "entry_requirements": {},
  "exit_criteria": {},
  "gates": [],
  "workflows": [],
  "outputs": {}
}
```

**Agent Registry** (`CORE_FOUNDATION/agents/.agent-status.json`):
```json
{
  "agents": {
    "AGENT_NAME": {
      "type": "builder|validator",
      "status": "active|inactive",
      "mode": "build|validate|both",
      "hive": "AURORA|LEX|..."
    }
  }
}
```

## Deployment

**CLI Installation**:
```bash
pip install -e .
inception --version
```

**API Server**:
```bash
uvicorn inception_engine.api.server:app --host 0.0.0.0 --port 8000
```

**Production**:
```bash
gunicorn inception_engine.api.server:app -w 4 -k uvicorn.workers.UvicornWorker
```

## Extension Points

**Add New Agent**:
1. Create agent class inheriting from `BaseAgent`
2. Implement `execute()` and `get_capabilities()`
3. Add to agent registry JSON
4. Place in `agents/builders/` or `agents/validators/`

**Add New Mode**:
1. Create mode directory in `MODES/`
2. Add `MODE_CONFIG.json`
3. Update `ModeType` enum
4. Implement mode workflow in orchestrator

**Add New Validator**:
1. Create validator class in `agents/validators/`
2. Inherit from `BaseAgent`
3. Implement validation logic
4. Register in agent registry

## Performance Considerations

**Agent Loading**: Lazy loading - agents only loaded when needed

**Session Management**: In-memory for speed, optional persistence

**Validation**: Parallel validation checks where possible

**Caching**: Mode configs and agent registry cached on load

## Security

**Constitutional Guard**: Prevents stealing and lock-in patterns

**SENTINEL Agent**: Scans for security vulnerabilities

**Input Validation**: All inputs validated before execution

**SHIP Gates**: Ensures quality before production

## Monitoring

**Session Tracking**: All sessions logged with timestamps

**Error Logging**: Comprehensive error tracking

**Status Endpoint**: Real-time system status

**History**: Complete workflow history available

## Future Enhancements

- Persistent session storage (database)
- Distributed agent execution
- Real-time progress streaming
- Advanced metrics and analytics
- Plugin system for custom agents
- Multi-project support
- Rollback capabilities
