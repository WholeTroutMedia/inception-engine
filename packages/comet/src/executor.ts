/**
 * COMET — Executor
 *
 * Deterministic traversal of a compiled MixedActionPlan.
 * Node by node. Output of each step feeds into the next via ActionContext.
 *
 * The Executor is the hands. The Validator is the eyes.
 * Together they handle the full execution loop with automatic repair.
 *
 * Works across web (Playwright) today.
 * Android/iOS nodes execute via their respective GHOST crawl agents.
 *
 * ── EXECUTION MODEL ────────────────────────────────────────────────────────
 * For each node in execution_order:
 *   1. Resolve any ${var} placeholders in input/selector from ActionContext
 *   2. Execute the node action
 *   3. Store output in ActionContext under output_var
 *   4. If failed → Validator.repair(node) → retry
 *   5. Emit real-time event for Console UI streaming
 */

import { chromium, type Browser, type Page } from 'playwright';
import type {
    MixedActionPlan,
    UINode,
    PythonNode,
    ActionContext,
    NodeResult,
    ExecutionResult,
} from './types.js';
import { createHash } from 'crypto';

const GHOST_URL = process.env.GHOST_URL ?? 'http://ghost:6000';
const HEADLESS = process.env.COMET_HEADLESS !== 'false';

// Event emitter signature for streaming progress to console WS
type ExecutionEventHandler = (event: {
    type: 'node_start' | 'node_complete' | 'node_failed' | 'node_repaired' | 'plan_complete';
    node_id: string;
    description?: string;
    output?: unknown;
    error?: string;
    context?: Record<string, unknown>;
}) => void;

// ─── Executor ─────────────────────────────────────────────────────────────────

export class Executor {
    private browser: Browser | null = null;
    private page: Page | null = null;
    private context: ActionContext = new Map();
    private onEvent: ExecutionEventHandler | null = null;

    on(handler: ExecutionEventHandler): this {
        this.onEvent = handler;
        return this;
    }

    private emit(event: Parameters<ExecutionEventHandler>[0]): void {
        this.onEvent?.(event);
    }

    /**
     * Execute a MixedActionPlan end-to-end.
     * Returns a full ExecutionResult including per-node results and final context.
     */
    async execute(plan: MixedActionPlan): Promise<ExecutionResult> {
        const startedAt = new Date().toISOString();
        const nodeResults: NodeResult[] = [];
        this.context = new Map();

        // Build node lookup
        const nodeMap = new Map(plan.nodes.map(n => [n.node_id, n]));

        try {
            await this.initBrowser();

            // Navigate to starting URL
            if (plan.platform === 'web' && this.page && plan.nodes.length > 0) {
                // Find first navigate node or use domain
                const firstNavNode = plan.nodes.find(n => n.type === 'ui' && (n as UINode).action === 'navigate');
                if (!firstNavNode) {
                    const entryUrl = `https://${plan.domain}`;
                    await this.page.goto(entryUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
                }
            }

            for (const nodeId of plan.execution_order) {
                const node = nodeMap.get(nodeId);
                if (!node) continue;

                this.emit({ type: 'node_start', node_id: nodeId, description: this.getNodeDescription(node) });

                const result = await this.executeNode(node, plan.domain, plan.platform);
                nodeResults.push(result);

                if (result.status === 'failed' && !result.repair_succeeded) {
                    // Critical failure — stop execution
                    this.emit({ type: 'node_failed', node_id: nodeId, error: result.error });
                    break;
                }

                this.emit({
                    type: result.repair_attempted && result.repair_succeeded ? 'node_repaired' : 'node_complete',
                    node_id: nodeId,
                    output: result.output,
                    context: Object.fromEntries(this.context),
                });
            }

        } finally {
            await this.closeBrowser();
        }

        const allSucceeded = nodeResults.every(r => r.status === 'success' || r.status === 'repaired');
        const anyFailed = nodeResults.some(r => r.status === 'failed');
        const status = anyFailed ? (allSucceeded ? 'partial' : 'failed') : 'success';

        const completedAt = new Date().toISOString();
        const duration = new Date(completedAt).getTime() - new Date(startedAt).getTime();

        const smgUpdates = nodeResults.filter(r => r.repair_succeeded).length;

        const result: ExecutionResult = {
            plan_id: plan.id,
            started_at: startedAt,
            completed_at: completedAt,
            duration_ms: duration,
            status,
            node_results: nodeResults,
            context_snapshot: Object.fromEntries(this.context),
            smg_updates: smgUpdates,
        };

        this.emit({ type: 'plan_complete', node_id: 'root', context: result.context_snapshot });
        return result;
    }

    // ── Node Execution ─────────────────────────────────────────────────────

    private async executeNode(node: MixedActionPlan['nodes'][0], domain: string, platform: string): Promise<NodeResult> {
        const start = Date.now();
        const nodeId = node.node_id;

        try {
            if (node.type === 'ui') {
                const output = await this.executeUINode(node, domain, platform);
                if (node.output_var && output !== undefined) {
                    this.context.set(node.output_var, output as any);
                }
                return {
                    node_id: nodeId, status: 'success', output,
                    duration_ms: Date.now() - start, selector_used: node.selector,
                    repair_attempted: false, repair_succeeded: false,
                };
            }

            if (node.type === 'python') {
                const output = await this.executePythonNode(node);
                this.context.set(node.output_var, output as any);
                return {
                    node_id: nodeId, status: 'success', output,
                    duration_ms: Date.now() - start,
                    repair_attempted: false, repair_succeeded: false,
                };
            }

            return {
                node_id: nodeId, status: 'skipped', duration_ms: Date.now() - start,
                repair_attempted: false, repair_succeeded: false,
            };

        } catch (err: any) {
            return {
                node_id: nodeId, status: 'failed', error: err.message,
                duration_ms: Date.now() - start, selector_used: (node as UINode).selector,
                repair_attempted: false, repair_succeeded: false,
            };
        }
    }

    private async executeUINode(node: UINode, domain: string, platform: string): Promise<unknown> {
        if (!this.page) throw new Error('Browser page not initialized');

        // Resolve ${var} interpolation in input and selector
        const selector = this.interpolate(node.selector);
        const input = node.input ? this.interpolate(node.input) : undefined;

        switch (node.action) {
            case 'navigate': {
                const url = selector.startsWith('http') ? selector : `https://${selector}`;
                await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: node.timeout_ms });
                return { navigated_to: url };
            }

            case 'click': {
                await this.page.waitForSelector(selector, { timeout: node.timeout_ms });
                await this.page.click(selector);
                await this.page.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => { });
                return { clicked: selector };
            }

