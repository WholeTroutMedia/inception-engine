/**
 * GHOST — SMG Crawl Agent
 *
 * Builds a State Machine Graph (SMG) by systematically exploring a web domain.
 * Uses BFS traversal with GhostBrowser (Playwright), recording every reachable
 * page state and the interactive elements that transition between them.
 *
 * Philosophy: This is an offline mapping operation — the equivalent of sending
 * a scout ahead to memorize the city before the exec agent walks through it.
 *
 * The Crawl Agent is GHOST's second superpower alongside SENTINEL.
 * Together: find the enemy (sentinel) + learn the terrain (crawl).
 */

import { createHash } from 'crypto';
import type { Page } from 'playwright';
import { GhostBrowser } from '../browser.js';
import { LynchClassifier } from './lynch-classifier.js';
import { smgStore } from './smg-store.js';
import {
    SMGGraph, SMGState, SMGElement, SMGTransition,
    stateId, elementId, graphId, transitionId,
} from './schema.js';

interface CrawlOptions {
    maxDepth?: number;          // Default: 3. Max BFS depth from root.
    maxStates?: number;         // Default: 100. Safety cap.
    excludePatterns?: string[]; // URL patterns to skip (e.g., /logout, /delete)
    respectRobots?: boolean;    // Default: true
    delayMs?: number;           // Delay between page visits (politeness). Default: 800ms.
    headless?: boolean;
    platform?: 'web';
}

interface CrawlEvent {
    type: 'state_discovered' | 'state_mapped' | 'transition_recorded' | 'crawl_complete' | 'error';
    data: unknown;
}

type CrawlEventHandler = (event: CrawlEvent) => void;

// ─── DOM Extraction Helpers ────────────────────────────────────────────────────

const ELEMENT_EXTRACTION_SCRIPT = `
(() => {
    const results = [];
    const seen = new Set();

    const getSelector = (el) => {
        if (el.id) return '#' + CSS.escape(el.id);
        if (el.getAttribute('data-testid')) return '[data-testid="' + el.getAttribute('data-testid') + '"]';
        if (el.getAttribute('aria-label')) return el.tagName.toLowerCase() + '[aria-label="' + el.getAttribute('aria-label') + '"]';
        if (el.name) return el.tagName.toLowerCase() + '[name="' + el.name + '"]';
        const path = [];
        let curr = el;
        while (curr && curr !== document.body) {
            let sel = curr.tagName.toLowerCase();
            if (curr.className) sel += '.' + Array.from(curr.classList).slice(0,2).join('.');
            path.unshift(sel);
            curr = curr.parentElement;
        }
        return path.join(' > ').slice(0, 120);
    };

    const getLabel = (el) => {
        return el.getAttribute('aria-label') ||
               el.getAttribute('title') ||
               el.textContent?.trim().slice(0, 80) ||
               el.getAttribute('placeholder') ||
               el.getAttribute('alt') ||
               el.tagName.toLowerCase();
    };

    // Clickable elements
    const clickables = document.querySelectorAll('a[href], button:not([disabled]), [role="button"], [role="tab"], [role="menuitem"]');
    for (const el of clickables) {
        const label = getLabel(el);
        const sel = getSelector(el);
        const key = sel + ':click';
        if (seen.has(key) || !label || label.length < 1) continue;
        seen.add(key);
        const href = el.getAttribute('href');
        results.push({
            selector: sel,
            action: 'click',
            label,
            href: href || null,
            text: el.textContent?.trim().slice(0, 80),
        });
    }

    // Form inputs
    const inputs = document.querySelectorAll('input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled])');
    for (const el of inputs) {
        const label = getLabel(el);
        const sel = getSelector(el);
        const key = sel + ':fill';
        if (seen.has(key)) continue;
        seen.add(key);
        results.push({
            selector: sel,
            action: 'fill',
            label,
            href: null,
            type: el.getAttribute('type') || 'text',
            placeholder: el.getAttribute('placeholder'),
        });
    }

    return results;
})()
`;

const DOM_SIGNATURE_SCRIPT = `
(() => {
    const title = document.title?.trim().slice(0, 80);
    const h1 = document.querySelector('h1')?.textContent?.trim().slice(0, 60);
    const nav = Array.from(document.querySelectorAll('nav a, header a')).slice(0, 5).map(a => a.textContent?.trim()).join(', ');
    return [title, h1, nav].filter(Boolean).join(' | ');
})()
`;

// ─── CrawlAgent ───────────────────────────────────────────────────────────────

export class CrawlAgent {
    private browser: GhostBrowser;
    private classifier: LynchClassifier;
    private options: Required<CrawlOptions>;
    private visited = new Set<string>(); // Visited URL patterns
    private onEvent: CrawlEventHandler | null = null;

