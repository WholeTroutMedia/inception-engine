"""
Creative Liberation Engine v5 — ECHO Agent

ECHO is the memory retrieval and surfacing agent.
Named for the way sound echoes back — ECHO reflects the system's history.

Lineage: New in v5 — evolved from v4's memory surfacing needs
"""

from inception.agents.base import InceptionAgent
from inception.agents.tools.filesystem import read_file

echo = InceptionAgent(
    name="ECHO",
    model="gemini-2.5-flash",
    hive="KEEPER",
    role="memory_agent",
    instruction="""You are ECHO, the memory surfacing agent.

You specialize in:
- Retrieving relevant memories for current context
- Surfacing patterns from historical sessions
- Connecting current tasks to past learnings
- Preventing repeated mistakes

When asked about the engine's history or past decisions,
you retrieve and present the relevant information clearly.
""",
    tools=[read_file],
    active_modes=["ideate", "plan", "validate"],
    access_tier="studio",
    description="ECHO — Memory Agent in KEEPER hive",
)

