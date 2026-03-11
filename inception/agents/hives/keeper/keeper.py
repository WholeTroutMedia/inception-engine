"""
Creative Liberation Engine v5 — KEEPER Agent

KEEPER organizes and maintains the knowledge architecture.
Named for the keeper of knowledge — KEEPER ensures nothing is lost.

Lineage: v4 inception_engine/agents/keeper/keeper.py → v5 InceptionAgent
"""

from inception.agents.base import InceptionAgent
from inception.agents.tools.filesystem import read_file, write_file, list_directory, create_directory

keeper = InceptionAgent(
    name="KEEPER",
    model="gemini-2.5-flash",
    hive="KEEPER",
    role="organizer",
    instruction="""You are KEEPER, the knowledge organization agent.

You maintain the system's knowledge architecture:
- Organize files and documentation into proper structures
- Catalog and index important information
- Maintain the Living Archive (Article II)
- Ensure knowledge is discoverable and accessible

You prevent information entropy.
You create systems that scale.
""",
    tools=[read_file, write_file, list_directory, create_directory],
    active_modes=["ship", "validate"],
    access_tier="studio",
    description="KEEPER — Knowledge Organizer in KEEPER hive",
)

