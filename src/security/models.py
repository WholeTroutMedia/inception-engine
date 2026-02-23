"""
Pydantic models for security API endpoints in Inception Engine.
Request/response schemas for auth, RBAC, GDPR, and audit endpoints.
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, EmailStr
from enum import Enum


# ── Auth Models ──────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str = Field(..., description="User email")
    password: str = Field(..., min_length=8, description="User password")


class OAuthCallbackRequest(BaseModel):
    code: str = Field(..., description="OAuth authorization code")
    state: str = Field(..., description="OAuth state parameter")
    provider: str = Field(..., description="OAuth provider name")


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    user_id: str
    email: str
    name: str
    provider: Optional[str] = None
    avatar_url: Optional[str] = None
    roles: List[str] = []
    permissions: List[str] = []


# ── RBAC Models ──────────────────────────────────────────

class RoleCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=50)
    level: int = Field(..., ge=1, le=100)
    permissions: List[str]
    description: str = ""


class RoleResponse(BaseModel):
    name: str
    level: int
    permissions: List[str]
    description: str
    is_custom: bool


class RoleAssignRequest(BaseModel):
    user_id: str
    role_name: str
    org_id: Optional[str] = None


class PermissionCheckRequest(BaseModel):
    user_id: str
    permission: str


class PermissionCheckResponse(BaseModel):
    user_id: str
    permission: str
    granted: bool


# ── Organization Models ──────────────────────────────────

class OrgCreateRequest(BaseModel):
    org_id: str = Field(..., min_length=2, max_length=50)
    name: str = Field(..., min_length=2, max_length=100)


class OrgMemberRequest(BaseModel):
    user_id: str
    role_name: str = "member"


class TeamCreateRequest(BaseModel):
    team_id: str = Field(..., min_length=2, max_length=50)
    name: str = Field(..., min_length=2, max_length=100)
    description: str = ""


class TeamMemberRequest(BaseModel):
    user_id: str
    role_name: str = "member"


class OrgResponse(BaseModel):
    org_id: str
    name: str
    owner_id: str
    member_count: int
    team_count: int


class TeamResponse(BaseModel):
    team_id: str
    name: str
    org_id: str
    member_count: int
    description: str


# ── GDPR Models ──────────────────────────────────────────

class ConsentRequest(BaseModel):
    purpose: str
    granted: bool


class ConsentResponse(BaseModel):
    consent_id: str
    purpose: str
    granted: bool
    timestamp: float
    version: str


class DataRequestCreate(BaseModel):
    request_type: str = Field(..., description="Type: access, erasure, portability, rectification")
    notes: str = ""


class DataRequestResponse(BaseModel):
    request_id: str
    request_type: str
    status: str
    created_at: float
    completed_at: Optional[float] = None
    deadline: Optional[float] = None


class DataExportResponse(BaseModel):
    user_id: str
    exported_at: float
    categories: List[str]
    format: str = "json"


# ── Audit Models ─────────────────────────────────────────

class AuditEventResponse(BaseModel):
    event_id: str
    event_type: str
    severity: str
    timestamp: float
    user_id: Optional[str]
    action: str
    outcome: str
    resource: Optional[str] = None
    ip_address: Optional[str] = None


class AuditQueryRequest(BaseModel):
    event_type: Optional[str] = None
    user_id: Optional[str] = None
    severity: Optional[str] = None
    since: Optional[float] = None
    limit: int = Field(default=100, le=1000)


# ── Security Status Models ───────────────────────────────

class SecurityStatusResponse(BaseModel):
    encryption_enabled: bool
    tls_enforced: bool
    pii_detection_active: bool
    audit_logging_active: bool
    rate_limiting_active: bool
    active_sessions: int
    recent_security_events: int


class PIIScanRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=50000)


class PIIScanResponse(BaseModel):
    has_pii: bool
    match_count: int
    highest_severity: Optional[str] = None
    pii_types: List[str] = []
    redacted_text: str


class HealthCheckResponse(BaseModel):
    status: str = "healthy"
    version: str
    security_modules: Dict[str, bool]
