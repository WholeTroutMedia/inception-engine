/**
 * Navigation Tools — browser_navigate, browser_back, browser_forward,
 * browser_refresh, browser_scroll, browser_wait_for
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { BrowserEngine } from "../browser/engine.js";
import { z } from "zod";

export const navigationTools: Tool[] = [
    {
        name: "browser_navigate",
        description: "Navigate the browser to a URL. Returns the final URL after redirects.",
        inputSchema: {
            type: "object",
            properties: {
                url: { type: "string", description: "URL to navigate to" },
                waitUntil: {
                    type: "string",
                    enum: ["load", "domcontentloaded", "networkidle"],
                    description: "When to consider navigation done (default: load)",
                },
                timeout: { type: "number", description: "Timeout in ms (default: 30000)" },
            },
            required: ["url"],
        },
    },
    {
        name: "browser_back",
        description: "Navigate back in browser history.",
        inputSchema: { type: "object", properties: {} },
    },
    {
        name: "browser_forward",
        description: "Navigate forward in browser history.",
        inputSchema: { type: "object", properties: {} },
    },
    {
        name: "browser_refresh",
        description: "Reload the current page.",
        inputSchema: {
            type: "object",
            properties: {
                waitUntil: {
                    type: "string",
                    enum: ["load", "domcontentloaded", "networkidle"],
                },
            },
        },
    },
    {
        name: "browser_scroll",
        description:
            "Scroll the page. Can scroll by pixel amount, to an element, or to the bottom.",
        inputSchema: {
            type: "object",
            properties: {
                direction: { type: "string", enum: ["up", "down", "left", "right", "bottom", "top"] },
                amount: { type: "number", description: "Pixels to scroll (default: 500)" },
                selector: { type: "string", description: "Scroll element into view instead" },
            },
        },
    },
    {
        name: "browser_wait_for",
        description:
            "Wait for a condition: element to appear, network to be idle, or a fixed duration.",
        inputSchema: {
            type: "object",
            properties: {
                type: {
                    type: "string",
                    enum: ["element", "networkidle", "timeout", "url"],
                    description: "What to wait for",
                },
                selector: { type: "string", description: "CSS selector (for type: element)" },
                url: { type: "string", description: "URL pattern to wait for (for type: url)" },
                timeout: { type: "number", description: "Max wait time in ms (default: 30000)" },
                duration: { type: "number", description: "Fixed wait in ms (for type: timeout)" },
            },
            required: ["type"],
        },
    },
];

const NavigateSchema = z.object({
    url: z.string(),
    waitUntil: z.enum(["load", "domcontentloaded", "networkidle"]).optional().default("load"),
    timeout: z.number().optional().default(30000),
});

const ScrollSchema = z.object({
    direction: z.enum(["up", "down", "left", "right", "bottom", "top"]).optional().default("down"),
    amount: z.number().optional().default(500),
    selector: z.string().optional(),
});

const WaitForSchema = z.object({
    type: z.enum(["element", "networkidle", "timeout", "url"]),
    selector: z.string().optional(),
    url: z.string().optional(),
    timeout: z.number().optional().default(30000),
    duration: z.number().optional().default(1000),
});

export async function handleNavigationTool(
    name: string,
    args: Record<string, unknown>,
    engine: BrowserEngine
) {
    const page = await engine.getPage();

    switch (name) {
        case "browser_navigate": {
            const { url, waitUntil, timeout } = NavigateSchema.parse(args);
            const response = await page.goto(url, { waitUntil, timeout });
            const finalUrl = page.url();
            const status = response?.status() ?? 0;
            return {
                content: [
                    {
                        type: "text" as const,
                        text: JSON.stringify({ url: finalUrl, status, title: await page.title() }),
                    },
                ],
            };
        }

        case "browser_back": {
            await page.goBack({ waitUntil: "load" });
            return { content: [{ type: "text" as const, text: JSON.stringify({ url: page.url() }) }] };
        }

        case "browser_forward": {
            await page.goForward({ waitUntil: "load" });
            return { content: [{ type: "text" as const, text: JSON.stringify({ url: page.url() }) }] };
        }

        case "browser_refresh": {
            const { waitUntil } = z.object({ waitUntil: z.enum(["load", "domcontentloaded", "networkidle"]).optional().default("load") }).parse(args);
            await page.reload({ waitUntil });
            return { content: [{ type: "text" as const, text: JSON.stringify({ url: page.url(), title: await page.title() }) }] };
        }

        case "browser_scroll": {
            const { direction, amount, selector } = ScrollSchema.parse(args);
            if (selector) {
                await page.locator(selector).scrollIntoViewIfNeeded();
            } else {
                const scrollMap: Record<string, string> = {
                    down: `window.scrollBy(0, ${amount})`,
                    up: `window.scrollBy(0, -${amount})`,
                    right: `window.scrollBy(${amount}, 0)`,
                    left: `window.scrollBy(-${amount}, 0)`,
                    bottom: "window.scrollTo(0, document.body.scrollHeight)",
                    top: "window.scrollTo(0, 0)",
                };
                await page.evaluate(scrollMap[direction] ?? `window.scrollBy(0, ${amount})`);
            }
            return { content: [{ type: "text" as const, text: `Scrolled ${direction}` }] };
        }

        case "browser_wait_for": {
            const { type, selector, url: urlPattern, timeout, duration } = WaitForSchema.parse(args);
            switch (type) {
                case "element":
                    if (!selector) throw new Error("selector required for type:element");
                    await page.waitForSelector(selector, { timeout });
                    break;
                case "networkidle":
                    await page.waitForLoadState("networkidle", { timeout });
                    break;
                case "timeout":
                    await page.waitForTimeout(duration);
                    break;
                case "url":
                    if (!urlPattern) throw new Error("url required for type:url");
                    await page.waitForURL(urlPattern, { timeout });
                    break;
            }
            return { content: [{ type: "text" as const, text: `Wait complete (${type})` }] };
        }

        default:
            throw new Error(`Unknown navigation tool: ${name}`);
    }
}
