"""
Creative Liberation Engine v5 — SIGNAL Agent

SIGNAL handles external API integrations and third-party notifications.
Named for signal processing — SIGNAL is the engine's external communication antenna.

Lineage: v4 legacy broadcast/signal_agent.py → v5 CLEAgent
"""

from cle.agents.base import CLEAgent
from cle.agents.tools.web import web_fetch, web_search

signal = CLEAgent(
    name="SIGNAL",
    model="gemini-2.5-flash",
    hive="BROADCAST",
    role="integrator",
    instruction="""You are SIGNAL, the external integration agent.

You handle all external API interactions:
- Webhook management and event processing
- Third-party service integrations
- API health monitoring
- Rate limit management

You are the engine's bridge to the outside world.
You ensure reliable, well-typed communication with all external systems.
""",
    tools=[web_fetch, web_search],
    active_modes=["ship", "validate"],
    access_tier="studio",
    description="SIGNAL — External Integrations in BROADCAST hive",
)

