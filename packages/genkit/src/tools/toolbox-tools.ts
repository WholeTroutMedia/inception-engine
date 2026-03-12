/**
 * TOOL-03: Toolbox Genkit Tool Registration
 * packages/genkit/src/tools/toolbox-tools.ts
 *
 * Registers @cle/toolbox utility functions as Genkit tools
 * so agents can invoke them directly during AI generation.
 *
 * Domain: utilities (convert, format, optimize, encode, generate, utility, tool)
 * Source: IECR Google Doc Tab 8 — Unified Toolbox Model
 *
 * All outputSchemas are derived directly from the matching TypeScript interfaces
 * in packages/toolbox/src/categories/*.ts to guarantee type safety.
 */

import { z } from 'genkit';
import { ai } from '../index.js';

// ─── Media Utilities ──────────────────────────────────────────────────────────

/** Get technical info about a video format by file extension */
export const videoFormatInfoTool = ai.defineTool(
    {
        name: 'toolbox_videoFormatInfo',
        description: 'Get technical info about a video file format — MIME type, alpha support, streaming, container type.',
        inputSchema: z.object({
            extension: z.string().describe('File extension like mp4, webm, mov (without the dot)'),
        }),
        outputSchema: z.object({
            extension: z.string(),
            mimeType: z.string(),
            supportsAlpha: z.boolean(),
            streamable: z.boolean(),
            container: z.string(),
            description: z.string(),
            error: z.string().optional(),
        }).partial(),
    },
    async (input) => {
        const { getVideoFormatInfo } = await import('@cle/toolbox');
        return getVideoFormatInfo(input.extension) ?? { error: `Unknown format: ${input.extension}` };
    },
);

/** Estimate post-compression image file size */
export const imageCompressTool = ai.defineTool(
    {
        name: 'toolbox_imageCompressEstimate',
        description: 'Estimate compressed image size and savings percentage given original bytes and target format.',
        inputSchema: z.object({
            originalBytes: z.number().describe('Original file size in bytes'),
            targetFormat: z.enum(['jpeg', 'webp', 'avif', 'png']),
            quality: z.number().min(0).max(100).default(80).describe('Quality level 0–100'),
        }),
        outputSchema: z.object({
            originalBytes: z.number(),
            estimatedBytes: z.number(),
            compressionRatio: z.number(),
            savingsPercent: z.number(),
            lossless: z.boolean(),
        }),
    },
    async (input) => {
        const { estimateImageCompression } = await import('@cle/toolbox');
        return estimateImageCompression(input.originalBytes, input.targetFormat, input.quality);
    },
);

/** Optimize an SVG string */
export const svgOptimizeTool = ai.defineTool(
    {
        name: 'toolbox_svgOptimize',
        description: 'Lightweight SVG optimizer — removes comments, collapses whitespace, strips empty attributes.',
        inputSchema: z.object({ svg: z.string().describe('SVG markup string to optimize') }),
        outputSchema: z.object({ optimized: z.string(), originalLength: z.number() }),
    },
    async (input) => {
        const { optimizeSVG } = await import('@cle/toolbox');
        return { optimized: optimizeSVG(input.svg), originalLength: input.svg.length };
    },
);

/** Parse audio duration from human-readable strings */
export const audioDurationTool = ai.defineTool(
    {
        name: 'toolbox_audioDurationParse',
        description: 'Parse audio duration from strings like "3:45", "1:23:00", "225s" — returns seconds and formatted string.',
        inputSchema: z.object({ input: z.string().describe('Duration string to parse') }),
        outputSchema: z.object({
            seconds: z.number().nullable(),
            formatted: z.string().nullable(),
            valid: z.boolean(),
        }),
    },
    async (input) => {
        const { parseAudioDuration, formatDuration } = await import('@cle/toolbox');
        const seconds = parseAudioDuration(input.input);
        return seconds !== null
            ? { seconds, formatted: formatDuration(seconds), valid: true }
            : { seconds: null, formatted: null, valid: false };
    },
);

