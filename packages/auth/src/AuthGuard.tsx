/**
 * @inception/auth — AuthGuard
 * Helix-A: Phase 1A — Route guard enforcing Firebase Auth before rendering protected content.
 * Passes X-Tenant-ID + Authorization headers on all outgoing requests via axios/fetch interceptors.
 */

'use client';

import { useEffect, type ReactNode } from 'react';
import { useAuth } from './AuthContext.js';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthGuardProps {
  /** Content to render when authenticated */
  children: ReactNode;
  /** Custom fallback when loading */
  loadingFallback?: ReactNode;
  /** Custom fallback when unauthenticated */
  unauthFallback?: ReactNode;
  /** Called after successful auth to set global request headers */
  onHeadersReady?: (headers: Record<string, string>) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AuthGuard({
  children,
  loadingFallback = <AuthLoadingSpinner />,
  unauthFallback = <AuthSignInPrompt />,
  onHeadersReady,
}: AuthGuardProps) {
  const { user, loading, getTenantHeaders } = useAuth();

  // When user authenticates, build and propagate tenant headers
  useEffect(() => {
    if (!user || !onHeadersReady) return;
    getTenantHeaders().then(onHeadersReady);
  }, [user, getTenantHeaders, onHeadersReady]);

  if (loading) return <>{loadingFallback}</>;
  if (!user) return <>{unauthFallback}</>;

  return <>{children}</>;
}

// ─── Default Fallbacks ────────────────────────────────────────────────────────

function AuthLoadingSpinner() {
  return (
    <div style={styles.center}>
      <div style={styles.spinner} />
      <p style={styles.label}>AVERI · Authorizing…</p>
    </div>
  );
}

function AuthSignInPrompt() {
  const { signIn, loading, error } = useAuth();

  return (
    <div style={styles.center}>
      <div style={styles.card}>
        <h1 style={styles.heading}>Creative Liberation Engine</h1>
        <p style={styles.subtitle}>Sign in to continue</p>
        <button style={styles.button} onClick={signIn} disabled={loading}>
          {loading ? 'Signing in…' : '🔐 Sign in with Google'}
        </button>
        {error && <p style={styles.error}>{error}</p>}
      </div>
    </div>
  );
}

// ─── Minimal inline styles ────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  center: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100dvh',
    background: '#0d0d12',
    fontFamily: "'Inter', sans-serif",
  },
  spinner: {
    width: 40,
    height: 40,
    border: '3px solid rgba(255,255,255,0.1)',
    borderTop: '3px solid #a78bfa',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  label: { color: '#7c3aed', marginTop: 12, fontSize: 13 },
  card: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: '48px 40px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
    backdropFilter: 'blur(12px)',
  },
  heading: { color: '#fff', fontSize: 24, fontWeight: 700, margin: 0 },
  subtitle: { color: 'rgba(255,255,255,0.5)', fontSize: 14, margin: 0 },
  button: {
    padding: '12px 28px',
    background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  error: { color: '#f87171', fontSize: 13 },
};