    constructor(options: CrawlOptions = {}) {
        this.browser = new GhostBrowser('/tmp/ghost-crawl-screenshots');
        this.classifier = new LynchClassifier(process.env.GENKIT_URL);
        this.options = {
            maxDepth: options.maxDepth ?? 3,
            maxStates: options.maxStates ?? 100,
            excludePatterns: options.excludePatterns ?? [
                '/logout', '/signout', '/delete', '/remove', '/unsubscribe',
                '/api/', '/__', '/cdn-cgi/', '.pdf', '.zip', '.png', '.jpg', '.mp4',
            ],
            respectRobots: options.respectRobots ?? true,
            delayMs: options.delayMs ?? 800,
            headless: options.headless ?? true,
            platform: options.platform ?? 'web',
        };
    }

    on(handler: CrawlEventHandler): this {
        this.onEvent = handler;
        return this;
    }

    private emit(event: CrawlEvent): void {
        this.onEvent?.(event);
    }

    /**
     * Crawl a domain from the given start URL.
     * Returns a completed SMGGraph ready to be stored and used by the Execution Agent.
     */
    async crawl(startUrl: string): Promise<SMGGraph> {
        const url = new URL(startUrl);
        const domain = url.hostname;
        const platform = 'web';

        console.log(`\n[GHOST/CRAWL] 🗺  Starting SMG crawl: ${domain}`);
        console.log(`[GHOST/CRAWL] Max depth: ${this.options.maxDepth} | Max states: ${this.options.maxStates}`);

        await this.browser.init({ headless: this.options.headless, viewport: { width: 1280, height: 900 } });

        const states: Record<string, SMGState> = {};
        const transitions: SMGTransition[] = [];
        const queue: Array<{ url: string; depth: number; fromStateId?: string; fromElementId?: string }> = [
            { url: startUrl, depth: 0 }
        ];

        const entryStateId = this.urlToStateId(domain, startUrl);
        let crawledCount = 0;

        try {
            while (queue.length > 0 && crawledCount < this.options.maxStates) {
                const item = queue.shift()!;
                const normalizedUrl = this.normalizeUrl(item.url);

                if (this.visited.has(normalizedUrl)) continue;
                if (this.shouldExclude(normalizedUrl)) continue;
                if (!this.isSameDomain(normalizedUrl, domain)) continue;
                if (item.depth > this.options.maxDepth) continue;

                this.visited.add(normalizedUrl);
                crawledCount++;

                this.emit({ type: 'state_discovered', data: { url: normalizedUrl, depth: item.depth } });

                const state = await this.mapPage(domain, normalizedUrl, item.depth);
                if (!state) continue;

                states[state.id] = state;
                crawledCount++;

                // Record transition from parent
                if (item.fromStateId && item.fromElementId) {
                    const t: SMGTransition = {
                        id: transitionId(item.fromStateId, item.fromElementId),
                        from_state: item.fromStateId,
                        to_state: state.id,
                        element_id: item.fromElementId,
                        action: 'click',
                        frequency: 1,
                        last_validated: new Date().toISOString(),
                        success_rate: 1.0,
                    };
                    transitions.push(t);
                    this.emit({ type: 'transition_recorded', data: t });
                }

                // Update element transition_to mappings
                if (item.fromStateId && states[item.fromStateId]) {
                    const parentState = states[item.fromStateId];
                    const elem = parentState.elements.find(e => e.id === item.fromElementId);
                    if (elem) elem.transition_to = state.id;
                }

                this.emit({ type: 'state_mapped', data: { stateId: state.id, url: normalizedUrl, elements: state.elements.length } });

                // Enqueue child pages from click elements
                if (item.depth < this.options.maxDepth) {
                    for (const elem of state.elements) {
                        if (elem.action === 'click' || elem.action === 'navigate') {
                            // Only enqueue elements that look like navigation
                            const page = this.browser.getPage();
                            if (page) {
                                const href = await page.getAttribute(elem.selector, 'href').catch(() => null);
                                if (href && href.startsWith('/') || href?.startsWith(url.origin)) {
                                    const childUrl = href.startsWith('/') ? `${url.origin}${href}` : href;
                                    queue.push({
                                        url: childUrl,
                                        depth: item.depth + 1,
                                        fromStateId: state.id,
                                        fromElementId: elem.id,
                                    });
                                }
                            }
                        }
                    }
                }

                if (this.options.delayMs > 0) {
                    await new Promise(r => setTimeout(r, this.options.delayMs));
                }
            }
        } finally {
            await this.browser.close();
        }

        // Update inbound/outbound counts
        for (const t of transitions) {
            if (states[t.from_state]) states[t.from_state].outbound_count++;
            if (states[t.to_state]) states[t.to_state].inbound_count++;
        }

        // Classify all states with Lynch taxonomy
        const classificationInput = Object.values(states).map(s => ({
            id: s.id,
            url_pattern: s.url_pattern,
            url_example: s.url_example,
            dom_signature: s.dom_signature,
            inbound_count: s.inbound_count,
            outbound_count: s.outbound_count,
            is_auth_required: s.is_auth_required,
            elements: s.elements,
        }));
        const lynchMap = await this.classifier.classify(classificationInput);
        for (const [sid, type] of lynchMap) {
            if (states[sid]) states[sid].lynch_type = type;
        }

        // Build district clusters and landmark lists
        const districtClusters: Record<string, string[]> = {};
        const landmarkIds: string[] = [];
        for (const state of Object.values(states)) {
            if (state.lynch_type === 'landmark') landmarkIds.push(state.id);
            if (state.lynch_type === 'district') {
                const urlParts = state.url_pattern.split('/').filter(Boolean);
                const districtKey = urlParts[0] ?? 'root';
                districtClusters[districtKey] = districtClusters[districtKey] ?? [];
                districtClusters[districtKey].push(state.id);
            }
        }

        const coverageScore = Math.min(1, crawledCount / Math.max(crawledCount * 1.2, 1));

        const graph: SMGGraph = {
            id: graphId(domain, platform),
            domain,
            platform,
            version: 1,
            crawled_at: new Date().toISOString(),
            coverage_score: coverageScore,
            total_states: Object.keys(states).length,
            total_transitions: transitions.length,
            crawl_depth_max: this.options.maxDepth,
            states,
            transitions,
            entry_state_id: entryStateId,
            landmark_ids: landmarkIds,
            district_clusters: districtClusters,
            staleness_score: 0,
            metadata: { crawl_options: this.options, start_url: startUrl },
        };

        await smgStore.save(graph);
        this.emit({ type: 'crawl_complete', data: { domain, states: graph.total_states, transitions: graph.total_transitions } });
        console.log(`\n[GHOST/CRAWL] ✅ Complete: ${domain} — ${graph.total_states} states, ${graph.total_transitions} transitions`);

        return graph;
    }

