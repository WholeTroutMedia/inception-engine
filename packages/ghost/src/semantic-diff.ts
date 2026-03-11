import { z } from 'zod';

// ─── GHOST Semantic Diff Engine ───────────────────────────────────────────────
// The brain of GHOST — understands the *meaning* of changes, not just pixels.
// PROOF agent's primary analysis tool.

export const ChangeSeveritySchema = z.enum(['info', 'warning', 'critical', 'blocking']);
export const ChangeTypeSchema = z.enum(['cosmetic', 'functional', 'business_critical', 'security', 'accessibility']);

export const SemanticChangeSchema = z.object({
    element: z.string(),
    selector: z.string().optional(),
    change_type: ChangeTypeSchema,
    severity: ChangeSeveritySchema,
    description: z.string(),
    before: z.string().optional(),
    after: z.string().optional(),
    business_impact: z.string(),
    recommendation: z.string(),
    blocks_release: z.boolean(),
});

export type SemanticChange = z.infer<typeof SemanticChangeSchema>;
export type ChangeSeverity = z.infer<typeof ChangeSeveritySchema>;

export interface DiffReport {
    passed: boolean;
    blocking_count: number;
    critical_count: number;
    warning_count: number;
    info_count: number;
    changes: SemanticChange[];
    summary: string;
    recommendation: 'SHIP' | 'REVIEW' | 'BLOCK';
}

// ─── Semantic Rules Engine ────────────────────────────────────────────────────
// Rules define how text changes are classified.
// PROOF maintains and extends this rule set.

interface SemanticRule {
    pattern: RegExp;
    classification: z.infer<typeof ChangeTypeSchema>;
    severity: z.infer<typeof ChangeSeveritySchema>;
    businessImpact: string;
}

const BUSINESS_CRITICAL_PATTERNS: SemanticRule[] = [
    {
        pattern: /free\s*trial/i,
        classification: 'business_critical',
        severity: 'blocking',
        businessImpact: 'Conversion rate and revenue impact — changing pricing language affects buyer intent',
    },
    {
        pattern: /\$0|no charge|free forever/i,
        classification: 'business_critical',
        severity: 'blocking',
        businessImpact: 'Pricing representation — misrepresentation creates legal and trust risk',
    },
    {
        pattern: /privacy policy|terms of service|gdpr/i,
        classification: 'security',
        severity: 'blocking',
        businessImpact: 'Legal compliance — changes to legal copy must be reviewed by LEX',
    },
    {
        pattern: /password|login|sign in|authenticate/i,
        classification: 'security',
        severity: 'critical',
        businessImpact: 'Authentication flow — changes here can break or compromise access',
    },
    {
        pattern: /subscribe|buy now|purchase|checkout/i,
        classification: 'business_critical',
        severity: 'critical',
        businessImpact: 'CTA conversion — changes to primary action copy directly affect revenue',
    },
    {
        pattern: /delete|remove|cancel|unsubscribe/i,
        classification: 'business_critical',
        severity: 'warning',
        businessImpact: 'Destructive action — wording must be clear to prevent unintended user actions',
    },
];

const FUNCTIONAL_PATTERNS: SemanticRule[] = [
    {
        pattern: /error|warning|failed|invalid/i,
        classification: 'functional',
        severity: 'warning',
        businessImpact: 'Error messaging — affects user ability to recover from failures',
    },
    {
        pattern: /loading|please wait|processing/i,
        classification: 'functional',
        severity: 'info',
        businessImpact: 'System feedback — affects perceived performance',
    },
    {
        pattern: /required|mandatory|must/i,
        classification: 'functional',
        severity: 'warning',
        businessImpact: 'Form validation messaging — affects form completion rates',
    },
];

// ─── Core Diff Functions ──────────────────────────────────────────────────────

