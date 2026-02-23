# Contributing to Inception Engine

Welcome. We're building an AI-native development engine governed by constitutional principles that put artists and creators first. This document tells you exactly where the project stands, how to contribute, and where help is needed most.

> **Honesty policy**: This guide distinguishes between what's built, what's scaffolded, and what's planned. We don't oversell.

---

## Current State (Honest Assessment)

_Last updated: February 23, 2026_

### What's Actually Implemented

These components have real code with meaningful logic:

| Component | File(s) | Lines | Status |
|-----------|---------|-------|--------|
| **Orchestrator** | `src/core/orchestrator.py` | ~518 | Core workflow engine. Coordinates modes, agents, constitutional checks. |
| **Mode Manager** | `src/core/mode_manager.py` | ~419 | IDEATE/PLAN/SHIP/VALIDATE lifecycle with entry/exit criteria. |
| **Constitutional Guard** | `src/core/constitutional_guard.py` | ~612 | Enforces all 18 articles. Scoring system, compliance checks. |
| **Gate Validator** | `src/core/gate_validator.py` | ~429 | SHIP mode exit gates: code complete, tests pass, deployed, accessible. |
| **Base Agent** | `src/agents/base_agent.py` | ~100 | Abstract base class all agents inherit from. |
| **CLI** | `src/cli/inception_cli.py` | ~466 | Click-based CLI with ideate/plan/ship/validate commands. |
| **API Server** | `src/api/server.py` | Exists | FastAPI REST + WebSocket server scaffold. |
| **Security Module** | `src/security/` | 17 files | PII detection, encryption, RBAC, OAuth, GDPR, audit logging. |
| **Agent Loader** | `src/core/agent_loader.py` | Exists | Dynamic agent discovery and loading. |
| **Boot System** | `src/core/boot_system.py` | Exists | System initialization and startup sequence. |
| **Session Config** | `src/core/session_config.py` | Exists | Session state and configuration management. |

**Agents implemented** (have their own files with class definitions):

- **Masters**: ATHENA, VERA, IRIS, Wise Men (Council)
- **Hive Leaders**: Atlas, Aurora, Compass, Keeper, Lex, Switchboard
- **Builders**: Bolt, Comet, Systems
- **Validators**: Archon, Coverage, Harbor, Logic, Patterns, Proof, Sentinel

**Tests that exist** (`src/tests/`):
- `test_agents.py` - Agent instantiation and base behavior
- `test_constitutional_guard.py` - Constitutional compliance checks
- `test_gate_validator.py` - SHIP mode gate validation
- `test_mode_manager.py` - Mode lifecycle transitions
- `test_orchestrator.py` - Orchestration workflow
- `conftest.py` - Shared test fixtures

**Security tests** (`tests/test_security/`):
- `test_audit.py`, `test_encryption.py`, `test_gdpr.py`, `test_oauth.py`, `test_pii.py`, `test_rbac.py`

**CI/CD**: GitHub Actions workflow (`ci.yml`) exists.

### What's Documented but Not Built Yet

These have extensive documentation and architectural design, but the runtime code is minimal or placeholder:

| Component | What Exists | What's Missing |
|-----------|-------------|----------------|
| **Modes directory** | `src/modes/__init__.py` only | Individual mode implementations (ideate.py, plan.py, ship.py, validate.py). Mode logic lives in mode_manager.py and orchestrator.py, not as separate modules. |
| **Neural Architecture** | Full docs in `docs/NEURAL_ARCHITECTURE.md` | No runtime implementation of PFC Planning, Hippocampal Memory, Default Mode Network, Small-World Topology, or Attractor Dynamics. |
| **HELIX Formation** | Documented in README and agent docs | No parallel execution runtime. Currently conceptual. |
| **Cross-session Memory** | Described in architecture docs | No persistence layer. Sessions are stateless. |
| **MCP Server** | Documented in `docs/MCP_GUIDE.md` | No MCP protocol implementation in codebase. |
| **Docker/K8s** | Dockerfile exists (0.2% of codebase) | No Kubernetes manifests, no docker-compose, no production deployment tested. |
| **Design System Runtime** | `design-system/tokens.json` + docs | No token-to-CSS pipeline, no prompt-based theme generation, no image palette extraction. |

