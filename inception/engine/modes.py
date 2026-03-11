"""
Creative Liberation Engine v5 — Mode System

Four operational modes that define the engine's current focus:
  ideate — brainstorm, explore, research
  plan   — architect, specify, design
  ship   — build, code, execute
  validate — test, review, verify

Lineage: v4 modes.py (6 modes) → v5 (4 modes, cleaner)
"""

import logging
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional

logger = logging.getLogger(__name__)


class ModeType(str, Enum):
    IDEATE = "ideate"
    PLAN = "plan"
    SHIP = "ship"
    VALIDATE = "validate"


@dataclass
class ModeConfig:
    """Configuration for an operational mode."""
    mode: ModeType
    description: str
    allowed_hives: list[str] = field(default_factory=list)
    default_agents: list[str] = field(default_factory=list)
    parallel_limit: int = 4
    requires_confirmation: bool = False


MODE_CONFIGS: dict[ModeType, ModeConfig] = {
    ModeType.IDEATE: ModeConfig(
        mode=ModeType.IDEATE,
        description="Brainstorm, explore, and research ideas",
        allowed_hives=["LEXICON", "HERALD", "AURORA"],
        default_agents=["LORE", "HERALD"],
        parallel_limit=2,
    ),
    ModeType.PLAN: ModeConfig(
        mode=ModeType.PLAN,
        description="Architect, specify, and design solutions",
        allowed_hives=["AURORA", "ALCHEMY", "LEXICON"],
        default_agents=["NEXUS", "BOLT", "VAULT"],
        parallel_limit=3,
    ),
    ModeType.SHIP: ModeConfig(
        mode=ModeType.SHIP,
        description="Build, code, and execute",
        allowed_hives=["AURORA", "ALCHEMY", "AVERI"],
        default_agents=["BOLT", "PIXEL", "TEMPO"],
        parallel_limit=4,
        requires_confirmation=True,
    ),
    ModeType.VALIDATE: ModeConfig(
        mode=ModeType.VALIDATE,
        description="Test, review, and verify quality",
        allowed_hives=["AURORA", "ALCHEMY"],
        default_agents=["LENS", "VAULT"],
        parallel_limit=2,
    ),
}


@dataclass
class ModeSession:
    """An active mode session."""
    mode: ModeType
    started_at: float = field(default_factory=time.time)
    task_count: int = 0
    completed_count: int = 0

    @property
    def duration_seconds(self) -> float:
        return time.time() - self.started_at

    @property
    def success_rate(self) -> float:
        if self.task_count == 0:
            return 0.0
        return self.completed_count / self.task_count


class ModeManager:
    """
    Manages the engine's operational mode.

    Usage:
        manager = ModeManager()
        manager.enter(ModeType.SHIP)
        # ... execute tasks ...
        manager.exit()
    """

    def __init__(self):
        self._current: Optional[ModeSession] = None
        self._history: list[ModeSession] = []

    def enter(self, mode: ModeType) -> ModeSession:
        """Enter a new mode."""
        if self._current:
            self.exit()

        session = ModeSession(mode=mode)
        self._current = session
        logger.info(f"Mode entered: {mode.value}")
        return session

    def exit(self) -> Optional[ModeSession]:
        """Exit the current mode."""
        if self._current:
            self._history.append(self._current)
            session = self._current
            self._current = None
            logger.info(
                f"Mode exited: {session.mode.value} "
                f"({session.task_count} tasks, {session.duration_seconds:.1f}s)"
            )
            return session
        return None

    @property
    def current(self) -> Optional[ModeSession]:
        return self._current

    @property
    def current_mode(self) -> Optional[ModeType]:
        return self._current.mode if self._current else None

    def is_in_mode(self, mode: ModeType) -> bool:
        """Check if currently in a specific mode."""
        return self._current is not None and self._current.mode == mode

    def get_config(self, mode: Optional[ModeType] = None) -> Optional[ModeConfig]:
        """Get configuration for a mode."""
        target = mode or self.current_mode
        if target is None:
            return None
        return MODE_CONFIGS.get(target)

    def get_history(self) -> list[ModeSession]:
        """Get completed mode sessions."""
        return list(self._history)
