/**
 * Console API base URLs — Zero Day: prod builds must set VITE_* to public URLs.
 * No 192.168 in defaults; localhost only for dev.
 */
const env = typeof import.meta !== 'undefined' ? (import.meta as { env?: Record<string, string> }).env ?? {} : {};

export const DISPATCH_URL = env.VITE_DISPATCH_URL ?? 'http://localhost:5050';
export const GENKIT_URL = env.VITE_GENKIT_URL ?? 'http://localhost:4100';
export const CAMPAIGN_URL = env.VITE_CAMPAIGN_URL ?? 'http://localhost:4006';
export const GATEWAY_URL = env.VITE_GATEWAY_URL ?? 'http://localhost:3080';
export const FORGE_URL = env.VITE_FORGE_URL ?? 'http://localhost:4300';
/** Base for same-host services (scanner); prod set VITE_NAS_BASE to public API base. No 192.168. */
export const API_BASE = env.VITE_NAS_BASE ?? 'http://localhost';
/** Forgejo/source links; prod can set VITE_FORGEJO_URL to public git URL */
export const FORGEJO_SOURCE_URL = env.VITE_FORGEJO_URL ?? 'http://localhost:3000';
