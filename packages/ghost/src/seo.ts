import axios from 'axios';
import { z } from 'zod';

// ─── GHOST — Technical SEO Audit Engine ──────────────────────────────────────
// Audits pages for technical SEO compliance: meta, OpenGraph, structured data,
// canonical, sitemap, robots.txt, hreflang, performance signals.

export const SeoAuditSchema = z.object({
    url: z.string().url().describe('Full URL to audit (e.g. https://example.com/about)'),
    check_sitemap: z.boolean().default(true),
    check_robots: z.boolean().default(true),
    generate_report: z.boolean().default(true),
});

export const SeoCheckSchema = z.object({
    html: z.string().describe('Raw HTML to analyse'),
    url: z.string().url().optional().describe('Source URL (used to resolve relative paths and validate canonical)'),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SeoIssue {
    id: string;
    severity: 'critical' | 'warning' | 'info';
    category: string;
    message: string;
    recommendation: string;
}

export interface SeoReport {
    url?: string;
    score: number;
    badge: string;
    total_issues: number;
    critical_count: number;
    warning_count: number;
    info_count: number;
    issues: SeoIssue[];
    passed: string[];
    meta: {
        title?: string;
        description?: string;
        canonical?: string;
        robots_meta?: string;
        og_title?: string;
        og_description?: string;
        og_image?: string;
        twitter_card?: string;
        lang?: string;
        viewport?: string;
        structured_data_types: string[];
    };
    external: {
        sitemap_found?: boolean;
        robots_found?: boolean;
        sitemap_url?: string;
    };
    generated_at: string;
}

// ─── HTML extraction helpers ──────────────────────────────────────────────────

function getMeta(html: string, name: string): string | undefined {
    const m = html.match(new RegExp(`<meta\\s+(?:name|property)=["']${name}["'][^>]*content=["']([^"']+)["']`, 'i'))
        ?? html.match(new RegExp(`<meta\\s+content=["']([^"']+)["'][^>]*(?:name|property)=["']${name}["']`, 'i'));
    return m?.[1];
}

function getTag(html: string, tag: string, attr?: string): string | undefined {
    const m = attr
        ? html.match(new RegExp(`<${tag}\\s[^>]*${attr}=["']([^"']+)["']`, 'i'))
        : html.match(new RegExp(`<${tag}[^>]*>([^<]+)<\/${tag}>`, 'i'));
    return m?.[1]?.trim();
}

function extractJsonLd(html: string): string[] {
    const types: string[] = [];
    const matches = [...html.matchAll(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
    for (const match of matches) {
        try {
            const data = JSON.parse(match[1]) as { '@type'?: string };
            if (data['@type']) types.push(data['@type']);
        } catch { /* ignore malformed */ }
    }
    return types;
}

// ─── Static HTML analysis ─────────────────────────────────────────────────────

function analyseHtml(html: string, sourceUrl?: string): { issues: SeoIssue[]; passed: string[]; meta: SeoReport['meta'] } {
    const issues: SeoIssue[] = [];
    const passed: string[] = [];

    const title = getTag(html, 'title');
    const metaDesc = getMeta(html, 'description');
    const canonical = getTag(html, 'link', 'rel="canonical"') ?? html.match(/rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)?.[1];
    const robotsMeta = getMeta(html, 'robots');
    const ogTitle = getMeta(html, 'og:title');
    const ogDesc = getMeta(html, 'og:description');
    const ogImage = getMeta(html, 'og:image');
    const twitterCard = getMeta(html, 'twitter:card');
    const lang = html.match(/<html[^>]+lang=["']([^"']+)["']/i)?.[1];
    const viewport = getMeta(html, 'viewport');
    const structuredDataTypes = extractJsonLd(html);
    const h1Tags = [...html.matchAll(/<h1\b[^>]*>/gi)];

    // Title checks
    if (!title) {
        issues.push({ id: 'no-title', severity: 'critical', category: 'Meta', message: 'Missing <title> tag', recommendation: 'Add a descriptive title (50-60 characters) inside <head>.' });
    } else if (title.length < 30) {
        issues.push({ id: 'title-short', severity: 'warning', category: 'Meta', message: `Title too short (${title.length} chars)`, recommendation: 'Title should be 50-60 characters to maximise CTR.' });
    } else if (title.length > 60) {
        issues.push({ id: 'title-long', severity: 'warning', category: 'Meta', message: `Title too long (${title.length} chars — will be truncated in SERPs)`, recommendation: 'Keep title under 60 characters.' });
    } else {
        passed.push('Title tag length is optimal');
    }

    // Meta description
    if (!metaDesc) {
        issues.push({ id: 'no-meta-desc', severity: 'critical', category: 'Meta', message: 'Missing meta description', recommendation: 'Add a compelling meta description (120-160 characters).' });
    } else if (metaDesc.length < 70) {
        issues.push({ id: 'meta-desc-short', severity: 'warning', category: 'Meta', message: `Meta description too short (${metaDesc.length} chars)`, recommendation: 'Aim for 120-160 characters.' });
    } else if (metaDesc.length > 160) {
        issues.push({ id: 'meta-desc-long', severity: 'warning', category: 'Meta', message: `Meta description too long (${metaDesc.length} chars)`, recommendation: 'Keep under 160 characters to avoid truncation.' });
    } else {
        passed.push('Meta description length is optimal');
    }

    // H1
    if (h1Tags.length === 0) {
        issues.push({ id: 'no-h1', severity: 'critical', category: 'Structure', message: 'Page has no <h1> element', recommendation: 'Every page should have exactly one <h1> containing the primary keyword.' });
    } else if (h1Tags.length > 1) {
        issues.push({ id: 'multiple-h1', severity: 'warning', category: 'Structure', message: `Page has ${h1Tags.length} <h1> elements`, recommendation: 'Use a single <h1> per page. Promote secondary headings to <h2>.' });
    } else {
        passed.push('Single <h1> element present');
    }

    // Canonical
    if (!canonical) {
        issues.push({ id: 'no-canonical', severity: 'warning', category: 'Crawl', message: 'Missing canonical link tag', recommendation: 'Add <link rel="canonical" href="..."> to prevent duplicate content issues.' });
    } else {
        passed.push('Canonical tag present');
        if (sourceUrl && canonical !== sourceUrl && !canonical.startsWith(new URL(sourceUrl).origin)) {
            issues.push({ id: 'cross-origin-canonical', severity: 'info', category: 'Crawl', message: 'Canonical points to a different origin', recommendation: 'Verify this cross-domain canonical is intentional.' });
        }
    }

    // Robots meta
    if (robotsMeta?.includes('noindex')) {
        issues.push({ id: 'noindex', severity: 'critical', category: 'Crawl', message: 'Page has meta robots: noindex', recommendation: 'Remove noindex if this page should appear in search results.' });
    } else {
        passed.push('No noindex directive');
    }

    // OpenGraph
    if (!ogTitle) issues.push({ id: 'no-og-title', severity: 'warning', category: 'Social', message: 'Missing og:title', recommendation: 'Add <meta property="og:title"> for rich social sharing previews.' });
    else passed.push('og:title present');
    if (!ogDesc) issues.push({ id: 'no-og-desc', severity: 'warning', category: 'Social', message: 'Missing og:description', recommendation: 'Add <meta property="og:description">.' });
    else passed.push('og:description present');
    if (!ogImage) issues.push({ id: 'no-og-image', severity: 'warning', category: 'Social', message: 'Missing og:image', recommendation: 'Add <meta property="og:image"> (recommended: 1200×630px).' });
    else passed.push('og:image present');

    // Twitter card
    if (!twitterCard) issues.push({ id: 'no-twitter-card', severity: 'info', category: 'Social', message: 'Missing twitter:card meta tag', recommendation: 'Add <meta name="twitter:card" content="summary_large_image">.' });
    else passed.push('Twitter card meta present');

    // Language
    if (!lang) issues.push({ id: 'no-lang', severity: 'warning', category: 'Accessibility/SEO', message: 'HTML element missing lang attribute', recommendation: 'Add lang="en" (or appropriate locale) to <html>.' });
    else passed.push('HTML lang attribute set');

    // Viewport (mobile)
    if (!viewport) {
        issues.push({ id: 'no-viewport', severity: 'warning', category: 'Mobile', message: 'Missing viewport meta tag', recommendation: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">.' });
    } else passed.push('Viewport meta tag present');

    // Structured data
    if (structuredDataTypes.length === 0) {
        issues.push({ id: 'no-structured-data', severity: 'info', category: 'Structured Data', message: 'No JSON-LD structured data found', recommendation: 'Add Schema.org JSON-LD (Organization, WebPage, BreadcrumbList, etc.) for rich results eligibility.' });
    } else {
        passed.push(`JSON-LD structured data found: ${structuredDataTypes.join(', ')}`);
    }

    // Images without alt
    const imagesWithoutAlt = [...html.matchAll(/<img\s(?=[^>]*src)[^>]*>/gi)].filter(m => !m[0].includes('alt='));
    if (imagesWithoutAlt.length > 0) {
        issues.push({ id: 'img-no-alt', severity: 'warning', category: 'Images', message: `${imagesWithoutAlt.length} image(s) missing alt attribute`, recommendation: 'All <img> elements need descriptive alt text for SEO and accessibility.' });
    } else if ([...html.matchAll(/<img\s/gi)].length > 0) {
        passed.push('All images have alt attributes');
    }

    return {
        issues,
        passed,
        meta: { title, description: metaDesc, canonical, robots_meta: robotsMeta, og_title: ogTitle, og_description: ogDesc, og_image: ogImage, twitter_card: twitterCard, lang, viewport, structured_data_types: structuredDataTypes },
    };
}

// ─── External checks (sitemap, robots) ────────────────────────────────────────

async function checkExternal(url: string): Promise<SeoReport['external'] & { issues: SeoIssue[] }> {
    const origin = new URL(url).origin;
    const issues: SeoIssue[] = [];
    let sitemapFound = false;
    let robotsFound = false;
    let sitemapUrl: string | undefined;

    try {
        const robotsRes = await axios.get<string>(`${origin}/robots.txt`, { timeout: 8000, responseType: 'text' });
        robotsFound = robotsRes.status === 200;
        const sitemapLine = robotsRes.data.match(/Sitemap:\s*(.+)/i);
        if (sitemapLine) sitemapUrl = sitemapLine[1].trim();
    } catch { /* robots.txt not found */ }

    if (!robotsFound) {
        issues.push({ id: 'no-robots', severity: 'warning', category: 'Crawl', message: 'No robots.txt found at /robots.txt', recommendation: 'Create a robots.txt to guide crawler access and link to your sitemap.' });
    }

    // Check sitemap (from robots or guess)
    const sitemapToCheck = sitemapUrl ?? `${origin}/sitemap.xml`;
    try {
        const sitemapRes = await axios.get(`${sitemapToCheck}`, { timeout: 8000 });
        sitemapFound = sitemapRes.status === 200;
    } catch { /* sitemap not found */ }

    if (!sitemapFound) {
        issues.push({ id: 'no-sitemap', severity: 'warning', category: 'Crawl', message: 'No XML sitemap found', recommendation: `Create and submit a sitemap at ${origin}/sitemap.xml and reference it in robots.txt.` });
    }

    return { sitemap_found: sitemapFound, robots_found: robotsFound, sitemap_url: sitemapUrl, issues };
}

// ─── Score computation ────────────────────────────────────────────────────────

function computeSeoScore(issues: SeoIssue[]): number {
    const deductions = issues.reduce((sum, i) => sum + ({ critical: 20, warning: 8, info: 2 }[i.severity] ?? 0), 0);
    return Math.max(0, 100 - deductions);
}

function seoBadge(score: number, critical: number): string {
    if (critical > 0) return `🔴 SEO FAIL — ${critical} critical issues`;
    if (score >= 90) return `✅ SEO EXCELLENT (${score}/100)`;
    if (score >= 70) return `🟡 SEO GOOD (${score}/100)`;
    return `⚠️ SEO NEEDS WORK (${score}/100)`;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function auditSeo(input: z.infer<typeof SeoAuditSchema>): Promise<SeoReport> {
    const v = SeoAuditSchema.parse(input);
    console.log(`[GHOST] 🔍 SEO audit → ${v.url}`);

    const htmlRes = await axios.get<string>(v.url, { headers: { 'User-Agent': 'GHOSTSEOBot/1.0' }, timeout: 15000, responseType: 'text' });
    const { issues: htmlIssues, passed, meta } = analyseHtml(htmlRes.data, v.url);

    let externalIssues: SeoIssue[] = [];
    let external: SeoReport['external'] = {};
    if (v.check_sitemap || v.check_robots) {
        const extResult = await checkExternal(v.url);
        const { issues: extIss, ...extData } = extResult;
        externalIssues = extIss;
        external = extData;
    }

    const allIssues = [...htmlIssues, ...externalIssues];
    const score = computeSeoScore(allIssues);
    const critical = allIssues.filter(i => i.severity === 'critical').length;
    const warning = allIssues.filter(i => i.severity === 'warning').length;
    const info = allIssues.filter(i => i.severity === 'info').length;

    return {
        url: v.url,
        score,
        badge: seoBadge(score, critical),
        total_issues: allIssues.length,
        critical_count: critical,
        warning_count: warning,
        info_count: info,
        issues: allIssues,
        passed,
        meta,
        external,
        generated_at: new Date().toISOString(),
    };
}

export async function checkSeoHtml(input: z.infer<typeof SeoCheckSchema>) {
    const v = SeoCheckSchema.parse(input);
    const { issues, passed, meta } = analyseHtml(v.html, v.url);
    const score = computeSeoScore(issues);
    const critical = issues.filter(i => i.severity === 'critical').length;
    return { score, badge: seoBadge(score, critical), issues, passed, meta };
}

// ─── MCP Tool Registration ────────────────────────────────────────────────────

export const SEO_TOOLS = [
    {
        name: 'ghost_audit_seo',
        description: 'Run a full technical SEO audit on a live URL. Checks meta tags, OpenGraph, structured data, canonical, sitemap, robots.txt, images.',
        inputSchema: SeoAuditSchema,
        handler: auditSeo,
        agentPermissions: ['GHOST', 'SENTINEL', 'ORACLE'],
        estimatedCost: 'Free (network fetch)',
    },
    {
        name: 'ghost_check_seo_html',
        description: 'Analyse raw HTML for SEO issues without fetching external resources.',
        inputSchema: SeoCheckSchema,
        handler: checkSeoHtml,
        agentPermissions: ['GHOST', 'SENTINEL', 'ORACLE'],
        estimatedCost: 'Free',
    },
];
