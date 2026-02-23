"""
Audit Event Schemas for Inception Engine.
Defines structured audit event types, severity levels,
and schema definitions for the audit logging system.
"""

import time
import uuid
import hashlib
import json
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, field
from enum import Enum


class AuditEventType(str, Enum):
    """Types of audit events."""
    # Authentication
    AUTH_LOGIN = "auth.login"
    AUTH_LOGOUT = "auth.logout"
    AUTH_LOGIN_FAILED = "auth.login_failed"
    AUTH_TOKEN_REFRESH = "auth.token_refresh"
    AUTH_TOKEN_REVOKED = "auth.token_revoked"
    AUTH_PASSWORD_CHANGE = "auth.password_change"
    AUTH_MFA_ENABLED = "auth.mfa_enabled"

    # Authorization
    AUTHZ_PERMISSION_CHECK = "authz.permission_check"
    AUTHZ_ACCESS_DENIED = "authz.access_denied"
    AUTHZ_ROLE_ASSIGNED = "authz.role_assigned"
    AUTHZ_ROLE_REVOKED = "authz.role_revoked"
    AUTHZ_ROLE_CREATED = "authz.role_created"

    # Data Access
    DATA_READ = "data.read"
    DATA_WRITE = "data.write"
    DATA_DELETE = "data.delete"
    DATA_EXPORT = "data.export"

    # Agent Execution
    AGENT_EXECUTE = "agent.execute"
    AGENT_COMPLETE = "agent.complete"
    AGENT_FAIL = "agent.fail"
    AGENT_CONSTITUTIONAL_CHECK = "agent.constitutional_check"

    # Mode Transitions
    MODE_TRANSITION = "mode.transition"
    MODE_IDEATE = "mode.ideate"
    MODE_PLAN = "mode.plan"
    MODE_SHIP = "mode.ship"
    MODE_VALIDATE = "mode.validate"

    # Configuration
    CONFIG_CHANGE = "config.change"
    CONFIG_AGENT_ACTIVATED = "config.agent_activated"
    CONFIG_AGENT_DEACTIVATED = "config.agent_deactivated"
    CONFIG_CONSTITUTIONAL_AMENDMENT = "config.constitutional_amendment"

    # Security
    SECURITY_PII_DETECTED = "security.pii_detected"
    SECURITY_KEY_ROTATED = "security.key_rotated"
    SECURITY_BREACH_DETECTED = "security.breach_detected"
    SECURITY_RATE_LIMITED = "security.rate_limited"

    # GDPR
    GDPR_DATA_REQUEST = "gdpr.data_request"
    GDPR_DATA_EXPORT = "gdpr.data_export"
    GDPR_DATA_DELETION = "gdpr.data_deletion"
    GDPR_CONSENT_CHANGE = "gdpr.consent_change"

    # System
    SYSTEM_STARTUP = "system.startup"
    SYSTEM_SHUTDOWN = "system.shutdown"
    SYSTEM_ERROR = "system.error"
    SYSTEM_HEALTH_CHECK = "system.health_check"


class AuditSeverity(str, Enum):
    """Severity levels for audit events."""
    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class AuditOutcome(str, Enum):
    """Outcome of an audited action."""
    SUCCESS = "success"
    FAILURE = "failure"
    DENIED = "denied"
    ERROR = "error"
    PARTIAL = "partial"


@dataclass
class AuditEvent:
    """
    A single audit event with full context.
    Designed for structured JSON logging and compliance reporting.
    """
    event_id: str = field(default_factory=lambda: f"evt_{uuid.uuid4().hex[:16]}")
    event_type: AuditEventType = AuditEventType.SYSTEM_HEALTH_CHECK
    severity: AuditSeverity = AuditSeverity.INFO
    timestamp: float = field(default_factory=time.time)

    # Who
    user_id: Optional[str] = None
    user_email: Optional[str] = None
    user_role: Optional[str] = None
    api_key_id: Optional[str] = None

    # What
    action: str = ""
    outcome: AuditOutcome = AuditOutcome.SUCCESS
    description: str = ""

    # Where
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    endpoint: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

    # Context
    metadata: Dict[str, Any] = field(default_factory=dict)
    request_id: Optional[str] = None
    session_id: Optional[str] = None
    org_id: Optional[str] = None

    # Hash chain
    previous_hash: Optional[str] = None
    event_hash: Optional[str] = None

    def compute_hash(self, previous_hash: str = "") -> str:
        """Compute tamper-evident hash for this event."""
        data = json.dumps({
            "event_id": self.event_id,
            "event_type": self.event_type.value,
            "timestamp": self.timestamp,
            "user_id": self.user_id,
            "action": self.action,
            "outcome": self.outcome.value,
            "previous_hash": previous_hash,
        }, sort_keys=True)
        self.previous_hash = previous_hash
        self.event_hash = hashlib.sha256(data.encode()).hexdigest()
        return self.event_hash

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "event_id": self.event_id,
            "event_type": self.event_type.value,
            "severity": self.severity.value,
            "timestamp": self.timestamp,
            "user_id": self.user_id,
            "user_email": self.user_email,
            "user_role": self.user_role,
            "action": self.action,
            "outcome": self.outcome.value,
            "description": self.description,
            "resource_type": self.resource_type,
            "resource_id": self.resource_id,
            "endpoint": self.endpoint,
            "ip_address": self.ip_address,
            "metadata": self.metadata,
            "request_id": self.request_id,
            "session_id": self.session_id,
            "org_id": self.org_id,
            "event_hash": self.event_hash,
            "previous_hash": self.previous_hash,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "AuditEvent":
        """Create an AuditEvent from a dictionary."""
        return cls(
            event_id=data.get("event_id", ""),
            event_type=AuditEventType(data.get("event_type", "system.health_check")),
            severity=AuditSeverity(data.get("severity", "info")),
            timestamp=data.get("timestamp", 0),
            user_id=data.get("user_id"),
            user_email=data.get("user_email"),
            user_role=data.get("user_role"),
            action=data.get("action", ""),
            outcome=AuditOutcome(data.get("outcome", "success")),
            description=data.get("description", ""),
            resource_type=data.get("resource_type"),
            resource_id=data.get("resource_id"),
            endpoint=data.get("endpoint"),
            ip_address=data.get("ip_address"),
            metadata=data.get("metadata", {}),
            request_id=data.get("request_id"),
            session_id=data.get("session_id"),
            org_id=data.get("org_id"),
            event_hash=data.get("event_hash"),
            previous_hash=data.get("previous_hash"),
        )


@dataclass
class AuditQuery:
    """Query parameters for searching audit events."""
    event_type: Optional[AuditEventType] = None
    user_id: Optional[str] = None
    severity: Optional[AuditSeverity] = None
    outcome: Optional[AuditOutcome] = None
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    org_id: Optional[str] = None
    since: Optional[float] = None
    until: Optional[float] = None
    limit: int = 100
    offset: int = 0


@dataclass
class AuditSummary:
    """Summary statistics for audit events."""
    total_events: int = 0
    events_by_type: Dict[str, int] = field(default_factory=dict)
    events_by_severity: Dict[str, int] = field(default_factory=dict)
    events_by_outcome: Dict[str, int] = field(default_factory=dict)
    unique_users: int = 0
    time_range_start: Optional[float] = None
    time_range_end: Optional[float] = None
    chain_integrity_valid: bool = True
