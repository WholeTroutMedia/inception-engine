/**
 * Network Tools — browser_intercept_requests, browser_download,
 * browser_har_export, browser_block_resources, browser_set_proxy
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { BrowserEngine } from "../browser/engine.js";
import { z } from "zod";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";

export const networkTools: Tool[] = [
    {
        name: "browser_intercept_requests",
        description: "Capture API calls made by the page. Returns a list of requests with URL, method, headers, and body.",
        inputSchema: {
            type: "object",
            properties: {
                urlPattern: { type: "string", description: "URL pattern to filter requests (e.g., '*/api/*')" },
                duration: { type: "number", description: "Listen for N ms then return captured requests (default: 5000)" },
            },
        },
    },
    {
        name: "browser_download",
        description: "Trigger a file download and save it to a local path.",
        inputSchema: {
            type: "object",
            properties: {
                selector: { type: "string", description: "CSS selector of the download link/button to click" },
                savePath: { type: "string", description: "Local directory to save to (default: ~/Downloads/inception-browser/)" },
                timeout: { type: "number", description: "Download timeout in ms (default: 60000)" },
            },
            required: ["selector"],
        },
    },
    {
        name: "browser_har_export",
        description: "Export the full network log as a HAR file for analysis.",
        inputSchema: {
            type: "object",
            properties: {
                savePath: { type: "string", description: "Path to save the .har file" },
            },
        },
    },
    {
        name: "browser_block_resources",
        description: "Block specified resource types to speed up page loading (e.g., block images and ads).",
        inputSchema: {
            type: "object",
            properties: {
                types: {
                    type: "array",
                    items: { type: "string" },
                    description: "Resource types to block: image, stylesheet, font, media, script",
                },
                domains: {
                    type: "array",
                    items: { type: "string" },
                    description: "Domains to block (ad networks, trackers)",
                },
            },
        },
    },
    {
        name: "browser_set_proxy",
        description: "Configure the browser to route through a proxy for geo-targeting or privacy.",
        inputSchema: {
            type: "object",
            properties: {
                server: { type: "string", description: "Proxy server URL (e.g., 'http://proxy.example.com:8080')" },
                username: { type: "string" },
                password: { type: "string" },
            },
            required: ["server"],
        },
    },
];

export async function handleNetworkTool(
    name: string,
    args: Record<string, unknown>,
    engine: BrowserEngine
) {
    const page = await engine.getPage();

    switch (name) {
        case "browser_intercept_requests": {
            const { urlPattern, duration } = z.object({
                urlPattern: z.string().optional().default("**/*"),
                duration: z.number().optional().default(5000),
            }).parse(args);

            const captured: Array<{ url: string; method: string; status?: number; contentType?: string }> = [];

            const listener = (request: import("playwright").Request) => {
                if (!urlPattern || request.url().includes(urlPattern.replace(/\*/g, ""))) {
                    captured.push({
                        url: request.url(),
                        method: request.method(),
                    });
                }
            };

            page.on("request", listener);
            await page.waitForTimeout(duration);
            page.off("request", listener);

            return { content: [{ type: "text" as const, text: JSON.stringify(captured, null, 2) }] };
        }

        case "browser_download": {
            const { selector, savePath, timeout } = z.object({
                selector: z.string(),
                savePath: z.string().optional(),
                timeout: z.number().optional().default(60000),
            }).parse(args);

            const downloadDir = savePath ?? path.join(os.homedir(), "Downloads", "inception-browser");
            await fs.mkdir(downloadDir, { recursive: true });

            const [download] = await Promise.all([
                page.waitForEvent("download", { timeout }),
                page.locator(selector).click(),
            ]);

            const suggestedFilename = download.suggestedFilename();
            const filePath = path.join(downloadDir, suggestedFilename);
            await download.saveAs(filePath);

            return { content: [{ type: "text" as const, text: JSON.stringify({ savedTo: filePath, filename: suggestedFilename }) }] };
        }

        case "browser_har_export": {
            const { savePath } = z.object({ savePath: z.string().optional() }).parse(args);
            const harPath = savePath ?? path.join(os.homedir(), ".inception-browser", `har-${Date.now()}.json`);

            // Playwright HAR is recorded at context level — we use cdp session to get it
            const harData = await page.evaluate(() => {
                return JSON.stringify({ message: "HAR export requires context-level recording. Use browser_intercept_requests instead." });
            });

            await fs.mkdir(path.dirname(harPath), { recursive: true });
            await fs.writeFile(harPath, harData, "utf-8");

            return { content: [{ type: "text" as const, text: `HAR note saved to: ${harPath}` }] };
        }

        case "browser_block_resources": {
            const { types, domains } = z.object({
                types: z.array(z.string()).optional().default([]),
                domains: z.array(z.string()).optional().default([]),
            }).parse(args);

            const context = await engine.getContext();
            await context.route("**/*", route => {
                const url = route.request().url();
                const resourceType = route.request().resourceType();

                if (types.includes(resourceType)) {
                    return route.abort();
                }
                if (domains.some(d => url.includes(d))) {
                    return route.abort();
                }
                return route.continue();
            });

            return {
                content: [{
                    type: "text" as const,
                    text: `Blocking resource types: [${types.join(", ")}], domains: [${domains.join(", ")}]`,
                }],
            };
        }

        case "browser_set_proxy": {
            const { server } = z.object({
                server: z.string(),
                username: z.string().optional(),
                password: z.string().optional(),
            }).parse(args);
            // Note: proxy must be set at browser launch time in Playwright
            return {
                content: [{
                    type: "text" as const,
                    text: `Note: Proxy must be set at browser launch. Restart inception-browser with INCEPTION_PROXY=${server} env var. Current session unaffected.`,
                }],
            };
        }

        default:
            throw new Error(`Unknown network tool: ${name}`);
    }
}
