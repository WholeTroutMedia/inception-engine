"""Tests for GDPR Compliance Module."""
import pytest
import time
from src.security.gdpr import (
  GDPRManager, ConsentPurpose, DataRequestType,
  RequestStatus, ConsentRecord, DataRequest, UserDataExport,
)
from src.security.audit_logger import AuditLogger


class TestConsentPurpose:
  def test_purpose_values(self):
    assert ConsentPurpose.ESSENTIAL == "essential"
    assert ConsentPurpose.ANALYTICS == "analytics"
    assert ConsentPurpose.MARKETING == "marketing"
    assert ConsentPurpose.PERSONALIZATION == "personalization"
    assert ConsentPurpose.THIRD_PARTY == "third_party"
    assert ConsentPurpose.AI_TRAINING == "ai_training"
    assert ConsentPurpose.DATA_SHARING == "data_sharing"


class TestDataRequestType:
  def test_request_types(self):
    assert DataRequestType.ACCESS == "access"
    assert DataRequestType.RECTIFICATION == "rectification"
    assert DataRequestType.ERASURE == "erasure"
    assert DataRequestType.PORTABILITY == "portability"
    assert DataRequestType.RESTRICTION == "restriction"
    assert DataRequestType.OBJECTION == "objection"


class TestRequestStatus:
  def test_status_values(self):
    assert RequestStatus.PENDING == "pending"
    assert RequestStatus.PROCESSING == "processing"
    assert RequestStatus.COMPLETED == "completed"
    assert RequestStatus.DENIED == "denied"
    assert RequestStatus.EXPIRED == "expired"


class TestConsentManagement:
  def _make_manager(self):
    audit = AuditLogger(log_to_file=False)
    return GDPRManager(audit_logger=audit)

  def test_record_consent_granted(self):
    mgr = self._make_manager()
    record = mgr.record_consent(
      user_id="user_1",
      purpose=ConsentPurpose.ANALYTICS,
      granted=True,
      ip_address="10.0.0.1",
    )
    assert record.consent_id is not None
    assert record.user_id == "user_1"
    assert record.purpose == ConsentPurpose.ANALYTICS
    assert record.granted is True

  def test_record_consent_revoked(self):
    mgr = self._make_manager()
    record = mgr.record_consent(
      user_id="user_1",
      purpose=ConsentPurpose.MARKETING,
      granted=False,
    )
    assert record.granted is False

  def test_check_consent_granted(self):
    mgr = self._make_manager()
    mgr.record_consent("user_1", ConsentPurpose.ANALYTICS, True)
    assert mgr.check_consent("user_1", ConsentPurpose.ANALYTICS) is True

  def test_check_consent_not_granted(self):
    mgr = self._make_manager()
    assert mgr.check_consent("user_1", ConsentPurpose.MARKETING) is False

  def test_check_consent_revoked(self):
    mgr = self._make_manager()
    mgr.record_consent("user_1", ConsentPurpose.ANALYTICS, True)
    mgr.record_consent("user_1", ConsentPurpose.ANALYTICS, False)
    assert mgr.check_consent("user_1", ConsentPurpose.ANALYTICS) is False

  def test_get_user_consents(self):
    mgr = self._make_manager()
    mgr.record_consent("user_1", ConsentPurpose.ANALYTICS, True)
    mgr.record_consent("user_1", ConsentPurpose.MARKETING, False)
    consents = mgr.get_user_consents("user_1")
    assert len(consents) == 2
    assert "analytics" in consents
    assert "marketing" in consents

  def test_get_user_consents_empty(self):
    mgr = self._make_manager()
    consents = mgr.get_user_consents("nonexistent_user")
    assert len(consents) == 0

  def test_revoke_all_consents(self):
    mgr = self._make_manager()
    mgr.record_consent("user_1", ConsentPurpose.ESSENTIAL, True)
    mgr.record_consent("user_1", ConsentPurpose.ANALYTICS, True)
    mgr.record_consent("user_1", ConsentPurpose.MARKETING, True)
    count = mgr.revoke_all_consents("user_1")
    assert count == 2
    assert mgr.check_consent("user_1", ConsentPurpose.ESSENTIAL) is True
    assert mgr.check_consent("user_1", ConsentPurpose.ANALYTICS) is False
    assert mgr.check_consent("user_1", ConsentPurpose.MARKETING) is False

  def test_consent_versioning(self):
    mgr = self._make_manager()
    record = mgr.record_consent(
      "user_1", ConsentPurpose.ANALYTICS, True, version="2.0"
    )
    assert record.version == "2.0"


