"""
Creative Liberation Engine v5 — InceptionAgent Base Class

The core agent definition. ADK-inspired: each agent has a name, model, tools,
instruction, and typed output schema.

Lineage:
  - v4 BaseAgent (AgentExecutor interface, AgentResult, AgentCapability)
  - Google ADK pattern: Agent(name=, model=, tools=[], instruction=)
  - v5: Adds Constitution, hive, tier awareness, Pydantic outputs

This is the single most important class in v5.
"""

import logging
import time
from dataclasses import dataclass, field
from typing import Any, Callable, Optional, Type

from pydantic import BaseModel

logger = logging.getLogger(__name__)


@dataclass
class AgentResult:
    """Typed result from agent execution."""
    success: bool
    output: dict[str, Any]
    agent_name: str = ""
    reasoning: str = ""
    execution_time_ms: float = 0.0
    model_used: str = ""
    tokens_used: int = 0
    errors: list[str] = field(default_factory=list)

    @property
    def summary(self) -> str:
        status = "✅" if self.success else "❌"
        return f"{status} {self.agent_name} ({self.execution_time_ms:.0f}ms)"


class InceptionAgent:
    """
    Base class for all Creative Liberation Engine agents.

    ADK-inspired definition pattern:
        bolt = InceptionAgent(
            name="BOLT",
            model="gemini-2.5-flash",
            hive="AURORA",
            role="builder",
            instruction="You are BOLT, the primary coder...",
            tools=[file_write, file_read, git_commit],
            output_schema=BuildResult,
            active_modes=["ship"],
            access_tier="studio",
        )

    Key differences from v4:
    - Each agent has REAL tools (not persona injection)
    - Typed outputs via Pydantic
    - Testable independently
    - Different models per agent
    - Tier-aware access control
    """

    def __init__(
        self,
        name: str,
        model: str = "gemini-2.5-flash",
        hive: str = "AURORA",
        role: str = "builder",
        instruction: str = "",
        tools: Optional[list[Callable]] = None,
        output_schema: Optional[Type[BaseModel]] = None,
        active_modes: Optional[list[str]] = None,
        access_tier: str = "studio",
        description: str = "",
    ):
        self.name = name
        self.model = model
        self.hive = hive
        self.role = role
        self.instruction = instruction
        self.tools = tools or []
        self.output_schema = output_schema
        self.active_modes = active_modes or ["ideate", "plan", "ship", "validate"]
        self.access_tier = access_tier
        self.description = description or f"{name} — {role} in {hive} hive"

        # Runtime state
        self._active = False
        self._execution_count = 0
        self._total_time_ms = 0.0

    def activate(self) -> None:
        """Activate agent for execution."""
        self._active = True
        logger.info(f"Agent {self.name} activated (hive={self.hive}, model={self.model})")

    def deactivate(self) -> None:
        """Deactivate agent."""
        self._active = False

    @property
    def is_active(self) -> bool:
        return self._active

    def can_execute_in_mode(self, mode: str) -> bool:
        """Check if agent is allowed to execute in a given mode."""
        return mode in self.active_modes

    def get_tool_names(self) -> list[str]:
        """Get names of all available tools."""
        return [t.__name__ for t in self.tools]

    async def execute(self, context: dict[str, Any]) -> AgentResult:
        """
        Execute agent's primary function.

        This is the main entry point. Override in subclasses for custom behavior,
        or the default implementation will use litellm with tools.

        Args:
            context: Execution context including task, mode, and global rules

        Returns:
            AgentResult with typed output
        """
        start = time.perf_counter()

        try:
            # Validate
            if not self._active:
                return AgentResult(
                    success=False,
                    output={},
                    agent_name=self.name,
                    errors=["Agent not activated"],
                )

            mode = context.get("mode", "ship")
            if not self.can_execute_in_mode(mode):
                return AgentResult(
                    success=False,
                    output={},
                    agent_name=self.name,
                    errors=[f"Agent {self.name} not allowed in {mode} mode"],
                )

            # Execute (subclasses override this)
            output = await self._execute_impl(context)

            duration = (time.perf_counter() - start) * 1000
            self._execution_count += 1
            self._total_time_ms += duration

            return AgentResult(
                success=True,
                output=output,
                agent_name=self.name,
                model_used=self.model,
                execution_time_ms=round(duration, 2),
            )

        except Exception as e:
            duration = (time.perf_counter() - start) * 1000
            logger.error(f"Agent {self.name} execution failed: {e}")
            return AgentResult(
                success=False,
                output={},
                agent_name=self.name,
                execution_time_ms=round(duration, 2),
                errors=[str(e)],
            )

    async def _execute_impl(self, context: dict[str, Any]) -> dict[str, Any]:
        """
        Internal execution implementation.

        Default: calls litellm with instruction + tools.
        Override in subclasses for custom behavior.
        """
        # Default implementation will be wired to litellm in Phase 2
        return {
            "agent": self.name,
            "status": "executed",
            "task": context.get("task", ""),
        }

    def get_capabilities(self) -> dict[str, Any]:
        """Return agent metadata for registry/status."""
        return {
            "name": self.name,
            "model": self.model,
            "hive": self.hive,
            "role": self.role,
            "tools": self.get_tool_names(),
            "active_modes": self.active_modes,
            "access_tier": self.access_tier,
            "active": self._active,
            "executions": self._execution_count,
            "total_time_ms": round(self._total_time_ms, 2),
        }

    def __repr__(self) -> str:
        tools = len(self.tools)
        return f"<InceptionAgent {self.name} hive={self.hive} model={self.model} tools={tools}>"

