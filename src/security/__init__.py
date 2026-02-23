"""Inception Engine Security Module

HELIX EPSILON - Enterprise security hardening.
Provides OAuth 2.0, RBAC, encryption, PII detection,
audit logging, GDPR compliance, and key management.
"""

# Phase 1: Authentication & Authorization
from .jwt_handler import JWTHandler, TokenPair
from .oauth import OAuthProvider, OAuthConfig
from .sso import SSOManager
from .rbac import RBACManager, Role, Permission, RoleLevel
from .middleware import SecurityMiddleware, require_auth, require_role
from .permissions import (
    PermissionDenied,
    InsufficientRole,
    require_permission,
    require_any_permission,
    require_all_permissions,
    require_role_level,
    require_org_membership,
    require_resource_owner,
    APIKeyScope,
    get_scope_permissions,
)

# Phase 2: Encryption & Data Protection
from .encryption import EncryptionManager
from .key_management import (
    KeyRotationManager,
    KeyStatus,
    KMSProvider,
    KeyMetadata,
    EncryptedDataKey,
)

# Phase 3: PII Detection
from .pii_detector import PIIDetector
from .pii_scrubber import PIIScrubber, RedactionStrategy, ScrubResult
from .pii_config import (
    SensitivityLevel,
    PIICategory,
    PIISeverity,
    PIIDetectionConfig,
    get_default_config,
    get_rules_for_sensitivity,
)

# Phase 4: Audit Logging
from .audit_logger import AuditLogger, AuditEvent
from .audit_models import (
    AuditEventType,
    AuditSeverity,
    AuditOutcome,
    AuditQuery,
    AuditSummary,
)
from .audit_storage import AuditStorage, StorageBackend, ExportFormat

# Phase 5: GDPR Compliance
from .gdpr import GDPRManager

__all__ = [
    # Auth
    "JWTHandler",
    "TokenPair",
    "OAuthProvider",
    "OAuthConfig",
    "SSOManager",
    # RBAC
    "RBACManager",
    "Role",
    "Permission",
    "RoleLevel",
    "SecurityMiddleware",
    "require_auth",
    "require_role",
    # Permissions
    "PermissionDenied",
    "InsufficientRole",
    "require_permission",
    "require_any_permission",
    "require_all_permissions",
    "require_role_level",
    "require_org_membership",
    "require_resource_owner",
    "APIKeyScope",
    "get_scope_permissions",
    # Encryption
    "EncryptionManager",
    "KeyRotationManager",
    "KeyStatus",
    "KMSProvider",
    "KeyMetadata",
    "EncryptedDataKey",
    # PII
    "PIIDetector",
    "PIIScrubber",
    "RedactionStrategy",
    "ScrubResult",
    "SensitivityLevel",
    "PIICategory",
    "PIISeverity",
    "PIIDetectionConfig",
    "get_default_config",
    "get_rules_for_sensitivity",
    # Audit
    "AuditLogger",
    "AuditEvent",
    "AuditEventType",
    "AuditSeverity",
    "AuditOutcome",
    "AuditQuery",
    "AuditSummary",
    "AuditStorage",
    "StorageBackend",
    "ExportFormat",
    # GDPR
    "GDPRManager",
]

__version__ = "1.0.0"
