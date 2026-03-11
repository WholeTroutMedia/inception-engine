/**
 * @inception/toolbox — Security Utilities
 * TOOL-02: Pure TypeScript security utility functions — zero external dependencies
 *
 * Functions: sanitizeHtml, generateSecret, passwordStrength, timingSafeEqual
 */
export interface SanitizeResult {
    output: string;
    removedTags: string[];
    removedAttributes: string[];
}
/**
 * Strips dangerous HTML tags/attributes from a string.
 * Allows a safe subset of HTML for rich text display.
 * Does NOT use DOMParser — uses regex-based approach safe for server-side use.
 */
export declare function sanitizeHtml(input: string): SanitizeResult;
export interface GeneratedSecret {
    secret: string;
    bits: number;
    hex: string;
    base64: string;
}
type SecretCharset = 'alphanumeric' | 'hex' | 'base64url' | 'numeric' | 'symbols';
/**
 * Generates a cryptographically secure random secret using the Web Crypto API.
 * @param length Number of characters
 * @param charset Character set to use
 */
export declare function generateSecret(length?: number, charset?: SecretCharset): GeneratedSecret;
export interface PasswordStrengthResult {
    score: 0 | 1 | 2 | 3 | 4;
    label: 'Very Weak' | 'Weak' | 'Fair' | 'Strong' | 'Very Strong';
    entropy: number;
    feedback: string[];
    passed: boolean;
}
/**
 * Evaluates password strength using entropy estimation and pattern detection.
 * Returns a score (0-4), label, entropy bits, and actionable feedback.
 */
export declare function passwordStrength(password: string): PasswordStrengthResult;
/**
 * Compares two strings in constant time to prevent timing attacks.
 * Use instead of === when comparing secrets, tokens, or HMAC values.
 * @param a First string
 * @param b Second string
 */
export declare function timingSafeEqual(a: string, b: string): boolean;
export {};
