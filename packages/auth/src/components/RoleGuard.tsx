/**
 * RoleGuard — Role-Based Route Protection
 * Creative Liberation Engine v5.0.0 (GENESIS) — Multi-Tenant Platform
 *
 * Extends AuthGuard with Firebase custom claims role enforcement.
 * Roles are read from JWT custom claims set by the Cloud Function.
 *
 * Usage:
 *   <RoleGuard requiredRole="admin">
 *     <AdminPanel />
 *   </RoleGuard>
 */

import React, { type ReactNode } from 'react';
import { useAuthContext } from '../contexts/AuthContext.js';

// ─── Role Hierarchy ────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'editor' | 'viewer' | 'partner';

const ROLE_LEVEL: Record<UserRole, number> = {
  admin: 100,
  editor: 50,
  partner: 30,
  viewer: 10,
};

/**
 * Extracts user role from Firebase JWT custom claims.
 * Falls back to 'viewer' if no role claim is set.
 */
export function extractUserRole(claims: Record<string, unknown>): UserRole {
  const role = claims['role'];
  if (role === 'admin' || role === 'editor' || role === 'viewer' || role === 'partner') {
    return role as UserRole;
  }
  return 'viewer';
}

/**
 * Returns true if userRole meets or exceeds the requiredRole.
 */
export function hasRequiredRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_LEVEL[userRole] >= ROLE_LEVEL[requiredRole];
}

// ─── useUserRole hook ──────────────────────────────────────────────────────────

/**
 * useUserRole — Resolves the current user's role from JWT claims.
 * Returns 'viewer' as the safe default for unauthenticated users.
 */
export function useUserRole(): { role: UserRole; isLoading: boolean } {
  const { user, isLoading } = useAuthContext();

  if (isLoading || !user) {
    return { role: 'viewer', isLoading };
  }

  const role = extractUserRole(user.tokenClaims);
  return { role, isLoading: false };
}

// ─── RoleGuard Component ────────────────────────────────────────────────────────

export interface RoleGuardProps {
  /** The protected content. */
  children: ReactNode;
  /** Minimum role required. Default: 'viewer'. */
  requiredRole?: UserRole;
  /** Optional custom forbidden message. */
  forbiddenFallback?: ReactNode;
}

/**
 * RoleGuard wraps protected content and enforces role-based access.
 * Must be used inside <AuthProvider>.
 *
 * If the user does not have the required role, renders a 403-style forbidden view.
 * If auth is still loading, renders nothing (let parent AuthGuard handle loading state).
 */
export function RoleGuard({
  children,
  requiredRole = 'viewer',
  forbiddenFallback,
}: RoleGuardProps): React.JSX.Element | null {
  const { role, isLoading } = useUserRole();

  // Still loading — render nothing, let AuthGuard's loading spinner show
  if (isLoading) return null;

  if (!hasRequiredRole(role, requiredRole)) {
    return (
      <>
        {forbiddenFallback ?? (
          <RoleGuardForbiddenView userRole={role} requiredRole={requiredRole} />
        )}
      </>
    );
  }

  return <>{children}</>;
}

// ─── withRoleGuard HOC ─────────────────────────────────────────────────────────

/**
 * withRoleGuard — HOC that wraps a component inside RoleGuard.
 *
 * Usage:
 *   const AdminOnly = withRoleGuard(MyComponent, 'admin');
 */
export function withRoleGuard<P extends object>(
  Component: React.ComponentType<P>,
  requiredRole: UserRole = 'viewer',
): React.ComponentType<P> {
  const WrappedComponent = (props: P) => (
    <RoleGuard requiredRole={requiredRole}>
      <Component {...props} />
    </RoleGuard>
  );
  WrappedComponent.displayName = `RoleGuard[${requiredRole}](${Component.displayName ?? Component.name ?? 'Component'})`;
  return WrappedComponent;
}

// ─── Role-Based Route Config ───────────────────────────────────────────────────

export interface RoleRoute {
  path: string;
  requiredRole: UserRole;
  label: string;
}

/**
 * CONSOLE_ROLE_ROUTES — defines which console paths require which roles.
 * Used by the console router to enforce access at the route level.
 */
export const CONSOLE_ROLE_ROUTES: RoleRoute[] = [
  { path: '/console', requiredRole: 'viewer', label: 'Console Home' },
  { path: '/console/agents', requiredRole: 'viewer', label: 'Agents' },
  { path: '/console/telemetry', requiredRole: 'viewer', label: 'Telemetry' },
  { path: '/console/dispatch', requiredRole: 'editor', label: 'Dispatch' },
  { path: '/console/admin', requiredRole: 'admin', label: 'Admin Panel' },
  { path: '/console/admin/billing', requiredRole: 'admin', label: 'Billing' },
  { path: '/console/admin/users', requiredRole: 'admin', label: 'User Management' },
];

/**
 * filterRoutesForRole — returns only the routes visible to a given user role.
 */
export function filterRoutesForRole(routes: RoleRoute[], userRole: UserRole): RoleRoute[] {
  return routes.filter((r) => hasRequiredRole(userRole, r.requiredRole));
}

/**
 * requireRole — pure function for server-side / API route role checks.
 * No React context needed. Use in API routes, server actions, middleware.
 *
 * @example
 * const { authorized, role } = requireRole(req.headers['x-user-role'], ['admin']);
 * if (!authorized) return res.status(403).json({ error: 'Forbidden' });
 */
export function requireRole(
  claimedRole: string | undefined,
  allowedRoles: UserRole[],
): { authorized: boolean; role: UserRole } {
  const role = extractUserRole({ role: claimedRole });
  return { authorized: allowedRoles.includes(role), role };
}

// ─── Internal Forbidden View ───────────────────────────────────────────────────

function RoleGuardForbiddenView({
  userRole,
  requiredRole,
}: {
  userRole: UserRole;
  requiredRole: UserRole;
}): React.JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem 2rem',
        gap: '1rem',
        fontFamily: 'Inter, system-ui, sans-serif',
        color: 'hsl(220 15% 65%)',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '3rem' }}>🔒</div>
      <h3 style={{ margin: 0, color: 'hsl(220 15% 85%)', fontWeight: 700 }}>
        Insufficient Permissions
      </h3>
      <p style={{ margin: 0, maxWidth: 360 }}>
        This area requires <strong>{requiredRole}</strong> access.
        Your current role is <strong>{userRole}</strong>.
        Contact your administrator to request elevated permissions.
      </p>
    </div>
  );
}
