/**
 * TOOL-03: Register @inception/toolbox functions as Genkit tools
 * packages/toolbox/src/mcp-tools.ts
 *
 * Wraps pure toolbox functions as Genkit tool definitions so agents
 * can call them directly during AI generation (no HTTP required).
 *
 * API surface locked to on-disk category exports (verified 2026-03-07).
 */

import { z } from 'genkit';

// — Media ────────────────────────────────────────────────────────────
import {
    getVideoFormatInfo,
    estimateImageCompression,
    optimizeSVG,
    parseAudioDuration,
    formatDuration,
} from './categories/media.js';

// ── Data ─────────────────────────────────────────────────────────────────────
import {
    jsonPretty,
    csvParse,
    markdownToHtml,
} from './categories/data.js';

// — Dev ──────────────────────────────────────────────────────────────
import {
    generateUUID,
    hashFNV32,
    regexTest,
    jwtDecode,
} from './categories/dev.js';

// ── Design ───────────────────────────────────────────────────────────────────
import {
    colorHexToHsl,
    contrastRatio,
    paletteGenerator,
    gradientString,
} from './categories/design.js';

// ── Web ───────────────────────────────────────────────────────────────────────
import {
    urlParse,
    qrDataEncode,
    base64Encode,
    base64Decode,
    urlSlugify,
} from './categories/web.js';

// ── Security ──────────────────────────────────────────────────────────────────
import {
    passwordStrength,
    generateSecret,
    sanitizeHtml,
} from './categories/security.js';

// ─────────────────────────────────────────────────────────────────────────────
// MEDIA TOOLS
// ─────────────────────────────────────────────────────────────────────────────

export const videoFormatInfoTool = {
    name: 'videoFormatInfo',
    description: 'Get technical info about a video file format (MIME type, alpha support, streaming, container)',
    inputSchema: z.object({ extension: z.string().describe('File extension like mp4, webm, mov') }),
    fn: ({ extension }: { extension: string }) => getVideoFormatInfo(extension) ?? { error: 'Unknown format' },
};

export const imageCompressTool = {
    name: 'imageCompressEstimate',
    description: 'Estimate post-compression image size and savings percentage',
    inputSchema: z.object({
        originalBytes: z.number().describe('Original file size in bytes'),
        targetFormat: z.enum(['jpeg', 'webp', 'avif', 'png']).describe('Target output format'),
        quality: z.number().min(0).max(100).default(80).describe('Quality level 0-100'),
    }),
    fn: ({ originalBytes, targetFormat, quality }: { originalBytes: number; targetFormat: 'jpeg' | 'webp' | 'avif' | 'png'; quality?: number }) =>
        estimateImageCompression(originalBytes, targetFormat, quality),
};

export const svgOptimizeTool = {
    name: 'svgOptimize',
    description: 'Lightweight SVG optimizer — removes comments, collapses whitespace, strips empty attributes',
    inputSchema: z.object({ svg: z.string().describe('SVG string to optimize') }),
    fn: ({ svg }: { svg: string }) => ({ optimized: optimizeSVG(svg), originalLength: svg.length }),
};

export const audioDurationTool = {
    name: 'audioDurationParse',
    description: 'Parse audio duration from strings like "3:45", "1:23:00", "225s" — returns seconds and formatted string',
    inputSchema: z.object({ input: z.string().describe('Duration string') }),
    fn: ({ input }: { input: string }) => {
        const seconds = parseAudioDuration(input);
        return seconds !== null
            ? { seconds, formatted: formatDuration(seconds), valid: true }
            : { seconds: null, formatted: null, valid: false };
    },
};

// ─────────────────────────────────────────────────────────────────────────────
// DATA TOOLS
// ─────────────────────────────────────────────────────────────────────────────

export const jsonPrettyTool = {
    name: 'jsonPretty',
    description: 'Pretty-print JSON with configurable indentation',
    inputSchema: z.object({
        json: z.string().describe('JSON string'),
        indent: z.number().default(2).describe('Indentation spaces'),
    }),
    fn: ({ json, indent }: { json: string; indent?: number }) => jsonPretty(json, indent),
};