// ─── Data Utilities ───────────────────────────────────────────────────────────

/** Pretty-print a JSON string */
export const jsonPrettyTool = ai.defineTool(
    {
        name: 'toolbox_jsonPretty',
        description: 'Pretty-print a JSON string with configurable indentation. Returns formatted string or error.',
        inputSchema: z.object({
            json: z.string().describe('JSON string to format'),
            indent: z.number().default(2).describe('Number of spaces for indentation'),
        }),
        outputSchema: z.object({ formatted: z.string(), error: z.string().optional() }),
    },
    async (input) => {
        const { jsonPretty } = await import('@cle/toolbox');
        const result = jsonPretty(input.json, input.indent);
        // jsonPretty may return a string or { formatted, error } — normalize
        if (typeof result === 'string') return { formatted: result };
        return result as { formatted: string; error?: string };
    },
);

/** Parse CSV string into rows with headers */
export const csvParseTool = ai.defineTool(
    {
        name: 'toolbox_csvParse',
        description: 'Parse a CSV string into structured rows with headers.',
        inputSchema: z.object({
            csv: z.string().describe('CSV content string'),
            delimiter: z.string().default(',').describe('Column delimiter character'),
        }),
        outputSchema: z.object({
            headers: z.array(z.string()),
            rows: z.array(z.record(z.string())),
            rowCount: z.number(),
        }),
    },
    async (input) => {
        const { csvParse } = await import('@cle/toolbox');
        const result = csvParse(input.csv, input.delimiter) as {
            headers: string[];
            rows: Record<string, string>[];
            rowCount: number;
        };
        return result;
    },
);

/** Convert markdown to HTML */
export const markdownToHtmlTool = ai.defineTool(
    {
        name: 'toolbox_markdownToHtml',
        description: 'Convert a markdown string to an HTML string.',
        inputSchema: z.object({ markdown: z.string() }),
        outputSchema: z.object({ html: z.string() }),
    },
    async (input) => {
        const { markdownToHtml } = await import('@cle/toolbox');
        return { html: markdownToHtml(input.markdown) as string };
    },
);

// ─── Dev Utilities ────────────────────────────────────────────────────────────

/** Generate a cryptographically random UUID v4 */
export const uuidTool = ai.defineTool(
    {
        name: 'toolbox_generateUUID',
        description: 'Generate a cryptographically random RFC 4122 v4 UUID.',
        inputSchema: z.object({}),
        outputSchema: z.object({ uuid: z.string() }),
    },
    async () => {
        const { generateUUID } = await import('@cle/toolbox');
        return { uuid: generateUUID() as string };
    },
);

/** FNV-1a 32-bit fast hash */
export const hashFnvTool = ai.defineTool(
    {
        name: 'toolbox_hashFNV32',
        description: 'Fast non-cryptographic FNV-1a 32-bit hash for a string. Returns decimal and hex.',
        inputSchema: z.object({ input: z.string() }),
        outputSchema: z.object({ hash: z.number(), hex: z.string() }),
    },
    async (input) => {
        const { hashFNV32 } = await import('@cle/toolbox');
        const hash = hashFNV32(input.input) as number;
        return { hash, hex: hash.toString(16) };
    },
);

/** Decode a JWT token (no signature verification) */
export const jwtDecodeTool = ai.defineTool(
    {
        name: 'toolbox_jwtDecode',
        description: 'Decode a JWT token (header + payload inspection only, no signature verification). Returns expiry and claims.',
        inputSchema: z.object({ token: z.string() }),
        outputSchema: z.object({
            header: z.record(z.unknown()).optional(),
            payload: z.record(z.unknown()).optional(),
            error: z.string().optional(),
        }),
    },
    async (input) => {
        const { jwtDecode } = await import('@cle/toolbox');
        const result = jwtDecode(input.token) as Record<string, unknown> | null;
        if (!result) return { error: 'Invalid JWT format' };
        return result as { header?: Record<string, unknown>; payload?: Record<string, unknown> };
    },
);

