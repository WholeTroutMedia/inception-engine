import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError } from '@modelcontextprotocol/sdk/types.js';
import { chromium, Browser, Page } from 'playwright';

class CometMcpServer {
    private server: Server;
    private browser: Browser | null = null;
    private page: Page | null = null;

    constructor() {
        this.server = new Server(
            { name: 'comet-browser-mcp', version: '1.0.0-genesis' },
            { capabilities: { tools: {} } }
        );
        this.setupHandlers();
        this.server.onerror = (error) => console.error('[MCP Error]', error);
    }

    private async ensureBrowser() {
        if (!this.browser) {
            this.browser = await chromium.launch({ headless: false });
            const context = await this.browser.newContext();
            this.page = await context.newPage();
        }
        return this.page!;
    }

    private setupHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: [
                {
                    name: 'navigate',
                    description: 'Navigate to a URL',
                    inputSchema: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] }
                },
                {
                    name: 'click',
                    description: 'Click an element by selector',
                    inputSchema: { type: 'object', properties: { selector: { type: 'string' } }, required: ['selector'] }
                },
                {
                    name: 'type',
                    description: 'Type text into an element',
                    inputSchema: { type: 'object', properties: { selector: { type: 'string' }, text: { type: 'string' } }, required: ['selector', 'text'] }
                },
                {
                    name: 'press_key',
                    description: 'Press a keyboard key',
                    inputSchema: { type: 'object', properties: { key: { type: 'string' } }, required: ['key'] }
                },
                {
                    name: 'evaluate_js',
                    description: 'Evaluate JavaScript in the browser',
                    inputSchema: { type: 'object', properties: { script: { type: 'string' } }, required: ['script'] }
                },
                {
                    name: 'extract_html',
                    description: 'Extract HTML from the page or a selector',
                    inputSchema: { type: 'object', properties: { selector: { type: 'string' } } }
                },
                {
                    name: 'screenshot',
                    description: 'Take a screenshot (returns base64)',
                    inputSchema: { type: 'object', properties: { fullPage: { type: 'boolean' } } }
                },
                {
                    name: 'scroll_down',
                    description: 'Scroll down the page',
                    inputSchema: { type: 'object', properties: { amount: { type: 'number' } } }
                },
                {
                    name: 'scroll_up',
                    description: 'Scroll up the page',
                    inputSchema: { type: 'object', properties: { amount: { type: 'number' } } }
                },
                {
                    name: 'wait_for_selector',
                    description: 'Wait for a selector to appear',
                    inputSchema: { type: 'object', properties: { selector: { type: 'string' }, timeout: { type: 'number' } }, required: ['selector'] }
                },
                {
                    name: 'get_url',
                    description: 'Get the current URL',
                    inputSchema: { type: 'object', properties: {} }
                },
                {
                    name: 'go_back',
                    description: 'Navigate back in history',
                    inputSchema: { type: 'object', properties: {} }
                },
                {
                    name: 'go_forward',
                    description: 'Navigate forward in history',
                    inputSchema: { type: 'object', properties: {} }
                },
                {
                    name: 'reload',
                    description: 'Reload the page',
                    inputSchema: { type: 'object', properties: {} }
                },
                {
                    name: 'hover',
                    description: 'Hover over an element',
                    inputSchema: { type: 'object', properties: { selector: { type: 'string' } }, required: ['selector'] }
                },
                {
                    name: 'select_option',
                    description: 'Select an option in a dropdown',
                    inputSchema: { type: 'object', properties: { selector: { type: 'string' }, value: { type: 'string' } }, required: ['selector', 'value'] }
                },
                {
                    name: 'read_accessibility_tree',
                    description: 'Read the accessibility tree of the page',
                    inputSchema: { type: 'object', properties: {} }
                },
                {
                    name: 'focus',
                    description: 'Focus an element',
                    inputSchema: { type: 'object', properties: { selector: { type: 'string' } }, required: ['selector'] }
                },
                {
                    name: 'clear_input',
                    description: 'Clear an input field',
                    inputSchema: { type: 'object', properties: { selector: { type: 'string' } }, required: ['selector'] }
                },
                {
                    name: 'get_title',
                    description: 'Get the page title',
                    inputSchema: { type: 'object', properties: {} }
                }
            ]
        }));

        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const page = await this.ensureBrowser();
            try {
                switch (request.params.name) {
                    case 'navigate': {
                        const url = String(request.params.arguments?.url);
                        await page.goto(url);
                        return { content: [{ type: 'text', text: `Navigated to ${url}` }] };
                    }
                    case 'click': {
                        const selector = String(request.params.arguments?.selector);
                        await page.click(selector);
                        return { content: [{ type: 'text', text: `Clicked ${selector}` }] };
                    }
                    case 'type': {
                        const selector = String(request.params.arguments?.selector);
                        const text = String(request.params.arguments?.text);
                        await page.fill(selector, text);
                        return { content: [{ type: 'text', text: `Typed into ${selector}` }] };
                    }
                    case 'press_key': {
                        const key = String(request.params.arguments?.key);
                        await page.keyboard.press(key);
                        return { content: [{ type: 'text', text: `Pressed ${key}` }] };
                    }
                    case 'evaluate_js': {
                        const script = String(request.params.arguments?.script);
                        const result = await page.evaluate(script);
                        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
                    }
                    case 'extract_html': {
                        const selector = request.params.arguments?.selector ? String(request.params.arguments?.selector) : 'body';
                        const html = await page.locator(selector).innerHTML();
                        return { content: [{ type: 'text', text: html }] };
                    }
                    case 'screenshot': {
                        const fullPage = Boolean(request.params.arguments?.fullPage);
                        const buffer = await page.screenshot({ fullPage });
                        return { content: [{ type: 'text', text: `data:image/png;base64,${buffer.toString('base64')}` }] };
                    }
                    case 'scroll_down': {
                        const amount = Number(request.params.arguments?.amount || 500);
                        await page.mouse.wheel(0, amount);
                        return { content: [{ type: 'text', text: `Scrolled down by ${amount}px` }] };
                    }
                    case 'scroll_up': {
                        const amount = Number(request.params.arguments?.amount || 500);
                        await page.mouse.wheel(0, -amount);
                        return { content: [{ type: 'text', text: `Scrolled up by ${amount}px` }] };
                    }
                    case 'wait_for_selector': {
                        const selector = String(request.params.arguments?.selector);
                        const timeout = Number(request.params.arguments?.timeout || 30000);
                        await page.waitForSelector(selector, { timeout });
                        return { content: [{ type: 'text', text: `Selector ${selector} appeared` }] };
                    }
                    case 'get_url': {
                        return { content: [{ type: 'text', text: page.url() }] };
                    }
                    case 'go_back': {
                        await page.goBack();
                        return { content: [{ type: 'text', text: `Navigated back to ${page.url()}` }] };
                    }
                    case 'go_forward': {
                        await page.goForward();
                        return { content: [{ type: 'text', text: `Navigated forward to ${page.url()}` }] };
                    }
                    case 'reload': {
                        await page.reload();
                        return { content: [{ type: 'text', text: `Reloaded ${page.url()}` }] };
                    }
                    case 'hover': {
                        const selector = String(request.params.arguments?.selector);
                        await page.hover(selector);
                        return { content: [{ type: 'text', text: `Hovered over ${selector}` }] };
                    }
                    case 'select_option': {
                        const selector = String(request.params.arguments?.selector);
                        const value = String(request.params.arguments?.value);
                        await page.selectOption(selector, value);
                        return { content: [{ type: 'text', text: `Selected ${value} in ${selector}` }] };
                    }
                    case 'read_accessibility_tree': {
                        // @ts-ignore - Property exists in runtime but may be missing in typings
                        const snapshot = await page.accessibility?.snapshot() || {};
                        return { content: [{ type: 'text', text: JSON.stringify(snapshot, null, 2) }] };
                    }
                    case 'focus': {
                        const selector = String(request.params.arguments?.selector);
                        await page.focus(selector);
                        return { content: [{ type: 'text', text: `Focused ${selector}` }] };
                    }
                    case 'clear_input': {
                        const selector = String(request.params.arguments?.selector);
                        await page.fill(selector, '');
                        return { content: [{ type: 'text', text: `Cleared ${selector}` }] };
                    }
                    case 'get_title': {
                        return { content: [{ type: 'text', text: await page.title() }] };
                    }
                    default:
                        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
                }
            } catch (error: any) {
                return {
                    content: [{ type: 'text', text: `Error executing ${request.params.name}: ${error.message}` }],
                    isError: true,
                };
            }
        });
    }

    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('COMET BROWSER MCP Server running on stdio');
    }
}

const server = new CometMcpServer();
server.run().catch(console.error);
