/**
 * @inception/auth — AuthContext
 * Helix-A: Phase 1A — React 19 context for Firebase Auth state
 */

'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import {
  signInWithGoogle,
  signOutUser,
  subscribeToAuthState,
  getIdToken,
  getTenantId,
  buildTenantHeaders,
  type User,
} from './firebase-auth.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AuthState {
  user: User | null;
  loading: boolean;
  tenantId: string | null;
  error: string | null;
}

export interface AuthContextValue extends AuthState {
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  getToken: (forceRefresh?: boolean) => Promise<string | null>;
  getTenantHeaders: (forceRefresh?: boolean) => Promise<Record<string, string>>;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    tenantId: null,
    error: null,
  });

  useEffect(() => {
    const unsubscribe = subscribeToAuthState((user) => {
      setState({
        user,
        loading: false,
        tenantId: user ? getTenantId(user) : null,
        error: null,
      });
    });
    return unsubscribe;
  }, []);

  const signIn = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      await signInWithGoogle();
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : 'Sign-in failed',
      }));
    }
  }, []);

  const signOut = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      await signOutUser();
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : 'Sign-out failed',
      }));
    }
  }, []);

  const getToken = useCallback(
    (forceRefresh = false) => getIdToken(forceRefresh),
    []
  );

  const getTenantHeaders = useCallback(
    async (forceRefresh = false) => {
      if (!state.user) return {};
      return buildTenantHeaders(state.user, forceRefresh);
    },
    [state.user]
  );

  return (
    <AuthContext.Provider
      value={{ ...state, signIn, signOut, getToken, getTenantHeaders }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('[AVERI] useAuth must be used inside <AuthProvider>');
  return ctx;
}
