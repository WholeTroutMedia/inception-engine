#!/usr/bin/env python3
"""Session Logger for Inception Engine

VERA's session logging system that tracks:
- Boot events and timestamps
- Agent activations and mode transitions
- User requests and system responses
- Performance metrics

Maintained by: VERA
Validated by: COMPASS
"""

import json
import uuid
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
import os


class SessionLogger:
    """VERA's session logging and activity tracking system."""

    def __init__(self, log_dir: Optional[Path] = None):
        """Initialize session logger.
        
        Args:
            log_dir: Directory for session logs. Defaults to KEEPER/logs/
        """
        if log_dir is None:
            base_path = Path(__file__).parent
            log_dir = base_path / "logs"
        
        self.log_dir = log_dir
        self.log_dir.mkdir(parents=True, exist_ok=True)
        
        self.session_id = str(uuid.uuid4())
        self.session_start = datetime.now(timezone.utc)
        self.session_file = self.log_dir / f"session-{self.session_start.strftime('%Y%m%d-%H%M%S')}-{self.session_id[:8]}.json"
        
        self.events: List[Dict[str, Any]] = []
        self.agent_activations: Dict[str, int] = {}
        self.mode_transitions: List[str] = []

    def log_boot(self, 
                 averi_status: Dict[str, str],
                 total_agents: int,
                 boot_duration_ms: float,
                 user_location: Optional[str] = None) -> None:
        """Log AVERI boot event.
        
        Args:
            averi_status: Status dict for ATHENA, VERA, IRIS
            total_agents: Total number of active agents
            boot_duration_ms: Boot sequence duration in milliseconds
            user_location: Optional user location string
        """
        boot_event = {
            "event_type": "boot",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "session_id": self.session_id,
            "averi_status": averi_status,
            "total_agents": total_agents,
            "boot_duration_ms": boot_duration_ms,
            "user_location": user_location
        }
        
        self.events.append(boot_event)
        self._write_session_log()

    def log_agent_activation(self, agent_name: str, purpose: str) -> None:
        """Log agent activation event.
        
        Args:
            agent_name: Name of activated agent
            purpose: Why the agent was activated
        """
        # Track activation count
        self.agent_activations[agent_name] = self.agent_activations.get(agent_name, 0) + 1
        
        activation_event = {
            "event_type": "agent_activation",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "agent_name": agent_name,
            "purpose": purpose,
            "activation_count": self.agent_activations[agent_name]
        }
        
        self.events.append(activation_event)
        self._write_session_log()

    def log_mode_transition(self, from_mode: Optional[str], to_mode: str, reason: str) -> None:
        """Log mode transition event.
        
        Args:
            from_mode: Previous mode (None if initial)
            to_mode: New mode (IDEATE, PLAN, SHIP, VALIDATE)
            reason: Reason for transition
        """
        self.mode_transitions.append(to_mode)
        
        transition_event = {
            "event_type": "mode_transition",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "from_mode": from_mode,
            "to_mode": to_mode,
            "reason": reason,
            "transition_count": len(self.mode_transitions)
        }
        
        self.events.append(transition_event)
        self._write_session_log()

    def log_user_request(self, request: str, request_type: str = "general") -> None:
        """Log user request.
        
        Args:
            request: User's request text
            request_type: Type of request (general, code, design, etc.)
        """
        request_event = {
            "event_type": "user_request",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "request": request[:500],  # Truncate long requests
            "request_type": request_type,
            "request_length": len(request)
        }
        
        self.events.append(request_event)
        self._write_session_log()

    def log_system_response(self, 
                            response_summary: str,
                            agents_involved: List[str],
                            duration_ms: float,
                            success: bool = True) -> None:
        """Log system response to user request.
        
        Args:
            response_summary: Brief summary of response
            agents_involved: List of agents that contributed
            duration_ms: Response generation time in milliseconds
            success: Whether response was successful
        """
        response_event = {
            "event_type": "system_response",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "response_summary": response_summary[:500],
            "agents_involved": agents_involved,
            "duration_ms": duration_ms,
            "success": success
        }
        
        self.events.append(response_event)
        self._write_session_log()

    def log_constitutional_review(self,
                                  action: str,
                                  reviewed_by: List[str],
                                  outcome: str,
                                  rationale: str) -> None:
        """Log constitutional review event.
        
        Args:
            action: Action being reviewed
            reviewed_by: List of reviewing agents (LEX hive)
            outcome: approved, rejected, or pending
            rationale: Reason for decision
        """
        review_event = {
            "event_type": "constitutional_review",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "action": action,
            "reviewed_by": reviewed_by,
            "outcome": outcome,
            "rationale": rationale[:500]
        }
        
        self.events.append(review_event)
        self._write_session_log()

    def log_memory_operation(self,
                             operation: str,
                             memory_type: str,
                             data_size_bytes: int,
                             success: bool = True) -> None:
        """Log SCRIBE memory operation.
        
        Args:
            operation: read, write, update, delete
            memory_type: episodic, semantic, procedural
            data_size_bytes: Size of data operated on
            success: Whether operation succeeded
        """
        memory_event = {
            "event_type": "memory_operation",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "operation": operation,
            "memory_type": memory_type,
            "data_size_bytes": data_size_bytes,
            "success": success
        }
        
        self.events.append(memory_event)
        self._write_session_log()

    def log_error(self, error_type: str, error_message: str, agent: Optional[str] = None) -> None:
        """Log error event.
        
        Args:
            error_type: Type/category of error
            error_message: Error message
            agent: Agent that encountered error (if applicable)
        """
        error_event = {
            "event_type": "error",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "error_type": error_type,
            "error_message": error_message[:1000],
            "agent": agent
        }
        
        self.events.append(error_event)
        self._write_session_log()

    def get_session_summary(self) -> Dict[str, Any]:
        """Get summary of current session.
        
        Returns:
            Dict containing session metrics and summary
        """
        duration = datetime.now(timezone.utc) - self.session_start
        
        return {
            "session_id": self.session_id,
            "start_time": self.session_start.isoformat(),
            "duration_minutes": duration.total_seconds() / 60,
            "total_events": len(self.events),
            "agent_activations": self.agent_activations,
            "mode_transitions": self.mode_transitions,
            "most_active_agent": max(self.agent_activations.items(), key=lambda x: x[1])[0] if self.agent_activations else None
        }

    def finalize_session(self) -> Path:
        """Finalize session and write complete log.
        
        Returns:
            Path to session log file
        """
        session_end = datetime.now(timezone.utc)
        duration = session_end - self.session_start
        
        final_log = {
            "session_info": {
                "session_id": self.session_id,
                "start_time": self.session_start.isoformat(),
                "end_time": session_end.isoformat(),
                "duration_minutes": duration.total_seconds() / 60,
                "total_events": len(self.events)
            },
            "metrics": {
                "agent_activations": self.agent_activations,
                "mode_transitions": self.mode_transitions,
                "most_active_agent": max(self.agent_activations.items(), key=lambda x: x[1])[0] if self.agent_activations else None,
                "events_by_type": self._count_events_by_type()
            },
            "events": self.events,
            "maintained_by": "VERA",
            "log_version": "1.0"
        }
        
        with open(self.session_file, 'w') as f:
            json.dump(final_log, f, indent=2)
        
        return self.session_file

    def _write_session_log(self) -> None:
        """Write current session state to log file (internal)."""
        try:
            current_log = {
                "session_id": self.session_id,
                "start_time": self.session_start.isoformat(),
                "last_updated": datetime.now(timezone.utc).isoformat(),
                "events": self.events,
                "agent_activations": self.agent_activations,
                "mode_transitions": self.mode_transitions
            }
            
            with open(self.session_file, 'w') as f:
                json.dump(current_log, f, indent=2)
        except Exception as e:
            # Silently fail - logging should never break the system
            pass

    def _count_events_by_type(self) -> Dict[str, int]:
        """Count events by type (internal)."""
        counts: Dict[str, int] = {}
        for event in self.events:
            event_type = event.get("event_type", "unknown")
            counts[event_type] = counts.get(event_type, 0) + 1
        return counts


