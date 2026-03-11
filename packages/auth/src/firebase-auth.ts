/**
 * @inception/auth — Firebase Auth integration
 * Helix-A: Phase 1A — React 19 + Vite 5 + GoogleAuthProvider
 * 
 * Provides Firebase Auth for multi-tenant platform with:
 * - GoogleAuthProvider + signInWithPopup
 * - JWT extraction for nginx auth_request gateway validation
 * - Tenant ID mapping from Firebase UID → X-Tenant-ID header
 */

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type Auth,
  type User,
  type UserCredential,
} from 'firebase/auth';

// ─── Config ────────────────────────────────────────────────────────────────

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;

export function initFirebase(config: FirebaseConfig): { app: FirebaseApp; auth: Auth } {
  if (getApps().length === 0) {
    _app = initializeApp(config);
  } else {
    _app = getApps()[0];
  }
  _auth = getAuth(_app);
  return { app: _app, auth: _auth };
}

export function getFirebaseAuth(): Auth {
  if (!_auth) throw new Error('[AVERI] Firebase not initialized — call initFirebase() first');
  return _auth;
}

// ─── Auth Providers ─────────────────────────────────────────────────────────

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

/**
 * Sign in with Google popup.
 * Returns the UserCredential including JWT token.
 */
export async function signInWithGoogle(): Promise<UserCredential> {
  const auth = getFirebaseAuth();
  return signInWithPopup(auth, googleProvider);
}

/**
 * Sign out the current user.
 */
export async function signOutUser(): Promise<void> {
  const auth = getFirebaseAuth();
  return signOut(auth);
}

// ─── JWT / Tenant ID ────────────────────────────────────────────────────────

/**
 * Get the current user's Firebase JWT token (ID token).
 * Used by nginx auth_request gateway to validate requests.
 * Force-refreshes if forceRefresh = true.
 */
export async function getIdToken(forceRefresh = false): Promise<string | null> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken(forceRefresh);
}

/**
 * Map Firebase UID → Tenant ID.
 * Convention: Firebase UID is used directly as the tenant identifier.
 * Passed as X-Tenant-ID header to Cloud Run services.
 */
export function getTenantId(user: User): string {
  return user.uid;
}

/**
 * Build the request headers required for multi-tenant Cloud Run routing.
 */
export async function buildTenantHeaders(
  user: User,
  forceRefresh = false
): Promise<Record<string, string>> {
  const token = await user.getIdToken(forceRefresh);
  return {
    Authorization: `Bearer ${token}`,
    'X-Tenant-ID': getTenantId(user),
  };
}

// ─── Auth State Observer ────────────────────────────────────────────────────

/**
 * Subscribe to auth state changes.
 * Returns an unsubscribe function.
 */
export function subscribeToAuthState(
  callback: (user: User | null) => void
): () => void {
  const auth = getFirebaseAuth();
  return onAuthStateChanged(auth, callback);
}

// ─── Re-exports ─────────────────────────────────────────────────────────────
export type { User, UserCredential, Auth };
