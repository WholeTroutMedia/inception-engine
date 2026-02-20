# Neural Architecture

> How Inception Engine's brain-inspired systems coordinate 35+ agents across four operational modes

## Overview

Inception Engine's neural architecture draws from five neuroscience-inspired systems that govern how agents communicate, remember, plan, and self-organize. These aren't metaphors - they're functional patterns that solve real coordination problems in multi-agent AI systems.

## The Five Neural Systems

### 1. PFC Planning (Prefrontal Cortex)

**Inspired by**: The brain's executive function center

**What it does**: Governs high-level decision-making, goal decomposition, and strategic planning across all agents.

**Key behaviors**:
- Breaks complex user intents into executable sub-tasks
- Prioritizes competing agent recommendations
- Manages mode transitions (IDEATE -> PLAN -> SHIP -> VALIDATE)
- Prevents premature execution before planning is complete

**Active in**: All four modes, with strongest influence in PLAN mode

### 2. Hippocampal Memory

**Inspired by**: The brain's memory consolidation center

**What it does**: Manages short-term working memory and long-term knowledge persistence across sessions and modes.

**Key behaviors**:
- Preserves context during mode transitions
- Consolidates session learnings into retrievable patterns
- Enables agents to reference prior decisions without re-computation
- Supports the KEEPER hive's knowledge organization

**Active in**: All four modes, critical during VALIDATE for lessons learned

### 3. Default Mode Network (DMN)

**Inspired by**: The brain's "resting state" network, active during creative thought

**What it does**: Enables background processing, creative association, and cross-domain insight generation.

**Key behaviors**:
- Runs parallel ideation threads during IDEATE mode
- Surfaces unexpected connections between project requirements
- Supports the Oracle Council and Three Wise Men agents
- Enables "shower thought" style breakthrough ideas

**Active in**: Strongest in IDEATE mode, provides background processing in all modes

### 4. Small World Topology

**Inspired by**: Neural network connectivity patterns (six degrees of separation)

**What it does**: Ensures any agent can reach any other agent within a maximum of 6 hops, enabling rapid information flow.

**Key behaviors**:
- Routes messages efficiently between agent hives
- Prevents information silos between Builder and Validator agents
- Enables SWITCHBOARD (RELAY) to coordinate cross-hive communication
- Maintains low latency even with 35+ active agents

**Configuration**: `max_hops: 6`

**Active in**: All modes, critical infrastructure layer

### 5. Attractor Dynamics

**Inspired by**: Dynamical systems theory (stable states in complex systems)

**What it does**: Keeps the system converging toward quality outputs rather than oscillating between competing agent opinions.

**Key behaviors**:
- Resolves conflicts when agents disagree on approach
- Pulls SHIP mode toward production-ready states (not "good enough")
- Prevents infinite revision loops in VALIDATE mode
- Enforces constitutional compliance as a stable attractor

**Active in**: All modes, strongest influence in SHIP and VALIDATE

## How Neural Systems Map to Modes

```
Mode          Primary Systems              Secondary Systems
-----------   -------------------------    -------------------
IDEATE        DMN, PFC Planning            Hippocampal Memory
PLAN          PFC Planning, Small World    Attractor Dynamics
SHIP          Attractor Dynamics, PFC      Small World Topology
VALIDATE      Hippocampal Memory, PFC      Attractor Dynamics
```

## Agent Hive Communication

The neural architecture enables structured communication between agent hives:

```
AVERI (Strategic Core)
  |-- Aurora Hive (Design & Engineering)
  |-- LEX Hive (Legal & Constitutional)
  |-- KEEPER Hive (Knowledge & Patterns)
  |-- BROADCAST Hive (Infrastructure)
  |-- SWITCHBOARD Hive (Operations)
  |-- Validator Team (Independent QA)
```

**Small World guarantees**: Any agent in Aurora Hive can reach any Validator agent in 6 hops or fewer, ensuring rapid feedback loops between building and quality assurance.

## Constitutional Integration

The neural systems enforce constitutional compliance at the architectural level:

- **PFC Planning**: Checks Article 0 (No Stealing) before any code generation task begins
- **Attractor Dynamics**: Article XVII (Zero Day Creativity) acts as a stable attractor - SHIP mode cannot exit until production gates pass
- **Hippocampal Memory**: Article XVIII (Generative Agency) compliance is tracked across sessions
- **Small World Topology**: Constitutional violations propagate instantly to LEX hive via short routing paths

## Configuration

See [`examples/agent-config.json`](../examples/agent-config.json) for the complete neural system configuration.

Key parameters:

| System | Parameter | Default | Description |
|--------|-----------|---------|-------------|
| Small World | `max_hops` | 6 | Maximum routing distance between agents |
| Constitution | `articles` | 19 | Total constitutional articles enforced |
| Constitution | `immutable` | I, III, IV, VIII | Articles that cannot be overridden |
| Modes | `exit_gates` | 5 gates | Required checks before SHIP mode exit |

## Further Reading

- [Four Modes Deep Dive](./FOUR_MODES.md)
- [Getting Started](./GETTING_STARTED.md)
- [Agent Constitution](../CONSTITUTION.md)
- [Example Configuration](../examples/agent-config.json)

---

*Built with intention by Whole Trout Media. The neural architecture ensures AI agents work like a brain - not a bureaucracy.*
