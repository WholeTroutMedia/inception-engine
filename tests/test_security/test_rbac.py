"""Tests for RBAC (Role-Based Access Control) and Permissions."""
import pytest
from src.security.rbac import (
    RBACManager, Permission, RoleLevel, Role,
    Organization, Team, DEFAULT_ROLES,
)
from src.security.permissions import (
    PermissionDenied, InsufficientRole,
    require_permission, require_any_permission,
    require_all_permissions, require_role_level,
    get_rbac_manager, set_rbac_manager,
    APIKeyScope, get_scope_permissions,
    check_api_key_permission, list_all_permissions,
    get_permissions_by_category,
)


class TestPermissionEnum:
    def test_agent_permissions_exist(self):
        assert Permission.AGENT_READ == "agent:read"
        assert Permission.AGENT_WRITE == "agent:write"
        assert Permission.AGENT_EXECUTE == "agent:execute"
        assert Permission.AGENT_DELETE == "agent:delete"

    def test_pipeline_permissions_exist(self):
        assert Permission.PIPELINE_READ == "pipeline:read"
        assert Permission.PIPELINE_WRITE == "pipeline:write"
        assert Permission.PIPELINE_EXECUTE == "pipeline:execute"

    def test_data_permissions_exist(self):
        assert Permission.DATA_READ == "data:read"
        assert Permission.DATA_WRITE == "data:write"
        assert Permission.DATA_EXPORT == "data:export"
        assert Permission.DATA_DELETE == "data:delete"

    def test_admin_permissions_exist(self):
        assert Permission.ADMIN_USERS == "admin:users"
        assert Permission.ADMIN_ROLES == "admin:roles"
        assert Permission.ADMIN_SETTINGS == "admin:settings"
        assert Permission.ADMIN_AUDIT == "admin:audit"
        assert Permission.ADMIN_BILLING == "admin:billing"


class TestRoleLevel:
    def test_role_hierarchy(self):
        assert RoleLevel.VIEWER < RoleLevel.MEMBER
        assert RoleLevel.MEMBER < RoleLevel.CONTRIBUTOR
        assert RoleLevel.CONTRIBUTOR < RoleLevel.MANAGER
        assert RoleLevel.MANAGER < RoleLevel.ADMIN
        assert RoleLevel.ADMIN < RoleLevel.OWNER

    def test_role_level_values(self):
        assert RoleLevel.VIEWER == 10
        assert RoleLevel.OWNER == 100


class TestDefaultRoles:
    def test_viewer_role(self):
        viewer = DEFAULT_ROLES["viewer"]
        assert viewer.level == RoleLevel.VIEWER
        assert Permission.AGENT_READ in viewer.permissions
        assert Permission.AGENT_WRITE not in viewer.permissions

    def test_admin_role(self):
        admin = DEFAULT_ROLES["admin"]
        assert admin.level == RoleLevel.ADMIN
        assert Permission.ADMIN_USERS in admin.permissions
        assert Permission.AGENT_DELETE in admin.permissions

    def test_owner_has_all_permissions(self):
        owner = DEFAULT_ROLES["owner"]
        assert owner.level == RoleLevel.OWNER
        for perm in Permission:
            assert perm in owner.permissions

    def test_member_can_execute_not_write(self):
        member = DEFAULT_ROLES["member"]
        assert Permission.AGENT_EXECUTE in member.permissions
        assert Permission.AGENT_WRITE not in member.permissions


class TestRBACManager:
    def test_init_has_default_roles(self):
        mgr = RBACManager()
        assert mgr.get_role("viewer") is not None
        assert mgr.get_role("admin") is not None
        assert mgr.get_role("owner") is not None

    def test_assign_role(self):
        mgr = RBACManager()
        mgr.assign_role("user_1", "admin")
        perms = mgr.get_user_permissions("user_1")
        assert Permission.ADMIN_USERS in perms

    def test_revoke_role(self):
        mgr = RBACManager()
        mgr.assign_role("user_1", "admin")
        mgr.revoke_role("user_1", "admin")
        perms = mgr.get_user_permissions("user_1")
        assert Permission.ADMIN_USERS not in perms

    def test_check_permission(self):
        mgr = RBACManager()
        mgr.assign_role("user_1", "viewer")
        assert mgr.check_permission("user_1", Permission.AGENT_READ)
        assert not mgr.check_permission("user_1", Permission.AGENT_WRITE)

    def test_create_custom_role(self):
        mgr = RBACManager()
        role = mgr.create_custom_role(
            name="tester",
            level=RoleLevel.CONTRIBUTOR,
            permissions={Permission.AGENT_READ, Permission.AGENT_EXECUTE},
            description="Custom tester role",
        )
        assert role.is_custom
        assert role.name == "tester"
        mgr.assign_role("user_1", "tester")
        assert mgr.check_permission("user_1", Permission.AGENT_EXECUTE)

    def test_duplicate_custom_role_raises(self):
        mgr = RBACManager()
        mgr.create_custom_role(
            name="custom1", level=RoleLevel.MEMBER,
            permissions={Permission.DATA_READ},
        )
        with pytest.raises(ValueError):
            mgr.create_custom_role(
                name="custom1", level=RoleLevel.MEMBER,
                permissions={Permission.DATA_READ},
            )

    def test_get_role_with_org(self):
        mgr = RBACManager()
        mgr.create_custom_role(
            name="org_role", level=RoleLevel.MEMBER,
            permissions={Permission.DATA_READ}, org_id="org_1",
        )
        assert mgr.get_role("org_role", org_id="org_1") is not None

    def test_multiple_roles_union_permissions(self):
        mgr = RBACManager()
        mgr.assign_role("user_1", "viewer")
        mgr.assign_role("user_1", "contributor")
        perms = mgr.get_user_permissions("user_1")
        assert Permission.AGENT_READ in perms
        assert Permission.AGENT_WRITE in perms