### What's Planned (Roadmap)

These are on the roadmap, pushed down from the full Brainchild V4 system:

- Stricter VALIDATE mode with isolated validator agents
- REST API interface (FastAPI server exists but needs endpoints)
- WebSocket real-time agent communication
- Cross-session memory and learning persistence
- Additional specialized agents from V4 roster
- Docker Compose and Kubernetes deployment templates
- Prometheus/Grafana monitoring integration
- MCP (Model Context Protocol) server implementation
- Neural architecture runtime (currently design-only)
- Design system token-to-code pipeline

---

## Before You Begin

### Read the Constitution

Every contribution must comply with the [Agent Constitution](./CONSTITUTION.md). The non-negotiable articles:

- **Article 0 (No Stealing)**: Never copy code, designs, ideas, or patterns. Learn, study, adapt, synthesize. Zero tolerance.
- **Article XVII (Zero Day Creativity)**: Ship complete solutions, never MVPs. Quality over speed.
- **Article XVIII (Generative Agency)**: Build "digital soil" not "digital fences." Users own their work. No lock-in.

If your contribution violates Article 0, it will be rejected immediately. No exceptions.

### Understand the Architecture

Familiarize yourself with:
- [Getting Started](./docs/GETTING_STARTED.md) - System overview and setup
- [Four Modes](./docs/FOUR_MODES.md) - How the IDEATE/PLAN/SHIP/VALIDATE cycle works
- [Neural Architecture](./docs/NEURAL_ARCHITECTURE.md) - How agent coordination systems function
- [Architecture Overview](./ARCHITECTURE.md) - High-level system design
- [Development Status](./DEVELOPMENT_STATUS.md) - What's built, what's not

---

## How to Contribute

### Setup Instructions

```bash
# 1. Fork and clone
git clone https://github.com/YOUR_USERNAME/inception-engine.git
cd inception-engine

# 2. Create a virtual environment (Python 3.11+ required)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r src/requirements.txt

# 4. Copy environment config
cp .env.example .env
# Edit .env with your API keys (OpenAI, Anthropic, etc.)

# 5. Run tests to verify setup
cd src
python -m pytest tests/ -v

# 6. Run the CLI
python -m cli.inception_cli --help
```

### Code Standards

#### Constitutional Compliance

Every code contribution is checked against:
- **Originality** - No copied code, patterns, or designs (Article 0)
- **Completeness** - Working, tested, documented (Article XVII)
- **User Freedom** - No lock-in, open standards preferred (Article XVIII)

#### Technical Standards

- Python 3.11+ for all engine code
- Type hints on all public functions
- Docstrings on all classes and public methods
- Tests for new functionality (pytest)
- No new dependencies without justification in the PR description
- Code formatted with `black` and linted with `ruff`
- Type-checked with `mypy`

#### Documentation Standards

- Update relevant docs when changing functionality
- Use clear, jargon-free language where possible
- Include examples for new features
- Cross-reference related documentation

### PR Process

1. **Fork** the repository
2. **Create a branch** from `main` with a descriptive name:
   - `feat/agent-memory-persistence`
   - `fix/mode-transition-error`
   - `docs/improve-getting-started`
3. **Make your changes** following code standards above
4. **Write tests** - incomplete solutions are not accepted (Article XVII)
5. **Run the full test suite** before submitting:
   ```bash
   cd src
   python -m pytest tests/ -v --cov
   ```
6. **Submit a pull request** with:
   - Clear description of what changed and why
   - Reference to any related issues
   - Confirmation that you've run tests locally
   - Screenshots/output for UI or CLI changes

### Commit Message Format

```
type(scope): description

Types: feat, fix, docs, refactor, test, chore
Scopes: core, agents, modes, gates, constitution, security, cli, api, docs

Examples:
feat(agents): add memory consolidation to KEEPER hive
fix(gates): resolve false positive in deployment health check
docs(modes): clarify SHIP mode exit criteria
test(security): add PII detection edge cases
```

### Testing Requirements

All contributions must include tests. Here's what we expect:

