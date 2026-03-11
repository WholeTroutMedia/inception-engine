import axios from 'axios';
import { z } from 'zod';

// ─── GHOST — Security Headers Audit Engine ───────────────────────────────────
// Scans HTTP response headers for security best practices:
// CSP, HSTS, X-Frame-Options, Permissions-Policy, CORS, referrer policy, etc.

export const SecurityAuditSchema = z.object({
    url: z.string().url(),
});

export interface SecurityIssue {
    id: string;
    severity: 'critical' | 'warning' | 'info';
    header: string;
    message: string;
    recommendation: string;
    owasp_ref: string;
}

export interface SecurityReport {
    url: string;
    score: number;
    grade: string;
    badge: string;
    issues: SecurityIssue[];
    passed: string[];
    headers_found: Record<string, string>;
    generated_at: string;
}

const SECURITY_CHECKS: Array<{
    id: string; header: string; severity: 'critical' | 'warning' | 'info';
    message: string; recommendation: string; owasp_ref: string;
    test: (headers: Record<string, string>) => boolean;
}> = [
        {
            id: 'no-hsts', header: 'Strict-Transport-Security', severity: 'critical',
            message: 'Missing HSTS header — site does not enforce HTTPS connections',
            recommendation: 'Add: Strict-Transport-Security: max-age=31536000; includeSubDomains; preload',
            owasp_ref: 'A02:2021',
            test: h => !h['strict-transport-security'],
        },
        {
            id: 'no-csp', header: 'Content-Security-Policy', severity: 'critical',
            message: 'Missing Content-Security-Policy header — XSS and injection risks',
            recommendation: "Add a strict CSP: Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none';",
            owasp_ref: 'A03:2021',
            test: h => !h['content-security-policy'],
        },
        {
            id: 'no-x-frame', header: 'X-Frame-Options', severity: 'warning',
            message: 'Missing X-Frame-Options — clickjacking risk',
            recommendation: "Add: X-Frame-Options: DENY (or use CSP frame-ancestors 'none')",
            owasp_ref: 'A04:2021',
            test: h => !h['x-frame-options'] && !(h['content-security-policy'] ?? '').includes('frame-ancestors'),
        },
        {
            id: 'no-content-type-options', header: 'X-Content-Type-Options', severity: 'warning',
            message: 'Missing X-Content-Type-Options — MIME sniffing risk',
            recommendation: 'Add: X-Content-Type-Options: nosniff',
            owasp_ref: 'A05:2021',
            test: h => !h['x-content-type-options'],
        },
        {
            id: 'no-referrer-policy', header: 'Referrer-Policy', severity: 'info',
            message: 'Missing Referrer-Policy header',
            recommendation: 'Add: Referrer-Policy: strict-origin-when-cross-origin',
            owasp_ref: 'A05:2021',
            test: h => !h['referrer-policy'],
        },
        {
            id: 'no-permissions-policy', header: 'Permissions-Policy', severity: 'info',
            message: 'Missing Permissions-Policy header',
            recommendation: 'Add: Permissions-Policy: geolocation=(), microphone=(), camera=()',
            owasp_ref: 'A05:2021',
            test: h => !h['permissions-policy'] && !h['feature-policy'],
        },
        {
            id: 'server-exposed', header: 'Server', severity: 'info',
            message: 'Server header exposes technology/version information',
            recommendation: 'Remove or obscure the Server header to reduce fingerprinting risk.',
            owasp_ref: 'A05:2021',
            test: h => !!(h['server'] && h['server'].length > 3),
        },
        {
            id: 'x-powered-by', header: 'X-Powered-By', severity: 'info',
            message: 'X-Powered-By header exposes technology stack',
            recommendation: 'Remove X-Powered-By header (e.g. app.disable("x-powered-by") in Express).',
            owasp_ref: 'A05:2021',
            test: h => !!h['x-powered-by'],
        },
        {
            id: 'insecure-cookies', header: 'Set-Cookie', severity: 'critical',
            message: 'Cookie set without Secure and/or HttpOnly flags',
            recommendation: 'All cookies must include: Secure; HttpOnly; SameSite=Strict',
            owasp_ref: 'A07:2021',
            test: h => {
                const cookie = h['set-cookie'] ?? '';
                return cookie.length > 0 && (!cookie.toLowerCase().includes('secure') || !cookie.toLowerCase().includes('httponly'));
            },
        },
        {
            id: 'cors-wildcard', header: 'Access-Control-Allow-Origin', severity: 'warning',
            message: 'CORS allows all origins (*) — may expose sensitive APIs',
            recommendation: 'Restrict CORS to specific, trusted origins instead of using wildcard *.',
            owasp_ref: 'A01:2021',
            test: h => h['access-control-allow-origin'] === '*',
        },
    ];

function gradeScore(score: number): string {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
}

function badge(score: number, critical: number): string {
    if (critical > 0) return `🔴 SECURITY RISK — ${critical} critical issue${critical !== 1 ? 's' : ''}`;
    if (score >= 80) return `🟢 SECURE (${score}/100)`;
    if (score >= 60) return `🟡 NEEDS HARDENING (${score}/100)`;
    return `🔴 VULNERABLE (${score}/100)`;
}

export async function auditSecurity(input: z.infer<typeof SecurityAuditSchema>): Promise<SecurityReport> {
    const v = SecurityAuditSchema.parse(input);
    console.log(`[GHOST] 🔒 Security audit → ${v.url}`);

    const res = await axios.get(v.url, {
        timeout: 15000,
        maxRedirects: 5,
        validateStatus: () => true,
        headers: { 'User-Agent': 'GHOSTSecurityScanner/1.0' },
    });

    const headers: Record<string, string> = {};
    for (const [k, val] of Object.entries(res.headers)) {
        if (typeof val === 'string') headers[k.toLowerCase()] = val;
        else if (Array.isArray(val)) headers[k.toLowerCase()] = val.join(', ');
    }

    const issues: SecurityIssue[] = [];
    const passed: string[] = [];

    for (const check of SECURITY_CHECKS) {
        if (check.test(headers)) {
            issues.push({ id: check.id, severity: check.severity, header: check.header, message: check.message, recommendation: check.recommendation, owasp_ref: check.owasp_ref });
        } else {
            passed.push(`${check.header} header properly configured`);
        }
    }

    const deductions = issues.reduce((s, i) => s + ({ critical: 25, warning: 10, info: 3 }[i.severity] ?? 0), 0);
    const score = Math.max(0, 100 - deductions);
    const critical = issues.filter(i => i.severity === 'critical').length;

    return { url: v.url, score, grade: gradeScore(score), badge: badge(score, critical), issues, passed, headers_found: headers, generated_at: new Date().toISOString() };
}

export const SECURITY_TOOLS = [
    { name: 'ghost_audit_security', description: 'Audit a URL for security header compliance: CSP, HSTS, X-Frame-Options, Referrer-Policy, cookie flags, CORS, server fingerprinting. Returns OWASP-referenced grade.', inputSchema: SecurityAuditSchema, handler: auditSecurity, agentPermissions: ['GHOST', 'SENTINEL'], estimatedCost: 'Free (network fetch)' },
];
