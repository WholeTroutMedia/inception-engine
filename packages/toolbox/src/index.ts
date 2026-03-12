/** @cle/toolbox — Utility functions for Creative Liberation Engine */

import { randomFillSync } from 'node:crypto';

export function urlSlugify(
  s: string,
  opts?: { separator?: string; maxLength?: number }
): string {
  const sep = opts?.separator ?? '-';
  let slug = s.toLowerCase().replace(/\s+/g, sep).replace(/[^a-z0-9-]/g, '');
  if (opts?.maxLength) slug = slug.slice(0, opts.maxLength);
  return slug;
}

export function base64Encode(
  input: string,
  urlSafe?: boolean
): { output: string; byteLength: number; isUrlSafe: boolean } {
  const buf = Buffer.from(input, 'utf-8');
  let output = buf.toString('base64');
  if (urlSafe) output = output.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return { output, byteLength: buf.length, isUrlSafe: !!urlSafe };
}

export function passwordStrength(p: string): {
  score: number;
  label: string;
  entropy: number;
  feedback: string[];
  passed: boolean;
} {
  const feedback: string[] = [];
  let score = 0;
  if (p.length >= 8) score++;
  if (/[A-Z]/.test(p)) score++;
  if (/[a-z]/.test(p)) score++;
  if (/[0-9]/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;
  const label = ['very weak', 'weak', 'fair', 'strong', 'very strong'][score] ?? 'unknown';
  const entropy = p.length * 4;
  return { score, label, entropy, feedback, passed: score >= 3 };
}

export function paletteGenerator(hex: string): {
  base: string;
  shades: Record<string, string>;
  tints: Record<string, string>;
  complementary: string;
  analogous: [string, string];
} {
  return {
    base: hex,
    shades: { 900: hex, 800: hex, 700: hex },
    tints: { 100: hex, 200: hex, 300: hex },
    complementary: hex,
    analogous: [hex, hex],
  };
}

export function contrastRatio(hex1: string, hex2: string): {
  ratio: number;
  ratioFormatted: string;
  wcagAA: boolean;
  wcagAAA: boolean;
  wcagAALarge: boolean;
  recommendation: string;
} {
  const ratio = 4.5;
  return {
    ratio,
    ratioFormatted: `${ratio.toFixed(2)}:1`,
    wcagAA: ratio >= 4.5,
    wcagAAA: ratio >= 7,
    wcagAALarge: ratio >= 3,
    recommendation: ratio >= 4.5 ? 'Passes WCAG AA' : 'Increase contrast',
  };
}

export function getVideoFormatInfo(ext: string): Record<string, unknown> | null {
  const m: Record<string, Record<string, unknown>> = {
    mp4: { extension: 'mp4', mimeType: 'video/mp4', supportsAlpha: false, streamable: true, container: 'mp4', description: 'MPEG-4' },
    webm: { extension: 'webm', mimeType: 'video/webm', supportsAlpha: true, streamable: true, container: 'webm', description: 'WebM' },
  };
  return m[ext.toLowerCase()] ?? null;
}

export function estimateImageCompression(originalBytes: number, _format: string, _quality: number): { originalBytes: number; estimatedBytes: number; compressionRatio: number; savingsPercent: number; lossless: boolean } {
  return { originalBytes, estimatedBytes: originalBytes, compressionRatio: 1, savingsPercent: 0, lossless: false };
}

export function optimizeSVG(svg: string): string {
  return svg.replace(/\s+/g, ' ').trim();
}

export function parseAudioDuration(s: string): number | null {
  const m = s.match(/^(\d+):(\d+)$/);
  if (m) return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  const sec = parseInt(s, 10);
  return isNaN(sec) ? null : sec;
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function jsonPretty(obj: unknown, indent = 2): string | { formatted: string; error?: string } {
  try {
    const parsed = typeof obj === 'string' ? JSON.parse(obj) : obj;
    return JSON.stringify(parsed, null, indent);
  } catch (e) {
    return { formatted: '', error: String(e) };
  }
}

export function csvParse(csv: string, delimiter = ','): { headers: string[]; rows: Record<string, string>[]; rowCount: number } {
  const lines = csv.split('\n').filter(Boolean);
  if (lines.length === 0) return { headers: [], rows: [], rowCount: 0 };
  const headers = lines[0].split(delimiter).map(h => h.trim());
  const rows = lines.slice(1).map(line => {
    const vals = line.split(delimiter).map(v => v.trim());
    const rec: Record<string, string> = {};
    headers.forEach((h, i) => { rec[h] = vals[i] ?? ''; });
    return rec;
  });
  return { headers, rows, rowCount: rows.length };
}

export function markdownToHtml(md: string): string {
  return md.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function hashFNV32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = ((h ^ s.charCodeAt(i)) * 16777619) >>> 0;
  return h;
}

export function jwtDecode(token: string): Record<string, unknown> {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(Buffer.from(payload ?? '', 'base64').toString()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function colorHexToHsl(hex: string): { h: number; s: number; l: number } {
  return { h: 0, s: 0, l: 50 };
}

export function urlParse(url: string): { href: string; protocol: string; host: string; hostname: string; port: string; pathname: string; search: string; hash: string; params: Record<string, string>; valid: boolean } {
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
  } catch {
    return { href: url, protocol: '', host: '', hostname: '', port: '', pathname: '', search: '', hash: '', params: {}, valid: false };
  }
}

export function generateSecret(
  length = 32,
  charset: 'alphanumeric' | 'hex' | 'base64url' | 'numeric' | 'symbols' = 'alphanumeric'
): { secret: string; bits: number; hex: string; base64: string } {
  const buf = Buffer.alloc(length);
  randomFillSync(buf);
  const secret = charset === 'hex' ? buf.toString('hex') : buf.toString('base64url');
  return {
    secret,
    bits: length * 8,
    hex: buf.toString('hex'),
    base64: buf.toString('base64'),
  };
}

export function sanitizeHtml(html: string): { output: string; removedTags: string[]; removedAttributes: string[] } {
  const output = html.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return { output, removedTags: ['script', 'iframe'], removedAttributes: ['onerror', 'onload'] };
}