class TestOrganizationManagement:
    def test_create_organization(self):
        mgr = RBACManager()
        org = mgr.create_organization("org_1", "TestOrg", "owner_1")
        assert org.org_id == "org_1"
        assert org.owner_id == "owner_1"
        assert "owner_1" in org.members

    def test_duplicate_org_raises(self):
        mgr = RBACManager()
        mgr.create_organization("org_1", "TestOrg", "owner_1")
        with pytest.raises(ValueError):
            mgr.create_organization("org_1", "Duplicate", "owner_2")

    def test_add_org_member(self):
        mgr = RBACManager()
        mgr.create_organization("org_1", "TestOrg", "owner_1")
        mgr.add_org_member("org_1", "user_2", "member")
        org = mgr._organizations["org_1"]
        assert "user_2" in org.members

    def test_remove_org_member(self):
        mgr = RBACManager()
        mgr.create_organization("org_1", "TestOrg", "owner_1")
        mgr.add_org_member("org_1", "user_2", "member")
        result = mgr.remove_org_member("org_1", "user_2")
        assert result is True

    def test_cannot_remove_owner(self):
        mgr = RBACManager()
        mgr.create_organization("org_1", "TestOrg", "owner_1")
        with pytest.raises(ValueError):
            mgr.remove_org_member("org_1", "owner_1")

    def test_add_member_to_nonexistent_org(self):
        mgr = RBACManager()
        with pytest.raises(ValueError):
            mgr.add_org_member("fake_org", "user_1", "member")


class TestTeamManagement:
    def test_create_team(self):
        mgr = RBACManager()
        mgr.create_organization("org_1", "TestOrg", "owner_1")
        team = mgr.create_team("org_1", "team_1", "Engineering")
        assert team.team_id == "team_1"
        assert team.name == "Engineering"

    def test_add_team_member(self):
        mgr = RBACManager()
        mgr.create_organization("org_1", "TestOrg", "owner_1")
        mgr.add_org_member("org_1", "user_2", "member")
        mgr.create_team("org_1", "team_1", "Engineering")
        mgr.add_team_member("org_1", "team_1", "user_2")
        org = mgr._organizations["org_1"]
        assert "user_2" in org.teams["team_1"].members

    def test_non_org_member_cannot_join_team(self):
        mgr = RBACManager()
        mgr.create_organization("org_1", "TestOrg", "owner_1")
        mgr.create_team("org_1", "team_1", "Engineering")
        with pytest.raises(ValueError):
            mgr.add_team_member("org_1", "team_1", "outsider")

    def test_remove_team_member(self):
        mgr = RBACManager()
        mgr.create_organization("org_1", "TestOrg", "owner_1")
        mgr.add_org_member("org_1", "user_2", "member")
        mgr.create_team("org_1", "team_1", "Engineering")
        mgr.add_team_member("org_1", "team_1", "user_2")
        result = mgr.remove_team_member("org_1", "team_1", "user_2")
        assert result is True

    def test_get_user_teams(self):
        mgr = RBACManager()
        mgr.create_organization("org_1", "TestOrg", "owner_1")
        mgr.add_org_member("org_1", "user_2", "member")
        mgr.create_team("org_1", "t1", "Team A")
        mgr.create_team("org_1", "t2", "Team B")
        mgr.add_team_member("org_1", "t1", "user_2")
        mgr.add_team_member("org_1", "t2", "user_2")
        teams = mgr.get_user_teams("org_1", "user_2")
        assert len(teams) == 2

    def test_duplicate_team_raises(self):
        mgr = RBACManager()
        mgr.create_organization("org_1", "TestOrg", "owner_1")
        mgr.create_team("org_1", "team_1", "Engineering")
        with pytest.raises(ValueError):
            mgr.create_team("org_1", "team_1", "Duplicate")


class TestAPIKeyScopes:
    def test_read_only_scope(self):
        perms = get_scope_permissions(APIKeyScope.READ_ONLY)
        assert Permission.AGENT_READ in perms
        assert Permission.AGENT_WRITE not in perms

    def test_full_access_scope(self):
        perms = get_scope_permissions(APIKeyScope.FULL_ACCESS)
        for p in Permission:
            assert p in perms

    def test_check_api_key_permission(self):
        assert check_api_key_permission(APIKeyScope.READ_WRITE, Permission.DATA_WRITE)
        assert not check_api_key_permission(APIKeyScope.READ_ONLY, Permission.DATA_WRITE)


class TestPermissionUtilities:
    def test_list_all_permissions(self):
        perms = list_all_permissions()
        assert len(perms) > 0
        assert all("name" in p and "value" in p for p in perms)

    def test_get_permissions_by_category(self):
        agent_perms = get_permissions_by_category("agent")
        assert Permission.AGENT_READ in agent_perms
        assert Permission.DATA_READ not in agent_perms

    def test_permission_denied_exception(self):
        exc = PermissionDenied("user_1", "agent:read")
        assert "user_1" in str(exc)
        assert exc.user_id == "user_1"

    def test_insufficient_role_exception(self):
        exc = InsufficientRole("user_1", RoleLevel.ADMIN)
        assert "user_1" in str(exc)
        assert exc.required_level == RoleLevel.ADMIN
