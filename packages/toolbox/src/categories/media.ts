/**
 * @inception/toolbox — Media Utilities
 * Pure TypeScript, zero external dependencies.
 * TOOL-02: video format info, image compress estimate, SVG optimize, audio duration parse
 */

// ─────────────────────────────────────────────────────────────────────────────
// VIDEO
// ─────────────────────────────────────────────────────────────────────────────

export interface VideoFormatInfo {
    extension: string;
    mimeType: string;
    supportsAlpha: boolean;
    streamable: boolean;
    container: string;
    description: string;
}

const VIDEO_FORMAT_MAP: Record<string, VideoFormatInfo> = {
    mp4:  { extension: 'mp4',  mimeType: 'video/mp4',       supportsAlpha: false, streamable: true,  container: 'MPEG-4', description: 'Widely compatible H.264/H.265 container' },
    webm: { extension: 'webm', mimeType: 'video/webm',      supportsAlpha: true,  streamable: true,  container: 'WebM',   description: 'Open-source VP8/VP9/AV1 container' },
    mov:  { extension: 'mov',  mimeType: 'video/quicktime',  supportsAlpha: true,  streamable: false, container: 'MOV',    description: 'Apple QuickTime container' },
    avi:  { extension: 'avi',  mimeType: 'video/x-msvideo', supportsAlpha: false, streamable: false, container: 'AVI',    description: 'Legacy Microsoft container' },
    mkv:  { extension: 'mkv',  mimeType: 'video/x-matroska',supportsAlpha: false, streamable: true,  container: 'Matroska','description': 'Open flexible container' },
};

export function getVideoFormatInfo(extension: string): VideoFormatInfo | null {
    return VIDEO_FORMAT_MAP[extension.toLowerCase().replace(/^\./, '')] ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// IMAGE
// ─────────────────────────────────────────────────────────────────────────────

export interface ImageCompressEstimate {
    originalBytes: number;
    estimatedBytes: number;
    compressionRatio: number;
    savingsPercent: number;
    lossless: boolean;
}

/**
 * Estimates post-compression file size based on format and quality.
 * Quality range: 0-100 (only applies to lossy formats like JPEG/WebP).
 */
export function estimateImageCompression(
    originalBytes: number,
    targetFormat: 'jpeg' | 'webp' | 'avif' | 'png',
    quality = 80
): ImageCompressEstimate {
    const formatBaseRatios: Record<string, number> = {
        jpeg: 0.1,
        webp: 0.075,
        avif: 0.06,
        png: 0.5, // lossless — varies wildly
    };
    const lossless = targetFormat === 'png';
    const baseRatio = formatBaseRatios[targetFormat] ?? 0.2;
    // Quality scaling: at q=100 → ratio * 2.5, at q=0 → ratio * 0.5
    const qualityScale = lossless ? 1 : 0.5 + (quality / 100) * 2;
    const estimatedBytes = Math.round(originalBytes * baseRatio * qualityScale);
    const compressionRatio = originalBytes / estimatedBytes;
    const savingsPercent = Math.round((1 - estimatedBytes / originalBytes) * 100);
    return { originalBytes, estimatedBytes, compressionRatio, savingsPercent, lossless };
}

// ─────────────────────────────────────────────────────────────────────────────
// SVG
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Lightweight SVG string optimizer — removes comments, extra whitespace,
 * xml declarations, and redundant attributes. Zero deps.
 */
export function optimizeSVG(svgString: string): string {
    return svgString
        .replace(/<!--[\s\S]*?-->/g, '')            // Remove comments
        .replace(/<\?xml[^?]*\?>/g, '')             // Remove XML declaration
        .replace(/\s+/g, ' ')                        // Collapse whitespace
        .replace(/>\s+</g, '><')                     // Remove space between tags
        .replace(/\s(\w+)=""/g, '')                  // Remove empty attributes
        .replace(/style="([^"]*)"/g, (_, s: string) => {
            // Collapse redundant style values  
            const clean = s.replace(/\s*:\s*/g, ':').replace(/\s*;\s*/g, ';').replace(/;$/, '');
            return `style="${clean}"`;
        })
        .trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// AUDIO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse audio duration from common string formats:
 *   "3:45", "1:23:45", "3m45s", "225s", "225"
 * Returns duration in seconds.
 */
export function parseAudioDuration(input: string): number | null {
    const s = input.trim();

    // HH:MM:SS or MM:SS
    const colonMatch = /^(\d+):(\d{2})(?::(\d{2}))?$/.exec(s);
    if (colonMatch) {
        const [, a, b, c] = colonMatch;
        if (c !== undefined) {
            return parseInt(a!) * 3600 + parseInt(b!) * 60 + parseInt(c);
        }
        return parseInt(a!) * 60 + parseInt(b!);
    }

    // 3m45s, 1h23m, etc.
    const dhmsMatch = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(s);
    if (dhmsMatch && s !== '') {
        const [, h, m, sec] = dhmsMatch;
        return (parseInt(h ?? '0') * 3600) + (parseInt(m ?? '0') * 60) + parseInt(sec ?? '0');
    }

    // Plain seconds
    const plainMatch = /^\d+(\.\d+)?$/.exec(s);
    if (plainMatch) return parseFloat(s);

    return null;
}

/**
 * Format duration in seconds to "MM:SS" or "HH:MM:SS"
 */
export function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
}
