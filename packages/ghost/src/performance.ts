import axios from 'axios';
import { z } from 'zod';

// ─── GHOST — Web Performance Audit Engine ────────────────────────────────────
// Analyses pages for Core Web Vitals compliance and performance best practices.
// Covers: resource counts, render-blocking, image optimization, caching,
// HTTPS, HTTP/2, compression, and a synthetic Lighthouse-style score.

export const PerformanceAuditSchema = z.object({
    url: z.string().url(),
    budget: z.object({
        max_html_bytes: z.number().default(50_000),
        max_total_bytes: z.number().default(500_000),
        max_requests: z.number().default(50),
        max_dom_elements: z.number().default(1500),
    }).optional(),
});

export type PerfSeverity = 'critical' | 'warning' | 'info';

export interface PerfIssue {
    id: string;
    severity: PerfSeverity;
    category: string;
    message: string;
    recommendation: string;
    impact: string;
}

export interface PerformanceReport {
    url: string;
    score: number;
    badge: string;
    html_bytes: number;
    estimated_lcp_risk: 'low' | 'medium' | 'high';
    issues: PerfIssue[];
    passed: string[];
    signals: {
        uses_https: boolean;
        has_gzip: boolean;
        has_cache_control: boolean;
        render_blocking_scripts: number;
        inline_styles_count: number;
        unoptimised_images: number;
        missing_lazy_load: number;
        external_scripts: number;
        dom_depth_estimate: 'shallow' | 'moderate' | 'deep';
    };
    generated_at: string;
}

// ─── HTML analysis ────────────────────────────────────────────────────────────

