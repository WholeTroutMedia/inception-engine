"""Telemetry Module for Inception Engine

Provides system monitoring, logging, and activity tracking capabilities.

Key Components:
- SessionLogger: Tracks all system activity and agent operations
- System Status: Real-time metrics and health monitoring
- Activity Logs: Session events, memory operations, constitutional reviews

Maintained by: VERA (Memory Operations)
Oversight: KEEPER (Knowledge Architecture)
"""

from .session_logger import SessionLogger, get_logger

__all__ = ["SessionLogger", "get_logger"]
__version__ = "4.0.0"
