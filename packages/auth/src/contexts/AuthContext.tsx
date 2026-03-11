/**
 * AuthContext.tsx — Firebase Auth Context
 * @inception/auth — Creative Liberation Engine v5 GENESIS
 *
 * React 19 context providing auth state, Google sign-in, and sign-out.
 * JWT validation occurs at gateway layer via nginx auth_request + X-Tenant-ID header.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
  type IdTokenResult,
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase.js';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  tenantId: string; // Maps Firebase UID → X-Tenant-ID
  idToken: string;
  tokenClaims: IdTokenResult['claims'];
}

export interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshToken: () => Promise<string | null>;
  error: string | null;
}

// ─── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ──────────────────────────────────────────────────────────────────

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): React.JSX.Element {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (firebaseUser) {
        try {
          const tokenResult = await firebaseUser.getIdTokenResult();
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            tenantId: firebaseUser.uid, // Firebase UID is the tenant ID
            idToken: tokenResult.token,
            tokenClaims: tokenResult.claims,
          });
        } catch (err: unknown) {
          setError(err instanceof Error ? err.message : 'Token resolution failed');
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return unsub;
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<void> => {
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed';
      setError(msg);
      throw err;
    }
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    setError(null);
    try {
      await firebaseSignOut(auth);
      setUser(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign-out failed';
      setError(msg);
      throw err;
    }
  }, []);

  const refreshToken = useCallback(async (): Promise<string | null> => {
    const currentUser = auth.currentUser;
    if (!currentUser) return null;
    try {
      return await currentUser.getIdToken(true);
    } catch {
      return null;
    }
  }, []);

  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated: !!user,
    signInWithGoogle,
    signOut,
    refreshToken,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('[useAuthContext] Must be used inside <AuthProvider>');
  }
  return ctx;
}