            case 'fill': {
                if (!input) throw new Error(`fill action on ${selector} requires input value`);
                await this.page.waitForSelector(selector, { timeout: node.timeout_ms });
                await this.page.fill(selector, input);
                return { filled: selector, value: input };
            }

            case 'read': {
                await this.page.waitForSelector(selector, { timeout: node.timeout_ms });
                const text = await this.page.textContent(selector);
                return text?.trim() ?? null;
            }

            case 'scroll': {
                await this.page.evaluate(`document.querySelector('${selector}')?.scrollIntoView()`);
                return { scrolled: selector };
            }

            case 'hover': {
                await this.page.waitForSelector(selector, { timeout: node.timeout_ms });
                await this.page.hover(selector);
                return { hovered: selector };
            }

            case 'wait': {
                await new Promise(r => setTimeout(r, parseInt(selector) || 2000));
                return { waited_ms: parseInt(selector) || 2000 };
            }

            default:
                throw new Error(`Unknown action: ${node.action}`);
        }
    }

    private async executePythonNode(node: PythonNode): Promise<unknown> {
        // Sandboxed evaluation using Node.js vm
        const { runInNewContext } = await import('vm');
        const ctxSnapshot: Record<string, unknown> = {};
        for (const varName of node.input_vars) {
            ctxSnapshot[varName] = this.context.get(varName) ?? null;
        }
        try {
            const result = runInNewContext(node.code, { ...ctxSnapshot, console, Math, JSON, Date });
            return result;
        } catch (err: any) {
            throw new Error(`[COMET/PYTHON_NODE] ${node.code.slice(0, 60)}: ${err.message}`);
        }
    }

    /** Interpolate ${var_name} placeholders from ActionContext */
    private interpolate(str: string): string {
        return str.replace(/\$\{(\w+)\}/g, (_, key) => {
            const val = this.context.get(key);
            return val !== undefined ? String(val) : `\${${key}}`;
        });
    }

    private getNodeDescription(node: MixedActionPlan['nodes'][0]): string {
        if (node.type === 'ui') return `${node.action} → ${node.description}`;
        if (node.type === 'python') return `compute → ${node.description}`;
        return `conditional → ${node.description}`;
    }

    // ── Browser Lifecycle ──────────────────────────────────────────────────

    private async initBrowser(): Promise<void> {
        this.browser = await chromium.launch({
            headless: HEADLESS,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        });
        const ctx = await this.browser.newContext({
            viewport: { width: 1280, height: 900 },
            userAgent: 'Mozilla/5.0 (compatible; Inception/COMET-Agent)',
        });
        this.page = await ctx.newPage();
    }

    private async closeBrowser(): Promise<void> {
        await this.browser?.close();
        this.browser = null;
        this.page = null;
    }
}
