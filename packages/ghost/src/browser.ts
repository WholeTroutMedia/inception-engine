import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { z } from 'zod';

// ─── GHOST Browser Engine ─────────────────────────────────────────────────────
// BROWSER agent's CDP wrapper — the foundation of GHOST's autonomous QA.
// Playwright-based, supporting headless + headed modes.

export const BrowserStepSchema = z.discriminatedUnion('action', [
    z.object({ action: z.literal('navigate'), url: z.string() }),
    z.object({ action: z.literal('click'), selector: z.string(), description: z.string() }),
    z.object({ action: z.literal('type'), selector: z.string(), text: z.string() }),
    z.object({ action: z.literal('wait'), selector: z.string().optional(), ms: z.number().optional() }),
    z.object({ action: z.literal('screenshot'), name: z.string() }),
    z.object({ action: z.literal('assert'), selector: z.string(), expected: z.string(), description: z.string() }),
    z.object({ action: z.literal('scroll'), selector: z.string().optional(), direction: z.enum(['up', 'down']) }),
    z.object({ action: z.literal('hover'), selector: z.string() }),
    z.object({ action: z.literal('extract'), selector: z.string(), as: z.string() }),
]);

export type BrowserStep = z.infer<typeof BrowserStepSchema>;

export interface JourneyResult {
    journey_id: string;
    passed: boolean;
    steps_total: number;
    steps_passed: number;
    failures: JourneyFailure[];
    screenshots: Record<string, string>; // name → file path
    extracted: Record<string, string>;   // name → extracted value
    duration_ms: number;
    timestamp: string;
}

export interface JourneyFailure {
    step_index: number;
    step: BrowserStep;
    error: string;
    screenshot?: string;
}

// ─── GhostBrowser ─────────────────────────────────────────────────────────────

export class GhostBrowser {
    private browser: Browser | null = null;
    private context: BrowserContext | null = null;
    private page: Page | null = null;
    private screenshotDir: string;

    constructor(screenshotDir = '/tmp/ghost-screenshots') {
        this.screenshotDir = screenshotDir;
    }

    async init(options: { headless?: boolean; viewport?: { width: number; height: number } } = {}) {
        this.browser = await chromium.launch({
            headless: options.headless ?? true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });

        this.context = await this.browser.newContext({
            viewport: options.viewport ?? { width: 1280, height: 720 },
            locale: 'en-US',
            userAgent: 'CreativeLiberationEngine/GHOST-QA/1.0',
        });

        this.page = await this.context.newPage();

        // Capture console errors
        this.page.on('console', (msg) => {
            if (msg.type() === 'error') {
                console.error(`[GHOST] Console error: ${msg.text()}`);
            }
        });

        // Capture network failures
        this.page.on('requestfailed', (req) => {
            console.warn(`[GHOST] Request failed: ${req.url()}`);
        });
    }

    async runJourney(journeyId: string, steps: BrowserStep[]): Promise<JourneyResult> {
        if (!this.page) throw new Error('Browser not initialized. Call init() first.');

        const startTime = Date.now();
        const result: JourneyResult = {
            journey_id: journeyId,
            passed: true,
            steps_total: steps.length,
            steps_passed: 0,
            failures: [],
            screenshots: {},
            extracted: {},
            duration_ms: 0,
            timestamp: new Date().toISOString(),
        };

        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            try {
                await this.executeStep(step, result);
                result.steps_passed++;
            } catch (error: unknown) {
                const msg = error instanceof Error ? error.message : String(error);
                const screenshotPath = `${this.screenshotDir}/${journeyId}-failure-${i}.png`;

                try {
                    await this.page.screenshot({ path: screenshotPath, fullPage: true });
                    result.screenshots[`failure-${i}`] = screenshotPath;
                } catch { /* ignore screenshot errors */ }

                result.failures.push({
                    step_index: i,
                    step,
                    error: msg,
                    screenshot: screenshotPath,
                });
                result.passed = false;

                console.error(`[GHOST] Step ${i} failed: ${msg}`);
                // Continue to capture all failures, not just the first
            }
        }

        result.duration_ms = Date.now() - startTime;
        return result;
    }

    private async executeStep(step: BrowserStep, result: JourneyResult): Promise<void> {
        const page = this.page!;

        switch (step.action) {
            case 'navigate':
                await page.goto(step.url, { waitUntil: 'networkidle' });
                break;

            case 'click':
                await page.waitForSelector(step.selector, { timeout: 10000 });
                await page.click(step.selector);
                break;

            case 'type':
                await page.waitForSelector(step.selector, { timeout: 10000 });
                await page.fill(step.selector, step.text);
                break;

            case 'wait':
                if (step.selector) {
                    await page.waitForSelector(step.selector, { timeout: 15000 });
                } else if (step.ms) {
                    await page.waitForTimeout(step.ms);
                }
                break;

            case 'screenshot': {
                const path = `${this.screenshotDir}/${result.journey_id}-${step.name}.png`;
                await page.screenshot({ path, fullPage: true });
                result.screenshots[step.name] = path;
                break;
            }

            case 'assert': {
                await page.waitForSelector(step.selector, { timeout: 10000 });
                const text = await page.textContent(step.selector);
                if (!text?.includes(step.expected)) {
                    throw new Error(`Assertion failed for "${step.description}": expected "${step.expected}", got "${text}"`);
                }
                break;
            }

            case 'scroll':
                if (step.selector) {
                    await page.locator(step.selector).scrollIntoViewIfNeeded();
                } else {
                    await page.evaluate(`window.scrollBy(0, ${step.direction === 'down' ? 500 : -500})`);
                }
                break;

            case 'hover':
                await page.hover(step.selector);
                break;

            case 'extract': {
                const val = await page.textContent(step.selector);
                result.extracted[step.as] = val?.trim() ?? '';
                break;
            }
        }
    }

    /** Expose the active Playwright Page (for SMG crawl agents) */
    getPage(): Page | null {
        return this.page;
    }

    /**
     * Record a user journey interactively (for future: attach to headed session)
     * Returns the steps array so it can be saved as a .journey.ts file
     */
    async takeFullPageScreenshot(url: string, name: string): Promise<string> {
        if (!this.page) throw new Error('Browser not initialized.');
        await this.page.goto(url, { waitUntil: 'networkidle' });
        const path = `${this.screenshotDir}/${name}-${Date.now()}.png`;
        await this.page.screenshot({ path, fullPage: true });
        return path;
    }

    async recordVideo(url: string, outputPath: string, durationMs = 10000): Promise<string> {
        const context = await this.browser!.newContext({
            recordVideo: { dir: '/tmp/ghost-video/', size: { width: 1280, height: 720 } },
        });
        const page = await context.newPage();
        await page.goto(url, { waitUntil: 'networkidle' });
        await page.waitForTimeout(durationMs);
        await context.close();
        const videoPath = await page.video()?.path();
        return videoPath ?? outputPath;
    }

    async getCurrentURL(): Promise<string> {
        return this.page?.url() ?? '';
    }

    async close(): Promise<void> {
        await this.page?.close();
        await this.context?.close();
        await this.browser?.close();
    }
}
