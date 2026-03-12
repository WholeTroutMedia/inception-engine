# Agent Name Mapping — Coded Names

All agent names use coded identifiers. This document maps legacy/descriptive names to the canonical coded names used in docs and (when implemented) in code.

---

## Canonical Coded Names

| Coded name | Role / responsibility |
|------------|------------------------|
| `vt100` | Strategy |
| `vt220` | Truth-check / memory |
| `xterm` | Execution |
| `kuid` | Architect, system design |
| `kbuildd` | Frontend code generation |
| `kwebd` | Backend, automation, web research |
| `kstated` | Knowledge state |
| `karchd` | Patterns |
| `kcodexd` | Documentation |
| `kdocsd` | Constitutional compliance |
| `kcompd` | Ethics guidance |
| `krelayd` | Inter-agent routing |
| `ksignald` | Integration |
| `kswitchd` | Ops / switchboard |
| `ksecud` | Security |
| `karchond` | Architecture |
| `kproofd` | Correctness |
| `kharbord` | Test coverage |
| `krecd` | Ship decision |

---

## Legacy → Coded Mapping

| Legacy / descriptive | Coded |
|----------------------|-------|
| COMET | kwebd |
| ARCH | karchd |
| CODEX | kcodexd |
| COMPASS | kcompd |
| RELAY | krelayd |
| SIGNAL | ksignald |
| SWITCHBOARD | kswitchd |
| SENTINEL | ksecud |
| ARCHON | karchond |
| PROOF | kproofd |
| HARBOR | kharbord |
| LEX | kdocsd |

---

## Naming Conventions

- **TTY agents:** `vt100`, `vt220`, `xterm` — strategy → truth → execution
- **k-prefix daemons:** `kbuildd`, `kwebd`, `karchd`, etc. — `k` + role + `d` (daemon)
- **Hive leads:** Use the primary agent’s coded name (e.g. `kswitchd` for switchboard hive)

---

## Out of Scope for Engine

Design ingest, wire feeds, OmniMedia, and other extended capabilities are not part of the engine core. See [CAPABILITY-TIERS.md](./CAPABILITY-TIERS.md).