| Change Type | Test Requirement |
|-------------|------------------|
| New agent | Unit tests for execute() and get_capabilities() |
| Core module change | Unit tests + integration test with orchestrator |
| Bug fix | Regression test that reproduces the bug |
| Security change | Security-specific tests in `tests/test_security/` |
| CLI change | Command-level integration tests |
| API endpoint | Request/response tests with test client |
| Documentation only | No tests required, but verify links work |

---

## High Priority Tasks

These are specific, actionable items where contributors can make the biggest impact. Each has clear acceptance criteria and a difficulty rating.

### P0 - Critical (Foundation)

#### 1. Implement Individual Mode Modules
**Difficulty**: Medium | **Scope**: `src/modes/`

The `src/modes/` directory only contains `__init__.py`. Mode logic currently lives inside `mode_manager.py` and `orchestrator.py`. We need clean, separate mode implementations.

**What to build**:
- `src/modes/ideate.py` - IDEATE mode logic
- `src/modes/plan.py` - PLAN mode logic
- `src/modes/ship.py` - SHIP mode logic
- `src/modes/validate.py` - VALIDATE mode logic

**Acceptance criteria**:
- [ ] Each mode has its own class inheriting from a `BaseMode`
- [ ] Entry requirements and exit criteria are enforced per mode
- [ ] Agent roster filtering works (which agents are active in which mode)
- [ ] Mode transitions emit events the orchestrator can consume
- [ ] Tests in `src/tests/test_modes/` cover all transitions
- [ ] Existing `test_mode_manager.py` tests still pass

---

#### 2. API Endpoint Implementation
**Difficulty**: Medium | **Scope**: `src/api/`

The FastAPI server scaffold exists but needs actual endpoints wired to the orchestrator.

**What to build**:
- `POST /sessions` - Create a new orchestration session
- `POST /sessions/{id}/ideate` - Run IDEATE mode
- `POST /sessions/{id}/plan` - Run PLAN mode
- `POST /sessions/{id}/ship` - Run SHIP mode
- `POST /sessions/{id}/validate` - Run VALIDATE mode
- `GET /sessions/{id}/status` - Get session state
- `GET /health` - Health check
- `WebSocket /sessions/{id}/stream` - Real-time output streaming

**Acceptance criteria**:
- [ ] All endpoints documented with OpenAPI/Swagger
- [ ] Request/response models use Pydantic
- [ ] Endpoints call through to the orchestrator
- [ ] Error handling returns proper HTTP codes
- [ ] Tests with FastAPI TestClient
- [ ] Constitutional compliance checked on all operations

### P1 - High (Core Capabilities)

#### 3. Test Coverage Expansion
**Difficulty**: Easy-Medium | **Scope**: `src/tests/`

Tests exist but coverage is incomplete. We need comprehensive coverage across all modules.

**What to build**:
- Integration tests for full IDEATE > PLAN > SHIP > VALIDATE workflow
- Edge case tests for mode transitions (skip modes, re-enter modes)
- Agent interaction tests (multiple agents collaborating)
- Constitutional guard edge cases (borderline compliance scores)
- CLI end-to-end tests

**Acceptance criteria**:
- [ ] Coverage report shows > 80% line coverage
- [ ] All public methods have at least one test
- [ ] Edge cases documented in test docstrings
- [ ] `pytest-cov` generates clean report
- [ ] CI pipeline runs all tests on PR

---

#### 4. MCP Server Implementation
**Difficulty**: Hard | **Scope**: `src/mcp/` (new)

Documented in `docs/MCP_GUIDE.md` but no implementation exists. Inception Engine should work as an MCP server for Claude Desktop and other MCP clients.

**What to build**:
- MCP protocol handler (JSON-RPC over stdio)
- Tool definitions for each mode (ideate, plan, ship, validate)
- Resource exposure for session state and agent registry
- Prompt templates for common workflows

**Acceptance criteria**:
- [ ] Works with Claude Desktop as MCP client
- [ ] All four modes accessible as MCP tools
- [ ] Session state readable as MCP resources
- [ ] Error handling follows MCP spec
- [ ] Integration test with mock MCP client