export function classifyTextChange(before: string, after: string, context: string): SemanticChange {
    // Check business critical patterns on the after text
    for (const rule of BUSINESS_CRITICAL_PATTERNS) {
        if (rule.pattern.test(before) !== rule.pattern.test(after)) {
            return SemanticChangeSchema.parse({
                element: context,
                change_type: rule.classification,
                severity: rule.severity,
                description: `"${before}" → "${after}" — triggers ${rule.classification} pattern`,
                before,
                after,
                business_impact: rule.businessImpact,
                recommendation: `PROOF review required. Verify this change is intentional and approved by LEX.`,
                blocks_release: rule.severity === 'blocking',
            });
        }
    }

    for (const rule of FUNCTIONAL_PATTERNS) {
        if (rule.pattern.test(before) !== rule.pattern.test(after)) {
            return SemanticChangeSchema.parse({
                element: context,
                change_type: rule.classification,
                severity: rule.severity,
                description: `"${before}" → "${after}" — functional copy change`,
                before,
                after,
                business_impact: rule.businessImpact,
                recommendation: 'Review with product team before shipping.',
                blocks_release: false,
            });
        }
    }

    // Calculate semantic distance
    const similarityScore = calculateSimilarity(before, after);

    if (similarityScore > 0.9) {
        // Very similar — cosmetic
        return SemanticChangeSchema.parse({
            element: context,
            change_type: 'cosmetic',
            severity: 'info',
            description: `Minor text change: "${before}" → "${after}"`,
            before,
            after,
            business_impact: 'Minimal — cosmetic copy adjustment',
            recommendation: 'Safe to ship.',
            blocks_release: false,
        });
    } else if (similarityScore > 0.6) {
        // Moderate change
        return SemanticChangeSchema.parse({
            element: context,
            change_type: 'functional',
            severity: 'warning',
            description: `Significant copy change: "${before}" → "${after}"`,
            before,
            after,
            business_impact: 'Moderate — user expectation may shift',
            recommendation: 'Verify with stakeholders before shipping.',
            blocks_release: false,
        });
    } else {
        // Complete rewrite
        return SemanticChangeSchema.parse({
            element: context,
            change_type: 'business_critical',
            severity: 'critical',
            description: `Complete copy rewrite: "${before.substring(0, 50)}..." → "${after.substring(0, 50)}..."`,
            before,
            after,
            business_impact: 'High — complete message change affects user understanding',
            recommendation: 'Stakeholder approval required. Test with users.',
            blocks_release: false,
        });
    }
}

function calculateSimilarity(a: string, b: string): number {
    const wordsA = new Set(a.toLowerCase().split(/\W+/));
    const wordsB = new Set(b.toLowerCase().split(/\W+/));
    const intersection = new Set([...wordsA].filter((w) => wordsB.has(w)));
    const union = new Set([...wordsA, ...wordsB]);
    return intersection.size / union.size; // Jaccard similarity
}

// ─── Element-Level Analysis ───────────────────────────────────────────────────

export interface ElementChange {
    selector: string;
    type: 'added' | 'removed' | 'modified' | 'moved';
    element_type: string; // button, input, heading, etc.
    before?: string;
    after?: string;
}

