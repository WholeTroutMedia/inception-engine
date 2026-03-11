/**
 * BrowserEngine — Playwright browser pool manager.
 * Singleton that manages the Chromium instance and default page context.
 * Lazy-init on first tool call, shared across all tool modules.
 */

import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

export interface PageHandle {
    id: string;
    page: Page;
    agentId?: string;
    createdAt: Date;
}

export class BrowserEngine {
    private browser: Browser | null = null;
    private context: BrowserContext | null = null;
    private pages: Map<string, PageHandle> = new Map();
    private defaultPageId: string | null = null;
    private pageCounter = 0;

    /** Ensure browser is running; returns default page. */
    async getPage(): Promise<Page> {
        await this.ensureInit();
        if (this.defaultPageId && this.pages.has(this.defaultPageId)) {
            return this.pages.get(this.defaultPageId)!.page;
        }
        return this.newPage();
    }

    /** Open a new tab and return its Page. */
    async newPage(agentId?: string): Promise<Page> {
        await this.ensureInit();
        const page = await this.context!.newPage();
        const id = `page-${++this.pageCounter}`;
        this.pages.set(id, { id, page, agentId, createdAt: new Date() });
        if (!this.defaultPageId) {
            this.defaultPageId = id;
        }
        return page;
    }

    /** Switch active default page by index (0-based). */
    async switchPage(index: number): Promise<Page> {
        const handles = Array.from(this.pages.values());
        if (index < 0 || index >= handles.length) {
            throw new Error(`Tab index ${index} out of range (0–${handles.length - 1})`);
        }
        this.defaultPageId = handles[index]!.id;
        return handles[index]!.page;
    }

    /** Close a page by index, return new active page. */
    async closePage(index: number): Promise<Page> {
        const handles = Array.from(this.pages.values());
        if (index < 0 || index >= handles.length) {
            throw new Error(`Tab index ${index} out of range`);
        }
        const handle = handles[index]!;
        await handle.page.close();
        this.pages.delete(handle.id);
        if (this.defaultPageId === handle.id) {
            const remaining = Array.from(this.pages.values());
            this.defaultPageId = remaining.length > 0 ? remaining[0]!.id : null;
        }
        return this.getPage();
    }

    /** List all open pages. */
    listPages(): Array<{ index: number; id: string; url: string; title: string }> {
        return Array.from(this.pages.values()).map((h, i) => ({
            index: i,
            id: h.id,
            url: h.page.url(),
            title: "", // filled async by callers
        }));
    }

    /** Get the underlying BrowserContext (for session/cookie ops). */
    async getContext(): Promise<BrowserContext> {
        await this.ensureInit();
        return this.context!;
    }

    /** Gracefully close the browser. */
    async close(): Promise<void> {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.context = null;
            this.pages.clear();
            this.defaultPageId = null;
        }
    }

    private async ensureInit(): Promise<void> {
        if (this.browser && this.context) return;

        this.browser = await chromium.launch({
            headless: true,
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-blink-features=AutomationControlled",
            ],
        });

        this.context = await this.browser.newContext({
            userAgent:
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            viewport: { width: 1280, height: 800 },
            locale: "en-US",
            timezoneId: "America/New_York",
        });
    }
}
