"""Session Configuration for Inception Engine (Light Edition)

Manages operational modes, workflow patterns, and session lifecycle.
Supports INTEROPERABLE (default), HELIX, and PLAN_DETERMINED modes.
"""

from enum import Enum
from typing import Dict, List, Optional
from datetime import datetime


class OperationalMode(Enum):
    """Available operational modes for agent organization."""

    INTEROPERABLE = "interoperable"
    HELIX = "helix"
    PLAN_DETERMINED = "plan_determined"


class InceptionMode(Enum):
    """The four modes of the Inception Engine workflow."""

    IDEATE = "ideate"
    PLAN = "plan"
    SHIP = "ship"
    VALIDATE = "validate"


class SessionManager:
    """Manages session configuration and operational mode switching."""

    def __init__(self):
        """Initialize session manager with default configuration."""
        self._session: Optional[Dict] = None
        self._operational_mode = OperationalMode.INTEROPERABLE
        self._current_inception_mode: Optional[InceptionMode] = None
        self._helix_config: Optional[Dict[str, List[str]]] = None
        self._excluded_agents: List[str] = []

    def start_session(
        self,
        operational_mode: OperationalMode = OperationalMode.INTEROPERABLE,
        workflow_pattern: str = "express",
        auto_validate: bool = True,
        show_agent_thoughts: bool = False,
        excluded_agents: Optional[List[str]] = None,
    ) -> Dict:
        """Start a new session with the specified configuration.

        Args:
            operational_mode: How agents are organized
            workflow_pattern: Which modes to run (express, rapid, full, continuous)
            auto_validate: Whether to auto-run VALIDATE after SHIP
            show_agent_thoughts: Whether to display agent reasoning
            excluded_agents: Agents to exclude from this session

        Returns:
            Session configuration dict
        """
        self._operational_mode = operational_mode
        self._excluded_agents = excluded_agents or []

        workflow_modes = self._resolve_workflow(workflow_pattern)

        self._session = {
            "session_id": f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "started_at": datetime.now().isoformat(),
            "operational_mode": operational_mode.value,
            "workflow_pattern": workflow_pattern,
            "workflow_modes": [m.value for m in workflow_modes],
            "auto_validate": auto_validate,
            "show_agent_thoughts": show_agent_thoughts,
            "excluded_agents": self._excluded_agents,
            "status": "active",
        }

        if workflow_modes:
            self._current_inception_mode = workflow_modes[0]

        return self._session

    def _resolve_workflow(self, pattern: str) -> List[InceptionMode]:
        """Resolve workflow pattern name to list of InceptionModes."""
        workflows = {
            "full": [
                InceptionMode.IDEATE,
                InceptionMode.PLAN,
                InceptionMode.SHIP,
                InceptionMode.VALIDATE,
            ],
            "rapid": [
                InceptionMode.IDEATE,
                InceptionMode.SHIP,
                InceptionMode.VALIDATE,
            ],
            "express": [
                InceptionMode.SHIP,
                InceptionMode.VALIDATE,
            ],
            "continuous": [
                InceptionMode.VALIDATE,
                InceptionMode.SHIP,
            ],
        }
        return workflows.get(pattern, workflows["express"])

    def switch_operational_mode(self, new_mode: OperationalMode) -> None:
        """Switch operational mode mid-session."""
        self._operational_mode = new_mode
        if self._session:
            self._session["operational_mode"] = new_mode.value

        if new_mode != OperationalMode.HELIX:
            self._helix_config = None

    def configure_helix(self, helix_assignments: Dict[str, List[str]]) -> None:
        """Configure HELIX mode with agent assignments.

        Args:
            helix_assignments: Dict mapping helix names to agent lists
                Example: {"design_helix": ["Aurora", "BOLT"],
                         "backend_helix": ["COMET", "SYSTEMS"]}
        """
        if self._operational_mode != OperationalMode.HELIX:
            self.switch_operational_mode(OperationalMode.HELIX)
        self._helix_config = helix_assignments

    def enter_mode(self, mode: InceptionMode) -> None:
        """Manually enter a specific Inception mode."""
        self._current_inception_mode = mode
        if self._session:
            self._session["current_mode"] = mode.value

    def get_current_config(self) -> Dict:
        """Get current session configuration."""
        return {
            "session": self._session,
            "operational_mode": self._operational_mode.value,
            "current_inception_mode": (
                self._current_inception_mode.value
                if self._current_inception_mode
                else None
            ),
            "helix_config": self._helix_config,
            "excluded_agents": self._excluded_agents,
        }

    @property
    def is_active(self) -> bool:
        """Check if a session is currently active."""
        return self._session is not None and self._session.get("status") == "active"

    def end_session(self) -> Optional[Dict]:
        """End the current session and return summary."""
        if self._session:
            self._session["status"] = "completed"
            self._session["ended_at"] = datetime.now().isoformat()
            summary = self._session.copy()
            self._session = None
            self._current_inception_mode = None
            self._helix_config = None
            return summary
        return None
