/**
 * Creative Liberation Engine v5 — Firebase Cloud Functions Entry Point
 *
 * Exposes Genkit flows as Firebase Cloud Functions (Gen 2) for production deployment.
 * Also enables Firebase telemetry (Genkit Monitoring via Google Cloud Observability).
 *
 * Local dev: firebase emulators:start --only functions,firestore,auth
 * Deploy:    firebase deploy --only functions
 */

import { onRequest } from 'firebase-functions/v2/https';
import { enableFirebaseTelemetry } from '@genkit-ai/firebase';
import { app } from './server.js';

// ─── Firebase Telemetry ──────────────────────────────────────────────────────
// Exports traces, metrics, and logs to Google Cloud Observability (Genkit Monitoring)
// Automatically enabled when deployed to Firebase Functions
enableFirebaseTelemetry().catch(console.error);

// ─── Cloud Function: Creative Liberation Engine API ───────────────────────────────────
// Wraps the full Express server as a single Firebase Cloud Function.
// All routes (/generate, /stream, /classify, /search, /health, /stats, /audit)
// are available under this function.
//
// Production URL: https://us-central1-creative-liberation-engine-v5.cloudfunctions.net/api
// Emulator URL:   http://localhost:5001/creative-liberation-engine-v5/us-central1/api
export const api = onRequest(
    {
        region: 'us-central1',
        timeoutSeconds: 300,   // 5 min for long-running flows
        memory: '1GiB',
        minInstances: 0,       // scale to zero when idle
        maxInstances: 10,
        concurrency: 80,
    },
    app
);
