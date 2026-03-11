/**
 * Evaluate Tool — browser_evaluate_js
 * Execute arbitrary JavaScript in page context.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { BrowserEngine } from "../browser/engine.js";
import { z } from "zod";

export const evaluateTools: Tool[] = [
    {
        name: "browser_evaluate_js",
        description: "Execute arbitrary JavaScript in the page context and return the result as JSON.",
        inputSchema: {
            type: "object",
            properties: {
                script: {
                    type: "string",
                    description: "JavaScript to execute. Use 'return' to return a value. Must be JSON-serialisable.",
                },
                arg: {
                    description: "Optional argument passed to the script as the first parameter.",
                },
            },
            required: ["script"],
        },
    },
];

export async function handleEvaluateTool(
    name: string,
    args: Record<string, unknown>,
    engine: BrowserEngine
) {
    if (name !== "browser_evaluate_js") throw new Error(`Unknown evaluate tool: ${name}`);

    const { script, arg } = z.object({
        script: z.string(),
        arg: z.unknown().optional(),
    }).parse(args);

    const page = await engine.getPage();

    // Wrap in function if script uses 'return'
    const wrappedScript = script.trim().startsWith("return")
        ? `(function() { ${script} })()`
        : script;

    const result = arg !== undefined
        ? await page.evaluate(wrappedScript as unknown as (arg: unknown) => unknown, arg)
        : await page.evaluate(wrappedScript);

    return {
        content: [
            {
                type: "text" as const,
                text: JSON.stringify(result, null, 2),
            },
        ],
    };
}