class TestDataSubjectRequests:
  def _make_manager(self):
    audit = AuditLogger(log_to_file=False)
    return GDPRManager(audit_logger=audit)

  def test_create_access_request(self):
    mgr = self._make_manager()
    req = mgr.create_data_request(
      user_id="user_1",
      request_type=DataRequestType.ACCESS,
      notes="Full data export requested",
    )
    assert req.request_id is not None
    assert req.user_id == "user_1"
    assert req.request_type == DataRequestType.ACCESS
    assert req.status == RequestStatus.PENDING
    assert req.deadline is not None

  def test_create_erasure_request(self):
    mgr = self._make_manager()
    req = mgr.create_data_request("user_1", DataRequestType.ERASURE)
    assert req.request_type == DataRequestType.ERASURE
    assert req.status == RequestStatus.PENDING

  def test_get_request_status(self):
    mgr = self._make_manager()
    req = mgr.create_data_request("user_1", DataRequestType.ACCESS)
    status = mgr.get_request_status(req.request_id)
    assert status is not None
    assert status.status == RequestStatus.PENDING

  def test_get_request_status_not_found(self):
    mgr = self._make_manager()
    assert mgr.get_request_status("nonexistent_id") is None

  def test_get_user_requests(self):
    mgr = self._make_manager()
    mgr.create_data_request("user_1", DataRequestType.ACCESS)
    mgr.create_data_request("user_1", DataRequestType.ERASURE)
    mgr.create_data_request("user_2", DataRequestType.ACCESS)
    requests = mgr.get_user_requests("user_1")
    assert len(requests) == 2

  def test_process_access_request(self):
    mgr = self._make_manager()
    mgr.store_user_data("user_1", "profile", {"name": "Test User"})
    req = mgr.create_data_request("user_1", DataRequestType.ACCESS)
    export = mgr.process_access_request(req.request_id)
    assert export is not None
    assert export.user_id == "user_1"
    assert "profile" in export.data_categories
    updated = mgr.get_request_status(req.request_id)
    assert updated.status == RequestStatus.COMPLETED

  def test_process_access_request_wrong_type(self):
    mgr = self._make_manager()
    req = mgr.create_data_request("user_1", DataRequestType.ERASURE)
    result = mgr.process_access_request(req.request_id)
    assert result is None

  def test_process_erasure_request(self):
    mgr = self._make_manager()
    mgr.store_user_data("user_1", "profile", {"name": "Test"})
    mgr.record_consent("user_1", ConsentPurpose.ANALYTICS, True)
    req = mgr.create_data_request("user_1", DataRequestType.ERASURE)
    result = mgr.process_erasure_request(req.request_id)
    assert result is True
    updated = mgr.get_request_status(req.request_id)
    assert updated.status == RequestStatus.COMPLETED

  def test_process_erasure_request_wrong_type(self):
    mgr = self._make_manager()
    req = mgr.create_data_request("user_1", DataRequestType.ACCESS)
    result = mgr.process_erasure_request(req.request_id)
    assert result is False

  def test_request_deadline(self):
    mgr = self._make_manager()
    req = mgr.create_data_request("user_1", DataRequestType.ACCESS)
    assert req.deadline > req.created_at
    expected_days = 30 * 86400
    assert abs((req.deadline - req.created_at) - expected_days) < 1