export function classifyElementChange(change: ElementChange): SemanticChange {
    const { selector, type, element_type } = change;

    // Input removed — functional breakage
    if (type === 'removed' && ['input', 'button', 'form', 'select'].includes(element_type)) {
        return SemanticChangeSchema.parse({
            element: selector,
            change_type: 'functional',
            severity: 'critical',
            description: `Interactive element removed: ${element_type} at ${selector}`,
            business_impact: 'User flows may be broken — this element was part of a user interaction',
            recommendation: 'Confirm this removal is intentional. Run user journey tests.',
            blocks_release: false,
        });
    }

    // Auth-related element changes
    if (/login|password|auth|session/.test(selector)) {
        return SemanticChangeSchema.parse({
            element: selector,
            change_type: 'security',
            severity: 'critical',
            description: `Auth element ${type}: ${selector}`,
            business_impact: 'Authentication security — changes here require SENTINEL review',
            recommendation: 'SENTINEL audit required before shipping.',
            blocks_release: false,
        });
    }

    // Payment elements
    if (/checkout|payment|stripe|card/.test(selector)) {
        return SemanticChangeSchema.parse({
            element: selector,
            change_type: 'business_critical',
            severity: 'critical',
            description: `Payment element ${type}: ${selector}`,
            business_impact: 'Revenue impact — payment flow changes affect checkout conversion',
            recommendation: 'Full checkout flow test required. Involve COMMERCE agent.',
            blocks_release: false,
        });
    }

    // General
    return SemanticChangeSchema.parse({
        element: selector,
        change_type: 'functional',
        severity: type === 'removed' ? 'warning' : 'info',
        description: `Element ${type}: ${element_type} at ${selector}`,
        business_impact: 'Standard UI change',
        recommendation: type === 'removed' ? 'Verify removal is intentional.' : 'Safe to ship.',
        blocks_release: false,
    });
}

// ─── Report Builder ───────────────────────────────────────────────────────────

export function buildDiffReport(changes: SemanticChange[]): DiffReport {
    const blocking = changes.filter((c) => c.blocks_release).length;
    const critical = changes.filter((c) => c.severity === 'critical' && !c.blocks_release).length;
    const warning = changes.filter((c) => c.severity === 'warning').length;
    const info = changes.filter((c) => c.severity === 'info').length;

    let recommendation: 'SHIP' | 'REVIEW' | 'BLOCK';
    if (blocking > 0) recommendation = 'BLOCK';
    else if (critical > 0) recommendation = 'REVIEW';
    else recommendation = 'SHIP';

    const summary = blocking > 0
        ? `🚨 BLOCKED: ${blocking} release-blocking change(s) detected. Resolve before shipping.`
        : critical > 0
            ? `⚠️ REVIEW REQUIRED: ${critical} critical change(s) need stakeholder approval.`
            : warning > 0
                ? `⚡ SHIP WITH REVIEW: ${warning} warning(s). Consider reviewing before release.`
                : `✅ CLEAR TO SHIP: ${changes.length} cosmetic change(s) only.`;

    return {
        passed: recommendation === 'SHIP',
        blocking_count: blocking,
        critical_count: critical,
        warning_count: warning,
        info_count: info,
        changes,
        summary,
        recommendation,
    };
}

export function formatDiffReportMarkdown(report: DiffReport): string {
    const icon = report.recommendation === 'SHIP' ? '✅' : report.recommendation === 'REVIEW' ? '⚠️' : '🚨';

    let md = `# GHOST QA Report — ${new Date().toISOString()}\n\n`;
    md += `## ${icon} Recommendation: ${report.recommendation}\n\n`;
    md += `${report.summary}\n\n`;
    md += `| Severity | Count |\n|----------|-------|\n`;
    md += `| 🚨 Blocking | ${report.blocking_count} |\n`;
    md += `| ⚠️ Critical | ${report.critical_count} |\n`;
    md += `| ⚡ Warning | ${report.warning_count} |\n`;
    md += `| ℹ️ Info | ${report.info_count} |\n\n`;

    if (report.changes.length > 0) {
        md += `## Changes Detected\n\n`;
        for (const change of report.changes) {
            const sev = { blocking: '🚨', critical: '⚠️', warning: '⚡', info: 'ℹ️' }[change.severity];
            md += `### ${sev} ${change.element}\n`;
            md += `- **Type:** ${change.change_type} | **Severity:** ${change.severity}\n`;
            md += `- **Description:** ${change.description}\n`;
            if (change.before) md += `- **Before:** \`${change.before}\`\n`;
            if (change.after) md += `- **After:** \`${change.after}\`\n`;
            md += `- **Business Impact:** ${change.business_impact}\n`;
            md += `- **Recommendation:** ${change.recommendation}\n\n`;
        }
    }

    return md;
}
