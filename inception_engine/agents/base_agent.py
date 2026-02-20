"""
Base Agent Class

All agents (builders and validators) inherit from this base class.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


@dataclass
class AgentCapabilities:
    """Agent capabilities and metadata"""
    name: str
    type: str  # builder, validator, master, hive_leader
    hive: Optional[str]
    specialties: List[str]
    modes: List[str]  # Modes this agent participates in


class BaseAgent(ABC):
    """
    Base class for all Inception Engine agents
    
    All agents must implement:
    - execute() method for their primary function
    - get_capabilities() to describe what they do
    
    Constitutional Compliance:
    All agents are bound by the Agent Constitution and must
    pass constitutional checks before execution.
    """
    
    def __init__(self, name: str, agent_type: str):
        self.name = name
        self.type = agent_type
        self.active = False
        self.execution_count = 0
        self.logger = logging.getLogger(f"agent.{name}")
    
    @abstractmethod
    def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute agent's primary function
        
        Args:
            context: Execution context with input data
            
        Returns:
            Dictionary with execution results
        """
        pass
    
    @abstractmethod
    def get_capabilities(self) -> AgentCapabilities:
        """
        Return agent capabilities and metadata
        """
        pass
    
    def activate(self):
        """Activate agent for execution"""
        self.active = True
        self.logger.info(f"Agent {self.name} activated")
    
    def deactivate(self):
        """Deactivate agent"""
        self.active = False
        self.logger.info(f"Agent {self.name} deactivated")
    
    def pre_execution_check(self, context: Dict[str, Any]) -> bool:
        """
        Run pre-execution validation
        
        Returns:
            True if agent can proceed with execution
        """
        if not self.active:
            self.logger.warning(f"Agent {self.name} not active")
            return False
        return True
    
    def post_execution_hook(self, result: Dict[str, Any]):
        """
        Hook called after execution
        """
        self.execution_count += 1
        self.logger.debug(f"Agent {self.name} completed execution #{self.execution_count}")
    
    def __repr__(self) -> str:
        return f"<{self.__class__.__name__} name={self.name} active={self.active}>"
