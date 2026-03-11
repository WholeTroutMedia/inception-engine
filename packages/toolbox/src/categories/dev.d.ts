/**
 * @inception/toolbox — Dev Utilities
 * Pure TypeScript, zero external dependencies.
 * TOOL-02: UUID gen, SHA-256 hash, regex tester, JWT decode
 */
/** Generate a RFC 4122 v4 UUID using crypto.getRandomValues (browser + Node 21+) */
export declare function generateUUID(): string;
/** SHA-256 hash via Web Crypto API (available in Node 16+ and all browsers) */
export declare function hashSHA256(input: string): Promise<string>;
/** Synchronous FNV-1a 32-bit hash (no crypto, fast, good for non-security uses) */
export declare function hashFNV32(input: string): number;
export interface RegexTestResult {
    isValid: boolean;
    matches: string[];
    groups: Record<string, string>[];
    matchCount: number;
    error?: string;
}
export declare function regexTest(pattern: string, input: string, flags?: string): RegexTestResult;
export interface JWTDecodeResult {
    header: Record<string, unknown>;
    payload: Record<string, unknown>;
    signature: string;
    isExpired: boolean;
    expiresAt?: Date;
}
export declare function jwtDecode(token: string): JWTDecodeResult | null;