class SessionAnalyzer:
    """Analyze historical session logs for insights."""

    def __init__(self, log_dir: Optional[Path] = None):
        """Initialize session analyzer.
        
        Args:
            log_dir: Directory containing session logs
        """
        if log_dir is None:
            base_path = Path(__file__).parent
            log_dir = base_path / "logs"
        
        self.log_dir = log_dir

    def get_all_sessions(self) -> List[Dict[str, Any]]:
        """Load all session logs.
        
        Returns:
            List of session log dicts
        """
        sessions = []
        
        if not self.log_dir.exists():
            return sessions
        
        for log_file in self.log_dir.glob("session-*.json"):
            try:
                with open(log_file, 'r') as f:
                    sessions.append(json.load(f))
            except Exception:
                continue
        
        return sessions

    def get_aggregate_metrics(self) -> Dict[str, Any]:
        """Get aggregate metrics across all sessions.
        
        Returns:
            Dict containing aggregate statistics
        """
        sessions = self.get_all_sessions()
        
        if not sessions:
            return {"total_sessions": 0}
        
        total_agent_activations: Dict[str, int] = {}
        total_mode_transitions: List[str] = []
        total_events = 0
        
        for session in sessions:
            # Aggregate agent activations
            activations = session.get("metrics", {}).get("agent_activations", {})
            for agent, count in activations.items():
                total_agent_activations[agent] = total_agent_activations.get(agent, 0) + count
            
            # Aggregate mode transitions
            transitions = session.get("metrics", {}).get("mode_transitions", [])
            total_mode_transitions.extend(transitions)
            
            # Count events
            total_events += session.get("session_info", {}).get("total_events", 0)
        
        return {
            "total_sessions": len(sessions),
            "total_events": total_events,
            "agent_activations": total_agent_activations,
            "most_active_agent": max(total_agent_activations.items(), key=lambda x: x[1])[0] if total_agent_activations else None,
            "total_mode_transitions": len(total_mode_transitions),
            "mode_usage": self._count_mode_usage(total_mode_transitions)
        }

    def _count_mode_usage(self, transitions: List[str]) -> Dict[str, int]:
        """Count mode usage from transitions."""
        counts: Dict[str, int] = {}
        for mode in transitions:
            counts[mode] = counts.get(mode, 0) + 1
        return counts


if __name__ == "__main__":
    # Example usage
    logger = SessionLogger()
    
    # Log boot
    logger.log_boot(
        averi_status={"ATHENA": "active", "VERA": "active", "IRIS": "active"},
        total_agents=35,
        boot_duration_ms=1247,
        user_location="Jamesport, New York, US"
    )
    
    # Log agent activation
    logger.log_agent_activation("ATHENA", "Strategic planning for new feature")
    
    # Log mode transition
    logger.log_mode_transition(None, "IDEATE", "User requested brainstorming session")
    
    # Get summary
    summary = logger.get_session_summary()
    print(json.dumps(summary, indent=2))
    
    # Finalize
    log_path = logger.finalize_session()
    print(f"Session log written to: {log_path}")