---

#### 5. Cross-Session Memory Persistence
**Difficulty**: Hard | **Scope**: `src/core/memory/` (new)

Sessions are currently stateless. We need a persistence layer so agents can learn across sessions.

**What to build**:
- Memory storage backend (SQLite for local, PostgreSQL for production)
- Session state serialization/deserialization
- Agent memory consolidation (what agents learned)
- Memory search and retrieval for context injection

**Acceptance criteria**:
- [ ] Sessions can be paused and resumed
- [ ] Agent learnings persist across sessions
- [ ] Memory is searchable by relevance
- [ ] SQLite works out of the box with zero config
- [ ] PostgreSQL optional via environment variable
- [ ] Migration scripts via Alembic

### P2 - Medium (Improvements)

#### 6. Design System Token Pipeline
**Difficulty**: Medium | **Scope**: `design-system/`

Tokens exist in JSON but there's no pipeline to generate usable CSS, Tailwind config, or component styles.

**What to build**:
- Token-to-CSS variable generator
- Token-to-Tailwind config generator
- Prompt-based theme generation (describe a mood, get tokens)
- Image palette extraction (upload image, get color tokens)

**Acceptance criteria**:
- [ ] `tokens.json` generates valid CSS custom properties
- [ ] Tailwind config output is plug-and-play
- [ ] At least 3 example themes included
- [ ] CLI command: `inception theme generate --mood "dark minimal"`

---

#### 7. Docker Compose Production Setup
**Difficulty**: Easy-Medium | **Scope**: root directory

Dockerfile exists but no compose setup or production deployment configuration.

**What to build**:
- `docker-compose.yml` for local development
- `docker-compose.prod.yml` for production
- Health check endpoints for container orchestration
- Environment variable documentation

**Acceptance criteria**:
- [ ] `docker-compose up` starts full system locally
- [ ] Production compose includes Redis, PostgreSQL
- [ ] All services have health checks
- [ ] `.env.example` updated with all required variables

---

#### 8. Documentation Gap Filling
**Difficulty**: Easy | **Scope**: `docs/`

Some docs describe features that don't exist yet. Others need practical examples.

**What to improve**:
- Add "Status" badges to each doc (Implemented / In Progress / Planned)
- Add practical examples to GETTING_STARTED.md
- Verify all setup guides actually work end-to-end
- Add troubleshooting sections to setup guides
- Create API reference from actual code (not aspirational)

**Acceptance criteria**:
- [ ] Every doc page has a status indicator
- [ ] Setup guides tested on clean machine (Mac, Windows, Linux)
- [ ] Broken links fixed
- [ ] Examples are runnable, not hypothetical

---

## What "Done" Looks Like

For any contribution, "done" means ALL of the following:

- [ ] Code works and has been tested locally
- [ ] Tests pass: `python -m pytest tests/ -v`
- [ ] Code is formatted: `black .` and `ruff check .`
- [ ] Type hints present on public functions
- [ ] Docstrings on classes and public methods
- [ ] Related documentation is updated
- [ ] PR description explains what and why
- [ ] Constitutional test passes (see below)

## The Constitutional Test

Before submitting, ask yourself:

1. **Is this original work?** (Article 0)
2. **Is this complete and tested?** (Article XVII)
3. **Does this make creators more free or less free?** (Article XVIII)

If you can answer yes, yes, and "more free" - submit that PR.

## Code of Conduct

We operate under the same constitutional principles that govern our AI agents:

- Treat all contributors with dignity and respect
- Value quality over quantity
- Support artist and creator liberation
- Build in the open, share knowledge generously
- Disagree constructively, resolve through principles not politics

## Getting Help

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Questions, ideas, community conversation
- **Documentation**: Start with [Getting Started](./docs/GETTING_STARTED.md)
- **Development Status**: See [DEVELOPMENT_STATUS.md](./DEVELOPMENT_STATUS.md) for current state

---

_In Modes We Execute. In Gates We Trust. In Constitution We Believe._

**Built by [Whole Trout Media](https://github.com/WholeTroutMedia)** | AGPL-3.0 License with Constitutional Constraints
