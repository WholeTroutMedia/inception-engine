/**
 * @inception/toolbox — Dev Utilities
 * Pure TypeScript, zero external dependencies.
 * TOOL-02: UUID gen, SHA-256 hash, regex tester, JWT decode
 */
// ─────────────────────────────────────────────────────────────────────────────
// UUID
// ─────────────────────────────────────────────────────────────────────────────
/** Generate a RFC 4122 v4 UUID using crypto.getRandomValues (browser + Node 21+) */
export function generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Polyfill for older Node
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
// ─────────────────────────────────────────────────────────────────────────────
// SHA-256 HASH
// ─────────────────────────────────────────────────────────────────────────────
/** SHA-256 hash via Web Crypto API (available in Node 16+ and all browsers) */
export async function hashSHA256(input) {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
/** Synchronous FNV-1a 32-bit hash (no crypto, fast, good for non-security uses) */
export function hashFNV32(input) {
    let hash = 2166136261;
    for (let i = 0; i < input.length; i++) {
        hash ^= input.charCodeAt(i);
        hash = (hash * 16777619) >>> 0;
    }
    return hash;
}
export function regexTest(pattern, input, flags = 'g') {
    try {
        const re = new RegExp(pattern, flags);
        const matches = [];
        const groups = [];
        let m;
        while ((m = re.exec(input)) !== null) {
            matches.push(m[0]);
            if (m.groups)
                groups.push(m.groups);
            if (!flags.includes('g'))
                break;
        }
        return { isValid: true, matches, groups, matchCount: matches.length };
    }
    catch (e) {
        return { isValid: false, matches: [], groups: [], matchCount: 0, error: String(e) };
    }
}
/** Decode a base64 / base64url string to utf-8 using Web APIs (Node 18+ & browsers). */
function decodeBase64Url(input) {
    // Add padding and normalize URL-safe chars
    const padded = input.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - input.length % 4) % 4);
    // atob is a global in Node 18+ and all browsers — no @types/node needed
    const binary = atob(padded);
    const bytes = Uint8Array.from({ length: binary.length }, (_, i) => binary.charCodeAt(i));
    return new TextDecoder().decode(bytes);
}
export function jwtDecode(token) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3)
            return null;
        const decode = (s) => JSON.parse(decodeBase64Url(s));
        const header = decode(parts[0]);
        const payload = decode(parts[1]);
        const signature = parts[2];
        const exp = typeof payload['exp'] === 'number' ? payload['exp'] : undefined;
        const expiresAt = exp ? new Date(exp * 1000) : undefined;
        const isExpired = expiresAt ? expiresAt < new Date() : false;
        return { header, payload, signature, isExpired, expiresAt };
    }
    catch {
        return null;
    }
}
