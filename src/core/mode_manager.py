"""
Mode Manager - Handles mode lifecycle and transitions

This module manages the four operational modes (IDEATE, PLAN, SHIP, VALIDATE),
including mode activation, transition logic, and state management.
"""

import json
from enum import Enum
from pathlib import Path
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from datetime import datetime


class ModeType(Enum):
    """Available operational modes"""
    IDEATE = "IDEATE"
    PLAN = "PLAN"
    SHIP = "SHIP"
    VALIDATE = "VALIDATE"


class ModeStatus(Enum):
    """Mode execution status"""
    PENDING = "pending"
    ACTIVE = "active"
    COMPLETE = "complete"
    FAILED = "failed"
    CHECKPOINTED = "checkpointed"


@dataclass
class ModeConfig:
    """Mode configuration loaded from MODE_CONFIG.json"""
    mode: ModeType
    version: str
    tagline: str
    objective: str
    agent_roster: List[str]
    entry_requirements: Dict[str, Any]
    exit_criteria: Dict[str, bool]
    gates: List[Dict[str, Any]]
    workflows: List[str]
    outputs: Dict[str, str]
    speed_modes: Optional[Dict[str, Dict[str, str]]] = None


@dataclass
class ModeSession:
    """Runtime mode session data"""
    session_id: str
    mode: ModeType
    status: ModeStatus
    start_time: datetime
    end_time: Optional[datetime]
    input_data: Dict[str, Any]
    output_data: Optional[Dict[str, Any]]
    checkpoints: List[Dict[str, Any]]
    errors: List[str]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        return {
            "session_id": self.session_id,
            "mode": self.mode.value,
            "status": self.status.value,
            "start_time": self.start_time.isoformat(),
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "input_data": self.input_data,
            "output_data": self.output_data,
            "checkpoints": self.checkpoints,
            "errors": self.errors
        }