// ─── Design Utilities ─────────────────────────────────────────────────────────

/** Convert hex color to HSL */
export const hexToHslTool = ai.defineTool(
    {
        name: 'toolbox_colorHexToHsl',
        description: 'Convert a hex color like #FF5733 to HSL values and a CSS hsl() string.',
        inputSchema: z.object({ hex: z.string().describe('Hex color string, e.g. #FF5733') }),
        outputSchema: z.object({ h: z.number(), s: z.number(), l: z.number(), css: z.string() }),
    },
    async (input) => {
        const { colorHexToHsl } = await import('@cle/toolbox');
        return colorHexToHsl(input.hex) as { h: number; s: number; l: number; css: string };
    },
);

/** WCAG contrast ratio checker — uses wcagAA / wcagAAA field names from ContrastResult */
export const contrastRatioTool = ai.defineTool(
    {
        name: 'toolbox_contrastRatio',
        description: 'Calculate WCAG 2.1 contrast ratio between two hex colors. Returns ratio and AA/AAA compliance.',
        inputSchema: z.object({
            hex1: z.string().describe('First color hex'),
            hex2: z.string().describe('Second color hex'),
        }),
        outputSchema: z.object({
            ratio: z.number(),
            ratioFormatted: z.string(),
            wcagAA: z.boolean(),
            wcagAAA: z.boolean(),
            wcagAALarge: z.boolean(),
            recommendation: z.string(),
        }),
    },
    async (input) => {
        const { contrastRatio } = await import('@cle/toolbox');
        return contrastRatio(input.hex1, input.hex2) as {
            ratio: number; ratioFormatted: string; wcagAA: boolean;
            wcagAAA: boolean; wcagAALarge: boolean; recommendation: string;
        };
    },
);

/** Generate a tonal palette from a base color */
export const paletteTool = ai.defineTool(
    {
        name: 'toolbox_paletteGenerator',
        description: 'Generate tints, shades, complementary and analogous colors from a base hex color.',
        inputSchema: z.object({ hex: z.string() }),
        outputSchema: z.object({
            base: z.string(),
            shades: z.record(z.string()),
            tints: z.record(z.string()),
            complementary: z.string(),
            analogous: z.tuple([z.string(), z.string()]),
        }),
    },
    async (input) => {
        const { paletteGenerator } = await import('@cle/toolbox');
        return paletteGenerator(input.hex) as {
            base: string; shades: Record<string, string>; tints: Record<string, string>;
            complementary: string; analogous: [string, string];
        };
    },
);

// ─── Web Utilities ────────────────────────────────────────────────────────────

/** Parse a URL into components */
export const urlParseTool = ai.defineTool(
    {
        name: 'toolbox_urlParse',
        description: 'Parse a URL into its components — protocol, host, pathname, query params, hash.',
        inputSchema: z.object({ url: z.string() }),
        outputSchema: z.object({
            href: z.string(),
            protocol: z.string(),
            host: z.string(),
            hostname: z.string(),
            port: z.string(),
            pathname: z.string(),
            search: z.string(),
            hash: z.string(),
            params: z.record(z.string()),
            valid: z.boolean(),
            error: z.string().optional(),
        }),
    },
    async (input) => {
        const { urlParse } = await import('@cle/toolbox');
        return urlParse(input.url) as unknown as {
            href: string; protocol: string; host: string; hostname: string;
            port: string; pathname: string; search: string; hash: string;
            params: Record<string, string>; valid: boolean; error?: string;
        };
    },
);

/** Base64 encode a string — returns Base64Result: { output, byteLength, isUrlSafe } */
export const base64EncodeTool = ai.defineTool(
    {
        name: 'toolbox_base64Encode',
        description: 'Encode a string to base64. Optionally URL-safe (replaces + with - and / with _). Returns the encoded string in `output`.',
        inputSchema: z.object({
            input: z.string(),
            urlSafe: z.boolean().default(false),
        }),
        outputSchema: z.object({
            output: z.string(),
            byteLength: z.number(),
            isUrlSafe: z.boolean(),
        }),
    },
    async (input) => {
        const { base64Encode } = await import('@cle/toolbox');
        return base64Encode(input.input, input.urlSafe);
    },
);

