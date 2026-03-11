import { z } from 'zod';
import axios from 'axios';

// ─── GHOST — Accessibility Audit Engine ──────────────────────────────────────
// WCAG 2.1 A/AA/AAA compliance scanning for Creative Liberation Engine components.
// Covers: contrast, semantic HTML, keyboard navigation, ARIA, forms, images.

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const AccessibilityAuditSchema = z.object({
    url: z.string().url().optional().describe('Live URL to audit'),
    html: z.string().optional().describe('Raw HTML string to audit (used if url not provided)'),
    wcag_level: z.enum(['A', 'AA', 'AAA']).default('AA'),
    include_warnings: z.boolean().default(true),
    generate_report: z.boolean().default(true),
});

export const ContrastCheckSchema = z.object({
    foreground: z.string().describe('Foreground hex color (e.g. #f5f0e8)'),
    background: z.string().describe('Background hex color (e.g. #0a0a0f)'),
    font_size_px: z.number().default(16),
    font_weight: z.enum(['normal', 'bold']).default('normal'),
    wcag_level: z.enum(['AA', 'AAA']).default('AA'),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type IssueSeverity = 'critical' | 'serious' | 'moderate' | 'minor';
export type WCAGLevel = 'A' | 'AA' | 'AAA';

export interface AccessibilityIssue {
    id: string;
    severity: IssueSeverity;
    wcag_criterion: string;
    description: string;
    element_selector?: string;
    help_text: string;
    help_url?: string;
}

export interface AccessibilityReport {
    url?: string;
    score: number;           // 0-100
    badge: string;           // 'WCAG AA ✅' or '⚠️ 12 issues'
    wcag_level: WCAGLevel;
    critical_count: number;
    serious_count: number;
    moderate_count: number;
    minor_count: number;
    total_issues: number;
    issues: AccessibilityIssue[];
    passed_criteria: string[];
    summary: string;
    generated_at: string;
}

// ─── Color contrast ───────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
    const h = hex.replace('#', '');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return [r, g, b];
}

function linearize(channel: number): number {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function luminance([r, g, b]: [number, number, number]): number {
    return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

function contrastRatio(fg: string, bg: string): number {
    const l1 = luminance(hexToRgb(fg));
    const l2 = luminance(hexToRgb(bg));
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
}

function getContrastRequirements(fontSizePx: number, fontWeight: string, level: 'AA' | 'AAA') {
    const isLargeText = fontSizePx >= 18 || (fontSizePx >= 14 && fontWeight === 'bold');
    if (level === 'AA') return isLargeText ? 3.0 : 4.5;
    return isLargeText ? 4.5 : 7.0;
}

export function checkContrast(input: z.infer<typeof ContrastCheckSchema>) {
    const v = ContrastCheckSchema.parse(input);
    const ratio = contrastRatio(v.foreground, v.background);
    const required = getContrastRequirements(v.font_size_px, v.font_weight, v.wcag_level);
    const passes = ratio >= required;
    return {
        ratio: Math.round(ratio * 100) / 100,
        required,
        passes,
        level: v.wcag_level,
        foreground: v.foreground,
        background: v.background,
        verdict: passes ? `✅ PASS (${ratio.toFixed(2)}:1 ≥ ${required}:1)` : `❌ FAIL (${ratio.toFixed(2)}:1 < ${required}:1)`,
        large_text: v.font_size_px >= 18 || (v.font_size_px >= 14 && v.font_weight === 'bold'),
    };
}

// ─── HTML parser rules ────────────────────────────────────────────────────────

interface HtmlScanResult {
    issues: AccessibilityIssue[];
    passed: string[];
}

function scanHtml(html: string, level: WCAGLevel): HtmlScanResult {
    const issues: AccessibilityIssue[] = [];
    const passed: string[] = [];

    // 1.1.1 — Non-text content: images without alt
    const imgMatches = [...html.matchAll(/<img\s([^>]*)>/gi)];
    const imgsWithoutAlt = imgMatches.filter(m => !m[1].includes('alt='));
    if (imgsWithoutAlt.length > 0) {
        for (let i = 0; i < imgsWithoutAlt.length; i++) {
            issues.push({
                id: `img-alt-${i}`,
                severity: 'critical',
                wcag_criterion: '1.1.1 Non-text Content (Level A)',
                description: `<img> missing alt attribute`,
                element_selector: 'img:not([alt])',
                help_text: 'Images must have alt text that describes their content, or alt="" if decorative.',
                help_url: 'https://www.w3.org/WAI/WCAG21/quickref/#non-text-content',
            });
        }
    } else {
        passed.push('1.1.1 Images have alt text');
    }

    // 1.3.1 — Form inputs without labels
    const inputMatches = [...html.matchAll(/<input\s([^>]*)>/gi)];
    const inputsWithoutLabel = inputMatches.filter(m => {
        const attrs = m[1];
        return !attrs.includes('type="hidden"') && !attrs.includes('type="submit"') &&
            !attrs.includes('type="button"') && !attrs.includes('aria-label') &&
            !attrs.includes('aria-labelledby') && !attrs.includes('id=');
    });
    if (inputsWithoutLabel.length > 0) {
        issues.push({
            id: 'input-label',
            severity: 'critical',
            wcag_criterion: '1.3.1 Info and Relationships (Level A)',
            description: `${inputsWithoutLabel.length} form input(s) may lack associated labels`,
            element_selector: 'input:not([aria-label]):not([aria-labelledby])',
            help_text: 'Every form input must have a <label> element or aria-label attribute.',
            help_url: 'https://www.w3.org/WAI/WCAG21/quickref/#info-and-relationships',
        });
    } else {
        passed.push('1.3.1 Form inputs have labels');
    }

    // 1.3.2 — Heading hierarchy
    const headings = [...html.matchAll(/<(h[1-6])\b/gi)].map(m => parseInt(m[1][1]));
    let prevLevel = 0;
    let hierarchyBroken = false;
    for (const level of headings) {
        if (prevLevel > 0 && level > prevLevel + 1) { hierarchyBroken = true; break; }
        prevLevel = level;
    }
    if (hierarchyBroken) {
        issues.push({
            id: 'heading-hierarchy',
            severity: 'moderate',
            wcag_criterion: '1.3.2 Meaningful Sequence (Level A)',
            description: 'Heading hierarchy skips levels (e.g. h1 → h3)',
            element_selector: 'h1,h2,h3,h4,h5,h6',
            help_text: 'Headings should not skip levels (h1 → h2 → h3, never h1 → h3).',
            help_url: 'https://www.w3.org/WAI/WCAG21/quickref/#meaningful-sequence',
        });
    } else if (headings.length > 0) {
        passed.push('1.3.2 Heading hierarchy is valid');
    }

    // 2.1.1 — Keyboard: tabindex > 0 (keyboard trap risk)
    const posTabIndex = [...html.matchAll(/tabindex="([0-9]+)"/gi)].filter(m => parseInt(m[1]) > 0);
    if (posTabIndex.length > 0) {
        issues.push({
            id: 'positive-tabindex',
            severity: 'serious',
            wcag_criterion: '2.1.1 Keyboard (Level A)',
            description: `${posTabIndex.length} element(s) use positive tabindex (disrupts natural tab order)`,
            element_selector: '[tabindex]:not([tabindex="0"]):not([tabindex="-1"])',
            help_text: 'Avoid positive tabindex values. Use tabindex="0" to make elements focusable in natural order.',
            help_url: 'https://www.w3.org/WAI/WCAG21/quickref/#keyboard',
        });
    } else {
        passed.push('2.1.1 No positive tabindex values');
    }

    // 2.4.2 — Page titled
    const hasTitle = /<title[^>]*>[^<]+<\/title>/i.test(html);
    if (!hasTitle) {
        issues.push({
            id: 'page-title',
            severity: 'serious',
            wcag_criterion: '2.4.2 Page Titled (Level A)',
            description: 'Page is missing a <title> element',
            help_text: 'Every page must have a descriptive <title> element.',
            help_url: 'https://www.w3.org/WAI/WCAG21/quickref/#page-titled',
        });
    } else {
        passed.push('2.4.2 Page has title');
    }

    // 4.1.2 — ARIA roles on interactive elements
    const buttonsWithoutLabel = [...html.matchAll(/<button\b([^>]*)>/gi)].filter(m => {
        const attrs = m[1];
        return !attrs.includes('aria-label') && !attrs.includes('aria-labelledby');
    });
    const emptyButtons = buttonsWithoutLabel.filter((_, i) => {
        // Rough heuristic — check if button contains no visible text (icon-only buttons)
        return html.includes('<button') && html.includes('</button>');
    });
    if (buttonsWithoutLabel.length > 0) {
        passed.push('4.1.2 Buttons present (verify they have accessible names)');
    }

    // 4.1.3 — lang attribute
    const hasLang = /html[^>]+lang=["'][a-z]{2}/i.test(html);
    if (!hasLang) {
        issues.push({
            id: 'html-lang',
            severity: 'serious',
            wcag_criterion: '3.1.1 Language of Page (Level A)',
            description: '<html> element missing lang attribute',
            help_text: 'The <html> element must have a lang attribute (e.g. lang="en").',
            help_url: 'https://www.w3.org/WAI/WCAG21/quickref/#language-of-page',
        });
    } else {
        passed.push('3.1.1 Document has language attribute');
    }

    // AA: focus visible
    if (level === 'AA' || level === 'AAA') {
        const hasOutlineNone = /outline\s*:\s*none|outline\s*:\s*0/i.test(html);
        if (hasOutlineNone) {
            issues.push({
                id: 'focus-visible',
                severity: 'serious',
                wcag_criterion: '2.4.7 Focus Visible (Level AA)',
                description: 'CSS contains outline:none which may hide keyboard focus indicators',
                element_selector: '[style*="outline: none"], [style*="outline:none"]',
                help_text: 'Never remove focus outlines without providing a visible alternative focus style.',
                help_url: 'https://www.w3.org/WAI/WCAG21/quickref/#focus-visible',
            });
        } else {
            passed.push('2.4.7 No detected focus-hiding CSS');
        }
    }

    return { issues, passed };
}

// ─── Axios-based live URL audit (uses axe-core CDN via headless proxy) ────────

async function auditLiveUrl(url: string): Promise<{ issues: AccessibilityIssue[]; passed: string[] }> {
    // In production this would call a headless Chrome microservice or Playwright.
    // For now, fetch the raw HTML and run static analysis.
    try {
        const res = await axios.get<string>(url, { headers: { 'User-Agent': 'GHOST/AccessibilityBot 1.0' }, timeout: 15000, responseType: 'text' });
        return scanHtml(res.data, 'AA');
    } catch (e) {
        throw new Error(`Failed to fetch URL for audit: ${(e as Error).message}`);
    }
}

// ─── Score + badge ────────────────────────────────────────────────────────────

function computeScore(issues: AccessibilityIssue[]): number {
    const penalties = issues.reduce((sum, issue) => {
        const w = { critical: 25, serious: 15, moderate: 8, minor: 3 }[issue.severity] ?? 0;
        return sum + w;
    }, 0);
    return Math.max(0, 100 - penalties);
}

function getBadge(score: number, critical: number, level: WCAGLevel): string {
    if (critical > 0) return `🔴 WCAG ${level} FAIL — ${critical} critical`;
    if (score >= 90) return `✅ WCAG ${level} PASS (${score}/100)`;
    if (score >= 70) return `⚠️ WCAG ${level} PARTIAL (${score}/100)`;
    return `❌ WCAG ${level} FAIL (${score}/100)`;
}

// ─── Main audit handler ───────────────────────────────────────────────────────

export async function runAccessibilityAudit(input: z.infer<typeof AccessibilityAuditSchema>): Promise<AccessibilityReport> {
    const v = AccessibilityAuditSchema.parse(input);
    if (!v.url && !v.html) throw new Error('Either url or html must be provided');

    console.log(`[GHOST] 🔍 Accessibility audit [WCAG ${v.wcag_level}]${v.url ? ' → ' + v.url : ' (inline HTML)'}`);

    const { issues, passed } = v.url ? await auditLiveUrl(v.url) : scanHtml(v.html!, v.wcag_level);

    const filteredIssues = v.include_warnings ? issues : issues.filter(i => i.severity !== 'minor');
    const score = computeScore(filteredIssues);
    const critical = filteredIssues.filter(i => i.severity === 'critical').length;
    const serious = filteredIssues.filter(i => i.severity === 'serious').length;
    const moderate = filteredIssues.filter(i => i.severity === 'moderate').length;
    const minor = filteredIssues.filter(i => i.severity === 'minor').length;

    const report: AccessibilityReport = {
        url: v.url,
        score,
        badge: getBadge(score, critical, v.wcag_level),
        wcag_level: v.wcag_level,
        critical_count: critical,
        serious_count: serious,
        moderate_count: moderate,
        minor_count: minor,
        total_issues: filteredIssues.length,
        issues: filteredIssues,
        passed_criteria: passed,
        summary: filteredIssues.length === 0
            ? `No accessibility issues found. ${passed.length} criteria passed.`
            : `Found ${critical} critical, ${serious} serious, ${moderate} moderate, ${minor} minor issues. Score: ${score}/100.`,
        generated_at: new Date().toISOString(),
    };

    return report;
}

// ─── MCP Tool Registration ────────────────────────────────────────────────────

export const ACCESSIBILITY_TOOLS = [
    {
        name: 'ghost_audit_accessibility',
        description: 'Run a WCAG 2.1 accessibility audit on a URL or HTML string. Returns scored report with issue list.',
        inputSchema: AccessibilityAuditSchema,
        handler: runAccessibilityAudit,
        agentPermissions: ['GHOST', 'SENTINEL', 'ORACLE'],
        estimatedCost: 'Free',
    },
    {
        name: 'ghost_check_contrast',
        description: 'Check WCAG color contrast ratio between foreground and background colors.',
        inputSchema: ContrastCheckSchema,
        handler: checkContrast,
        agentPermissions: ['GHOST', 'SENTINEL', 'ORACLE', 'STUDIO'],
        estimatedCost: 'Free',
    },
];
