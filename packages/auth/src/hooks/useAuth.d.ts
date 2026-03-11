/**
 * useAuth.ts — Typed Auth Hook
 * @inception/auth — Creative Liberation Engine v5 GENESIS
 *
 * Convenience hook wrapping AuthContext. Use in any component.
 * Provides tenant-aware auth state with X-Tenant-ID header helper.
 */
import { type AuthContextValue, type AuthUser } from '../contexts/AuthContext.js';
export type { AuthUser, AuthContextValue };
export declare function useAuth(): AuthContextValue;
/**
 * Returns the current user's tenant ID (Firebase UID) for use in API headers.
 * Usage: const tenantId = useTenantId(); fetch(url, { headers: { 'X-Tenant-ID': tenantId } })
 */
export declare function useTenantId(): string | null;
/**
 * Returns a pre-built headers object ready for authenticated fetch calls.
 * Includes Authorization: Bearer <token> and X-Tenant-ID: <uid>
 */
export declare function useAuthHeaders(): Record<string, string> | null;
/**
 * Returns whether the current user has a specific custom claim.
 * Useful for role-based access (e.g., admin, studio, client).
 */
export declare function useHasClaim(claim: string): boolean;
