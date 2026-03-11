"""
Creative Liberation Engine v5 — Agent Registry

Dynamic agent discovery, loading, and management.
Agents register themselves; the registry provides lookup by name, hive, or role.

Lineage: v4 orchestrator/skills_registry.py → v5 (simplified, tier-aware)
"""

import logging
from typing import Optional

from inception.agents.base import InceptionAgent

logger = logging.getLogger(__name__)


class AgentRegistry:
    """
    Registry for all Creative Liberation Engine agents.

    Usage:
        registry = AgentRegistry()
        registry.register(bolt)
        registry.register(aurora)

        agent = registry.get("BOLT")
        aurora_agents = registry.by_hive("AURORA")
    """

    def __init__(self):
        self._agents: dict[str, InceptionAgent] = {}

    def register(self, agent: InceptionAgent) -> None:
        """Register an agent."""
        if agent.name in self._agents:
            logger.warning(f"Agent {agent.name} already registered, overwriting")
        self._agents[agent.name] = agent
        agent.activate()
        logger.info(f"Registered agent: {agent}")

    def unregister(self, name: str) -> None:
        """Remove an agent from the registry."""
        if name in self._agents:
            self._agents[name].deactivate()
            del self._agents[name]

    def get(self, name: str) -> Optional[InceptionAgent]:
        """Get agent by name."""
        return self._agents.get(name)

    def by_hive(self, hive: str) -> list[InceptionAgent]:
        """Get all agents in a hive."""
        return [a for a in self._agents.values() if a.hive == hive]

    def by_role(self, role: str) -> list[InceptionAgent]:
        """Get all agents with a specific role."""
        return [a for a in self._agents.values() if a.role == role]

    def by_mode(self, mode: str) -> list[InceptionAgent]:
        """Get all agents active in a specific mode."""
        return [a for a in self._agents.values() if a.can_execute_in_mode(mode)]

    def by_tier(self, tier: str) -> list[InceptionAgent]:
        """Get agents accessible to a specific tier."""
        from inception.config.tiers import AccessTier, check_agent_access
        access_tier = AccessTier(tier)
        return [
            a for a in self._agents.values()
            if check_agent_access(access_tier, a.hive)
        ]

    def list_all(self) -> list[str]:
        """List all registered agent names."""
        return list(self._agents.keys())

    def count(self) -> int:
        return len(self._agents)

    def get_status(self) -> list[dict]:
        """Get capabilities for all registered agents."""
        return [a.get_capabilities() for a in self._agents.values()]
