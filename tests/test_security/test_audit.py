"""Tests for Audit Logging."""
import pytest
import time
from src.security.audit_logger import (
  AuditLogger, AuditEventType, AuditSeverity, AuditEvent,
)


class TestAuditEventType:
  def test_auth_event_types(self):
    assert AuditEventType.AUTH_LOGIN == "auth.login"
    assert AuditEventType.AUTH_LOGOUT == "auth.logout"
    assert AuditEventType.AUTH_LOGIN_FAILED == "auth.login_failed"
    assert AuditEventType.AUTH_TOKEN_REFRESH == "auth.token_refresh"

  def test_data_event_types(self):
    assert AuditEventType.DATA_READ == "data.read"
    assert AuditEventType.DATA_WRITE == "data.write"
    assert AuditEventType.DATA_DELETE == "data.delete"

  def test_security_event_types(self):
    assert AuditEventType.SECURITY_PII_DETECTED == "security.pii_detected"
    assert AuditEventType.SECURITY_RATE_LIMIT_HIT == "security.rate_limit_hit"

  def test_gdpr_event_types(self):
    assert AuditEventType.GDPR_DATA_REQUEST == "gdpr.data_request"
    assert AuditEventType.GDPR_DATA_DELETED == "gdpr.data_deleted"


class TestAuditSeverity:
  def test_severity_levels(self):
    assert AuditSeverity.INFO == "info"
    assert AuditSeverity.WARNING == "warning"
    assert AuditSeverity.ERROR == "error"
    assert AuditSeverity.CRITICAL == "critical"


class TestAuditLogger:
  def test_create_logger(self):
    logger = AuditLogger(log_to_file=False)
    assert logger is not None
    assert logger.event_count == 0

  def test_log_event(self):
    logger = AuditLogger(log_to_file=False)
    event = logger.log(
      event_type=AuditEventType.AUTH_LOGIN,
      action="user login",
      user_id="user_1",
    )
    assert event.event_id is not None
    assert event.event_type == AuditEventType.AUTH_LOGIN
    assert event.user_id == "user_1"
    assert logger.event_count == 1

  def test_log_with_all_fields(self):
    logger = AuditLogger(log_to_file=False)
    event = logger.log(
      event_type=AuditEventType.DATA_WRITE,
      action="update record",
      outcome="success",
      severity=AuditSeverity.INFO,
      user_id="user_1",
      ip_address="192.168.1.1",
      user_agent="TestAgent/1.0",
      resource="/api/data/123",
      details={"field": "name", "old": "a", "new": "b"},
      org_id="org_1",
      session_id="sess_123",
      request_id="req_456",
    )
    assert event.ip_address == "192.168.1.1"
    assert event.resource == "/api/data/123"
    assert event.org_id == "org_1"
    assert event.details["field"] == "name"

  def test_multiple_events(self):
    logger = AuditLogger(log_to_file=False)
    for i in range(5):
      logger.log(
        event_type=AuditEventType.DATA_READ,
        action=f"read {i}",
        user_id="user_1",
      )
    assert logger.event_count == 5

  def test_log_login_success(self):
    logger = AuditLogger(log_to_file=False)
    event = logger.log_login("user_1", "10.0.0.1", provider="google", success=True)
    assert event.event_type == AuditEventType.AUTH_LOGIN
    assert event.outcome == "success"
    assert event.details["provider"] == "google"

  def test_log_login_failure(self):
    logger = AuditLogger(log_to_file=False)
    event = logger.log_login("user_1", "10.0.0.1", success=False)
    assert event.event_type == AuditEventType.AUTH_LOGIN_FAILED
    assert event.outcome == "failed"
    assert event.severity == AuditSeverity.WARNING

  def test_log_logout(self):
    logger = AuditLogger(log_to_file=False)
    event = logger.log_logout("user_1", "sess_abc")
    assert event.event_type == AuditEventType.AUTH_LOGOUT
    assert event.session_id == "sess_abc"

  def test_log_permission_denied(self):
    logger = AuditLogger(log_to_file=False)
    event = logger.log_permission_denied("user_1", "admin.write", "/api/admin")
    assert event.event_type == AuditEventType.AUTHZ_PERMISSION_DENIED
    assert event.outcome == "denied"
    assert event.severity == AuditSeverity.WARNING
    assert event.details["permission"] == "admin.write"

  def test_log_data_access(self):
    logger = AuditLogger(log_to_file=False)
    event = logger.log_data_access("user_1", "/api/records", action="read")
    assert event.event_type == AuditEventType.DATA_READ
    event_w = logger.log_data_access("user_1", "/api/records", action="write")
    assert event_w.event_type == AuditEventType.DATA_WRITE
    event_d = logger.log_data_access("user_1", "/api/records", action="delete")
    assert event_d.event_type == AuditEventType.DATA_DELETE

  def test_log_pii_detected(self):
    logger = AuditLogger(log_to_file=False)
    event = logger.log_pii_detected("user_1", ["email", "ssn"], "/api/input")
    assert event.event_type == AuditEventType.SECURITY_PII_DETECTED
    assert event.severity == AuditSeverity.WARNING
    assert "email" in event.details["pii_types"]

  def test_log_suspicious_activity(self):
    logger = AuditLogger(log_to_file=False)
    event = logger.log_suspicious_activity("user_1", "10.0.0.1", "brute force")
    assert event.event_type == AuditEventType.SECURITY_SUSPICIOUS_ACTIVITY
    assert event.severity == AuditSeverity.CRITICAL
    assert event.details["reason"] == "brute force"


