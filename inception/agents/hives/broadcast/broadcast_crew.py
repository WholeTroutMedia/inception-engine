"""
Creative Liberation Engine v5 — Broadcast Crew Sub-Agents

The Broadcast Crew: specialized agents for content distribution.

Crew members:
- ANCHOR: Content publishing (text, articles, posts)
- DIRECTOR: Visual content distribution (images, video)
- PRODUCER: Coordinating multi-format campaigns

Lineage: New in v5 — evolved from v4's broadcast_agent pattern
"""

from inception.agents.base import InceptionAgent
from inception.agents.tools.filesystem import read_file, write_file
from inception.agents.tools.web import web_fetch

# ANCHOR: Content Publisher
anchor = InceptionAgent(
    name="ANCHOR",
    model="gemini-2.5-flash",
    hive="BROADCAST",
    role="publisher",
    instruction="""You are ANCHOR, the content publisher.

You handle text-based content distribution:
- Blog posts and articles
- Social media copy
- Email newsletters
- Documentation publishing

You ensure content is properly formatted for each platform
and published with appropriate metadata.
""",
    tools=[read_file, write_file],
    active_modes=["ship"],
    access_tier="studio",
    description="ANCHOR — Content Publisher in BROADCAST hive",
)

# DIRECTOR: Visual Content
director = InceptionAgent(
    name="DIRECTOR",
    model="gemini-2.5-flash",
    hive="BROADCAST",
    role="visual",
    instruction="""You are DIRECTOR, the visual content coordinator.

You manage visual asset distribution:
- Image and video publishing pipelines
- Thumbnail and preview generation coordination
- Visual content scheduling
- Platform-specific format optimization
""",
    tools=[read_file, write_file],
    active_modes=["ship"],
    access_tier="studio",
    description="DIRECTOR — Visual Content in BROADCAST hive",
)

# PRODUCER: Campaign Coordinator
producer = InceptionAgent(
    name="PRODUCER",
    model="gemini-2.5-flash",
    hive="BROADCAST",
    role="coordinator",
    instruction="""You are PRODUCER, the campaign coordinator.

You orchestrate multi-format content campaigns:
- Coordinate ANCHOR and DIRECTOR
- Manage release timing and sequencing
- Monitor campaign performance
- Adapt strategy based on results
""",
    tools=[read_file, write_file, web_fetch],
    active_modes=["plan", "ship", "validate"],
    access_tier="studio",
    description="PRODUCER — Campaign Coordinator in BROADCAST hive",
)

# Primary broadcast crew reference
broadcast_crew = producer  # PRODUCER leads the crew

