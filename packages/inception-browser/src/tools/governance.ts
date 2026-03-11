/**
 * Governance Tools — browser_audit_log, browser_check_governance,
 * browser_set_domain_policy, browser_pii_scan
 * Session Tools — browser_save_session, browser_restore_session
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { BrowserEngine } from "../browser/engine.js";
import type { SessionManager } from "../browser/session.js";
import { z } from "zod";
import { governance } from "../governance/constitutional.js";
import { queryHistory, setDomainPolicy, checkDomainPolicy } from "../memory/session-store.js";

// ─── Governance Tools ───────────────────────────────────────────────────────

export const governanceTools: Tool[] = [
    {
        name: "browser_check_governance",
        description: "Check if a proposed browser action is allowed by constitutional rules before executing it.",
        inputSchema: {
            type: "object",
            properties: {
                actionType: { type: "string", description: "Tool name to check (e.g., 'browser_navigate')" },
                url: { type: "string", description: "Target URL (if applicable)" },
                selector: { type: "string", description: "Target selector (if applicable)" },
                value: { type: "string", description: "Value being entered (if applicable)" },
                agentId: { type: "string", description: "Agent requesting the action" },
            },
            required: ["actionType"],
        },
    },
    {
        name: "browser_audit_log",
        description: "Return the full action audit log for this session, optionally filtered.",
        inputSchema: {
            type: "object",
            properties: {
                session: { type: "string", description: "Filter by session name" },
                actionType: { type: "string", description: "Filter by action type" },
                limit: { type: "number", description: "Max records to return (default: 50)" },
            },
        },
    },
    {
        name: "browser_set_domain_policy",
        description: "Allow or block a domain for a specific agent.",
        inputSchema: {
            type: "object",
            properties: {
                agentId: { type: "string", description: "AVERI agent ID (e.g., 'ATHENA', 'IRIS')" },
                domain: { type: "string", description: "Domain to set policy for (e.g., 'example.com')" },
                policy: { type: "string", enum: ["allow", "block"], description: "Policy to apply" },
            },
            required: ["agentId", "domain", "policy"],
        },
    },
    {
        name: "browser_pii_scan",
        description: "Scan the current page for PII before extracting data. Returns detected PII types and locations.",
        inputSchema: {
            type: "object",
            properties: {
                selector: { type: "string", description: "Scope scan to element (default: body)" },
            },
        },
    },
];

export async function handleGovernanceTool(
    name: string,
    args: Record<string, unknown>,
    engine: BrowserEngine
) {
    switch (name) {
        case "browser_check_governance": {
            const { actionType, url, selector, value, agentId } = z.object({
                actionType: z.string(),
                url: z.string().optional(),
                selector: z.string().optional(),
                value: z.string().optional(),
                agentId: z.string().optional(),
            }).parse(args);

            const result = await governance.checkAction({ type: actionType, url, selector, value, agentId });
            return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
        }

        case "browser_audit_log": {
            const { session, actionType, limit } = z.object({
                session: z.string().optional(),
                actionType: z.string().optional(),
                limit: z.number().optional().default(50),
            }).parse(args);

            const records = queryHistory({ session, type: actionType, limit });
            return { content: [{ type: "text" as const, text: JSON.stringify(records, null, 2) }] };
        }

        case "browser_set_domain_policy": {
            const { agentId, domain, policy } = z.object({
                agentId: z.string(),
                domain: z.string(),
                policy: z.enum(["allow", "block"]),
            }).parse(args);

            setDomainPolicy(agentId, domain, policy);
            return { content: [{ type: "text" as const, text: `Policy "${policy}" set for agent "${agentId}" on domain "${domain}"` }] };
        }

        case "browser_pii_scan": {
            const { selector } = z.object({ selector: z.string().optional().default("body") }).parse(args);
            const page = await engine.getPage();

            const piiPatterns = [
                { type: "Email", pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g },
                { type: "Phone", pattern: /\b(\+?1?[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g },
                { type: "SSN", pattern: /\b\d{3}-\d{2}-\d{4}\b/g },
                { type: "Credit Card", pattern: /\b(?:\d[ -]?){13,16}\b/g },
                { type: "IP Address", pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g },
            ];

            const text = await page.locator(selector).innerText().catch(() => "");
            const found: Array<{ type: string; matches: string[] }> = [];

            for (const { type, pattern } of piiPatterns) {
                const matches = Array.from(String(text).matchAll(pattern)).map(m => m[0]);
                if (matches.length > 0) {
                    found.push({ type, matches: matches.slice(0, 5) });
                }
            }

            return {
                content: [{
                    type: "text" as const,
                    text: JSON.stringify({
                        piiDetected: found.length > 0,
                        items: found,
                        recommendation: found.length > 0
                            ? "Review detected PII before extracting this page content."
                            : "No PII patterns detected.",
                    }, null, 2),
                }],
            };
        }

        default:
            throw new Error(`Unknown governance tool: ${name}`);
    }
}

