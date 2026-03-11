/**
 * AuthGuard.tsx — Route Protection Wrapper
 * @inception/auth — Creative Liberation Engine v5 GENESIS
 *
 * Wraps any route/component tree. Redirects to sign-in if unauthenticated.
 * Passes X-Tenant-ID to downstream via context for Cloud Run routing.
 */

import React, { type ReactNode } from 'react';
import { useAuthContext } from '../contexts/AuthContext.js';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthGuardProps {
  children: ReactNode;
  /**
   * Custom fallback shown while auth state is resolving (e.g., spinner).
   * Defaults to a minimal centered loading div.
   */
  loadingFallback?: ReactNode;
  /**
   * Custom component shown when unauthenticated.
   * Receives onSignIn callback. If omitted, renders a default Google sign-in button.
   */
  unauthFallback?: (onSignIn: () => Promise<void>) => ReactNode;
}

// ─── Default UI ───────────────────────────────────────────────────────────────

function DefaultLoading(): React.JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontFamily: 'Inter, system-ui, sans-serif',
        color: 'hsl(220 15% 65%)',
        background: 'hsl(220 15% 8%)',
      }}
    >
      <span>Authenticating…</span>
    </div>
  );
}

function DefaultSignIn({ onSignIn, error }: { onSignIn: () => Promise<void>; error: string | null }): React.JSX.Element {
  const [loading, setLoading] = React.useState(false);

  const handleClick = async (): Promise<void> => {
    setLoading(true);
    try {
      await onSignIn();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        gap: '1.5rem',
        fontFamily: 'Inter, system-ui, sans-serif',
        background: 'hsl(220 15% 8%)',
        color: 'hsl(220 15% 90%)',
      }}
    >
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Creative Liberation Engine</h1>
      <p style={{ color: 'hsl(220 15% 55%)', margin: 0 }}>Sign in to continue</p>
      {error && (
        <p style={{ color: 'hsl(0 80% 65%)', fontSize: '0.875rem', margin: 0 }}>{error}</p>
      )}
      <button
        onClick={() => void handleClick()}
        disabled={loading}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.75rem 1.5rem',
          borderRadius: '0.5rem',
          border: '1px solid hsl(220 15% 25%)',
          background: 'hsl(220 15% 12%)',
          color: 'hsl(220 15% 90%)',
          fontSize: '0.9375rem',
          fontWeight: 500,
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.6 : 1,
          transition: 'background 0.15s ease',
        }}
      >
        {loading ? 'Signing in…' : 'Continue with Google'}
      </button>
    </div>
  );
}

// ─── AuthGuard ────────────────────────────────────────────────────────────────

export function AuthGuard({ children, loadingFallback, unauthFallback }: AuthGuardProps): React.JSX.Element {
  const { isLoading, isAuthenticated, signInWithGoogle, error } = useAuthContext();

  if (isLoading) {
    return <>{loadingFallback ?? <DefaultLoading />}</>;
  }

  if (!isAuthenticated) {
    if (unauthFallback) {
      return <>{unauthFallback(signInWithGoogle)}</>;
    }
    return <DefaultSignIn onSignIn={signInWithGoogle} error={error} />;
  }

  return <>{children}</>;
}
