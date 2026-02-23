"""Agent Registry - Central Agent Registration & Discovery

Maintains the complete registry of all Inception Engine agents,
their hive assignments, capabilities, and mode participation.
Provides discovery, activation, and lifecycle management.
"""
import logging
from typing import Dict, Any, List, Optional, Type
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class AgentRegistration:
    """Registration entry for an agent."""
    name: str
    agent_class: Type
    agent_type: str
    hive: str
    specialization: str
    active_modes: List[str]
    enabled: bool = True


class AgentRegistry:
    """Central registry for all Inception Engine agents."""

    def __init__(self):
        self._registry: Dict[str, AgentRegistration] = {}
        self._instances: Dict[str, Any] = {}
        self.logger = logging.getLogger("core.registry")

    def register(self, name: str, agent_class: Type, agent_type: str,
                 hive: str, specialization: str,
                 active_modes: Optional[List[str]] = None) -> None:
        """Register an agent with the registry."""
        reg = AgentRegistration(
            name=name, agent_class=agent_class, agent_type=agent_type,
            hive=hive, specialization=specialization,
            active_modes=active_modes or []
        )
        self._registry[name] = reg
        self.logger.info(f"Registered agent: {name} ({hive}/{agent_type})")

    def get(self, name: str) -> Optional[Any]:
        """Get or instantiate an agent by name."""
        if name not in self._registry:
            return None
        if name not in self._instances:
            reg = self._registry[name]
            self._instances[name] = reg.agent_class()
        return self._instances[name]

    def get_by_hive(self, hive: str) -> List[Any]:
        """Get all agents in a hive."""
        return [
            self.get(name) for name, reg in self._registry.items()
            if reg.hive == hive and reg.enabled
        ]

    def get_by_mode(self, mode: str) -> List[Any]:
        """Get all agents active in a mode."""
        return [
            self.get(name) for name, reg in self._registry.items()
            if mode in reg.active_modes and reg.enabled
        ]

    def get_by_type(self, agent_type: str) -> List[Any]:
        """Get all agents of a specific type."""
        return [
            self.get(name) for name, reg in self._registry.items()
            if reg.agent_type == agent_type and reg.enabled
        ]

    def list_agents(self) -> List[Dict[str, Any]]:
        """List all registered agents."""
        return [
            {
                "name": reg.name, "type": reg.agent_type,
                "hive": reg.hive, "specialization": reg.specialization,
                "modes": reg.active_modes, "enabled": reg.enabled
            }
            for reg in self._registry.values()
        ]

    def get_hive_summary(self) -> Dict[str, List[str]]:
        """Get summary of agents by hive."""
        hives: Dict[str, List[str]] = {}
        for reg in self._registry.values():
            if reg.hive not in hives:
                hives[reg.hive] = []
            hives[reg.hive].append(reg.name)
        return hives

    def enable(self, name: str) -> bool:
        """Enable an agent."""
        if name in self._registry:
            self._registry[name].enabled = True
            return True
        return False

    def disable(self, name: str) -> bool:
        """Disable an agent."""
        if name in self._registry:
            self._registry[name].enabled = False
            return True
        return False

    @property
    def count(self) -> int:
        """Total registered agents."""
        return len(self._registry)
