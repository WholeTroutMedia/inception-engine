/**
 * @inception/toolbox — Media Utilities
 * Pure TypeScript, zero external dependencies.
 * TOOL-02: video format info, image compress estimate, SVG optimize, audio duration parse
 */
export interface VideoFormatInfo {
    extension: string;
    mimeType: string;
    supportsAlpha: boolean;
    streamable: boolean;
    container: string;
    description: string;
}
export declare function getVideoFormatInfo(extension: string): VideoFormatInfo | null;
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
export declare function estimateImageCompression(originalBytes: number, targetFormat: 'jpeg' | 'webp' | 'avif' | 'png', quality?: number): ImageCompressEstimate;
/**
 * Lightweight SVG string optimizer — removes comments, extra whitespace,
 * xml declarations, and redundant attributes. Zero deps.
 */
export declare function optimizeSVG(svgString: string): string;
/**
 * Parse audio duration from common string formats:
 *   "3:45", "1:23:45", "3m45s", "225s", "225"
 * Returns duration in seconds.
 */
export declare function parseAudioDuration(input: string): number | null;
/**
 * Format duration in seconds to "MM:SS" or "HH:MM:SS"
 */
export declare function formatDuration(seconds: number): string;
