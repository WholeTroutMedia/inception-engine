# Inception Engine - Examples

Runnable Python scripts demonstrating the Inception Engine's core capabilities.

## Quick Start

```bash
# From the repo root:
python examples/01_invoke_agent.py
python examples/02_run_workflow.py
python examples/03_query_scribe_memory.py
python examples/04_check_agent_status.py
```

## Examples

| File | What It Demonstrates | Dependencies |
|------|---------------------|-------------|
| `01_invoke_agent.py` | Creating, activating, executing, and deactivating an agent | `src/agents/base_agent.py` |
| `02_run_workflow.py` | Running the four-mode pipeline (IDEATE -> PLAN -> SHIP -> VALIDATE) | `src/core/mode_manager.py` |
| `03_query_scribe_memory.py` | SCRIBE memory system: procedural, semantic, and episodic memory | Standalone |
| `04_check_agent_status.py` | Agent registry queries, hive status, constitutional compliance | `src/core/constitutional_guard.py` |

## Running Tests

```bash
# From the src/ directory:
python -m pytest tests/ -v
```

## Architecture Reference

- **Four Modes**: IDEATE -> PLAN -> SHIP -> VALIDATE
- **Agent Types**: leaders, hive_leaders, builders, validators, shared
- **Hives**: AURORA, LEX, KEEPER, BROADCAST, SWITCHBOARD, COMPASS
- **AVERI Collective**: ATHENA + VERA + IRIS (strategic leadership)
- **SCRIBE Memory**: Procedural / Semantic / Episodic
- **Constitutional Governance**: 19 articles + Article 0 (immutable)
