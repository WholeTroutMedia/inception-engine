/**
 * File Tools — browser_download (alias), upload wrappers
 * Forms Tools — browser_smart_form_fill
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { BrowserEngine } from "../browser/engine.js";
import { z } from "zod";

// ─── File Tools ─────────────────────────────────────────────────────────────

export const fileTools: Tool[] = [
    {
        name: "browser_upload_file",
        description: "Upload a file from the local filesystem to a file input element.",
        inputSchema: {
            type: "object",
            properties: {
                selector: { type: "string", description: "CSS selector for the file input element" },
                filePaths: {
                    type: "array",
                    items: { type: "string" },
                    description: "Absolute paths of files to upload (supports multiple)",
                },
            },
            required: ["selector", "filePaths"],
        },
    },
];

export async function handleFileTool(
    name: string,
    args: Record<string, unknown>,
    engine: BrowserEngine
) {
    const page = await engine.getPage();

    switch (name) {
        case "browser_upload_file": {
            const { selector, filePaths } = z.object({
                selector: z.string(),
                filePaths: z.array(z.string()),
            }).parse(args);

            await page.locator(selector).setInputFiles(filePaths);
            return {
                content: [{
                    type: "text" as const,
                    text: `Uploaded ${filePaths.length} file(s) to "${selector}"`,
                }],
            };
        }

        default:
            throw new Error(`Unknown file tool: ${name}`);
    }
}

