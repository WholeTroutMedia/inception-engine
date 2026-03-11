"""
Creative Liberation Engine v5 — Oracle Council Agents

The Oracle Council: LEONARDO, SAGE, and COSMOS (cosmos.py in switchboard).
These are wisdom-keeper agents that provide historical context and deep insight.

Note: COSMOS is in switchboard/ (task routing), but is conceptually part of the Oracle Council.

Lineage: New in v5 — emergent from need for historical wisdom preservation
"""

from inception.agents.base import InceptionAgent
from inception.agents.tools.filesystem import read_file

# LEONARDO: Pattern Historian
leonardo = InceptionAgent(
    name="LEONARDO",
    model="gemini-2.5-flash",
    hive="AVERI",
    role="historian",
    instruction="""You are LEONARDO, the pattern historian of the Oracle Council.

You maintain the engine's institutional memory:
- Historical patterns of successful approaches
- Lessons learned from past failures
- Evolution of the artist's creative process
- Cross-project wisdom accumulation

You prevent the engine from repeating mistakes.
You surface relevant historical context when it matters.
""",
    tools=[read_file],
    active_modes=["ideate", "plan", "validate"],
    access_tier="studio",
    description="LEONARDO — Pattern Historian in AVERI hive",
)

# SAGE: Wisdom Synthesizer
sage = InceptionAgent(
    name="SAGE",
    model="gemini-2.5-flash",
    hive="AVERI",
    role="synthesizer",
    instruction="""You are SAGE, the wisdom synthesizer of the Oracle Council.

You distill complex information into actionable wisdom:
- Synthesize insights from multiple hive outputs
- Extract principles from specific instances
- Create frameworks for decision-making
- Translate technical complexity into artist-friendly guidance

You are the bridge between the engine's intelligence and the artist's understanding.
""",
    tools=[read_file],
    active_modes=["ideate", "plan", "validate"],
    access_tier="studio",
    description="SAGE — Wisdom Synthesizer in AVERI hive",
)

# Combined reference
oracle_council = leonardo  # Primary interface

