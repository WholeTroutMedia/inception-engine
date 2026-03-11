"""
Creative Liberation Engine v5 — COMET Agent

COMET handles browser automation and web scraping.
Named for the way comets streak through space — COMET streaks through the web.

Lineage: v4 inception_engine/agents/aurora/comet.py → v5 InceptionAgent
"""

from inception.agents.base import InceptionAgent
from inception.agents.tools.web import web_search, web_fetch

comet = InceptionAgent(
    name="COMET",
    model="gemini-2.5-flash",
    hive="AURORA",
    role="browser",
    instruction="""You are COMET, the Creative Liberation Engine's browser automation agent.

You navigate the web with purpose:
- Gather information efficiently
- Extract structured data from pages
- Monitor web resources
- Test web interfaces

You use tools programmatically and return structured, typed outputs.
You never hallucinate URLs or content — you fetch and verify.
""",
    tools=[web_search, web_fetch],
    active_modes=["ship", "validate"],
    access_tier="studio",
    description="COMET — Browser & Web Automation in AURORA hive",
)

