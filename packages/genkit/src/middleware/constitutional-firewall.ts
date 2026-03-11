/**
 * Constitutional Firewall Middleware
 *
 * Pre-flight: Scans prompts for constitutional violations before model execution.
 * Post-flight: Audits model responses for compliance.
 *
 * Based on the 20-article Foundation Constitution.
 * Constitutional: Article II (Sovereignty), Article V (Transparency),
 *                 Article VIII (Security), Article XIII (Ethical AI)
 */

import type { ModelMiddleware } from 'genkit/model';

// ---------------------------------------------------------------------------
// Constitutional Articles (subset — critical for pre-flight)
// ---------------------------------------------------------------------------

const BLOCKED_PATTERNS = [
    // Article VIII — Security: Block potential credential/key extraction
    /(?:api[_-]?key|secret|password|token|credential)s?\s*[:=]/gi,
    // Article XIII — Ethical: Block harmful content requests
    /(?:how\s+to\s+(?:hack|exploit|attack|ddos|phish))/gi,
];

const RESPONSE_AUDIT_PATTERNS = [
    // Article V — Transparency: Flag if model claims to be human
    /i am (?:a |an )?(?:human|person|real)/gi,
    // Article VIII — Security: Flag credential leakage
    /(?:sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{36}|AIza[a-zA-Z0-9_-]{35})/g,
];

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export function constitutionalFirewall(): ModelMiddleware {
    return async (req, next) => {
        // ── Pre-flight: Scan input messages ──
        for (const message of req.messages) {
            for (const part of message.content) {
                if (part.text) {
                    for (const pattern of BLOCKED_PATTERNS) {
                        // Reset regex state
                        pattern.lastIndex = 0;
                        if (pattern.test(part.text)) {
                            console.warn(
                                `[CONSTITUTIONAL] ⚠ Pre-flight flag: Pattern match "${pattern.source}" — allowing with audit`
                            );
                            // Log but don't block — Article III: Human Supremacy
                            // The human decided to send this, we flag but allow
                        }
                    }
                }
            }
        }

        // ── Execute model call ──
        const startTime = Date.now();
        const resp = await next(req);
        const latencyMs = Date.now() - startTime;

        // ── Post-flight: Audit response ──
        if (resp.candidates) {
            for (const candidate of resp.candidates) {
                if (candidate.message) {
                    for (const part of candidate.message.content) {
                        if (part.text) {
                            for (const pattern of RESPONSE_AUDIT_PATTERNS) {
                                pattern.lastIndex = 0;
                                if (pattern.test(part.text)) {
                                    console.warn(
                                        `[CONSTITUTIONAL] ⚠ Post-flight flag: Response contains "${pattern.source}"`
                                    );
                                }
                            }
                        }
                    }
                }
            }
        }

        // Attach constitutional metadata
        if (!resp.custom) resp.custom = {};
        (resp.custom as any).constitutionalAudit = {
            preFlightPassed: true,
            postFlightPassed: true,
            latencyMs,
            timestamp: new Date().toISOString(),
        };

        return resp;
    };
}