class TestDataPortability:
  def _make_manager(self):
    audit = AuditLogger(log_to_file=False)
    return GDPRManager(audit_logger=audit)

  def test_export_user_data(self):
    mgr = self._make_manager()
    mgr.store_user_data("user_1", "profile", {"name": "Test User"})
    mgr.store_user_data("user_1", "preferences", {"theme": "dark"})
    export = mgr.export_user_data("user_1")
    assert export.user_id == "user_1"
    assert export.data_categories["profile"]["name"] == "Test User"
    assert export.data_categories["preferences"]["theme"] == "dark"

  def test_export_user_data_empty(self):
    mgr = self._make_manager()
    export = mgr.export_user_data("nonexistent_user")
    assert export.user_id == "nonexistent_user"
    assert export.data_categories["profile"] == {}

  def test_export_includes_consents(self):
    mgr = self._make_manager()
    mgr.record_consent("user_1", ConsentPurpose.ANALYTICS, True)
    export = mgr.export_user_data("user_1")
    assert "consents" in export.data_categories
    assert "analytics" in export.data_categories["consents"]

  def test_export_to_json(self):
    mgr = self._make_manager()
    mgr.store_user_data("user_1", "profile", {"name": "Test"})
    json_str = mgr.export_to_json("user_1")
    assert "user_1" in json_str
    assert "Test" in json_str


class TestRightToErasure:
  def _make_manager(self):
    audit = AuditLogger(log_to_file=False)
    return GDPRManager(audit_logger=audit)

  def test_delete_user_data(self):
    mgr = self._make_manager()
    mgr.store_user_data("user_1", "profile", {"name": "Test"})
    mgr.store_user_data("user_1", "activity", [{"action": "login"}])
    deleted = mgr.delete_user_data("user_1")
    assert "profile" in deleted
    assert "activity" in deleted

  def test_delete_removes_consents(self):
    mgr = self._make_manager()
    mgr.record_consent("user_1", ConsentPurpose.ANALYTICS, True)
    deleted = mgr.delete_user_data("user_1")
    assert "consents" in deleted
    assert mgr.check_consent("user_1", ConsentPurpose.ANALYTICS) is False

  def test_delete_nonexistent_user(self):
    mgr = self._make_manager()
    deleted = mgr.delete_user_data("nonexistent")
    assert len(deleted) == 0

  def test_deletion_is_logged(self):
    mgr = self._make_manager()
    mgr.store_user_data("user_1", "profile", {"name": "Test"})
    mgr.delete_user_data("user_1")
    assert len(mgr._deletion_log) == 1
    assert mgr._deletion_log[0]["user_id"] == "user_1"


class TestOverdueRequests:
  def _make_manager(self):
    audit = AuditLogger(log_to_file=False)
    return GDPRManager(audit_logger=audit, request_deadline_days=0)

  def test_check_overdue_requests(self):
    mgr = self._make_manager()
    mgr.create_data_request("user_1", DataRequestType.ACCESS)
    time.sleep(0.01)
    overdue = mgr.check_overdue_requests()
    assert len(overdue) >= 1

  def test_completed_requests_not_overdue(self):
    mgr = self._make_manager()
    req = mgr.create_data_request("user_1", DataRequestType.ACCESS)
    mgr.process_access_request(req.request_id)
    time.sleep(0.01)
    overdue = mgr.check_overdue_requests()
    assert len(overdue) == 0


class TestUserDataStore:
  def _make_manager(self):
    audit = AuditLogger(log_to_file=False)
    return GDPRManager(audit_logger=audit)

  def test_store_and_retrieve(self):
    mgr = self._make_manager()
    mgr.store_user_data("user_1", "profile", {"name": "Test"})
    export = mgr.export_user_data("user_1")
    assert export.data_categories["profile"]["name"] == "Test"

  def test_store_multiple_categories(self):
    mgr = self._make_manager()
    mgr.store_user_data("user_1", "profile", {"name": "Test"})
    mgr.store_user_data("user_1", "preferences", {"theme": "dark"})
    export = mgr.export_user_data("user_1")
    assert "profile" in export.data_categories
    assert "preferences" in export.data_categories

  def test_overwrite_category(self):
    mgr = self._make_manager()
    mgr.store_user_data("user_1", "profile", {"name": "Old"})
    mgr.store_user_data("user_1", "profile", {"name": "New"})
    export = mgr.export_user_data("user_1")
    assert export.data_categories["profile"]["name"] == "New"
