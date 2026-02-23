"""
GDPR Compliance Module for Inception Engine.
Handles data subject rights, consent management, data portability, and right to erasure.
"""

import time
import json
import uuid
from typing import Optional, Dict, Any, List, Set
from dataclasses import dataclass, field
from enum import Enum

from .audit_logger import AuditLogger, AuditEventType
from .encryption import EncryptionService
from .pii_detector import PIIDetector


class ConsentPurpose(str, Enum):
    ESSENTIAL = "essential"
    ANALYTICS = "analytics"
    MARKETING = "marketing"
    PERSONALIZATION = "personalization"
    THIRD_PARTY = "third_party"
    AI_TRAINING = "ai_training"
    DATA_SHARING = "data_sharing"


class DataRequestType(str, Enum):
    ACCESS = "access"
    RECTIFICATION = "rectification"
    ERASURE = "erasure"
    PORTABILITY = "portability"
    RESTRICTION = "restriction"
    OBJECTION = "objection"


class RequestStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    DENIED = "denied"
    EXPIRED = "expired"


@dataclass
class ConsentRecord:
    """Records user consent for a specific purpose."""
    consent_id: str
    user_id: str
    purpose: ConsentPurpose
    granted: bool
    timestamp: float
    ip_address: Optional[str] = None
    expires_at: Optional[float] = None
    version: str = "1.0"
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class DataRequest:
    """A GDPR data subject request."""
    request_id: str
    user_id: str
    request_type: DataRequestType
    status: RequestStatus
    created_at: float
    completed_at: Optional[float] = None
    response_data: Optional[Dict[str, Any]] = None
    notes: str = ""
    deadline: Optional[float] = None  # 30-day GDPR deadline


@dataclass
class UserDataExport:
    """Portable data export for a user."""
    user_id: str
    exported_at: float
    data_categories: Dict[str, Any] = field(default_factory=dict)
    format: str = "json"
    checksum: str = ""