export const csvParseTool = {
    name: 'csvParse',
    description: 'Parse CSV string into structured rows with headers',
    inputSchema: z.object({
        csv: z.string().describe('CSV content'),
        delimiter: z.string().default(',').describe('Column delimiter'),
    }),
    fn: ({ csv, delimiter }: { csv: string; delimiter?: string }) => csvParse(csv, delimiter),
};

export const markdownToHtmlTool = {
    name: 'markdownToHtml',
    description: 'Convert markdown text to HTML string',
    inputSchema: z.object({ markdown: z.string() }),
    fn: ({ markdown }: { markdown: string }) => ({ html: markdownToHtml(markdown) }),
};

// ─────────────────────────────────────────────────────────────────────────────
// DEV TOOLS
// ─────────────────────────────────────────────────────────────────────────────

export const uuidTool = {
    name: 'generateUUID',
    description: 'Generate a cryptographically random RFC 4122 v4 UUID',
    inputSchema: z.object({}),
    fn: () => ({ uuid: generateUUID() }),
};

export const hashFnvTool = {
    name: 'hashFNV32',
    description: 'Fast non-cryptographic FNV-1a 32-bit hash for short strings',
    inputSchema: z.object({ input: z.string() }),
    fn: ({ input }: { input: string }) => ({ hash: hashFNV32(input), hex: hashFNV32(input).toString(16) }),
};

export const regexTool = {
    name: 'regexTest',
    description: 'Test a regex pattern against an input string — returns all matches and named groups',
    inputSchema: z.object({
        pattern: z.string().describe('Regex pattern'),
        input: z.string().describe('String to test against'),
        flags: z.string().default('g').describe('Regex flags'),
    }),
    fn: ({ pattern, input, flags }: { pattern: string; input: string; flags?: string }) => regexTest(pattern, input, flags),
};

export const jwtDecodeTool = {
    name: 'jwtDecode',
    description: 'Decode a JWT token (no signature verification) — inspects header, payload, expiry',
    inputSchema: z.object({ token: z.string() }),
    fn: ({ token }: { token: string }) => jwtDecode(token) ?? { error: 'Invalid JWT format' },
};

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOOLS
// ─────────────────────────────────────────────────────────────────────────────

export const hexToHslTool = {
    name: 'colorHexToHsl',
    description: 'Convert hex color to HSL values and CSS string',
    inputSchema: z.object({ hex: z.string().describe('Hex color like #FF5733') }),
    fn: ({ hex }: { hex: string }) => colorHexToHsl(hex),
};

export const contrastRatioTool = {
    name: 'contrastRatio',
    description: 'Calculate WCAG contrast ratio between two hex colors with AA/AAA compliance flags',
    inputSchema: z.object({ hex1: z.string(), hex2: z.string() }),
    fn: ({ hex1, hex2 }: { hex1: string; hex2: string }) => contrastRatio(hex1, hex2),
};

export const paletteTool = {
    name: 'paletteGenerator',
    description: 'Generate tints, shades, complementary and analogous colors from a base hex color',
    inputSchema: z.object({ hex: z.string() }),
    fn: ({ hex }: { hex: string }) => paletteGenerator(hex),
};

export const gradientTool = {
    name: 'gradientString',
    description: 'Generate a CSS gradient string from color stops',
    inputSchema: z.object({
        type: z.enum(['linear', 'radial', 'conic']).default('linear'),
        direction: z.string().optional().describe('e.g. "135deg" or "to top right"'),
        stops: z.array(z.object({
            color: z.string(),
            position: z.string().optional(),
        })).min(2),
    }),
    fn: ({ type, direction, stops }: { type: 'linear' | 'radial' | 'conic'; direction?: string; stops: Array<{ color: string; position?: string }> }) =>
        ({ gradient: gradientString({ type, direction, stops }) }),
};

