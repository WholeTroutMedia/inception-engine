/**
 * @inception/toolbox — Security Utilities
 * TOOL-02: Pure TypeScript security utility functions — zero external dependencies
 *
 * Functions: sanitizeHtml, generateSecret, passwordStrength, timingSafeEqual
 */
const ALLOWED_TAGS = new Set([
    'p', 'br', 'b', 'i', 'u', 'strong', 'em', 'del', 's',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'span',
    'a', 'img',
]);
const ALLOWED_ATTRS = {
    a: new Set(['href', 'title', 'rel']),
    img: new Set(['src', 'alt', 'width', 'height']),
    '*': new Set(['class', 'id']),
};
/**
 * Strips dangerous HTML tags/attributes from a string.
 * Allows a safe subset of HTML for rich text display.
 * Does NOT use DOMParser — uses regex-based approach safe for server-side use.
 */
export function sanitizeHtml(input) {
    const removedTags = [];
    const removedAttributes = [];
    // Remove script/style/iframe blocks wholesale
    const dangerousBlocks = input.replace(/<(script|style|iframe|object|embed|form)[^>]*>[\s\S]*?<\/\1>/gi, (_, tag) => { removedTags.push(tag.toLowerCase()); return ''; });
    // Remove event attributes (onclick, onerror, etc.)
    const noEvents = dangerousBlocks.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, (attr) => { removedAttributes.push(attr.trim().split('=')[0].trim()); return ''; });
    // Remove javascript: protocol in href/src
    const noJavascript = noEvents.replace(/(href|src)\s*=\s*["']?\s*javascript:[^"'>]*/gi, (_, attr) => { removedAttributes.push(attr); return `${attr}="#"`; });
    // Process remaining tags: strip disallowed ones
    const output = noJavascript.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g, (fullTag, tagName) => {
        const lower = tagName.toLowerCase();
        if (!ALLOWED_TAGS.has(lower)) {
            removedTags.push(lower);
            return '';
        }
        // Re-assemble tag keeping only allowed attributes
        const allowedForTag = new Set([
            ...Array.from(ALLOWED_ATTRS['*'] ?? []),
            ...Array.from(ALLOWED_ATTRS[lower] ?? []),
        ]);
        const cleanTag = fullTag.replace(/\s+([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]*))/g, (attrStr, attrName) => {
            if (!allowedForTag.has(attrName.toLowerCase())) {
                removedAttributes.push(attrName);
                return '';
            }
            return attrStr;
        });
        return cleanTag;
    });
    return {
        output,
        removedTags: [...new Set(removedTags)],
        removedAttributes: [...new Set(removedAttributes)],
    };
}
const CHARSETS = {
    alphanumeric: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
    hex: '0123456789abcdef',
    base64url: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_',
    numeric: '0123456789',
    symbols: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*',
};
/**
 * Generates a cryptographically secure random secret using the Web Crypto API.
 * @param length Number of characters
 * @param charset Character set to use
 */
export function generateSecret(length = 32, charset = 'alphanumeric') {
    const chars = CHARSETS[charset];
    const randomValues = new Uint8Array(length);
    globalThis.crypto.getRandomValues(randomValues);
    const secret = Array.from(randomValues)
        .map((v) => chars[v % chars.length])
        .join('');
    // Also provide raw bytes
    const rawBytes = new Uint8Array(Math.ceil(length * 0.75));
    globalThis.crypto.getRandomValues(rawBytes);
    const hex = Array.from(rawBytes).map((b) => b.toString(16).padStart(2, '0')).join('');
    const base64 = btoa(String.fromCharCode(...rawBytes));
    return {
        secret,
        bits: length * Math.log2(chars.length),
        hex,
        base64,
    };
}
/**
 * Evaluates password strength using entropy estimation and pattern detection.
 * Returns a score (0-4), label, entropy bits, and actionable feedback.
 */
export function passwordStrength(password) {
    const feedback = [];
    let charsetSize = 0;
    if (/[a-z]/.test(password))
        charsetSize += 26;
    else
        feedback.push('Add lowercase letters');
    if (/[A-Z]/.test(password))
        charsetSize += 26;
    else
        feedback.push('Add uppercase letters');
    if (/\d/.test(password))
        charsetSize += 10;
    else
        feedback.push('Add numbers');
    if (/[^a-zA-Z0-9]/.test(password))
        charsetSize += 32;
    else
        feedback.push('Add special characters (!@#$%^&*)');
    if (password.length < 8)
        feedback.push('Use at least 8 characters');
    if (password.length < 12)
        feedback.push('12+ characters recommended');
    // Common patterns penalty
    const hasCommonPattern = /^(password|123456|qwerty|abc123|letmein|welcome)/i.test(password);
    if (hasCommonPattern)
        feedback.push('Avoid common password patterns');
    const entropy = charsetSize > 0 ? Math.log2(charsetSize) * password.length : 0;
    const effectiveEntropy = hasCommonPattern ? entropy * 0.5 : entropy;
    let score;
    if (effectiveEntropy < 28)
        score = 0;
    else if (effectiveEntropy < 36)
        score = 1;
    else if (effectiveEntropy < 50)
        score = 2;
    else if (effectiveEntropy < 70)
        score = 3;
    else
        score = 4;
    const labels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
    return {
        score,
        label: labels[score],
        entropy: Math.round(effectiveEntropy),
        feedback,
        passed: score >= 3,
    };
}
// ─────────────────────────────────────────────────────────────────────────────
// TIMING-SAFE EQUAL
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Compares two strings in constant time to prevent timing attacks.
 * Use instead of === when comparing secrets, tokens, or HMAC values.
 * @param a First string
 * @param b Second string
 */
export function timingSafeEqual(a, b) {
    const aBytes = new TextEncoder().encode(a);
    const bBytes = new TextEncoder().encode(b);
    if (aBytes.length !== bBytes.length)
        return false;
    let diff = 0;
    for (let i = 0; i < aBytes.length; i++) {
        diff |= aBytes[i] ^ bBytes[i];
    }
    return diff === 0;
}
