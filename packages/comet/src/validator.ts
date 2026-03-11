/**
 * COMET — Validator
 *
 * Wraps the Executor with intelligent failure recovery.
 * When a UINode fails (element not found, timeout, stale selector):
 *
 *   1. Take a screenshot of current page state
 *   2. Send screenshot + failed selector to Genkit vision
 *   3. Genkit returns an updated selector that should work
 *   4. Retry the node with the new selector
 *   5. On success: write corrected selector back to SMG (write-back)
 *
 * This is the active inference loop — the system continuously corrects
 * its world model to match observed reality. Every repair makes COMET smarter.
 *
 * "Prediction error drives learning" — Karl Friston, 2010
 */

import { chromium, type Browser, type Page } from 'playwright';
import { Executor } from './executor.js';
import type {
    MixedActionPlan,
    UINode,
    NodeResult,
    ExecutionResult,
} from './types.js';

const GHOST_URL = process.env.GHOST_URL ?? 'http://ghost:6000';
const GENKIT_URL = process.env.GENKIT_URL ?? 'http://genkit:4100';
const HEADLESS = process.env.COMET_HEADLESS !== 'false';

// ─── Validator ────────────────────────────────────────────────────────────────

export class Validator {
    /**
     * Execute a plan with full validation + repair on each node failure.
     * Returns ExecutionResult with repair metrics included.
     */
    async execute(plan: MixedActionPlan, onEvent?: Parameters<Executor['on']>[0]): Promise<ExecutionResult> {
        const executor = new Executor();
        if (onEvent) executor.on(onEvent);

        // Intercept node failures for repair
        const self = this;
        const originalExecute = executor.execute.bind(executor);

        // Run with retry wrapper
        const result = await this.executeWithRepair(plan, onEvent);
        return result;
    }

    private async executeWithRepair(plan: MixedActionPlan, onEvent?: Parameters<Executor['on']>[0]): Promise<ExecutionResult> {
        const startedAt = new Date().toISOString();
        const nodeResults: NodeResult[] = [];
        let smgUpdates = 0;

        let browser: Browser | null = null;
        let page: Page | null = null;

        try {
            browser = await chromium.launch({
                headless: HEADLESS,
                args: ['--no-sandbox', '--disable-dev-shm-usage'],
            });
            const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
            page = await ctx.newPage();

            const context = new Map<string, unknown>();
            const nodeMap = new Map(plan.nodes.map(n => [n.node_id, n]));

            for (const nodeId of plan.execution_order) {
                const node = nodeMap.get(nodeId);
                if (!node || node.type !== 'ui') continue;
                const uiNode = node as UINode;

                onEvent?.({ type: 'node_start', node_id: nodeId, description: `${uiNode.action} → ${uiNode.description}` });

                const result = await this.executeUINodeWithRepair(uiNode, page, context, plan.domain);
                nodeResults.push(result);

                if (result.repair_succeeded) smgUpdates++;

                // Update SMG with corrected selector
                if (result.repair_succeeded && result.selector_used && uiNode.state_id && uiNode.element_id) {
                    void this.writeSelectorBackToSMG(plan.domain, uiNode.state_id, uiNode.element_id, result.selector_used);
                }

                if (result.output_var && result.output !== undefined) {
                    context.set(result.output_var!, result.output);
                }

                onEvent?.({
                    type: result.repair_attempted && result.repair_succeeded ? 'node_repaired' : 'node_complete',
                    node_id: nodeId,
                    output: result.output,
                    context: Object.fromEntries(context),
                });

                if (result.status === 'failed') break;
            }

        } finally {
            await browser?.close();
        }

        const allSucceeded = nodeResults.every(r => ['success', 'repaired', 'skipped'].includes(r.status));
        const anyFailed = nodeResults.some(r => r.status === 'failed');
        const completedAt = new Date().toISOString();

        return {
            plan_id: plan.id,
            started_at: startedAt,
            completed_at: completedAt,
            duration_ms: new Date(completedAt).getTime() - new Date(startedAt).getTime(),
            status: anyFailed ? 'failed' : allSucceeded ? 'success' : 'partial',
            node_results: nodeResults,
            context_snapshot: {},
            smg_updates: smgUpdates,
        };
    }

    // ── Repair Loop ──────────────────────────────────────────────────────────