class TestAuditLoggerQueries:
  def _create_populated_logger(self):
    logger = AuditLogger(log_to_file=False)
    logger.log_login("user_1", "10.0.0.1", success=True)
    logger.log_login("user_2", "10.0.0.2", success=False)
    logger.log_data_access("user_1", "/api/data", action="read")
    logger.log_permission_denied("user_2", "admin", "/api/admin")
    logger.log_pii_detected("user_1", ["email"], "/input")
    return logger

  def test_get_events_all(self):
    logger = self._create_populated_logger()
    events = logger.get_events()
    assert len(events) == 5

  def test_get_events_by_type(self):
    logger = self._create_populated_logger()
    events = logger.get_events(event_type=AuditEventType.AUTH_LOGIN)
    assert len(events) == 1
    assert events[0].event_type == AuditEventType.AUTH_LOGIN

  def test_get_events_by_user(self):
    logger = self._create_populated_logger()
    events = logger.get_events(user_id="user_1")
    assert len(events) == 3

  def test_get_events_by_severity(self):
    logger = self._create_populated_logger()
    events = logger.get_events(severity=AuditSeverity.WARNING)
    assert len(events) >= 2

  def test_get_events_with_limit(self):
    logger = self._create_populated_logger()
    events = logger.get_events(limit=2)
    assert len(events) == 2

  def test_get_user_activity(self):
    logger = self._create_populated_logger()
    activity = logger.get_user_activity("user_1")
    assert len(activity) == 3
    assert all(e.user_id == "user_1" for e in activity)

  def test_get_security_events(self):
    logger = self._create_populated_logger()
    sec_events = logger.get_security_events()
    assert len(sec_events) >= 2


class TestAuditEvent:
  def test_to_dict(self):
    logger = AuditLogger(log_to_file=False)
    event = logger.log(
      event_type=AuditEventType.AUTH_LOGIN,
      action="login",
      user_id="user_1",
    )
    d = event.to_dict()
    assert "event_id" in d
    assert "timestamp" in d
    assert d["user_id"] == "user_1"

  def test_to_json(self):
    logger = AuditLogger(log_to_file=False)
    event = logger.log(
      event_type=AuditEventType.AUTH_LOGIN,
      action="login",
      user_id="user_1",
    )
    j = event.to_json()
    assert "auth.login" in j
    assert "user_1" in j


class TestAuditExport:
  def test_export_events(self):
    logger = AuditLogger(log_to_file=False)
    for i in range(3):
      logger.log(
        event_type=AuditEventType.DATA_READ,
        action=f"read {i}",
        user_id="user_1",
      )
    exported = logger.export_events()
    assert len(exported) == 3
    assert all(isinstance(e, dict) for e in exported)

  def test_max_memory_events(self):
    logger = AuditLogger(max_memory_events=5, log_to_file=False)
    for i in range(10):
      logger.log(
        event_type=AuditEventType.DATA_READ,
        action=f"read {i}",
      )
    assert logger.event_count == 5

  def test_export_with_time_filter(self):
    logger = AuditLogger(log_to_file=False)
    logger.log(
      event_type=AuditEventType.DATA_READ,
      action="old read",
    )
    cutoff = time.time()
    time.sleep(0.01)
    logger.log(
      event_type=AuditEventType.DATA_WRITE,
      action="new write",
    )
    exported = logger.export_events(since=cutoff)
    assert len(exported) == 1