class GDPRManager:
    """Manages GDPR compliance features."""

    def __init__(
        self,
        audit_logger: Optional[AuditLogger] = None,
        encryption_service: Optional[EncryptionService] = None,
        pii_detector: Optional[PIIDetector] = None,
        request_deadline_days: int = 30,
    ):
        self.audit = audit_logger or AuditLogger(log_to_file=False)
        self.encryption = encryption_service
        self.pii_detector = pii_detector or PIIDetector()
        self.request_deadline_days = request_deadline_days
        self._consents: Dict[str, Dict[str, ConsentRecord]] = {}
        self._requests: Dict[str, DataRequest] = {}
        self._user_data: Dict[str, Dict[str, Any]] = {}
        self._deletion_log: List[Dict[str, Any]] = []

    # ── Consent Management ───────────────────────────────

    def record_consent(
        self,
        user_id: str,
        purpose: ConsentPurpose,
        granted: bool,
        ip_address: Optional[str] = None,
        version: str = "1.0",
    ) -> ConsentRecord:
        """Record user consent for a specific purpose."""
        record = ConsentRecord(
            consent_id=str(uuid.uuid4()),
            user_id=user_id,
            purpose=purpose,
            granted=granted,
            timestamp=time.time(),
            ip_address=ip_address,
            version=version,
        )
        if user_id not in self._consents:
            self._consents[user_id] = {}
        self._consents[user_id][purpose.value] = record

        self.audit.log(
            event_type=AuditEventType.GDPR_CONSENT_UPDATED,
            action=f"consent {'granted' if granted else 'revoked'}: {purpose.value}",
            user_id=user_id,
            details={"purpose": purpose.value, "granted": granted, "version": version},
        )
        return record

    def check_consent(self, user_id: str, purpose: ConsentPurpose) -> bool:
        """Check if user has granted consent for a purpose."""
        user_consents = self._consents.get(user_id, {})
        record = user_consents.get(purpose.value)
        if not record:
            return False
        if record.expires_at and time.time() > record.expires_at:
            return False
        return record.granted

    def get_user_consents(self, user_id: str) -> Dict[str, ConsentRecord]:
        """Get all consent records for a user."""
        return dict(self._consents.get(user_id, {}))

    def revoke_all_consents(self, user_id: str) -> int:
        """Revoke all non-essential consents for a user."""
        user_consents = self._consents.get(user_id, {})
        count = 0
        for purpose, record in user_consents.items():
            if record.purpose != ConsentPurpose.ESSENTIAL and record.granted:
                record.granted = False
                record.timestamp = time.time()
                count += 1
        return count

    # ── Data Subject Requests ────────────────────────────

    def create_data_request(
        self, user_id: str, request_type: DataRequestType, notes: str = ""
    ) -> DataRequest:
        """Create a new GDPR data subject request."""
        now = time.time()
        request = DataRequest(
            request_id=str(uuid.uuid4()),
            user_id=user_id,
            request_type=request_type,
            status=RequestStatus.PENDING,
            created_at=now,
            notes=notes,
            deadline=now + (self.request_deadline_days * 86400),
        )
        self._requests[request.request_id] = request

        self.audit.log(
            event_type=AuditEventType.GDPR_DATA_REQUEST,
            action=f"data request created: {request_type.value}",
            user_id=user_id,
            details={"request_id": request.request_id, "type": request_type.value},
        )
        return request

    def process_access_request(self, request_id: str) -> Optional[UserDataExport]:
        """Process a data access request (right of access)."""
        request = self._requests.get(request_id)
        if not request or request.request_type != DataRequestType.ACCESS:
            return None

        request.status = RequestStatus.PROCESSING
        export = self.export_user_data(request.user_id)
        request.status = RequestStatus.COMPLETED
        request.completed_at = time.time()
        request.response_data = {"export_categories": list(export.data_categories.keys())}

        self.audit.log(
            event_type=AuditEventType.GDPR_DATA_EXPORTED,
            action="data access request fulfilled",
            user_id=request.user_id,
            details={"request_id": request_id},
        )
        return export

    def process_erasure_request(self, request_id: str) -> bool:
        """Process a data erasure request (right to be forgotten)."""
        request = self._requests.get(request_id)
        if not request or request.request_type != DataRequestType.ERASURE:
            return False

        request.status = RequestStatus.PROCESSING
        deleted = self.delete_user_data(request.user_id)
        request.status = RequestStatus.COMPLETED
        request.completed_at = time.time()
        request.response_data = {"data_deleted": deleted}

        self.audit.log(
            event_type=AuditEventType.GDPR_DATA_DELETED,
            action="data erasure request fulfilled",
            user_id=request.user_id,
            details={"request_id": request_id, "categories_deleted": deleted},
        )
        return True

    # ── Data Portability ─────────────────────────────────

    def export_user_data(self, user_id: str) -> UserDataExport:
        """Export all user data in a portable format."""
        user_data = self._user_data.get(user_id, {})
        consents = {k: {"granted": v.granted, "timestamp": v.timestamp}
                    for k, v in self._consents.get(user_id, {}).items()}

        export = UserDataExport(
            user_id=user_id,
            exported_at=time.time(),
            data_categories={
                "profile": user_data.get("profile", {}),
                "consents": consents,
                "activity": user_data.get("activity", []),
                "preferences": user_data.get("preferences", {}),
                "agents": user_data.get("agents", []),
            },
        )
        return export

    def export_to_json(self, user_id: str) -> str:
        """Export user data as JSON string."""
        export = self.export_user_data(user_id)
        return json.dumps({
            "user_id": export.user_id,
            "exported_at": export.exported_at,
            "data": export.data_categories,
        }, indent=2, default=str)

    # ── Right to Erasure ─────────────────────────────────

    def delete_user_data(self, user_id: str) -> List[str]:
        """Delete all user data (right to be forgotten)."""
        deleted_categories = []

        if user_id in self._user_data:
            deleted_categories = list(self._user_data[user_id].keys())
            del self._user_data[user_id]

        if user_id in self._consents:
            deleted_categories.append("consents")
            del self._consents[user_id]

        self._deletion_log.append({
            "user_id": user_id,
            "deleted_at": time.time(),
            "categories": deleted_categories,
        })
        return deleted_categories

    # ── Data Retention ───────────────────────────────────

    def check_overdue_requests(self) -> List[DataRequest]:
        """Find requests that are past their deadline."""
        now = time.time()
        overdue = []
        for request in self._requests.values():
            if request.status in (RequestStatus.PENDING, RequestStatus.PROCESSING):
                if request.deadline and now > request.deadline:
                    overdue.append(request)
        return overdue

    def get_request_status(self, request_id: str) -> Optional[DataRequest]:
        """Get the status of a data request."""
        return self._requests.get(request_id)

    def get_user_requests(self, user_id: str) -> List[DataRequest]:
        """Get all requests for a user."""
        return [r for r in self._requests.values() if r.user_id == user_id]

    # ── PII Scanning ─────────────────────────────────────

    def scan_user_data_for_pii(self, user_id: str) -> Dict[str, Any]:
        """Scan all stored user data for PII."""
        user_data = self._user_data.get(user_id, {})
        if not user_data:
            return {"user_id": user_id, "has_pii": False, "matches": []}

        matches = self.pii_detector.scan_dict(user_data)
        return {
            "user_id": user_id,
            "has_pii": len(matches) > 0,
            "match_count": len(matches),
            "pii_types": list(set(m.pii_type.value for m in matches)),
        }

    # ── User Data Store ──────────────────────────────────

    def store_user_data(self, user_id: str, category: str, data: Any) -> None:
        """Store user data (for export/deletion tracking)."""
        if user_id not in self._user_data:
            self._user_data[user_id] = {}
        self._user_data[user_id][category] = data
