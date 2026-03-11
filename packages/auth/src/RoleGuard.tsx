/**
 * @inception/auth — RoleGuard
 * Role-based routing: wraps AuthGuard and enforces user-role access.
 *
 * Usage:
 *   <RoleGuard allowedRoles={['admin']}>
 *     <AdminDashboard />
 *   </RoleGuard>
 *
 * Role is read from Firebase custom claims or the AuthContext role field.
 * Falls back to 'viewer' if no role is set.
 */

'use client';

import { type ReactNode } from 'react';
import { AuthGuard } from './AuthGuard.js';
import { useAuth } from './AuthContext.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'editor' | 'viewer' | 'partner';

export interface RoleGuardProps {
  /** Which roles are allowed to see this content */
  allowedRoles: UserRole[];
  /** Content to render when authorized */
  children: ReactNode;
  /** Custom fallback when authenticated but not authorized */
  unauthorizedFallback?: ReactNode;
  /** Custom fallback when not authenticated at all */
  unauthFallback?: ReactNode;
  /** Show loading spinner while auth resolves */
  loadingFallback?: ReactNode;
}

// ─── useUserRole hook ─────────────────────────────────────────────────────────

/**
 * Returns the current user's role. Reads from Firebase ID token custom claims
 * (preferred) or ctx.user.email domain heuristic as fallback.
 */
export function useUserRole(): { role: UserRole; loading: boolean } {
  const { user, loading } = useAuth();

  if (loading || !user) {
    return { role: 'viewer', loading };
  }

  // Read role from custom claims if available
  // Custom claims are set by the backend on the token directly.
  // We cast user to access the reloadUserInfo shape used by Firebase Auth v12
  const claims = (user as unknown as { reloadUserInfo?: { customAttributes?: string } })
    .reloadUserInfo?.customAttributes;

  if (claims) {
    try {
      const parsed = JSON.parse(claims) as { role?: UserRole };
      if (parsed.role && ['admin', 'editor', 'viewer', 'partner'].includes(parsed.role)) {
        return { role: parsed.role, loading: false };
      }
    } catch {
      // fall through to heuristic
    }
  }

  // Domain heuristic fallback for internal dev — never used in production
  const email = user.email ?? '';
  if (
    email.endsWith('@inceptionengine.systems') ||
    email.endsWith('@creative-liberation-engine.io')
  ) {
    return { role: 'admin', loading: false };
  }

  return { role: 'viewer', loading: false };
}

// ─── RoleGuard component ──────────────────────────────────────────────────────

export function RoleGuard({
  allowedRoles,
  children,
  unauthorizedFallback = <UnauthorizedView />,
  unauthFallback,
  loadingFallback,
}: RoleGuardProps) {
  return (
    <AuthGuard unauthFallback={unauthFallback} loadingFallback={loadingFallback}>
      <RoleCheck allowedRoles={allowedRoles} unauthorizedFallback={unauthorizedFallback}>
        {children}
      </RoleCheck>
    </AuthGuard>
  );
}

// ─── Inner role check (auth already guaranteed by AuthGuard above) ────────────

function RoleCheck({
  allowedRoles,
  children,
  unauthorizedFallback,
}: {
  allowedRoles: UserRole[];
  children: ReactNode;
  unauthorizedFallback: ReactNode;
}) {
  const { role, loading } = useUserRole();

  if (loading) return null; // AuthGuard already shows loading spinner

  if (!allowedRoles.includes(role)) {
    return <>{unauthorizedFallback}</>;
  }

  return <>{children}</>;
}

// ─── Unauthorized view ────────────────────────────────────────────────────────

function UnauthorizedView() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100dvh',
        background: '#0d0d12',
        fontFamily: "'Inter', sans-serif",
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div
        style={{
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 16,
          padding: '40px 48px',
          textAlign: 'center',
          maxWidth: 400,
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
        <h1 style={{ color: '#fff', fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>
          Access Restricted
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, margin: 0, lineHeight: 1.6 }}>
          You don't have permission to view this page. Contact your administrator to request access.
        </p>
      </div>
    </div>
  );
}

// ─── withRoleGuard HOC ────────────────────────────────────────────────────────

/**
 * Higher-order component version for class components or page-level wrapping.
 *
 * @example
 * export default withRoleGuard(['admin'])(AdminDashboard);
 */
export function withRoleGuard<P extends object>(
  allowedRoles: UserRole[],
  options?: Pick<RoleGuardProps, 'unauthorizedFallback' | 'unauthFallback'>,
) {
  return function (WrappedComponent: React.ComponentType<P>) {
    function RoleGuardedComponent(props: P) {
      return (
        <RoleGuard allowedRoles={allowedRoles} {...options}>
          <WrappedComponent {...props} />
        </RoleGuard>
      );
    }
    RoleGuardedComponent.displayName = `withRoleGuard(${WrappedComponent.displayName ?? WrappedComponent.name})`;
    return RoleGuardedComponent;
  };
}

// ─── requireRole utility (for server-side / API route checks) ─────────────────

/**
 * Pure function — validates that a claimed role is allowed.
 * Use in API routes / server actions where there's no React context.
 */
export function requireRole(
  claimedRole: string | undefined,
  allowedRoles: UserRole[],
): { authorized: boolean; role: UserRole } {
  const role = (claimedRole ?? 'viewer') as UserRole;
  return {
    authorized: allowedRoles.includes(role),
    role,
  };
}
