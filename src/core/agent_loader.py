"""
Agent Loader - Dynamic agent activation and management

This module handles loading and activating agents based on mode requirements.
Agents are dynamically loaded from the registry and activated only when needed.
"""

import json
from pathlib import Path
from typing import Dict, List, Optional, Any, Set
from dataclasses import dataclass
from enum import Enum
import importlib
import logging

logger = logging.getLogger(__name__)


class AgentType(Enum):
    """Agent classification types"""
    BUILDER = "builder"  # Production/creation agents
    VALIDATOR = "validator"  # Review/quality agents
    SHARED = "shared"  # Agents used in multiple modes
    HIVE_LEADER = "hive_leader"  # Hive coordination agents
    MASTER = "master"  # Master agents (AVERI, etc.)


class AgentStatus(Enum):
    """Agent operational status"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    LOADING = "loading"
    ERROR = "error"


@dataclass
class AgentMetadata:
    """Agent registry metadata"""
    name: str
    type: AgentType
    status: AgentStatus
    modes: List[str]  # Modes this agent participates in
    hive: Optional[str] = None
    description: Optional[str] = None
    dependencies: Optional[List[str]] = None
    
    @classmethod
    def from_dict(cls, name: str, data: Dict[str, Any]) -> 'AgentMetadata':
        """Create from registry dictionary"""
        return cls(
            name=name,
            type=AgentType(data.get("type", "builder")),
            status=AgentStatus(data.get("status", "inactive")),
            modes=data.get("mode", "build").split(",") if isinstance(data.get("mode"), str) else [data.get("mode", "build")],
            hive=data.get("hive"),
            description=data.get("description"),
            dependencies=data.get("dependencies", [])
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for registry"""
        return {
            "type": self.type.value,
            "status": self.status.value,
            "mode": ",".join(self.modes),
            "hive": self.hive,
            "description": self.description,
            "dependencies": self.dependencies
        }


