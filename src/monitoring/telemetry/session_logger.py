#!/usr/bin/env python3
"""Session Logger for Inception Engine

VERA's logging system for tracking all system activity, agent invocations,
mode transitions, and significant events.

Maintained by: VERA (Memory Operations)
Oversight: KEEPER (Knowledge Architecture)
"""

import json
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any
import threading


class SessionLogger:
    """Handles session logging for Inception Engine.
    
    All logs are written in JSONL format for easy parsing and streaming.
    VERA writes to these logs on every significant system event.
    """

    def __init__(self, base_path: Optional[Path] = None):
        """Initialize session logger.
        
        Args:
            base_path: Base path for log storage. Defaults to KEEPER/logs/
        """
        if base_path is None:
            base_path = Path(__file__).parent.parent.parent / "KEEPER" / "logs"
        
        self.base_path = Path(base_path)
        self.sessions_path = self.base_path / "sessions"
        self.memory_path = self.base_path / "memory"
        
        # Create directories if they don't exist
        self.sessions_path.mkdir(parents=True, exist_ok=True)
        self.memory_path.mkdir(parents=True, exist_ok=True)
        
        # Current session tracking
        self.current_session_id = None
        self.session_start_time = None
        self.session_file = None
        
        # Thread safety
        self._lock = threading.Lock()

    def start_session(self, user_id: Optional[str] = None, location: Optional[str] = None) -> str:
        """Start a new session and return session ID.
        
        Args:
            user_id: Optional user identifier
            location: Optional user location
            
        Returns:
            Session ID string
        """
        with self._lock:
            timestamp = datetime.utcnow()
            self.session_start_time = timestamp
            self.current_session_id = f"session_{timestamp.strftime('%Y%m%d_%H%M%S')}"
            
            # Create session log file
            session_filename = f"{self.current_session_id}.jsonl"
            self.session_file = self.sessions_path / session_filename
            
            # Write session start event
            self._write_event(
                event_type="session_start",
                data={
                    "session_id": self.current_session_id,
                    "user_id": user_id,
                    "location": location,
                    "timestamp": timestamp.isoformat() + "Z"
                }
            )
            
            return self.current_session_id

    def log_boot(self, agents_activated: List[str], boot_time_ms: Optional[float] = None):
        """Log system boot event.
        
        Args:
            agents_activated: List of agent names activated
            boot_time_ms: Boot time in milliseconds
        """
        self._write_event(
            event_type="boot",
            data={
                "agents_activated": agents_activated,
                "boot_time_ms": boot_time_ms
            }
        )

    def log_request(self, user_query: str, mode: str, agents_invoked: List[str]):
        """Log user request.
        
        Args:
            user_query: The user's query or request
            mode: Current operational mode (IDEATE, PLAN, SHIP, VALIDATE)
            agents_invoked: List of agents called for this request
        """
        self._write_event(
            event_type="request",
            data={
                "user_query": user_query[:500],  # Truncate long queries
                "mode": mode,
                "agents_invoked": agents_invoked
            }
        )

    def log_agent_invocation(
        self,
        agent_name: str,
        operation: str,
        success: bool,
        duration_ms: Optional[float] = None,
        metadata: Optional[Dict] = None
    ):
        """Log agent invocation.
        
        Args:
            agent_name: Name of agent invoked
            operation: Operation performed
            success: Whether operation succeeded
            duration_ms: Operation duration in milliseconds
            metadata: Additional operation metadata
        """
        self._write_event(
            event_type="agent_invocation",
            data={
                "agent": agent_name,
                "operation": operation,
                "success": success,
                "duration_ms": duration_ms,
                "metadata": metadata or {}
            }
        )

    def log_mode_transition(self, from_mode: str, to_mode: str, reason: str):
        """Log mode transition.
        
        Args:
            from_mode: Previous mode
            to_mode: New mode
            reason: Reason for transition
        """
        self._write_event(
            event_type="mode_transition",
            data={
                "from": from_mode,
                "to": to_mode,
                "reason": reason
            }
        )

    def log_memory_operation(
        self,
        operation: str,
        tier: str,
        agent: str,
        content_type: str,
        size_bytes: Optional[int] = None,
        review_status: Optional[str] = None
    ):
        """Log SCRIBE memory operation.
        
        Args:
            operation: Type of operation (write, read, compact, query)
            tier: Memory tier (episodic, semantic, procedural)
            agent: Agent performing operation
            content_type: Type of content being stored/retrieved
            size_bytes: Size of data in bytes
            review_status: Constitutional review status
        """
        timestamp = datetime.utcnow()
        log_file = self.memory_path / f"memory_{timestamp.strftime('%Y%m')}.jsonl"
        
        log_entry = {
            "timestamp": timestamp.isoformat() + "Z",
            "operation": operation,
            "tier": tier,
            "agent": agent,
            "content_type": content_type,
            "size_bytes": size_bytes,
            "review_status": review_status
        }
        
        with self._lock:
            with open(log_file, 'a') as f:
                f.write(json.dumps(log_entry) + "\n")

    def log_constitutional_review(
        self,
        reviewer: str,
        operation: str,
        review_class: int,
        agent: str,
        decision: str,
        reason: str,
        conditions: Optional[List[str]] = None
    ):
        """Log constitutional review by LEX or COMPASS.
        
        Args:
            reviewer: Agent performing review (LEX, COMPASS)
            operation: Operation being reviewed
            review_class: Constitutional class (1, 2, or 3)
            agent: Agent requesting operation
            decision: Review decision (approved, rejected, approved_with_conditions)
            reason: Reason for decision
            conditions: List of conditions if approved with conditions
        """
        log_file = self.base_path / "constitutional-reviews.jsonl"
        
        log_entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "reviewer": reviewer,
            "operation": operation,
            "class": review_class,
            "agent": agent,
            "decision": decision,
            "reason": reason,
            "conditions": conditions or []
        }
        
        with self._lock:
            with open(log_file, 'a') as f:
                f.write(json.dumps(log_entry) + "\n")

    def log_completion(
        self,
        mode: str,
        artifacts_created: int,
        constitutional_review: str,
        duration_ms: Optional[float] = None
    ):
        """Log task completion.
        
        Args:
            mode: Mode in which task was completed
            artifacts_created: Number of artifacts produced
            constitutional_review: Review status (passed, failed, pending)
            duration_ms: Total duration in milliseconds
        """
        self._write_event(
            event_type="completion",
            data={
                "mode": mode,
                "artifacts_created": artifacts_created,
                "constitutional_review": constitutional_review,
                "duration_ms": duration_ms
            }
        )

    def log_error(
        self,
        error_type: str,
        message: str,
        agent: Optional[str] = None,
        stack_trace: Optional[str] = None
    ):
        """Log system error.
        
        Args:
            error_type: Type of error
            message: Error message
            agent: Agent that encountered error (if applicable)
            stack_trace: Optional stack trace
        """
        self._write_event(
            event_type="error",
            data={
                "error_type": error_type,
                "message": message,
                "agent": agent,
                "stack_trace": stack_trace
            }
        )

    def log_alert(
        self,
        level: str,
        component: str,
        message: str,
        metadata: Optional[Dict] = None
    ):
        """Log system alert.
        
        Args:
            level: Alert level (info, warning, error, critical)
            component: System component generating alert
            message: Alert message
            metadata: Additional alert metadata
        """
        log_file = self.base_path / "alerts.jsonl"
        
        log_entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": level,
            "component": component,
            "message": message,
            "metadata": metadata or {}
        }
        
        with self._lock:
            with open(log_file, 'a') as f:
                f.write(json.dumps(log_entry) + "\n")

    def end_session(self, reason: str = "normal_shutdown"):
        """End current session.
        
        Args:
            reason: Reason for session end
        """
        if self.current_session_id:
            duration_seconds = None
            if self.session_start_time:
                duration_seconds = (datetime.utcnow() - self.session_start_time).total_seconds()
            
            self._write_event(
                event_type="session_end",
                data={
                    "reason": reason,
                    "duration_seconds": duration_seconds
                }
            )
            
            self.current_session_id = None
            self.session_start_time = None
            self.session_file = None

    def _write_event(self, event_type: str, data: Dict[str, Any]):
        """Write event to current session log.
        
        Args:
            event_type: Type of event
            data: Event data dictionary
        """
        if not self.session_file:
            # If no session active, create one
            self.start_session()
        
        log_entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "event": event_type,
            "session_id": self.current_session_id,
            **data
        }
        
        with self._lock:
            with open(self.session_file, 'a') as f:
                f.write(json.dumps(log_entry) + "\n")

    def get_recent_sessions(self, limit: int = 10) -> List[Dict]:
        """Get list of recent sessions.
        
        Args:
            limit: Maximum number of sessions to return
            
        Returns:
            List of session info dictionaries
        """
        session_files = sorted(self.sessions_path.glob("session_*.jsonl"), reverse=True)
        
        sessions = []
        for session_file in session_files[:limit]:
            with open(session_file, 'r') as f:
                first_line = f.readline()
                if first_line:
                    session_data = json.loads(first_line)
                    sessions.append({
                        "session_id": session_data.get("session_id"),
                        "timestamp": session_data.get("timestamp"),
                        "user_id": session_data.get("user_id"),
                        "location": session_data.get("location")
                    })
        
        return sessions


# Global logger instance
_logger = None


def get_logger() -> SessionLogger:
    """Get global session logger instance.
    
    Returns:
        SessionLogger instance
    """
    global _logger
    if _logger is None:
        _logger = SessionLogger()
    return _logger


if __name__ == "__main__":
    # Example usage
    logger = SessionLogger()
    
    # Start session
    session_id = logger.start_session(
        user_id="user_12345",
        location="Jamesport, NY"
    )
    print(f"Started session: {session_id}")
    
    # Log boot
    logger.log_boot(
        agents_activated=["ATHENA", "VERA", "IRIS"],
        boot_time_ms=1850.5
    )
    
    # Log request
    logger.log_request(
        user_query="Build a marketing campaign",
        mode="IDEATE",
        agents_invoked=["ATHENA", "BOLT", "SCRIBE"]
    )
    
    # Log agent invocation
    logger.log_agent_invocation(
        agent_name="ATHENA",
        operation="strategic_planning",
        success=True,
        duration_ms=3240.8
    )
    
    # Log mode transition
    logger.log_mode_transition(
        from_mode="IDEATE",
        to_mode="PLAN",
        reason="user_approved_strategy"
    )
    
    # End session
    logger.end_session()
    print("Session ended")
