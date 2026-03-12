"""
Creative Liberation Engine v5 — Constants

System-wide constants. Single source of truth.
"""

ENGINE_NAME = "Creative Liberation Engine"
ENGINE_VERSION = "5.0.0"
ENGINE_CODENAME = "GENESIS"

# Mode definitions
MODES = ("ideate", "plan", "ship", "validate")
MODE_EXPRESS_SKIP = ("ideate", "plan")  # Modes that can be skipped in Express

# Hive definitions
HIVES = {
    "kuid": "Creative Architecture & Design",
    "kdocsd": "Legal, Compliance & Constitutional Guard",
    "kstated": "Knowledge Organization & Documentation",
    "BROADCAST": "Communication & Content Distribution",
    "SWITCHBOARD": "Task Routing & Agent Coordination",
    "TTY": "Constitutional Alignment & Leadership",
}

# Access tier names
TIER_STUDIO = "studio"
TIER_CLIENT = "client"
TIER_MERCH = "merch"

# Neural architecture systems (v3 lineage)
NEURAL_SYSTEMS = (
    "pfc_planner",
    "hippocampus",
    "default_mode",
    "small_world",
    "attractors",
)

# Constitutional articles count
CONSTITUTION_ARTICLES = 20  # 0-XIX
