/**
 * @inception/toolbox — Web Utilities
 * TOOL-02: Pure TypeScript web utility functions — zero external dependencies
 *
 * Functions: urlParse, qrDataEncode, base64Encode, base64Decode, urlSlugify
 */
export interface ParsedUrl {
    href: string;
    protocol: string;
    host: string;
    hostname: string;
    port: string;
    pathname: string;
    search: string;
    hash: string;
    params: Record<string, string>;
    valid: boolean;
    error?: string;
}
/**
 * Parses a URL string into its structural components with query params.
 */
export declare function urlParse(url: string): ParsedUrl;
export interface QrDataResult {
    /** The raw data that should be encoded in a QR code */
    data: string;
    /** Suggested QR error correction level */
    errorCorrection: 'L' | 'M' | 'Q' | 'H';
    /** Estimated QR version required (1-40) */
    estimatedVersion: number;
    /** Character count */
    charCount: number;
    /** Encoding mode */
    mode: 'numeric' | 'alphanumeric' | 'byte' | 'kanji';
}
/**
 * Prepares and classifies a string for QR code encoding.
 * Returns encoding metadata including suggested error correction and QR version.
 * (Actual QR rendering requires a QR library or canvas — this handles the data layer.)
 */
export declare function qrDataEncode(data: string, preferredErrorCorrection?: 'L' | 'M' | 'Q' | 'H'): QrDataResult;
export interface Base64Result {
    output: string;
    byteLength: number;
    isUrlSafe: boolean;
}
/**
 * Encodes a string to base64 (standard or URL-safe variant).
 * @param input String to encode
 * @param urlSafe Whether to use URL-safe base64 (replaces +/= with -_)
 */
export declare function base64Encode(input: string, urlSafe?: boolean): Base64Result;
/**
 * Decodes a base64 (or URL-safe base64) string back to a plain string.
 * @param input Base64 string to decode
 */
export declare function base64Decode(input: string): {
    output: string;
    valid: boolean;
    error?: string;
};
export interface SlugOptions {
    separator?: string;
    lowercase?: boolean;
    maxLength?: number;
    strict?: boolean;
}
/**
 * Converts a string to a URL-friendly slug.
 * Handles Unicode characters, removes diacritics, strips special characters.
 * @param input Text to slugify
 * @param options Slug generation options
 */
export declare function urlSlugify(input: string, options?: SlugOptions): string;