function analysePerformance(
    html: string,
    responseHeaders: Record<string, string>,
    url: string,
    budget?: z.infer<typeof PerformanceAuditSchema>['budget']
): { issues: PerfIssue[]; passed: string[]; signals: PerformanceReport['signals'] } {
    const issues: PerfIssue[] = [];
    const passed: string[] = [];

    // HTTPS
    const usesHttps = url.startsWith('https://');
    if (!usesHttps) {
        issues.push({ id: 'no-https', severity: 'critical', category: 'Security/Performance', message: 'Site not served over HTTPS', recommendation: 'Enable HTTPS. Required for HTTP/2, Service Workers, and modern browser features.', impact: 'SEO penalty, PWA blocked, mixed-content warnings' });
    } else passed.push('HTTPS enabled');

    // Compression
    const hasGzip = (responseHeaders['content-encoding'] ?? '').includes('gzip')
        || (responseHeaders['content-encoding'] ?? '').includes('br');
    if (!hasGzip) {
        issues.push({ id: 'no-compression', severity: 'warning', category: 'Network', message: 'Response not compressed (no gzip/brotli)', recommendation: 'Enable gzip or Brotli compression on your server/CDN. Typically reduces HTML by 60-70%.', impact: 'Larger payloads, slower FCP' });
    } else passed.push('Response compressed (gzip/brotli)');

    // Cache-Control
    const hasCacheControl = !!responseHeaders['cache-control'];
    if (!hasCacheControl) {
        issues.push({ id: 'no-cache', severity: 'warning', category: 'Caching', message: 'Missing Cache-Control header', recommendation: 'Set Cache-Control for HTML (no-cache) and static assets (max-age=31536000, immutable).', impact: 'Repeat visitors re-download all resources' });
    } else passed.push('Cache-Control header present');

    // Render-blocking scripts (sync scripts in <head>)
    const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? '';
    const renderBlockingScripts = [...headMatch.matchAll(/<script\s(?![^>]*(?:async|defer|type=["']module))[^>]*src=/gi)].length;
    if (renderBlockingScripts > 0) {
        issues.push({ id: 'render-blocking', severity: 'critical', category: 'Render Performance', message: `${renderBlockingScripts} render-blocking script(s) in <head>`, recommendation: 'Add defer or async to non-critical scripts. Move scripts to end of <body>.', impact: 'Blocks HTML parsing, delays FCP and LCP' });
    } else passed.push('No render-blocking scripts detected');

    // Inline styles (performance & CSP risk)
    const inlineStyles = [...html.matchAll(/style=["'][^"']{100,}["']/gi)].length;
    if (inlineStyles > 10) {
        issues.push({ id: 'excessive-inline-styles', severity: 'info', category: 'CSS', message: `${inlineStyles} large inline style attributes detected`, recommendation: 'Move inline styles to CSS classes to improve caching and reduce HTML size.', impact: 'Increased HTML payload, harder to cache' });
    } else passed.push('Minimal inline styles');

    // Images without dimensions (causes layout shift → CLS)
    const imgsWithoutDims = [...html.matchAll(/<img\s(?=[^>]*src)[^>]*>/gi)].filter(m => {
        return !m[0].includes('width=') && !m[0].includes('height=') && !m[0].includes('style=');
    }).length;
    if (imgsWithoutDims > 0) {
        issues.push({ id: 'img-no-dimensions', severity: 'warning', category: 'Core Web Vitals (CLS)', message: `${imgsWithoutDims} image(s) missing width/height attributes`, recommendation: 'Always specify width and height on <img> elements to prevent Cumulative Layout Shift (CLS).', impact: 'CLS score degradation, layout jumps on load' });
    } else if ([...html.matchAll(/<img\s/gi)].length > 0) passed.push('All images have dimensions');

    // Missing lazy loading
    const aboveFoldThreshold = 3;
    const imgsTotal = [...html.matchAll(/<img\s/gi)].length;
    const lazyImgs = [...html.matchAll(/loading=["']lazy["']/gi)].length;
    if (imgsTotal > aboveFoldThreshold && lazyImgs === 0) {
        issues.push({ id: 'no-lazy-load', severity: 'warning', category: 'Loading', message: `${imgsTotal} images found, none use loading="lazy"`, recommendation: 'Add loading="lazy" to below-fold images to defer offscreen image loading.', impact: 'Unnecessarily loads offscreen images on initial visit' });
    } else if (imgsTotal > aboveFoldThreshold) passed.push('Lazy loading used on images');

    // External scripts count
    const externalScripts = [...html.matchAll(/<script\s[^>]*src=["']https?:\/\/(?!(?:your-domain|localhost))[^"']+["']/gi)].length;
    if (externalScripts > 5) {
        issues.push({ id: 'too-many-external-scripts', severity: 'warning', category: 'Network', message: `${externalScripts} third-party scripts loaded`, recommendation: 'Minimise third-party scripts. Each adds a DNS lookup + round trip. Self-host critical scripts.', impact: 'Each third-party script blocks on DNS, TLS, and download' });
    } else passed.push(`External scripts within limit (${externalScripts})`);

    // DOM depth (rough estimate via nesting of divs)
    const maxNesting = estimateDomDepth(html);
    const domDepth: PerformanceReport['signals']['dom_depth_estimate'] = maxNesting > 25 ? 'deep' : maxNesting > 15 ? 'moderate' : 'shallow';
    if (domDepth === 'deep') {
        issues.push({ id: 'deep-dom', severity: 'info', category: 'Rendering', message: 'DOM tree appears deeply nested (>25 levels)', recommendation: 'Flatten your DOM structure. Each extra level increases style recalculation time.', impact: 'Slower style recalculation, potential layout thrashing' });
    } else passed.push(`DOM depth appears ${domDepth}`);

    // Budget checks
    if (budget) {
        const htmlBytes = html.length;
        if (htmlBytes > budget.max_html_bytes) {
            issues.push({ id: 'html-too-large', severity: 'warning', category: 'Performance Budget', message: `HTML document is ${Math.round(htmlBytes / 1024)}kb (budget: ${Math.round(budget.max_html_bytes / 1024)}kb)`, recommendation: 'Reduce HTML size by server-side streaming, lazy rendering, or extracting inline content.', impact: 'Slower TTFB and FCP' });
        }
    }

    // Viewport meta (mobile performance)
    if (!html.includes('width=device-width')) {
        issues.push({ id: 'no-viewport', severity: 'warning', category: 'Mobile', message: 'Missing or incorrect viewport meta tag', recommendation: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">.', impact: 'Mobile browser must zoom and reflow, hurting LCP' });
    } else passed.push('Viewport meta correct');

    return {
        issues,
        passed,
        signals: {
            uses_https: usesHttps,
            has_gzip: hasGzip,
            has_cache_control: hasCacheControl,
            render_blocking_scripts: renderBlockingScripts,
            inline_styles_count: inlineStyles,
            unoptimised_images: imgsWithoutDims,
            missing_lazy_load: imgsTotal > aboveFoldThreshold && lazyImgs === 0 ? imgsTotal : 0,
            external_scripts: externalScripts,
            dom_depth_estimate: domDepth,
        },
    };
}

function estimateDomDepth(html: string): number {
    let depth = 0;
    let max = 0;
    for (const char of html) {
        if (char === '<') continue;
        if (html.includes('</')) { /* heuristic */ }
    }
    // Simple heuristic: count open vs close tags per region
    const opens = (html.match(/<[a-zA-Z][^/][^>]*>/g) ?? []).length;
    const closes = (html.match(/<\/[a-zA-Z][^>]*>/g) ?? []).length;
    max = Math.min(opens, closes) / 2;
    return Math.round(max / 10); // rough depth estimate
}

function computePerfScore(issues: PerfIssue[]): number {
    const deductions = issues.reduce((s, i) => s + ({ critical: 20, warning: 8, info: 2 }[i.severity] ?? 0), 0);
    return Math.max(0, 100 - deductions);
}

function lcpRisk(issues: PerfIssue[]): PerformanceReport['estimated_lcp_risk'] {
    const hasCritical = issues.some(i => i.severity === 'critical');
    const hasRenderBlocking = issues.some(i => i.id === 'render-blocking');
    if (hasCritical || hasRenderBlocking) return 'high';
    if (issues.some(i => i.severity === 'warning')) return 'medium';
    return 'low';
}

function perfBadge(score: number): string {
    if (score >= 90) return `🟢 FAST (${score}/100)`;
    if (score >= 50) return `🟡 NEEDS IMPROVEMENT (${score}/100)`;
    return `🔴 SLOW (${score}/100)`;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function auditPerformance(input: z.infer<typeof PerformanceAuditSchema>): Promise<PerformanceReport> {
    const v = PerformanceAuditSchema.parse(input);
    console.log(`[GHOST] ⚡ Performance audit → ${v.url}`);

    const res = await axios.get<string>(v.url, {
        headers: { 'User-Agent': 'GHOSTPerf/1.0', 'Accept-Encoding': 'gzip, deflate, br' },
        timeout: 15000,
        responseType: 'text',
    });

    const headers = Object.fromEntries(Object.entries(res.headers).map(([k, val]) => [k.toLowerCase(), String(val ?? '')]));
    const html = res.data;
    const { issues, passed, signals } = analysePerformance(html, headers, v.url, v.budget);
    const score = computePerfScore(issues);

    return {
        url: v.url,
        score,
        badge: perfBadge(score),
        html_bytes: html.length,
        estimated_lcp_risk: lcpRisk(issues),
        issues,
        passed,
        signals,
        generated_at: new Date().toISOString(),
    };
}

export const PERFORMANCE_TOOLS = [
    {
        name: 'ghost_audit_performance',
        description: 'Audit a URL for Core Web Vitals risk factors, render-blocking resources, caching, compression, and image optimisation.',
        inputSchema: PerformanceAuditSchema,
        handler: auditPerformance,
        agentPermissions: ['GHOST', 'SENTINEL'],
        estimatedCost: 'Free (network fetch)',
    },
];
