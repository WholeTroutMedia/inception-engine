/**
 * Extraction Tools — screenshot, dom_tree, text, extract_data,
 * get_links, get_forms
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { BrowserEngine } from "../browser/engine.js";
import { z } from "zod";

export const extractionTools: Tool[] = [
    {
        name: "browser_screenshot",
        description: "Take a screenshot. Returns base64-encoded PNG. Supports full page, viewport, or element.",
        inputSchema: {
            type: "object",
            properties: {
                fullPage: { type: "boolean", description: "Capture full scrollable page (default: false = viewport only)" },
                selector: { type: "string", description: "Capture only this element" },
                quality: { type: "number", description: "JPEG quality 0-100 (omit for PNG)" },
            },
        },
    },
    {
        name: "browser_dom_tree",
        description: "Get a pruned, semantic accessibility tree of the current page — reduced from raw DOM to ~500 actionable nodes.",
        inputSchema: {
            type: "object",
            properties: {
                selector: { type: "string", description: "Root element to start from (default: entire page)" },
                maxDepth: { type: "number", description: "Max tree depth (default: 8)" },
            },
        },
    },
    {
        name: "browser_text",
        description: "Extract all visible text content from the page or a specific element.",
        inputSchema: {
            type: "object",
            properties: {
                selector: { type: "string", description: "CSS selector to extract text from (default: body)" },
                trim: { type: "boolean", description: "Trim and collapse whitespace (default: true)" },
            },
        },
    },
    {
        name: "browser_extract_data",
        description: "Extract structured data from the page — tables, lists, products, prices, or custom patterns.",
        inputSchema: {
            type: "object",
            properties: {
                type: {
                    type: "string",
                    enum: ["table", "list", "products", "prices", "custom"],
                    description: "Data type to extract",
                },
                selector: { type: "string", description: "CSS selector narrowing extraction scope" },
                customSelector: { type: "string", description: "For type:custom — CSS selector for repeated items" },
                fields: {
                    type: "array",
                    items: { type: "object", properties: { name: { type: "string" }, selector: { type: "string" } } },
                    description: "For type:custom — field definitions",
                },
            },
            required: ["type"],
        },
    },
    {
        name: "browser_get_links",
        description: "Get all links on the page with their text, href, and visibility.",
        inputSchema: {
            type: "object",
            properties: {
                selector: { type: "string", description: "Scope to links within this element" },
                filterExternal: { type: "boolean", description: "Only return external links" },
                filterInternal: { type: "boolean", description: "Only return internal links" },
            },
        },
    },
    {
        name: "browser_get_forms",
        description: "Get all forms on the page with their fields, labels, and types.",
        inputSchema: {
            type: "object",
            properties: {
                selector: { type: "string", description: "Scope to a specific form" },
            },
        },
    },
];

export async function handleExtractionTool(
    name: string,
    args: Record<string, unknown>,
    engine: BrowserEngine
) {
    const page = await engine.getPage();

    switch (name) {
        case "browser_screenshot": {
            const { fullPage, selector, quality } = z.object({
                fullPage: z.boolean().optional().default(false),
                selector: z.string().optional(),
                quality: z.number().optional(),
            }).parse(args);

            let buffer: Buffer<ArrayBufferLike>;
            if (selector) {
                buffer = await page.locator(selector).screenshot({ type: quality ? "jpeg" : "png", quality });
            } else {
                buffer = await page.screenshot({ fullPage, type: quality ? "jpeg" : "png", quality });
            }
            const base64 = buffer.toString("base64");
            const mime = quality ? "image/jpeg" : "image/png";
            return {
                content: [
                    {
                        type: "image" as const,
                        data: base64,
                        mimeType: mime,
                    },
                ],
            };
        }

        case "browser_dom_tree": {
            const { selector, maxDepth } = z.object({
                selector: z.string().optional(),
                maxDepth: z.number().optional().default(8),
            }).parse(args);

            // Build semantic tree via DOM evaluation (page.accessibility removed in Playwright 1.47+)
            const snapshot = await page.evaluate((maxD: number) => {
                function getRole(el: Element): string {
                    return el.getAttribute('role') ?? el.tagName.toLowerCase();
                }
                function traverse(el: Element, depth: number): object | null {
                    if (depth > maxD) return null;
                    const tag = el.tagName.toLowerCase();
                    if (['script', 'style', 'noscript'].includes(tag)) return null;
                    const name = el.getAttribute('aria-label') ?? el.getAttribute('title') ?? undefined;
                    const role = getRole(el);
                    const children: object[] = Array.from(el.children).map(c => traverse(c, depth + 1)).filter(Boolean) as object[];
                    if (!name && children.length === 0) return null;
                    return { role, name, children: children.length > 0 ? children : undefined };
                }
                return traverse(document.body, 0);
            }, maxDepth);
            const pruned = pruneTree(snapshot as AccessibilityNode | null, maxDepth);
            return {
                content: [{ type: "text" as const, text: JSON.stringify(pruned, null, 2) }],
            };
        }

        case "browser_text": {
            const { selector, trim } = z.object({
                selector: z.string().optional().default("body"),
                trim: z.boolean().optional().default(true),
            }).parse(args);

            const text = await page.locator(selector).innerText().catch(() =>
                page.evaluate(`document.querySelector('${selector}')?.innerText ?? ''`)
            );
            const result = trim ? String(text).replace(/\s+/g, " ").trim() : String(text);
            return { content: [{ type: "text" as const, text: result }] };
        }

        case "browser_extract_data": {
            const { type, selector, customSelector } = z.object({
                type: z.enum(["table", "list", "products", "prices", "custom"]),
                selector: z.string().optional(),
                customSelector: z.string().optional(),
            }).parse(args);

            const scope = selector ?? "body";
            let data: unknown;

            if (type === "table") {
                data = await page.evaluate((sel: string) => {
                    const table = document.querySelector(sel + " table") ?? document.querySelector("table");
                    if (!table) return [];
                    const rows = Array.from(table.querySelectorAll("tr"));
                    return rows.map(row =>
                        Array.from(row.querySelectorAll("th, td")).map(cell => cell.textContent?.trim() ?? "")
                    );
                }, scope);
            } else if (type === "list") {
                data = await page.evaluate((sel: string) => {
                    const lists = Array.from(document.querySelectorAll(sel + " ul, " + sel + " ol, ul, ol"));
                    return lists.slice(0, 5).map(list =>
                        Array.from(list.querySelectorAll("li")).map(li => li.textContent?.trim() ?? "")
                    );
                }, scope);
            } else if (type === "prices") {
                data = await page.evaluate(() => {
                    const priceRegex = /[\$\€\£\¥][\d,]+\.?\d*/g;
                    const text = document.body.innerText;
                    return text.match(priceRegex) ?? [];
                });
            } else {
                // products or custom — get text from main content area
                data = await page.evaluate((sel: string) => {
                    const el = document.querySelector(sel);
                    if (!el) return [];
                    const items = Array.from(el.querySelectorAll("[class*='product'], [class*='item'], [class*='card']"));
                    return items.slice(0, 20).map(item => item.textContent?.trim().slice(0, 200) ?? "");
                }, customSelector ?? scope);
            }

            return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
        }

        case "browser_get_links": {
            const { selector, filterExternal, filterInternal } = z.object({
                selector: z.string().optional().default("body"),
                filterExternal: z.boolean().optional(),
                filterInternal: z.boolean().optional(),
            }).parse(args);

            const links = await page.evaluate(
                ({ sel, ext, int: internal }: { sel: string; ext?: boolean; int?: boolean }) => {
                    const origin = window.location.origin;
                    const anchors = Array.from(document.querySelectorAll(sel + " a[href]"));
                    return anchors
                        .map(a => ({
                            text: (a as HTMLAnchorElement).textContent?.trim() ?? "",
                            href: (a as HTMLAnchorElement).href,
                            external: !(a as HTMLAnchorElement).href.startsWith(origin),
                        }))
                        .filter(l => {
                            if (ext) return l.external;
                            if (internal) return !l.external;
                            return true;
                        })
                        .slice(0, 100);
                },
                { sel: selector, ext: filterExternal, int: filterInternal }
            );

            return { content: [{ type: "text" as const, text: JSON.stringify(links, null, 2) }] };
        }

        case "browser_get_forms": {
            const { selector } = z.object({ selector: z.string().optional() }).parse(args);

            const forms = await page.evaluate((sel?: string) => {
                const scope = sel ? document.querySelector(sel) ?? document : document;
                const formEls = Array.from((scope as Document | Element).querySelectorAll("form"));
                return formEls.map(form => ({
                    id: form.id,
                    action: form.action,
                    method: form.method,
                    fields: Array.from(form.querySelectorAll("input, textarea, select")).map(el => ({
                        type: (el as HTMLInputElement).type ?? el.tagName.toLowerCase(),
                        name: (el as HTMLInputElement).name,
                        id: el.id,
                        placeholder: (el as HTMLInputElement).placeholder ?? "",
                        label: document.querySelector(`label[for="${el.id}"]`)?.textContent?.trim() ?? "",
                        required: (el as HTMLInputElement).required,
                    })),
                }));
            }, selector);

            return { content: [{ type: "text" as const, text: JSON.stringify(forms, null, 2) }] };
        }

        default:
            throw new Error(`Unknown extraction tool: ${name}`);
    }
}

// ─── DOM Tree Pruning ───────────────────────────────────────────────────────

interface AccessibilityNode {
    role?: string;
    name?: string;
    value?: string | number | boolean;
    children?: AccessibilityNode[];
    [key: string]: unknown;
}

function pruneTree(node: AccessibilityNode | null, maxDepth: number, depth = 0): AccessibilityNode | null {
    if (!node || depth > maxDepth) return null;
    const { children, ...rest } = node;
    const pruned: AccessibilityNode = { ...rest };
    if (children) {
        const prunedChildren = children
            .map(child => pruneTree(child, maxDepth, depth + 1))
            .filter(Boolean) as AccessibilityNode[];
        if (prunedChildren.length > 0) pruned.children = prunedChildren;
    }
    return pruned;
}
