/**
 * firebase.ts — Firebase App Initialization
 * @inception/auth — Creative Liberation Engine v5 GENESIS
 *
 * Initializes Firebase with environment-driven config.
 * Exports the Firebase app, Auth, and GoogleAuthProvider.
 */

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

function resolveConfig(): FirebaseConfig {
  const env = typeof import.meta !== 'undefined' && (import.meta as any).env ? (import.meta as any).env : (process.env || {});
  const cfg: FirebaseConfig = {
    apiKey: env['VITE_FIREBASE_API_KEY'] as string,
    authDomain: env['VITE_FIREBASE_AUTH_DOMAIN'] as string,
    projectId: env['VITE_FIREBASE_PROJECT_ID'] as string,
    storageBucket: env['VITE_FIREBASE_STORAGE_BUCKET'] as string,
    messagingSenderId: env['VITE_FIREBASE_MESSAGING_SENDER_ID'] as string,
    appId: env['VITE_FIREBASE_APP_ID'] as string,
    measurementId: env['VITE_FIREBASE_MEASUREMENT_ID'] as string | undefined,
  };

  const missing = (Object.entries(cfg) as [string, string | undefined][])
    .filter(([key, val]) => key !== 'measurementId' && !val)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`[FirebaseAuth] Missing environment variables: ${missing.join(', ')}`);
  }

  return cfg;
}

// Singleton init — safe for hot-reload in Vite
let app: FirebaseApp;
let auth: Auth;
let googleProvider: GoogleAuthProvider;

function initFirebase(): void {
  let config: FirebaseConfig;
  try {
    config = resolveConfig();
  } catch (err: any) {
    if (typeof window === 'undefined' || typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
      console.log(`[FirebaseAuth] Skipped frontend Firebase init: ${err.message}`);
      return; 
    }
    throw err;
  }

  if (getApps().length === 0) {
    app = initializeApp(config);
  } else {
    app = getApps()[0]!;
  }
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: 'select_account' });
}

initFirebase();

export { app, auth, googleProvider };
