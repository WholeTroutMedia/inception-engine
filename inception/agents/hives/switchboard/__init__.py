"""
Creative Liberation Engine v5 — Neural Architecture Package

5 neural systems migrated from v3:
1. ConceptVectorEngine — 2048-dim semantic agent vectors
2. AttractorNetwork — Hopfield/Hebbian team formation
3. SmallWorldNetwork — Topology overlay + Dijkstra routing
4. DefaultModeNetwork — Background intelligence (4 functions)
5. PrefrontalCortex — Executive planning and coordination
"""

from inception.agents.neural.concept_vectors import ConceptVectorEngine, VECTOR_DIM, FEATURE_RANGES
from inception.agents.neural.attractors import AttractorNetwork, AttractorAgent, Problem, Solution
from inception.agents.neural.small_world import SmallWorldNetwork, NetworkAgent, NetworkPath
from inception.agents.neural.dmn import DefaultModeNetwork
from inception.agents.neural.pfc import PrefrontalCortex, Plan, PlanStep

__all__ = [
    # Concept Vectors
    "ConceptVectorEngine",
    "VECTOR_DIM",
    "FEATURE_RANGES",
    # Attractor Networks
    "AttractorNetwork",
    "AttractorAgent",
    "Problem",
    "Solution",
    # Small-World Network
    "SmallWorldNetwork",
    "NetworkAgent",
    "NetworkPath",
    # Default Mode Network
    "DefaultModeNetwork",
    # Prefrontal Cortex
    "PrefrontalCortex",
    "Plan",
    "PlanStep",
]
