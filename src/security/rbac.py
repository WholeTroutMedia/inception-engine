"""
Role-Based Access Control (RBAC) for Inception Engine.
Supports hierarchical roles, permissions, team/org structures.
"""

from typing import Optional, Dict, Any, Set
from dataclasses import dataclass, field
from enum import Enum
from functools import wraps


class Permission(str, Enum):
    # Agent permissions
    AGENT_READ = "agent:read"
    AGENT_WRITE = "agent:write"
    AGENT_EXECUTE = "agent:execute"
    AGENT_DELETE = "agent:delete"
    # Pipeline permissions
    PIPELINE_READ = "pipeline:read"
    PIPELINE_WRITE = "pipeline:write"
    PIPELINE_EXECUTE = "pipeline:execute"
    PIPELINE_DELETE = "pipeline:delete"
    # Data permissions
    DATA_READ = "data:read"
    DATA_WRITE = "data:write"
    DATA_EXPORT = "data:export"
    DATA_DELETE = "data:delete"
    # Admin permissions
    ADMIN_USERS = "admin:users"
    ADMIN_ROLES = "admin:roles"
    ADMIN_SETTINGS = "admin:settings"
    ADMIN_AUDIT = "admin:audit"
    ADMIN_BILLING = "admin:billing"
    # Team/Org permissions
    ORG_MANAGE = "org:manage"
    TEAM_MANAGE = "team:manage"
    TEAM_INVITE = "team:invite"


class RoleLevel(int, Enum):
    """Role hierarchy levels (higher = more access)."""
    VIEWER = 10
    MEMBER = 20
    CONTRIBUTOR = 30
    MANAGER = 40
    ADMIN = 50
    OWNER = 100


@dataclass
class Role:
    """Defines a role with permissions."""
    name: str
    level: RoleLevel
    permissions: Set[Permission]
    description: str = ""
    is_custom: bool = False
    org_id: Optional[str] = None


@dataclass
class Organization:
    """Represents an organization."""
    org_id: str
    name: str
    owner_id: str
    members: Dict[str, str] = field(default_factory=dict)  # user_id -> role_name
    teams: Dict[str, "Team"] = field(default_factory=dict)
    custom_roles: Dict[str, Role] = field(default_factory=dict)
    settings: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Team:
    """Represents a team within an organization."""
    team_id: str
    name: str
    org_id: str
    members: Dict[str, str] = field(default_factory=dict)  # user_id -> role_name
    description: str = ""


# Default role definitions
DEFAULT_ROLES: Dict[str, Role] = {
    "viewer": Role(
        name="viewer",
        level=RoleLevel.VIEWER,
        permissions={
            Permission.AGENT_READ,
            Permission.PIPELINE_READ,
            Permission.DATA_READ,
        },
        description="Read-only access to agents, pipelines, and data.",
    ),
    "member": Role(
        name="member",
        level=RoleLevel.MEMBER,
        permissions={
            Permission.AGENT_READ, Permission.AGENT_EXECUTE,
            Permission.PIPELINE_READ, Permission.PIPELINE_EXECUTE,
            Permission.DATA_READ,
        },
        description="Can view and execute agents and pipelines.",
    ),
    "contributor": Role(
        name="contributor",
        level=RoleLevel.CONTRIBUTOR,
        permissions={
            Permission.AGENT_READ, Permission.AGENT_WRITE, Permission.AGENT_EXECUTE,
            Permission.PIPELINE_READ, Permission.PIPELINE_WRITE, Permission.PIPELINE_EXECUTE,
            Permission.DATA_READ, Permission.DATA_WRITE,
        },
        description="Can create and modify agents, pipelines, and data.",
    ),
    "admin": Role(
        name="admin",
        level=RoleLevel.ADMIN,
        permissions={
            Permission.AGENT_READ, Permission.AGENT_WRITE,
            Permission.AGENT_EXECUTE, Permission.AGENT_DELETE,
            Permission.PIPELINE_READ, Permission.PIPELINE_WRITE,
            Permission.PIPELINE_EXECUTE, Permission.PIPELINE_DELETE,
            Permission.DATA_READ, Permission.DATA_WRITE,
            Permission.DATA_EXPORT, Permission.DATA_DELETE,
            Permission.ADMIN_USERS, Permission.ADMIN_ROLES,
            Permission.ADMIN_SETTINGS, Permission.ADMIN_AUDIT,
            Permission.TEAM_MANAGE, Permission.TEAM_INVITE,
        },
        description="Full admin access except billing and org ownership.",
    ),
    "owner": Role(
        name="owner",
        level=RoleLevel.OWNER,
        permissions=set(Permission),
        description="Full access including billing and org management.",
    ),
}