/** URL-safe slugify */
export const slugifyTool = ai.defineTool(
    {
        name: 'toolbox_urlSlugify',
        description: 'Convert a string into a URL-safe slug. Replaces spaces and special chars with a separator.',
        inputSchema: z.object({
            input: z.string(),
            separator: z.string().default('-'),
            maxLength: z.number().optional(),
        }),
        outputSchema: z.object({ slug: z.string() }),
    },
    async (input) => {
        const { urlSlugify } = await import('@cle/toolbox');
        const slug = urlSlugify(input.input, { separator: input.separator, maxLength: input.maxLength });
        return { slug };
    },
);

// ─── Security Utilities ───────────────────────────────────────────────────────

/** Score password strength — uses `feedback` field per PasswordStrengthResult */
export const passwordStrengthTool = ai.defineTool(
    {
        name: 'toolbox_passwordStrength',
        description: 'Score a password 0–4 with entropy estimation and actionable improvement feedback.',
        inputSchema: z.object({ password: z.string() }),
        outputSchema: z.object({
            score: z.number(),
            label: z.string(),
            entropy: z.number(),
            feedback: z.array(z.string()),
            passed: z.boolean(),
        }),
    },
    async (input) => {
        const { passwordStrength } = await import('@cle/toolbox');
        return passwordStrength(input.password) as {
            score: number; label: string; entropy: number; feedback: string[]; passed: boolean;
        };
    },
);

/** Generate a cryptographically secure random secret — returns { secret, bits, hex, base64 } */
export const generateSecretTool = ai.defineTool(
    {
        name: 'toolbox_generateSecret',
        description: 'Generate a cryptographically secure random secret. Returns secret, bits of entropy, hex, and base64.',
        inputSchema: z.object({
            length: z.number().min(8).max(256).default(32),
            charset: z.enum(['alphanumeric', 'hex', 'base64url', 'numeric', 'symbols']).default('alphanumeric'),
        }),
        outputSchema: z.object({
            secret: z.string(),
            bits: z.number(),
            hex: z.string(),
            base64: z.string(),
        }),
    },
    async (input) => {
        const { generateSecret } = await import('@cle/toolbox');
        return generateSecret(input.length, input.charset) as {
            secret: string; bits: number; hex: string; base64: string;
        };
    },
);

/** Sanitize HTML — SanitizeResult returns { output, removedTags, removedAttributes } */
export const sanitizeHtmlTool = ai.defineTool(
    {
        name: 'toolbox_sanitizeHtml',
        description: 'Strip dangerous HTML tags and attributes. Returns sanitized output plus lists of removed tags and attributes.',
        inputSchema: z.object({ input: z.string() }),
        outputSchema: z.object({
            output: z.string(),
            removedTags: z.array(z.string()),
            removedAttributes: z.array(z.string()),
        }),
    },
    async (input) => {
        const { sanitizeHtml } = await import('@cle/toolbox');
        return sanitizeHtml(input.input) as {
            output: string; removedTags: string[]; removedAttributes: string[];
        };
    },
);

// ─── Registry ─────────────────────────────────────────────────────────────────

/** All toolbox Genkit tools — import this in server.ts to register them */
export const ALL_TOOLBOX_GENKIT_TOOLS = [
    videoFormatInfoTool,
    imageCompressTool,
    svgOptimizeTool,
    audioDurationTool,
    jsonPrettyTool,
    csvParseTool,
    markdownToHtmlTool,
    uuidTool,
    hashFnvTool,
    jwtDecodeTool,
    hexToHslTool,
    contrastRatioTool,
    paletteTool,
    urlParseTool,
    base64EncodeTool,
    slugifyTool,
    passwordStrengthTool,
    generateSecretTool,
    sanitizeHtmlTool,
];
