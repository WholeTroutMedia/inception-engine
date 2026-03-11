/**
 * @inception/toolbox — Web Utilities
 * TOOL-02: Pure TypeScript web utility functions — zero external dependencies
 *
 * Functions: urlParse, qrDataEncode, base64Encode, base64Decode, urlSlugify
 */

// ─────────────────────────────────────────────────────────────────────────────
// URL PARSE
// ─────────────────────────────────────────────────────────────────────────────

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
export function urlParse(url: string): ParsedUrl {
  try {
    const u = new URL(url);
    const params: Record<string, string> = {};
    u.searchParams.forEach((v, k) => { params[k] = v; });

    return {
      href: u.href,
      protocol: u.protocol,
      host: u.host,
      hostname: u.hostname,
      port: u.port,
      pathname: u.pathname,
      search: u.search,
      hash: u.hash,
      params,
      valid: true,
    };
  } catch (err) {
    return {
      href: url,
      protocol: '',
      host: '',
      hostname: '',
      port: '',
      pathname: '',
      search: '',
      hash: '',
      params: {},
      valid: false,
      error: err instanceof Error ? err.message : 'Invalid URL',
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// QR DATA ENCODE (data URL segment — renders as a plain text QR payload)
// ─────────────────────────────────────────────────────────────────────────────

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
export function qrDataEncode(data: string, preferredErrorCorrection: 'L' | 'M' | 'Q' | 'H' = 'M'): QrDataResult {
  const charCount = data.length;

  const mode: QrDataResult['mode'] = /^\d+$/.test(data)
    ? 'numeric'
    : /^[0-9A-Z $%*+\-./:]+$/.test(data)
    ? 'alphanumeric'
    : 'byte';

  // Rough QR version estimate based on byte mode + M error correction
  // Version 1 = 17 bytes, each version adds ~data capacity
  const bytesPerVersion: Record<QrDataResult['errorCorrection'], number[]> = {
    L: [41, 77, 127, 187, 255, 322, 370, 461, 552, 652],
    M: [25, 47, 77, 114, 154, 195, 224, 279, 335, 395],
    Q: [17, 32, 53, 78, 106, 134, 154, 192, 230, 271],
    H: [10, 20, 32, 48, 65, 82, 95, 118, 141, 167],
  };

  const caps = bytesPerVersion[preferredErrorCorrection];
  const versionIdx = caps.findIndex((cap) => cap >= charCount);
  const estimatedVersion = versionIdx === -1 ? 40 : versionIdx + 1;

  return {
    data,
    errorCorrection: preferredErrorCorrection,
    estimatedVersion,
    charCount,
    mode,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// BASE64 ENCODE / DECODE
// ─────────────────────────────────────────────────────────────────────────────

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
export function base64Encode(input: string, urlSafe = false): Base64Result {
  const encoded = btoa(encodeURIComponent(input).replace(/%([0-9A-F]{2})/g,
    (_, hex: string) => String.fromCharCode(parseInt(hex, 16))
  ));

  const output = urlSafe
    ? encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
    : encoded;

  return {
    output,
    byteLength: new TextEncoder().encode(input).length,
    isUrlSafe: urlSafe,
  };
}

/**
 * Decodes a base64 (or URL-safe base64) string back to a plain string.
 * @param input Base64 string to decode
 */
export function base64Decode(input: string): { output: string; valid: boolean; error?: string } {
  try {
    // Normalize URL-safe base64
    const normalized = input
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(input.length + (4 - (input.length % 4)) % 4, '=');

    const decoded = decodeURIComponent(
      atob(normalized)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    );

    return { output: decoded, valid: true };
  } catch (err) {
    return {
      output: '',
      valid: false,
      error: err instanceof Error ? err.message : 'Failed to decode base64',
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// URL SLUGIFY
// ─────────────────────────────────────────────────────────────────────────────

export interface SlugOptions {
  separator?: string;     // Default: '-'
  lowercase?: boolean;    // Default: true
  maxLength?: number;     // Truncate slug at this many chars (after separator handling)
  strict?: boolean;       // If true, only allow [a-z0-9-]
}

/**
 * Converts a string to a URL-friendly slug.
 * Handles Unicode characters, removes diacritics, strips special characters.
 * @param input Text to slugify
 * @param options Slug generation options
 */
export function urlSlugify(input: string, options: SlugOptions = {}): string {
  const { separator = '-', lowercase = true, maxLength, strict = false } = options;

  let slug = input
    // Normalize Unicode (remove diacritics)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Replace spaces, slashes, underscores with separator
    .replace(/[\s/\\._]+/g, separator)
    // Remove special chars (in strict mode: only letters, numbers, separator)
    .replace(strict ? /[^a-z0-9-]/gi : /[^\w\s-]/g, '')
    // Collapse multiple separators
    .replace(new RegExp(`[${separator}]+`, 'g'), separator)
    // Trim leading/trailing separators
    .replace(new RegExp(`^${separator}|${separator}$`, 'g'), '');

  if (lowercase) {
    slug = slug.toLowerCase();
  }

  if (maxLength && slug.length > maxLength) {
    slug = slug.slice(0, maxLength).replace(new RegExp(`${separator}$`), '');
  }

  return slug;
}
