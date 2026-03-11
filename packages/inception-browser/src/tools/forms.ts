// packages/inception-browser/src/tools/forms.ts
// T20260306-168: Form interaction tools — fill, submit, validate, select, file upload

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { BrowserEngine } from '../browser/engine.js';
import { z } from 'zod';

export const formTools: Tool[] = [
    {
        name: 'browser_form_fill',
        description: 'Fill a form field with a value (input, textarea). Supports CSS selectors and label text.',
        inputSchema: {
            type: 'object',
            properties: {
                selector: { type: 'string', description: 'CSS selector or label text of the form field' },
                value: { type: 'string', description: 'Value to fill into the field' },
                clearFirst: { type: 'boolean', description: 'Clear existing value before filling (default: true)', default: true },
            },
            required: ['selector', 'value'],
        },
    },
    {
        name: 'browser_form_select',
        description: 'Select an option from a <select> dropdown by value, label, or index',
        inputSchema: {
            type: 'object',
            properties: {
                selector: { type: 'string', description: 'CSS selector for the <select> element' },
                value: { type: 'string', description: 'Option value or label text to select' },
            },
            required: ['selector', 'value'],
        },
    },
    {
        name: 'browser_form_check',
        description: 'Check or uncheck a checkbox or radio button',
        inputSchema: {
            type: 'object',
            properties: {
                selector: { type: 'string', description: 'CSS selector for the checkbox or radio' },
                checked: { type: 'boolean', description: 'true to check, false to uncheck', default: true },
            },
            required: ['selector'],
        },
    },
    {
        name: 'browser_form_submit',
        description: 'Submit a form by clicking its submit button or pressing Enter on the focused field',
        inputSchema: {
            type: 'object',
            properties: {
                selector: { type: 'string', description: 'CSS selector of the form or submit button' },
                waitForNavigation: { type: 'boolean', description: 'Wait for page navigation after submit', default: true },
            },
            required: ['selector'],
        },
    },
    {
        name: 'browser_form_upload',
        description: 'Upload a file to a file input element',
        inputSchema: {
            type: 'object',
            properties: {
                selector: { type: 'string', description: 'CSS selector for the file input element' },
                filePath: { type: 'string', description: 'Absolute path to the file to upload' },
            },
            required: ['selector', 'filePath'],
        },
    },
    {
        name: 'browser_form_get_values',
        description: 'Extract all current form field values from the page (names, values, types)',
        inputSchema: {
            type: 'object',
            properties: {
                formSelector: { type: 'string', description: 'CSS selector of the form (default: first form on page)' },
            },
            required: [],
        },
    },
    {
        name: "browser_smart_form_fill",
        description: "Automatically detect all form fields on the page and fill them from a provided data map.",
        inputSchema: {
            type: "object",
            properties: {
                data: {
                    type: "object",
                    description: "Key-value map of field names/labels to values (e.g., {\"email\": \"test@example.com\", \"name\": \"ATHENA\"})",
                },
                formSelector: { type: "string", description: "CSS selector scoping the form (default: first form)" },
                submit: { type: "boolean", description: "Submit the form after filling (default: false)" },
            },
            required: ["data"],
        },
    },
];

export async function handleFormTool(
    name: string,
    args: Record<string, unknown>,
    engine: BrowserEngine
): Promise<{ content: Array<{ type: string; text: string }> }> {
    const page = await engine.getPage();
    if (!page) throw new Error('No active browser page — navigate somewhere first');

    switch (name) {
        case 'browser_form_fill': {
            const selector = String(args.selector);
            const value = String(args.value);
            const clearFirst = args.clearFirst !== false;
            const locator = page.locator(selector).first();
            if (clearFirst) await locator.clear();
            await locator.fill(value);
            return { content: [{ type: 'text', text: `✅ Filled "${selector}" with "${value}"` }] };
        }

        case 'browser_form_select': {
            const selector = String(args.selector);
            const value = String(args.value);
            await page.selectOption(selector, { label: value }).catch(() =>
                page.selectOption(selector, { value })
            );
            return { content: [{ type: 'text', text: `✅ Selected "${value}" in ${selector}` }] };
        }

        case 'browser_form_check': {
            const selector = String(args.selector);
            const checked = args.checked !== false;
            if (checked) {
                await page.check(selector);
            } else {
                await page.uncheck(selector);
            }
            return { content: [{ type: 'text', text: `✅ ${selector} is now ${checked ? 'checked' : 'unchecked'}` }] };
        }

        case 'browser_form_submit': {
            const selector = String(args.selector);
            const waitForNav = args.waitForNavigation !== false;
            if (waitForNav) {
                await Promise.all([
                    page.waitForNavigation({ timeout: 10000 }).catch(() => { }),
                    page.click(selector),
                ]);
            } else {
                await page.click(selector);
            }
            return { content: [{ type: 'text', text: `✅ Form submitted via "${selector}" — current URL: ${page.url()}` }] };
        }

        case 'browser_form_upload': {
            const selector = String(args.selector);
            const filePath = String(args.filePath);
            const fileChooserPromise = page.waitForEvent('filechooser');
            await page.click(selector);
            const fileChooser = await fileChooserPromise;
            await fileChooser.setFiles(filePath);
            return { content: [{ type: 'text', text: `✅ File uploaded: ${filePath}` }] };
        }

        case 'browser_form_get_values': {
            const formSelector = args.formSelector ? String(args.formSelector) : 'form';
            const values = await page.evaluate((sel: string) => {
                const form = document.querySelector(sel) as HTMLFormElement | null;
                if (!form) return [];
                const data = new FormData(form);
                return Array.from(data as any).map((entry: any) => ({ name: entry[0], value: String(entry[1]) }));
            }, formSelector);
            return { content: [{ type: 'text', text: JSON.stringify(values, null, 2) }] };
        }

        case "browser_smart_form_fill": {
            const { data, formSelector, submit } = z.object({
                data: z.record(z.string()),
                formSelector: z.string().optional().default("form"),
                submit: z.boolean().optional().default(false),
            }).parse(args);

            const filled: string[] = [];
            const skipped: string[] = [];

            for (const [key, value] of Object.entries(data)) {
                // Try multiple strategies to find each field
                const strategies = [
                    () => page.locator(`${formSelector} [name="${key}"]`).first(),
                    () => page.locator(`${formSelector} [id="${key}"]`).first(),
                    () => page.locator(`${formSelector} [placeholder*="${key}" i]`).first(),
                    () => page.getByLabel(key, { exact: false }).first(),
                ];

                let filled_field = false;
                for (const strategy of strategies) {
                    const loc = strategy();
                    const count = await loc.count().catch(() => 0);
                    if (count > 0) {
                        const type = await loc.getAttribute("type").catch(() => "text");
                        if (type === "checkbox" || type === "radio") {
                            if (value === "true" || value === "1") await loc.check();
                            else await loc.uncheck();
                        } else if (type === "file") {
                            // Skip file inputs in auto-fill
                            skipped.push(key);
                            filled_field = true;
                            break;
                        } else {
                            await loc.fill(value);
                        }
                        filled.push(key);
                        filled_field = true;
                        break;
                    }
                }
                if (!filled_field) skipped.push(key);
            }

            if (submit) {
                const submitBtn = page.locator(`${formSelector} [type="submit"], ${formSelector} button[type="submit"]`).first();
                if (await submitBtn.count() > 0) {
                    await submitBtn.click();
                }
            }

            return {
                content: [{
                    type: "text" as const,
                    text: JSON.stringify({ filled, skipped, submitted: submit }),
                }],
            };
        }

        default:
            throw new Error(`Unknown form tool: ${name}`);
    }
}

