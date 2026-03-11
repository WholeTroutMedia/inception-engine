/**
 * index.ts — @inception/auth public exports
 * Creative Liberation Engine v5 GENESIS
 */

// Firebase app singleton
export { app, auth, googleProvider } from './lib/firebase.js';

// Auth context + provider
export { AuthProvider, useAuthContext, type AuthUser, type AuthContextValue } from './contexts/AuthContext.js';

// Route guard + role-based access
export { AuthGuard } from './AuthGuard.js';
export {
  RoleGuard,
  withRoleGuard,
  extractUserRole,
  hasRequiredRole,
  useUserRole,
  requireRole,
  CONSOLE_ROLE_ROUTES,
  filterRoutesForRole,
} from './components/RoleGuard.js';
export type { UserRole, RoleGuardProps, RoleRoute } from './components/RoleGuard.js';


// Hooks
export { useAuth, useTenantId, useAuthHeaders, useHasClaim } from './hooks/useAuth.js';

// (Server-side agents should import directly from dist/agent-oauth.js or dist/agent-rbac.js)
