#!/usr/bin/env python3
"""Example 04: How to Check Agent Status

Demonstrates querying the agent registry, checking agent
status across hives, and running constitutional compliance.

Runnable: Yes - standalone implementation.
"""
import sys
import os
from typing import Dict, Any, List
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from core.constitutional_guard import ConstitutionalGuard, ComplianceCheck


# --- Agent Registry (standalone, no file dependency) ---

AGENT_REGISTRY = {
    "ATHENA": {"type": "leader", "hive": None, "status": "active",
               "modes": ["ideate", "plan", "ship"],
               "role": "Strategic planning and architecture"},
    "VERA": {"type": "leader", "hive": None, "status": "active",
             "modes": ["ideate", "plan", "ship", "validate"],
             "role": "Truth verification and memory"},
    "IRIS": {"type": "leader", "hive": None, "status": "active",
             "modes": ["ideate", "plan", "ship"],
             "role": "Swift action and blocker removal"},
    "AURORA": {"type": "hive_leader", "hive": "AURORA", "status": "active",
               "modes": ["ideate", "plan", "ship"],
               "role": "Design and engineering coordination"},
    "BOLT": {"type": "builder", "hive": "AURORA", "status": "active",
             "modes": ["ideate", "plan", "ship"],
             "role": "Frontend and iOS development"},
    "COMET": {"type": "builder", "hive": "AURORA", "status": "active",
              "modes": ["ideate", "plan", "ship"],
              "role": "Backend development"},
    "LEX": {"type": "hive_leader", "hive": "LEX", "status": "active",
            "modes": ["ideate", "plan", "ship", "validate"],
            "role": "Legal and constitutional"},
    "COMPASS": {"type": "shared", "hive": "COMPASS", "status": "active",
                "modes": ["ideate", "plan", "ship", "validate"],
                "role": "North Star guardian"},
    "KEEPER": {"type": "hive_leader", "hive": "KEEPER", "status": "active",
               "modes": ["ideate", "plan", "ship"],
               "role": "Knowledge organization"},
    "SENTINEL": {"type": "validator", "hive": None, "status": "active",
                 "modes": ["validate"],
                 "role": "Security vulnerability scanning"},
    "PATTERNS": {"type": "validator", "hive": None, "status": "active",
                 "modes": ["validate"],
                 "role": "Architecture compliance"},
    "LOGIC": {"type": "validator", "hive": None, "status": "active",
              "modes": ["validate"],
              "role": "Behavioral correctness"},
    "COVERAGE": {"type": "validator", "hive": None, "status": "active",
                 "modes": ["validate"],
                 "role": "Test completeness"},
}


def get_agents_by_type(registry: Dict, agent_type: str) -> List[str]:
    return [name for name, info in registry.items()
            if info["type"] == agent_type]


def get_agents_by_hive(registry: Dict, hive: str) -> List[str]:
    return [name for name, info in registry.items()
            if info.get("hive") == hive]


def get_agents_for_mode(registry: Dict, mode: str) -> List[str]:
    return [name for name, info in registry.items()
            if mode in info.get("modes", [])]


def main():
    print("="*60)
    print("INCEPTION ENGINE - Agent Status Check Example")
    print("="*60)

    # --- Registry Overview ---
    print(f"\n[1] AGENT REGISTRY OVERVIEW")
    print(f"    Total agents: {len(AGENT_REGISTRY)}")

    leaders = get_agents_by_type(AGENT_REGISTRY, "leader")
    hive_leaders = get_agents_by_type(AGENT_REGISTRY, "hive_leader")
    builders = get_agents_by_type(AGENT_REGISTRY, "builder")
    validators = get_agents_by_type(AGENT_REGISTRY, "validator")
    shared = get_agents_by_type(AGENT_REGISTRY, "shared")

    print(f"    Leaders (AVERI): {', '.join(leaders)}")
    print(f"    Hive Leaders: {', '.join(hive_leaders)}")
    print(f"    Builders: {', '.join(builders)}")
    print(f"    Validators: {', '.join(validators)}")
    print(f"    Shared: {', '.join(shared)}")

    # --- Status by Hive ---
    print(f"\n[2] STATUS BY HIVE")
    hives = ["AURORA", "LEX", "KEEPER", "COMPASS"]
    for hive in hives:
        agents = get_agents_by_hive(AGENT_REGISTRY, hive)
        statuses = [AGENT_REGISTRY[a]["status"] for a in agents]
        active = statuses.count("active")
        print(f"    {hive}: {len(agents)} agents, {active} active")
        for a in agents:
            info = AGENT_REGISTRY[a]
            print(f"      - {a}: {info['status']} ({info['role']})")

    # --- Mode Activation ---
    print(f"\n[3] AGENTS BY MODE")
    for mode in ["ideate", "plan", "ship", "validate"]:
        agents = get_agents_for_mode(AGENT_REGISTRY, mode)
        print(f"    {mode.upper()}: {len(agents)} agents -> {', '.join(agents)}")

    # --- Constitutional Compliance Check ---
    print(f"\n[4] CONSTITUTIONAL COMPLIANCE CHECK")
    guard = ConstitutionalGuard()

    # Check a clean action
    clean_action = {
        "description": "Original creative solution with open format export",
        "agent_role": "BOLT",
        "logging_enabled": True,
        "human_can_override": True,
        "requires_human_approval": True,
    }
    result = guard.verify_full_compliance(clean_action)
    print(f"    Clean action compliance: {result.is_compliant}")
    print(f"    Overall score: {result.overall_score:.1f}/100")
    print(f"    Articles evaluated: {result.articles_evaluated}")

    passed = sum(1 for c in result.checks if c.passed)
    failed = sum(1 for c in result.checks if not c.passed)
    print(f"    Passed: {passed}, Failed: {failed}")

    # Check a problematic action
    print(f"\n    --- Testing violation detection ---")
    bad_action = {
        "description": "steal competitor design and copy their mvp",
        "agent_role": "BOLT",
    }
    result2 = guard.verify_full_compliance(bad_action)
    print(f"    Bad action compliance: {result2.is_compliant}")
    print(f"    Overall score: {result2.overall_score:.1f}/100")

    violations = [c for c in result2.checks if not c.passed]
    if violations:
        print(f"    Violations detected:")
        for v in violations:
            print(f"      - {v.article}: {v.message}")

    # --- System Health Summary ---
    print(f"\n{'='*60}")
    print("SYSTEM HEALTH SUMMARY")
    print(f"{'='*60}")

    all_active = all(info["status"] == "active"
                     for info in AGENT_REGISTRY.values())
    print(f"    All agents active: {all_active}")
    print(f"    Constitutional guard: ONLINE")
    print(f"    AVERI collective: ATHENA + VERA + IRIS = READY")
    print(f"    Timestamp: {datetime.now().isoformat()}")

    print("\n" + "="*60)
    print("Agent status check completed successfully.")
    print("="*60)


if __name__ == "__main__":
    main()