class ModeManager:
    """
    Manages mode lifecycle, transitions, and state
    
    Responsibilities:
    - Load mode configurations
    - Activate/deactivate modes
    - Manage mode transitions
    - Track mode sessions
    - Enforce entry/exit criteria
    """
    
    def __init__(self, modes_dir: str = "MODES"):
        self.modes_dir = Path(modes_dir)
        self.configs: Dict[ModeType, ModeConfig] = {}
        self.active_session: Optional[ModeSession] = None
        self.session_history: List[ModeSession] = []
        
        # Load all mode configurations
        self._load_configs()
    
    def _load_configs(self):
        """Load configuration for all modes"""
        mode_mappings = {
            "01_IDEATE": ModeType.IDEATE,
            "02_PLAN": ModeType.PLAN,
            "03_SHIP": ModeType.SHIP,
            "04_VALIDATE": ModeType.VALIDATE
        }
        
        for mode_dir, mode_type in mode_mappings.items():
            config_path = self.modes_dir / mode_dir / "MODE_CONFIG.json"
            if config_path.exists():
                with open(config_path, 'r') as f:
                    config_data = json.load(f)
                    self.configs[mode_type] = ModeConfig(
                        mode=mode_type,
                        **config_data
                    )
    
    def get_config(self, mode: ModeType) -> ModeConfig:
        """Get configuration for a specific mode"""
        if mode not in self.configs:
            raise ValueError(f"No configuration found for mode: {mode}")
        return self.configs[mode]
    
    def can_enter_mode(self, mode: ModeType, context: Dict[str, Any]) -> tuple[bool, Optional[str]]:
        """
        Check if mode entry requirements are met
        
        Returns:
            (can_enter, reason_if_not)
        """
        config = self.get_config(mode)
        requirements = config.entry_requirements
        
        # Check if input is required from previous mode
        requires_input_from = requirements.get("requires_input_from")
        if requires_input_from:
            # Check if we have output from required mode
            if not context.get(f"{requires_input_from[0].lower()}_output"):
                # Check if we can skip
                can_skip = requirements.get("can_skip_if")
                if can_skip == "direct_prompt_provided" and context.get("direct_prompt"):
                    return True, None
                return False, f"Mode {mode.value} requires input from {requires_input_from[0]}"
        
        return True, None
    
    def can_exit_mode(self, mode: ModeType, output: Dict[str, Any]) -> tuple[bool, List[str]]:
        """
        Check if mode exit criteria are met
        
        Returns:
            (can_exit, list_of_unmet_criteria)
        """
        config = self.get_config(mode)
        exit_criteria = config.exit_criteria
        
        unmet = []
        for criterion, required in exit_criteria.items():
            if required and not output.get(criterion, False):
                unmet.append(criterion)
        
        return len(unmet) == 0, unmet
    
    def start_mode(self, mode: ModeType, input_data: Dict[str, Any]) -> ModeSession:
        """
        Start a new mode session
        
        Args:
            mode: Mode to start
            input_data: Input data for the mode
            
        Returns:
            ModeSession object
            
        Raises:
            ValueError: If entry requirements not met
        """
        # Check entry requirements
        can_enter, reason = self.can_enter_mode(mode, input_data)
        if not can_enter:
            raise ValueError(f"Cannot enter mode {mode.value}: {reason}")
        
        # End any active session
        if self.active_session and self.active_session.status == ModeStatus.ACTIVE:
            self.active_session.status = ModeStatus.CHECKPOINTED
            self.session_history.append(self.active_session)
        
        # Create new session
        session = ModeSession(
            session_id=self._generate_session_id(mode),
            mode=mode,
            status=ModeStatus.ACTIVE,
            start_time=datetime.now(),
            end_time=None,
            input_data=input_data,
            output_data=None,
            checkpoints=[],
            errors=[]
        )
        
        self.active_session = session
        return session
    
    def complete_mode(self, output_data: Dict[str, Any]) -> ModeSession:
        """
        Complete the active mode session
        
        Args:
            output_data: Output data from the mode
            
        Returns:
            Completed ModeSession
            
        Raises:
            ValueError: If no active session or exit criteria not met
        """
        if not self.active_session:
            raise ValueError("No active mode session to complete")
        
        # Check exit criteria
        can_exit, unmet = self.can_exit_mode(self.active_session.mode, output_data)
        if not can_exit:
            raise ValueError(
                f"Cannot exit {self.active_session.mode.value}: "
                f"Unmet criteria: {', '.join(unmet)}"
            )
        
        # Complete session
        self.active_session.status = ModeStatus.COMPLETE
        self.active_session.end_time = datetime.now()
        self.active_session.output_data = output_data
        
        # Archive to history
        completed_session = self.active_session
        self.session_history.append(completed_session)
        self.active_session = None
        
        return completed_session
    
    def fail_mode(self, error: str):
        """Mark active mode session as failed"""
        if self.active_session:
            self.active_session.status = ModeStatus.FAILED
            self.active_session.end_time = datetime.now()
            self.active_session.errors.append(error)
            self.session_history.append(self.active_session)
            self.active_session = None
    
    def checkpoint_mode(self, checkpoint_data: Dict[str, Any]):
        """Create a checkpoint in the active mode session"""
        if self.active_session:
            checkpoint = {
                "timestamp": datetime.now().isoformat(),
                "data": checkpoint_data
            }
            self.active_session.checkpoints.append(checkpoint)
    
    def get_last_session(self, mode: Optional[ModeType] = None) -> Optional[ModeSession]:
        """Get the most recent session, optionally filtered by mode"""
        if not self.session_history:
            return None
        
        if mode:
            for session in reversed(self.session_history):
                if session.mode == mode:
                    return session
            return None
        
        return self.session_history[-1]
    
    def transition_to_next_mode(self, current_mode: ModeType) -> ModeType:
        """
        Determine the next mode in the standard workflow
        
        Args:
            current_mode: Current mode
            
        Returns:
            Next mode in sequence
        """
        transitions = {
            ModeType.IDEATE: ModeType.PLAN,
            ModeType.PLAN: ModeType.SHIP,
            ModeType.SHIP: ModeType.VALIDATE,
            ModeType.VALIDATE: None  # End of workflow
        }
        
        return transitions.get(current_mode)
    
    def _generate_session_id(self, mode: ModeType) -> str:
        """Generate unique session ID"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        return f"{mode.value.lower()}_{timestamp}"
    
    def get_session_summary(self) -> Dict[str, Any]:
        """Get summary of current and historical sessions"""
        return {
            "active_session": self.active_session.to_dict() if self.active_session else None,
            "total_sessions": len(self.session_history),
            "sessions_by_mode": {
                mode.value: len([s for s in self.session_history if s.mode == mode])
                for mode in ModeType
            },
            "recent_sessions": [
                s.to_dict() for s in self.session_history[-5:]
            ]
        }