    // ── Private Helpers ────────────────────────────────────────────────────────

    private async mapPage(domain: string, url: string, depth: number): Promise<SMGState | null> {
        try {
            const page = this.browser.getPage();
            if (!page) return null;

            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
            await page.waitForTimeout(500); // Let JS render

            const isAuthRequired = await this.detectAuthWall(page);
            const domSig: string = await page.evaluate(DOM_SIGNATURE_SCRIPT) as string;
            const rawElements: any[] = await page.evaluate(ELEMENT_EXTRACTION_SCRIPT) as any[];
            const urlPattern = this.urlToPattern(url);
            const sid = this.urlToStateId(domain, url);

            // Generate visual hash from DOM signature (lightweight fingerprint)
            const visualHash = createHash('sha256').update(domSig + urlPattern).digest('hex').slice(0, 16);

            const elements: SMGElement[] = rawElements.map(raw => {
                const eid = elementId(sid, raw.selector);
                return {
                    id: eid,
                    selector: raw.selector,
                    text_content: raw.text ?? raw.label,
                    action: raw.action,
                    label: raw.label,
                    transition_to: null,
                    input_required: raw.action === 'fill',
                    input_placeholder: raw.placeholder,
                    validated_at: new Date().toISOString(),
                    staleness_score: 0,
                };
            });

            const state: SMGState = {
                id: sid,
                label: domSig.split(' | ')[0] ?? url,
                url_pattern: urlPattern,
                url_example: url,
                lynch_type: 'path', // Will be overridden by classifier
                visual_hash: visualHash,
                dom_signature: domSig,
                elements,
                inbound_count: 0,
                outbound_count: 0,
                last_crawled: new Date().toISOString(),
                crawl_depth: depth,
                is_auth_required: isAuthRequired,
                metadata: {},
            };

            return state;
        } catch (err: any) {
            console.warn(`[GHOST/CRAWL] Failed to map ${url}: ${err.message}`);
            return null;
        }
    }

    private async detectAuthWall(page: Page): Promise<boolean> {
        const indicators = await page.evaluate(`
            !!(document.querySelector('input[type="password"]') ||
               document.querySelector('[data-testid*="login"]') ||
               document.querySelector('[aria-label*="sign in"]') ||
               document.querySelector('[aria-label*="log in"]') ||
               (document.title?.toLowerCase().includes('sign in')) ||
               (document.title?.toLowerCase().includes('log in')))
        `).catch(() => false);
        return !!indicators;
    }

    /** Convert a URL to an SMG state ID */
    private urlToStateId(domain: string, url: string): string {
        return stateId(domain, this.urlToPattern(url));
    }

    /** Convert a URL to a normalized pattern (removes query params and UUIDs) */
    private urlToPattern(url: string): string {
        try {
            const u = new URL(url);
            const path = u.pathname
                .replace(/\/[0-9a-f]{8}-[0-9a-f-]{27}/gi, '/{uuid}') // UUIDs
                .replace(/\/\d{6,}/g, '/{id}')                         // Long numeric IDs
                .replace(/\/\d{4}\/\d{2}\/\d{2}/g, '/{date}');         // Date paths
            return path || '/';
        } catch {
            return '/';
        }
    }

    private normalizeUrl(url: string): string {
        try {
            const u = new URL(url);
            return `${u.origin}${u.pathname}`.replace(/\/$/, '') || u.origin;
        } catch {
            return url;
        }
    }

    private isSameDomain(url: string, domain: string): boolean {
        try {
            return new URL(url).hostname === domain;
        } catch {
            return false;
        }
    }

    private shouldExclude(url: string): boolean {
        return this.options.excludePatterns.some(p => url.includes(p));
    }
}
