/**
 * Tab Tools — browser_new_tab, browser_switch_tab, browser_close_tab, browser_list_tabs
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { BrowserEngine } from "../browser/engine.js";
import { z } from "zod";

export const tabTools: Tool[] = [
    {
        name: "browser_new_tab",
        description: "Open a new browser tab, optionally navigating to a URL.",
        inputSchema: {
            type: "object",
            properties: {
                url: { type: "string", description: "URL to navigate to in the new tab (optional)" },
            },
        },
    },
    {
        name: "browser_switch_tab",
        description: "Switch to an existing tab by its index (0-based).",
        inputSchema: {
            type: "object",
            properties: {
                index: { type: "number", description: "Tab index (0-based)" },
            },
            required: ["index"],
        },
    },
    {
        name: "browser_close_tab",
        description: "Close a tab by its index.",
        inputSchema: {
            type: "object",
            properties: {
                index: { type: "number", description: "Tab index to close (0-based)" },
            },
            required: ["index"],
        },
    },
    {
        name: "browser_list_tabs",
        description: "List all open tabs with their index, URL, and title.",
        inputSchema: {
            type: "object",
            properties: {},
        },
    },
];

export async function handleTabTool(
    name: string,
    args: Record<string, unknown>,
    engine: BrowserEngine
) {
    switch (name) {
        case "browser_new_tab": {
            const { url } = z.object({ url: z.string().optional() }).parse(args);
            const page = await engine.newPage();
            if (url) await page.goto(url, { waitUntil: "load" });
            const tabs = engine.listPages();
            return {
                content: [{
                    type: "text" as const,
                    text: JSON.stringify({ message: "New tab opened", url: url ?? "about:blank", tabCount: tabs.length }),
                }],
            };
        }

        case "browser_switch_tab": {
            const { index } = z.object({ index: z.number() }).parse(args);
            const page = await engine.switchPage(index);
            return {
                content: [{
                    type: "text" as const,
                    text: JSON.stringify({ switched: true, url: page.url() }),
                }],
            };
        }

        case "browser_close_tab": {
            const { index } = z.object({ index: z.number() }).parse(args);
            await engine.closePage(index);
            const tabs = engine.listPages();
            return {
                content: [{
                    type: "text" as const,
                    text: JSON.stringify({ closed: true, remainingTabs: tabs.length }),
                }],
            };
        }

        case "browser_list_tabs": {
            const pages = await Promise.all(
                engine.listPages().map(async (t) => {
                    // Try to get title — handle closed pages gracefully
                    try {
                        const allPages = await engine.getContext();
                        return { ...t };
                    } catch {
                        return t;
                    }
                })
            );
            return { content: [{ type: "text" as const, text: JSON.stringify(pages, null, 2) }] };
        }

        default:
            throw new Error(`Unknown tab tool: ${name}`);
    }
}
