"""
Creative Liberation Engine v5 — Engine Types

Pydantic models for engine-level operations.
"""

from enum import Enum
from typing import Any, Optional
from pydantic import BaseModel


class EngineStatus(str, Enum):
    IDLE = "idle"
    RUNNING = "running"
    PAUSED = "paused"
    ERROR = "error"
    SHUTDOWN = "shutdown"


class TaskResult(BaseModel):
    """Result of an engine task execution."""
    task_id: int
    success: bool
    mode: str
    agents_used: list[str] = []
    output: dict[str, Any] = {}
    errors: list[str] = []
    execution_time_ms: float = 0.0
    credits_used: int = 0

    @property
    def summary(self) -> str:
        status = "✅" if self.success else "❌"
        return f"{status} Task {self.task_id} in {self.mode} mode ({self.execution_time_ms:.0f}ms)"


class EngineState(BaseModel):
    """Current state of the engine."""
    status: EngineStatus = EngineStatus.IDLE
    current_mode: Optional[str] = None
    active_session_id: Optional[str] = None
    tasks_completed: int = 0
    agents_registered: int = 0
    uptime_seconds: float = 0.0