// ─────────────────────────────────────────────────────────────────────────────
// WEB TOOLS
// ─────────────────────────────────────────────────────────────────────────────

export const urlParseTool = {
    name: 'urlParse',
    description: 'Parse a URL into its components (protocol, host, path, query params)',
    inputSchema: z.object({ url: z.string() }),
    fn: ({ url }: { url: string }) => urlParse(url),
};

export const qrEncodeTool = {
    name: 'qrDataEncode',
    description: 'Classify text for QR encoding — returns version estimate and encoding mode',
    inputSchema: z.object({
        data: z.string(),
        errorCorrection: z.enum(['L', 'M', 'Q', 'H']).default('M'),
    }),
    fn: ({ data, errorCorrection }: { data: string; errorCorrection?: 'L' | 'M' | 'Q' | 'H' }) =>
        qrDataEncode(data, errorCorrection),
};

export const base64EncodeTool = {
    name: 'base64Encode',
    description: 'Encode a string to base64 or URL-safe base64',
    inputSchema: z.object({ input: z.string(), urlSafe: z.boolean().default(false) }),
    fn: ({ input, urlSafe }: { input: string; urlSafe?: boolean }) => base64Encode(input, urlSafe),
};

export const base64DecodeTool = {
    name: 'base64Decode',
    description: 'Decode a base64 or URL-safe base64 string',
    inputSchema: z.object({ input: z.string() }),
    fn: ({ input }: { input: string }) => base64Decode(input),
};

export const slugifyTool = {
    name: 'urlSlugify',
    description: 'Convert a string into a URL-safe slug',
    inputSchema: z.object({
        input: z.string(),
        separator: z.string().default('-'),
        maxLength: z.number().optional(),
    }),
    fn: ({ input, separator, maxLength }: { input: string; separator?: string; maxLength?: number }) =>
        ({ slug: urlSlugify(input, { separator, maxLength }) }),
};

// ─────────────────────────────────────────────────────────────────────────────
// SECURITY TOOLS
// ─────────────────────────────────────────────────────────────────────────────

export const passwordStrengthTool = {
    name: 'passwordStrength',
    description: 'Score a password 0-4 with entropy estimation and improvement feedback',
    inputSchema: z.object({ password: z.string() }),
    fn: ({ password }: { password: string }) => passwordStrength(password),
};

export const generateSecretTool = {
    name: 'generateSecret',
    description: 'Generate a cryptographically secure random secret or token',
    inputSchema: z.object({
        length: z.number().min(8).max(256).default(32),
        charset: z.enum(['alphanumeric', 'hex', 'base64url', 'numeric', 'symbols']).default('alphanumeric'),
    }),
    fn: ({ length, charset }: { length?: number; charset?: 'alphanumeric' | 'hex' | 'base64url' | 'numeric' | 'symbols' }) =>
        generateSecret(length, charset),
};

export const sanitizeHtmlTool = {
    name: 'sanitizeHtml',
    description: 'Strip dangerous HTML tags/attributes — allows safe rich text subset',
    inputSchema: z.object({ input: z.string() }),
    fn: ({ input }: { input: string }) => sanitizeHtml(input),
};

// ─────────────────────────────────────────────────────────────────────────────
// ALL TOOLS REGISTRY
// ─────────────────────────────────────────────────────────────────────────────

export const ALL_TOOLBOX_TOOLS = [
    videoFormatInfoTool,
    imageCompressTool,
    svgOptimizeTool,
    audioDurationTool,
    jsonPrettyTool,
    csvParseTool,
    markdownToHtmlTool,
    uuidTool,
    hashFnvTool,
    regexTool,
    jwtDecodeTool,
    hexToHslTool,
    contrastRatioTool,
    paletteTool,
    gradientTool,
    urlParseTool,
    qrEncodeTool,
    base64EncodeTool,
    base64DecodeTool,
    slugifyTool,
    passwordStrengthTool,
    generateSecretTool,
    sanitizeHtmlTool,
] as const;