    private async executeUINodeWithRepair(
        node: UINode,
        page: Page,
        context: Map<string, unknown>,
        domain: string,
    ): Promise<NodeResult & { output_var?: string }> {
        const start = Date.now();
        const selector = this.interpolate(node.selector, context);
        const input = node.input ? this.interpolate(node.input, context) : undefined;

        // First attempt
        try {
            const output = await this.runUIAction(node, page, selector, input);
            return {
                node_id: node.node_id,
                status: 'success',
                output,
                duration_ms: Date.now() - start,
                selector_used: selector,
                repair_attempted: false,
                repair_succeeded: false,
                output_var: node.output_var,
            };
        } catch (firstError: any) {
            console.warn(`[COMET/VALIDATOR] Node ${node.node_id} failed: ${firstError.message}. Attempting repair...`);
        }

        // Repair: take screenshot → ask Genkit for new selector
        let repairedSelector: string | null = null;
        try {
            const screenshot = await page.screenshot({ type: 'jpeg', quality: 60 });
            const screenshotB64 = screenshot.toString('base64');

            repairedSelector = await this.askGenkitForSelector(
                screenshotB64,
                node.selector,
                node.description,
                node.action,
            );
        } catch (repairErr: any) {
            console.warn(`[COMET/VALIDATOR] Genkit repair failed: ${repairErr.message}`);
        }

        if (!repairedSelector) {
            return {
                node_id: node.node_id,
                status: 'failed',
                error: `Could not find element: ${selector}`,
                duration_ms: Date.now() - start,
                selector_used: selector,
                repair_attempted: true,
                repair_succeeded: false,
                output_var: node.output_var,
            };
        }

        // Retry with repaired selector
        try {
            const output = await this.runUIAction(node, page, repairedSelector, input);
            console.log(`[COMET/VALIDATOR] ✅ Repaired: ${selector} → ${repairedSelector}`);
            return {
                node_id: node.node_id,
                status: 'repaired',
                output,
                duration_ms: Date.now() - start,
                selector_used: repairedSelector,
                repair_attempted: true,
                repair_succeeded: true,
                output_var: node.output_var,
            };
        } catch (retryErr: any) {
            return {
                node_id: node.node_id,
                status: 'failed',
                error: `Repaired selector also failed: ${retryErr.message}`,
                duration_ms: Date.now() - start,
                selector_used: repairedSelector,
                repair_attempted: true,
                repair_succeeded: false,
                output_var: node.output_var,
            };
        }
    }

    private async runUIAction(node: UINode, page: Page, selector: string, input?: string): Promise<unknown> {
        const timeout = node.timeout_ms ?? 15000;

        switch (node.action) {
            case 'navigate': {
                const url = selector.startsWith('http') ? selector : `https://${selector}`;
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
                return { navigated_to: url };
            }
            case 'click':
                await page.waitForSelector(selector, { timeout });
                await page.click(selector);
                await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => { });
                return { clicked: selector };
            case 'fill':
                if (!input) throw new Error(`fill requires input`);
                await page.waitForSelector(selector, { timeout });
                await page.fill(selector, input);
                return { filled: selector, value: input };
            case 'read':
                await page.waitForSelector(selector, { timeout });
                return (await page.textContent(selector))?.trim() ?? null;
            case 'scroll':
                await page.evaluate(`document.querySelector('${selector}')?.scrollIntoView({ behavior: 'smooth' })`);
                return { scrolled: true };
            case 'hover':
                await page.waitForSelector(selector, { timeout });
                await page.hover(selector);
                return { hovered: selector };
            case 'wait':
                await new Promise(r => setTimeout(r, parseInt(selector) || 2000));
                return { waited_ms: parseInt(selector) || 2000 };
            default:
                throw new Error(`Unknown action: ${node.action}`);
        }
    }

    // ── Genkit Vision Repair ──────────────────────────────────────────────

    private async askGenkitForSelector(
        screenshotB64: string,
        failedSelector: string,
        elementLabel: string,
        action: string,
    ): Promise<string | null> {
        const prompt = `You are assisting a browser automation agent that failed to find an element.

Failed selector: "${failedSelector}"
Element description: "${elementLabel}"
Required action: "${action}"

Looking at this webpage screenshot, what is the correct CSS or ARIA selector for the "${elementLabel}" element?

Return JSON only: { "selector": "css_or_aria_selector_here" }
Use accessibility selectors first (role=, aria-label=) before CSS selectors.
If the element is not visible, return: { "selector": null }`;

        try {
            const res = await fetch(`${GENKIT_URL}/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'googleai/gemini-2.0-flash',
                    prompt,
                    media: [{ contentType: 'image/jpeg', data: screenshotB64 }],
                    output: { format: 'json' },
                }),
                signal: AbortSignal.timeout(20000),
            });

            if (!res.ok) return null;
            const data = await res.json();
            const parsed = JSON.parse(data.text ?? data.output ?? '{}');
            return parsed.selector ?? null;
        } catch {
            return null;
        }
    }

    // ── SMG Write-back ────────────────────────────────────────────────────

    private async writeSelectorBackToSMG(
        domain: string,
        stateId: string,
        elementId: string,
        newSelector: string,
    ): Promise<void> {
        try {
            await fetch(`${GHOST_URL}/smg/${encodeURIComponent(domain)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    state: {
                        id: stateId,
                        elements: [{ id: elementId, selector: newSelector, validated_at: new Date().toISOString(), staleness_score: 0 }],
                    },
                }),
                signal: AbortSignal.timeout(5000),
            });
            console.log(`[COMET/VALIDATOR] SMG write-back: ${domain}::${elementId} → ${newSelector}`);
        } catch { /* Best effort */ }
    }

    private interpolate(str: string, context: Map<string, unknown>): string {
        return str.replace(/\$\{(\w+)\}/g, (_, key) => {
            const val = context.get(key);
            return val !== undefined ? String(val) : `\${${key}}`;
        });
    }
}
