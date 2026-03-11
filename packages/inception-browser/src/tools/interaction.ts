/**
 * Interaction Tools — click, type, fill, select, hover, drag, keyboard, upload
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { BrowserEngine } from "../browser/engine.js";
import { z } from "zod";

export const interactionTools: Tool[] = [
    {
        name: "browser_click",
        description: "Click an element by CSS selector, text content, or coordinates.",
        inputSchema: {
            type: "object",
            properties: {
                selector: { type: "string", description: "CSS selector" },
                text: { type: "string", description: "Visible text of the element to click" },
                x: { type: "number", description: "X coordinate (for coordinate-based click)" },
                y: { type: "number", description: "Y coordinate (for coordinate-based click)" },
                button: { type: "string", enum: ["left", "right", "middle"], description: "Mouse button" },
                clickCount: { type: "number", description: "Number of clicks (1=click, 2=dblclick)" },
            },
        },
    },
    {
        name: "browser_type",
        description: "Type text into the currently focused element or a specified element.",
        inputSchema: {
            type: "object",
            properties: {
                text: { type: "string", description: "Text to type" },
                selector: { type: "string", description: "Optional CSS selector to focus first" },
                delay: { type: "number", description: "Delay between keystrokes in ms (simulates human)" },
            },
            required: ["text"],
        },
    },
    {
        name: "browser_fill",
        description: "Fill a form field with text (clears existing content first).",
        inputSchema: {
            type: "object",
            properties: {
                selector: { type: "string", description: "CSS selector or label text" },
                value: { type: "string", description: "Value to fill" },
                clearFirst: { type: "boolean", description: "Clear existing content first (default: true)" },
            },
            required: ["selector", "value"],
        },
    },
    {
        name: "browser_select",
        description: "Select an option from a dropdown/select element.",
        inputSchema: {
            type: "object",
            properties: {
                selector: { type: "string", description: "CSS selector of the select element" },
                value: { type: "string", description: "Option value to select" },
                label: { type: "string", description: "Option label text to select" },
            },
            required: ["selector"],
        },
    },
    {
        name: "browser_hover",
        description: "Hover the mouse over an element.",
        inputSchema: {
            type: "object",
            properties: {
                selector: { type: "string", description: "CSS selector to hover over" },
            },
            required: ["selector"],
        },
    },
    {
        name: "browser_drag",
        description: "Drag an element from source to target.",
        inputSchema: {
            type: "object",
            properties: {
                sourceSelector: { type: "string", description: "CSS selector of element to drag" },
                targetSelector: { type: "string", description: "CSS selector of drop target" },
                sourceX: { type: "number" },
                sourceY: { type: "number" },
                targetX: { type: "number" },
                targetY: { type: "number" },
            },
        },
    },
    {
        name: "browser_keyboard",
        description: "Press a key or keyboard shortcut (e.g., Enter, Tab, Control+A).",
        inputSchema: {
            type: "object",
            properties: {
                key: { type: "string", description: "Key or shortcut (e.g., 'Enter', 'Control+A', 'Tab')" },
            },
            required: ["key"],
        },
    },
    {
        name: "browser_upload",
        description: "Upload a file from the local filesystem to a file input element.",
        inputSchema: {
            type: "object",
            properties: {
                selector: { type: "string", description: "CSS selector of the file input" },
                filePath: { type: "string", description: "Absolute path to the file to upload" },
            },
            required: ["selector", "filePath"],
        },
    },
];

export async function handleInteractionTool(
    name: string,
    args: Record<string, unknown>,
    engine: BrowserEngine
) {
    const page = await engine.getPage();

    switch (name) {
        case "browser_click": {
            const { selector, text, x, y, button, clickCount } = z.object({
                selector: z.string().optional(),
                text: z.string().optional(),
                x: z.number().optional(),
                y: z.number().optional(),
                button: z.enum(["left", "right", "middle"]).optional().default("left"),
                clickCount: z.number().optional().default(1),
            }).parse(args);

            if (x !== undefined && y !== undefined) {
                await page.mouse.click(x, y, { button, clickCount });
            } else if (text) {
                await page.getByText(text).first().click({ button, clickCount });
            } else if (selector) {
                await page.locator(selector).first().click({ button, clickCount });
            } else {
                throw new Error("Provide selector, text, or x/y coordinates");
            }
            return { content: [{ type: "text" as const, text: "Clicked successfully" }] };
        }

        case "browser_type": {
            const { text, selector, delay } = z.object({
                text: z.string(),
                selector: z.string().optional(),
                delay: z.number().optional().default(30),
            }).parse(args);
            if (selector) await page.locator(selector).first().click();
            await page.keyboard.type(text, { delay });
            return { content: [{ type: "text" as const, text: `Typed: "${text}"` }] };
        }

        case "browser_fill": {
            const { selector, value, clearFirst } = z.object({
                selector: z.string(),
                value: z.string(),
                clearFirst: z.boolean().optional().default(true),
            }).parse(args);
            const loc = page.locator(selector).first();
            if (clearFirst) await loc.clear();
            await loc.fill(value);
            return { content: [{ type: "text" as const, text: `Filled "${selector}" with "${value}"` }] };
        }

        case "browser_select": {
            const { selector, value, label } = z.object({
                selector: z.string(),
                value: z.string().optional(),
                label: z.string().optional(),
            }).parse(args);
            const selectBy = value ? { value } : label ? { label } : null;
            if (!selectBy) throw new Error("Provide value or label");
            await page.locator(selector).selectOption(selectBy);
            return { content: [{ type: "text" as const, text: "Selected option" }] };
        }

        case "browser_hover": {
            const { selector } = z.object({ selector: z.string() }).parse(args);
            await page.locator(selector).hover();
            return { content: [{ type: "text" as const, text: `Hovered over ${selector}` }] };
        }

        case "browser_drag": {
            const { sourceSelector, targetSelector, sourceX, sourceY, targetX, targetY } = z.object({
                sourceSelector: z.string().optional(),
                targetSelector: z.string().optional(),
                sourceX: z.number().optional(),
                sourceY: z.number().optional(),
                targetX: z.number().optional(),
                targetY: z.number().optional(),
            }).parse(args);

            if (sourceSelector && targetSelector) {
                await page.locator(sourceSelector).dragTo(page.locator(targetSelector));
            } else if (sourceX !== undefined && sourceY !== undefined && targetX !== undefined && targetY !== undefined) {
                await page.mouse.move(sourceX, sourceY);
                await page.mouse.down();
                await page.mouse.move(targetX, targetY);
                await page.mouse.up();
            } else {
                throw new Error("Provide source+target selectors OR source+target coordinates");
            }
            return { content: [{ type: "text" as const, text: "Drag completed" }] };
        }

        case "browser_keyboard": {
            const { key } = z.object({ key: z.string() }).parse(args);
            await page.keyboard.press(key);
            return { content: [{ type: "text" as const, text: `Pressed: ${key}` }] };
        }

        case "browser_upload": {
            const { selector, filePath } = z.object({
                selector: z.string(),
                filePath: z.string(),
            }).parse(args);
            await page.locator(selector).setInputFiles(filePath);
            return { content: [{ type: "text" as const, text: `Uploaded: ${filePath}` }] };
        }

        default:
            throw new Error(`Unknown interaction tool: ${name}`);
    }
}
