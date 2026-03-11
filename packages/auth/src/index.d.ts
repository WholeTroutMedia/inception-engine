/**
 * index.ts — @inception/auth public exports
 * Creative Liberation Engine v5 GENESIS
 */
export { app, auth, googleProvider } from './lib/firebase.js';
export { AuthProvider, useAuthContext, type AuthUser, type AuthContextValue } from './contexts/AuthContext.js';
export { AuthGuard } from './components/AuthGuard.js';
export { useAuth, useTenantId, useAuthHeaders, useHasClaim } from './hooks/useAuth.js';
export { agentOAuth, AgentOAuth } from './agent-oauth.js';
export { requireAgentAuth } from './agent-rbac.js';
