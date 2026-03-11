/**
 * Constitutional Governance — 20 articles as executable browser rules.
 * Every browser action passes through checkAction() before execution.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RULES_FILE = path.resolve(__dirname, "../../../config/governance-rules.json");

export interface GovernanceRule {
    id: string;
    article: number;
    description: string;
    rule_type: "domain_block" | "pii_guard" | "rate_limit" | "audit_required" | "custom";
    conditions: Record<string, unknown>;
    action: "block" | "warn" | "audit";
}

export interface GovernanceResult {
    allowed: boolean;
    reason: string;
    article?: number;
    action?: string;
}

export interface BrowserAction {
    type: string;
    url?: string;
    selector?: string;
    value?: string;
    agentId?: string;
}

export class ConstitutionalGovernance {
    private rules: GovernanceRule[] = [];
    private loaded = false;

    async checkAction(action: BrowserAction): Promise<GovernanceResult> {
        await this.ensureLoaded();

        for (const rule of this.rules) {
            const result = this.evaluateRule(rule, action);
            if (!result.allowed) return result;
        }

        return { allowed: true, reason: "All constitutional checks passed" };
    }

    private evaluateRule(rule: GovernanceRule, action: BrowserAction): GovernanceResult {
        switch (rule.rule_type) {
            case "domain_block": {
                const blockedDomains = (rule.conditions["domains"] as string[]) ?? [];
                if (action.url) {
                    try {
                        const domain = new URL(action.url).hostname;
                        if (blockedDomains.some(d => domain.includes(d))) {
                            return {
                                allowed: false,
                                reason: `Article ${rule.article}: Domain "${domain}" is constitutionally blocked. ${rule.description}`,
                                article: rule.article,
                                action: action.type,
                            };
                        }
                    } catch { /* invalid URL — skip */ }
                }
                break;
            }

            case "pii_guard": {
                const piiKeywords = (rule.conditions["keywords"] as string[]) ?? [];
                const valueToCheck = (action.value ?? "").toLowerCase();
                const selectorToCheck = (action.selector ?? "").toLowerCase();
                if (piiKeywords.some(kw => valueToCheck.includes(kw) || selectorToCheck.includes(kw))) {
                    return {
                        allowed: rule.action !== "block",
                        reason: `Article ${rule.article}: Potential PII detected. ${rule.description}`,
                        article: rule.article,
                    };
                }
                break;
            }

            case "audit_required": {
                const auditActions = (rule.conditions["action_types"] as string[]) ?? [];
                if (auditActions.includes(action.type)) {
                    // Warn but allow — audit logging handled by action-audit.ts
                    return {
                        allowed: true,
                        reason: `Article ${rule.article}: Action "${action.type}" requires audit logging. Proceeding.`,
                        article: rule.article,
                    };
                }
                break;
            }
        }

        return { allowed: true, reason: "Rule passed" };
    }

    private async ensureLoaded(): Promise<void> {
        if (this.loaded) return;
        try {
            const raw = await fs.readFile(RULES_FILE, "utf-8");
            this.rules = JSON.parse(raw) as GovernanceRule[];
        } catch {
            this.rules = this.getDefaultRules();
        }
        this.loaded = true;
    }

    private getDefaultRules(): GovernanceRule[] {
        return [
            {
                id: "art-i-sovereignty",
                article: 1,
                description: "Prefer sovereign/local infrastructure; flag external data exfiltration",
                rule_type: "audit_required",
                conditions: { action_types: ["browser_download", "browser_har_export"] },
                action: "audit",
            },
            {
                id: "art-iv-quality",
                article: 4,
                description: "All form fills must be intentional; no accidental data entry",
                rule_type: "audit_required",
                conditions: { action_types: ["browser_fill", "browser_type", "browser_smart_form_fill"] },
                action: "audit",
            },
            {
                id: "art-ix-no-mvp",
                article: 9,
                description: "Block navigation to known low-quality or spam domains",
                rule_type: "domain_block",
                conditions: { domains: [] }, // Populated by user via browser_set_domain_policy
                action: "block",
            },
            {
                id: "art-xx-pii-guard",
                article: 20,
                description: "Warn when PII-adjacent fields are being filled",
                rule_type: "pii_guard",
                conditions: {
                    keywords: ["ssn", "social security", "passport", "credit card", "cvv", "pin"],
                },
                action: "warn",
            },
        ];
    }
}

// Singleton
export const governance = new ConstitutionalGovernance();
