/**
 * Firebase v5 Auth Bootstrap
 * Creative Liberation Engine v5.0.0 (GENESIS) — Multi-Tenant Platform Phase 1A
 *
 * Config is injected by the consumer (e.g. the console Vite app via import.meta.env).
 * This keeps the auth package dependency-tree clean and avoids vite/client in a Node pkg.
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
} from 'firebase/auth';

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

function getFirebaseAuth(): Auth {
  if (!_auth) throw new Error('[Firebase] initFirebase() must be called before using auth.');
  return _auth;
}

export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

export async function signInWithGoogle(): Promise<User> {
  const auth = getFirebaseAuth();
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutUser(): Promise<void> {
  const auth = getFirebaseAuth();
  await signOut(auth);
}

export function onAuthChange(callback: (user: User | null) => void): () => void {
  const auth = getFirebaseAuth();
  return onAuthStateChanged(auth, callback);
}

export { getFirebaseAuth };
export type { User };