class RBACManager:
    """Manages role-based access control."""

    def __init__(self):
        self._roles: Dict[str, Role] = dict(DEFAULT_ROLES)
        self._user_roles: Dict[str, Set[str]] = {}
        self._organizations: Dict[str, Organization] = {}

    # ── Role Management ──────────────────────────────────

    def create_custom_role(
        self,
        name: str,
        level: RoleLevel,
        permissions: Set[Permission],
        description: str = "",
        org_id: Optional[str] = None,
    ) -> Role:
        """Create a custom role."""
        key = f"{org_id}:{name}" if org_id else name
        if key in self._roles:
            raise ValueError(f"Role '{name}' already exists")
        role = Role(
            name=name, level=level, permissions=permissions,
            description=description, is_custom=True, org_id=org_id,
        )
        self._roles[key] = role
        if org_id and org_id in self._organizations:
            self._organizations[org_id].custom_roles[name] = role
        return role

    def get_role(self, name: str, org_id: Optional[str] = None) -> Optional[Role]:
        """Get a role by name, checking org-specific first."""
        if org_id:
            key = f"{org_id}:{name}"
            if key in self._roles:
                return self._roles[key]
        return self._roles.get(name)

    # ── User Role Assignment ─────────────────────────────

    def assign_role(self, user_id: str, role_name: str, org_id: Optional[str] = None) -> None:
        """Assign a role to a user."""
        role = self.get_role(role_name, org_id)
        if not role:
            raise ValueError(f"Role '{role_name}' not found")
        if user_id not in self._user_roles:
            self._user_roles[user_id] = set()
        key = f"{org_id}:{role_name}" if org_id else role_name
        self._user_roles[user_id].add(key)

    def revoke_role(self, user_id: str, role_name: str, org_id: Optional[str] = None) -> bool:
        """Revoke a role from a user."""
        if user_id not in self._user_roles:
            return False
        key = f"{org_id}:{role_name}" if org_id else role_name
        self._user_roles[user_id].discard(key)
        return True

    def get_user_permissions(self, user_id: str) -> Set[Permission]:
        """Get all permissions for a user across all assigned roles."""
        permissions: Set[Permission] = set()
        role_keys = self._user_roles.get(user_id, set())
        for key in role_keys:
            role = self._roles.get(key) or self._roles.get(key.split(":")[-1])
            if role:
                permissions.update(role.permissions)
        return permissions

    def check_permission(self, user_id: str, permission: Permission) -> bool:
        """Check if a user has a specific permission."""
        return permission in self.get_user_permissions(user_id)

    def require_permission(self, permission: Permission):
        """Decorator to enforce permission on a function."""
        def decorator(func):
            @wraps(func)
            async def wrapper(*args, user_id: str = None, **kwargs):
                if not user_id:
                    raise PermissionError("user_id is required")
                if not self.check_permission(user_id, permission):
                    raise PermissionError(
                        f"User '{user_id}' lacks permission '{permission.value}'"
                    )
                return await func(*args, user_id=user_id, **kwargs)
            return wrapper
        return decorator

    # ── Organization Management ──────────────────────────

    def create_organization(self, org_id: str, name: str, owner_id: str) -> Organization:
        """Create a new organization."""
        if org_id in self._organizations:
            raise ValueError(f"Organization '{org_id}' already exists")
        org = Organization(
            org_id=org_id, name=name, owner_id=owner_id,
            members={owner_id: "owner"},
        )
        self._organizations[org_id] = org
        self.assign_role(owner_id, "owner", org_id)
        return org

    def add_org_member(
        self, org_id: str, user_id: str, role_name: str = "member"
    ) -> None:
        """Add a member to an organization."""
        org = self._organizations.get(org_id)
        if not org:
            raise ValueError(f"Organization '{org_id}' not found")
        org.members[user_id] = role_name
        self.assign_role(user_id, role_name, org_id)

    def remove_org_member(self, org_id: str, user_id: str) -> bool:
        """Remove a member from an organization."""
        org = self._organizations.get(org_id)
        if not org or user_id not in org.members:
            return False
        if user_id == org.owner_id:
            raise ValueError("Cannot remove the organization owner")
        role_name = org.members.pop(user_id)
        self.revoke_role(user_id, role_name, org_id)
        return True

    # ── Team Management ──────────────────────────────────

    def create_team(
        self, org_id: str, team_id: str, name: str, description: str = ""
    ) -> Team:
        """Create a team within an organization."""
        org = self._organizations.get(org_id)
        if not org:
            raise ValueError(f"Organization '{org_id}' not found")
        if team_id in org.teams:
            raise ValueError(f"Team '{team_id}' already exists")
        team = Team(
            team_id=team_id, name=name, org_id=org_id, description=description,
        )
        org.teams[team_id] = team
        return team

    def add_team_member(
        self, org_id: str, team_id: str, user_id: str, role_name: str = "member"
    ) -> None:
        """Add a member to a team."""
        org = self._organizations.get(org_id)
        if not org:
            raise ValueError(f"Organization '{org_id}' not found")
        team = org.teams.get(team_id)
        if not team:
            raise ValueError(f"Team '{team_id}' not found")
        if user_id not in org.members:
            raise ValueError(f"User must be an org member first")
        team.members[user_id] = role_name

    def remove_team_member(self, org_id: str, team_id: str, user_id: str) -> bool:
        """Remove a member from a team."""
        org = self._organizations.get(org_id)
        if not org:
            return False
        team = org.teams.get(team_id)
        if not team or user_id not in team.members:
            return False
        del team.members[user_id]
        return True

    def get_user_teams(self, org_id: str, user_id: str) -> list[Team]:
        """Get all teams a user belongs to in an org."""
        org = self._organizations.get(org_id)
        if not org:
            return []
        return [
            team for team in org.teams.values()
            if user_id in team.members
        ]
