/**
 * useAuth.ts — Typed Auth Hook
 * @inception/auth — Creative Liberation Engine v5 GENESIS
 *
 * Convenience hook wrapping AuthContext. Use in any component.
 * Provides tenant-aware auth state with X-Tenant-ID header helper.
 */
import { useAuthContext } from '../contexts/AuthContext.js';
// ─── Main hook ────────────────────────────────────────────────────────────────
export function useAuth() {
    return useAuthContext();
}
// ─── Derived hooks ────────────────────────────────────────────────────────────
/**
 * Returns the current user's tenant ID (Firebase UID) for use in API headers.
 * Usage: const tenantId = useTenantId(); fetch(url, { headers: { 'X-Tenant-ID': tenantId } })
 */
export function useTenantId() {
    const { user } = useAuthContext();
    return user?.tenantId ?? null;
}
/**
 * Returns a pre-built headers object ready for authenticated fetch calls.
 * Includes Authorization: Bearer <token> and X-Tenant-ID: <uid>
 */
export function useAuthHeaders() {
    const { user } = useAuthContext();
    if (!user)
        return null;
    return {
        Authorization: `Bearer ${user.idToken}`,
        'X-Tenant-ID': user.tenantId,
        'Content-Type': 'application/json',
    };
}
/**
 * Returns whether the current user has a specific custom claim.
 * Useful for role-based access (e.g., admin, studio, client).
 */
export function useHasClaim(claim) {
    const { user } = useAuthContext();
    return !!(user?.tokenClaims?.[claim]);
}