class AgentLoader:
    """
    Manages dynamic agent loading and activation
    
    Responsibilities:
    - Load agent registry
    - Activate agents based on mode
    - Manage agent lifecycle
    - Track active agents
    - Handle agent dependencies
    """
    
    def __init__(self, 
                 registry_path: str = "CORE_FOUNDATION/agents/.agent-status.json",
                 agents_dir: str = "inception_engine/agents"):
        self.registry_path = Path(registry_path)
        self.agents_dir = Path(agents_dir)
        
        # Agent storage
        self.registry: Dict[str, AgentMetadata] = {}
        self.active_agents: Dict[str, Any] = {}  # Loaded agent instances
        self.agent_modules: Dict[str, Any] = {}  # Imported modules
        
        # Load registry
        self._load_registry()
    
    def _load_registry(self):
        """Load agent registry from JSON file"""
        if not self.registry_path.exists():
            logger.warning(f"Registry not found: {self.registry_path}")
            return
        
        try:
            with open(self.registry_path, 'r') as f:
                data = json.load(f)
                agents_data = data.get("agents", {})
                
                for name, agent_data in agents_data.items():
                    self.registry[name] = AgentMetadata.from_dict(name, agent_data)
            
            logger.info(f"Loaded {len(self.registry)} agents from registry")
        except Exception as e:
            logger.error(f"Failed to load registry: {e}")
            raise
    
    def get_agents_for_mode(self, mode: str) -> List[AgentMetadata]:
        """
        Get list of agents that should be active for a mode
        
        Args:
            mode: Mode name (IDEATE, PLAN, SHIP, VALIDATE)
            
        Returns:
            List of agent metadata for the mode
        """
        mode = mode.upper()
        agents = []
        
        for agent_meta in self.registry.values():
            # Check if agent participates in this mode
            if self._agent_active_in_mode(agent_meta, mode):
                agents.append(agent_meta)
        
        return agents
    
    def _agent_active_in_mode(self, agent: AgentMetadata, mode: str) -> bool:
        """Check if agent should be active in given mode"""
        # Special case: IDEATE mode activates ALL agents
        if mode == "IDEATE":
            return True
        
        # Check mode-specific activation
        mode_map = {
            "PLAN": ["build", "both"],
            "SHIP": ["build", "both"],
            "VALIDATE": ["validate", "both"]
        }
        
        allowed_modes = mode_map.get(mode, [])
        return any(m in agent.modes for m in allowed_modes)
    
    def activate_agents_for_mode(self, mode: str) -> Dict[str, Any]:
        """
        Activate all agents required for a mode
        
        Args:
            mode: Mode name
            
        Returns:
            Dictionary of activated agent instances
        """
        mode = mode.upper()
        agents_to_activate = self.get_agents_for_mode(mode)
        
        logger.info(f"Activating {len(agents_to_activate)} agents for {mode} mode")
        
        activated = {}
        for agent_meta in agents_to_activate:
            try:
                agent = self.load_agent(agent_meta.name)
                if agent:
                    activated[agent_meta.name] = agent
                    logger.debug(f"Activated agent: {agent_meta.name}")
            except Exception as e:
                logger.error(f"Failed to activate {agent_meta.name}: {e}")
        
        self.active_agents = activated
        return activated
    
    def load_agent(self, agent_name: str) -> Optional[Any]:
        """
        Load a specific agent
        
        Args:
            agent_name: Name of agent to load
            
        Returns:
            Agent instance or None if failed
        """
        # Check if already loaded
        if agent_name in self.active_agents:
            return self.active_agents[agent_name]
        
        # Get agent metadata
        if agent_name not in self.registry:
            logger.error(f"Agent not in registry: {agent_name}")
            return None
        
        agent_meta = self.registry[agent_name]
        
        # Determine agent module path
        agent_type_dir = "builders" if agent_meta.type == AgentType.BUILDER else "validators"
        if agent_meta.type in [AgentType.SHARED, AgentType.HIVE_LEADER, AgentType.MASTER]:
            agent_type_dir = "builders"  # Masters/shared in builders dir
        
        module_name = agent_name.lower()
        module_path = f"inception_engine.agents.{agent_type_dir}.{module_name}"
        
        try:
            # Import module
            if module_path not in self.agent_modules:
                module = importlib.import_module(module_path)
                self.agent_modules[module_path] = module
            else:
                module = self.agent_modules[module_path]
            
            # Get agent class (assume class name matches agent name)
            agent_class = getattr(module, agent_name, None)
            if not agent_class:
                # Try capitalized version
                agent_class = getattr(module, agent_name.capitalize(), None)
            
            if not agent_class:
                logger.error(f"Agent class not found in {module_path}")
                return None
            
            # Instantiate agent
            agent = agent_class()
            
            # Update status
            agent_meta.status = AgentStatus.ACTIVE
            self._update_registry_status(agent_name, AgentStatus.ACTIVE)
            
            return agent
            
        except ImportError as e:
            logger.error(f"Failed to import agent {agent_name}: {e}")
            agent_meta.status = AgentStatus.ERROR
            return None
        except Exception as e:
            logger.error(f"Failed to load agent {agent_name}: {e}")
            agent_meta.status = AgentStatus.ERROR
            return None
    
    def deactivate_agent(self, agent_name: str):
        """Deactivate a specific agent"""
        if agent_name in self.active_agents:
            del self.active_agents[agent_name]
            
            if agent_name in self.registry:
                self.registry[agent_name].status = AgentStatus.INACTIVE
                self._update_registry_status(agent_name, AgentStatus.INACTIVE)
            
            logger.info(f"Deactivated agent: {agent_name}")
    
    def deactivate_all(self):
        """Deactivate all active agents"""
        for agent_name in list(self.active_agents.keys()):
            self.deactivate_agent(agent_name)
        
        logger.info("All agents deactivated")
    
    def get_active_count(self) -> int:
        """Get count of currently active agents"""
        return len(self.active_agents)
    
    def get_agent_info(self, agent_name: str) -> Optional[Dict[str, Any]]:
        """Get detailed information about an agent"""
        if agent_name not in self.registry:
            return None
        
        agent_meta = self.registry[agent_name]
        is_active = agent_name in self.active_agents
        
        return {
            "name": agent_name,
            "type": agent_meta.type.value,
            "status": agent_meta.status.value,
            "is_active": is_active,
            "modes": agent_meta.modes,
            "hive": agent_meta.hive,
            "description": agent_meta.description,
            "dependencies": agent_meta.dependencies
        }
    
    def get_agents_by_hive(self, hive: str) -> List[AgentMetadata]:
        """Get all agents in a specific hive"""
        return [
            agent for agent in self.registry.values()
            if agent.hive and agent.hive.lower() == hive.lower()
        ]
    
    def get_agents_by_type(self, agent_type: AgentType) -> List[AgentMetadata]:
        """Get all agents of a specific type"""
        return [
            agent for agent in self.registry.values()
            if agent.type == agent_type
        ]
    
    def get_builder_agents(self) -> List[AgentMetadata]:
        """Get all builder agents (V3 agents)"""
        return self.get_agents_by_type(AgentType.BUILDER)
    
    def get_validator_agents(self) -> List[AgentMetadata]:
        """Get all validator agents (V4 agents)"""
        return self.get_agents_by_type(AgentType.VALIDATOR)
    
    def _update_registry_status(self, agent_name: str, status: AgentStatus):
        """Update agent status in registry file"""
        try:
            with open(self.registry_path, 'r') as f:
                data = json.load(f)
            
            if agent_name in data.get("agents", {}):
                data["agents"][agent_name]["status"] = status.value
            
            with open(self.registry_path, 'w') as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to update registry status: {e}")
    
    def get_summary(self) -> Dict[str, Any]:
        """Get loader summary"""
        return {
            "total_agents": len(self.registry),
            "active_agents": len(self.active_agents),
            "builders": len(self.get_builder_agents()),
            "validators": len(self.get_validator_agents()),
            "by_hive": {
                "AURORA": len(self.get_agents_by_hive("AURORA")),
                "LEX": len(self.get_agents_by_hive("LEX")),
                "KEEPER": len(self.get_agents_by_hive("KEEPER")),
                "BROADCAST": len(self.get_agents_by_hive("BROADCAST")),
                "SWITCHBOARD": len(self.get_agents_by_hive("SWITCHBOARD"))
            },
            "active_list": list(self.active_agents.keys())
        }
    
    def validate_dependencies(self, agent_name: str) -> Tuple[bool, List[str]]:
        """
        Validate that all agent dependencies are available
        
        Returns:
            (all_satisfied, list_of_missing)
        """
        if agent_name not in self.registry:
            return False, ["Agent not in registry"]
        
        agent = self.registry[agent_name]
        if not agent.dependencies:
            return True, []
        
        missing = []
        for dep in agent.dependencies:
            if dep not in self.registry:
                missing.append(dep)
        
        return len(missing) == 0, missing
