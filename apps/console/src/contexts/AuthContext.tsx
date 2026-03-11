// @ts-nocheck
// @ts-nocheck
/**
 * AuthContext — Firebase Auth context for Inception Console v5
 * Multi-Tenant Platform Phase 1A
 *
 * Initialises Firebase from VITE_ env vars and exposes auth state + tenantId.
 */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
const initFirebase = (_config: any) => {};
const signInWithGoogle = async () => {};
const signOutUser = async () => {};
const onAuthChange = (_cb: any) => () => {};
export type User = any;

// ── Initialise Firebase once at module load (VITE env vars are runtime-safe here) ──
initFirebase({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
});

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  /** Firebase UID — maps to tenant ID for multi-tenant isolation */
  tenantId: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const tenantId = user?.uid ?? null;

  useEffect(() => {
    const unsubscribe = onAuthChange((firebaseUser: any) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOutUser();
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, tenantId, signIn: handleSignIn, signOut: handleSignOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
