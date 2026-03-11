/**
 * index.ts — @inception/auth public exports
 * Creative Liberation Engine v5 GENESIS
 */
// Firebase app singleton
export { app, auth, googleProvider } from './lib/firebase.js';
// Auth context + provider
export { AuthProvider, useAuthContext } from './contexts/AuthContext.js';
// Route guard
export { AuthGuard } from './components/AuthGuard.js';
// Hooks
export { useAuth, useTenantId, useAuthHeaders, useHasClaim } from './hooks/useAuth.js';
// Agent OAuth
export { agentOAuth, AgentOAuth } from './agent-oauth.js';
export { requireAgentAuth } from './agent-rbac.js';
