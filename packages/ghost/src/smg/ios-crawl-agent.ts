/**
 * GHOST — SMG iOS Crawl Agent
 *
 * Builds State Machine Graphs for iOS native apps via Appium + XCUITest.
 * Traverses View Controller states by interacting with the XCUIElement hierarchy.
 *
 * Requirements:
 *   - Mac with Xcode + iOS Simulator or physical device
 *   - Appium server running (npm install -g appium && appium driver install xcuitest)
 *   - webdriverio installed in this package
 *
 * Run Appium: appium --port 4723 (default)
 * Then point this agent at the running server.
 *
 * The iOS SMG uses the same schema as web/Android — identical world model,
 * different execution primitives. One language to rule all platforms.
 */

import { createHash } from 'crypto';
import { smgStore } from './smg-store.js';
import { LynchClassifier } from './lynch-classifier.js';
import {
    SMGGraph, SMGState, SMGElement, SMGTransition,
    stateId, elementId, graphId, transitionId,
} from './schema.js';

interface IOSCrawlOptions {
    appiumUrl?: string;         // Default: 'http://localhost:4723'
    bundleId: string;           // App bundle ID, e.g. 'com.reddit.Reddit'
    deviceName?: string;        // Simulator name or 'iPhone' for physical
    platformVersion?: string;   // iOS version, e.g. '17.0'
    maxDepth?: number;          // Default: 2
    maxStates?: number;         // Default: 60
    delayMs?: number;           // Default: 1000ms
}

// ─── Appium Element ───────────────────────────────────────────────────────────

interface AppiumElement {
    elementId: string;
    accessibilityId: string;
    label: string;
    type: string;
    value: string;
    isInteractable: boolean;
    isTextInput: boolean;
    rect: { x: number; y: number; width: number; height: number };
}

// Dynamic Appium import — gracefully unavailable if not installed
async function getDriver(capabilities: Record<string, unknown>, appiumUrl: string): Promise<any> {
    try {
        const { remote } = await import('webdriverio');
        return await remote({
            logLevel: 'warn',
            port: parseInt(new URL(appiumUrl).port ?? '4723'),
            hostname: new URL(appiumUrl).hostname,
            capabilities: {
                platformName: 'iOS',
                'appium:automationName': 'XCUITest',
                'appium:newCommandTimeout': 60,
                ...capabilities,
            },
        });
    } catch (err: any) {
        throw new Error(`[GHOST/IOS] Cannot connect to Appium at ${appiumUrl}. Start with: appium --port 4723\nError: ${err.message}`);
    }
}

async function getPageElements(driver: any): Promise<AppiumElement[]> {
    try {
        const elements: AppiumElement[] = [];
        const types = [
            'XCUIElementTypeButton',
            'XCUIElementTypeTextField',
            'XCUIElementTypeSecureTextField',
            'XCUIElementTypeTextView',
            'XCUIElementTypeLink',
            'XCUIElementTypeCell',
            'XCUIElementTypeSwitch',
        ];

        for (const type of types) {
            let found: any[] = [];
            try {
                found = await driver.$$(type);
            } catch { continue; }

            for (const el of found.slice(0, 15)) {
                try {
                    const [accessId, label, value, rect, isEnabled] = await Promise.all([
                        el.getAttribute('name').catch(() => ''),
                        el.getAttribute('label').catch(() => ''),
                        el.getAttribute('value').catch(() => ''),
                        el.getRect().catch(() => ({ x: 0, y: 0, width: 0, height: 0 })),
                        el.isEnabled().catch(() => true),
                    ]);

                    if (!isEnabled) continue;
                    const isTextInput = ['XCUIElementTypeTextField', 'XCUIElementTypeSecureTextField', 'XCUIElementTypeTextView'].includes(type);

                    elements.push({
                        elementId: await el.elementId.catch(() => ''),
                        accessibilityId: accessId,
                        label: label || accessId || value || type.replace('XCUIElementType', ''),
                        type,
                        value: value || '',
                        isInteractable: true,
                        isTextInput,
                        rect,
                    });
                } catch { /* Skip unavailable elements */ }
            }
        }

        return elements;
    } catch (err: any) {
        console.warn(`[GHOST/IOS] Element extraction failed: ${err.message}`);
        return [];
    }
}

async function getCurrentViewController(driver: any): Promise<string> {
    try {
        const source = await driver.getPageSource();
        const match = source.match(/type="XCUIElementTypeWindow"[^>]*label="([^"]+)"/);
        return match?.[1] ?? await driver.getTitle().catch(() => 'unknown');
    } catch {
        return 'unknown';
    }
}

// ─── IOSCrawlAgent ────────────────────────────────────────────────────────────

export class IOSCrawlAgent {
    private classifier: LynchClassifier;
    private opts: Required<IOSCrawlOptions>;

    constructor(options: IOSCrawlOptions) {
        this.classifier = new LynchClassifier(process.env.GENKIT_URL);
        this.opts = {
            appiumUrl: options.appiumUrl ?? 'http://localhost:4723',
            bundleId: options.bundleId,
            deviceName: options.deviceName ?? 'iPhone 15 Pro',
            platformVersion: options.platformVersion ?? '17.0',
            maxDepth: options.maxDepth ?? 2,
            maxStates: options.maxStates ?? 60,
            delayMs: options.delayMs ?? 1000,
        };
    }

    /**
     * Crawl an iOS app to build its SMGGraph.
     * Requires Appium server running and the app installed on target device/simulator.
     */
    async crawl(): Promise<SMGGraph> {
        const { bundleId, appiumUrl, deviceName, platformVersion, maxDepth, maxStates, delayMs } = this.opts;

        console.log(`\n[GHOST/IOS] 📱 Crawling ${bundleId} via Appium...`);
        console.log(`[GHOST/IOS] Device: ${deviceName} iOS ${platformVersion}`);

        const driver = await getDriver({
            'appium:bundleId': bundleId,
            'appium:deviceName': deviceName,
            'appium:platformVersion': platformVersion,
            'appium:noReset': false,
        }, appiumUrl);

        const states: Record<string, SMGState> = {};
        const transitions: SMGTransition[] = [];
        const visitedControllers = new Set<string>();
        let entryStateId = '';

        interface QueueItem {
            controller: string;
            depth: number;
            fromStateId?: string;
            fromElementId?: string;
        }

        const initialController = await getCurrentViewController(driver);
        const queue: QueueItem[] = [{ controller: initialController, depth: 0 }];
        let iteration = 0;

        try {
            while (queue.length > 0 && iteration < maxStates) {
                const item = queue.shift()!;
                const currentVC = await getCurrentViewController(driver).catch(() => item.controller);

                if (visitedControllers.has(currentVC)) continue;
                visitedControllers.add(currentVC);
                iteration++;

                const sid = stateId(bundleId, currentVC);
                if (iteration === 1) entryStateId = sid;

                const rawElements = await getPageElements(driver);
                const visualHash = createHash('sha256')
                    .update(rawElements.map(e => e.accessibilityId).join(','))
                    .digest('hex').slice(0, 16);
                const domSig = `${currentVC} | ${rawElements.slice(0, 3).map(e => e.label).join(', ')}`;

                const smgElements: SMGElement[] = rawElements.map(raw => {
                    const selector = raw.accessibilityId
                        ? `~${raw.accessibilityId}` // Appium accessibility ID selector
                        : raw.type;
                    const eid = elementId(sid, selector);
                    return {
                        id: eid,
                        selector,
                        text_content: raw.label || raw.value,
                        action: raw.isTextInput ? 'fill' : 'click',
                        label: raw.label || raw.type.replace('XCUIElementType', ''),
                        transition_to: null,
                        input_required: raw.isTextInput,
                        input_placeholder: raw.isTextInput ? (raw.value || undefined) : undefined,
                        validated_at: new Date().toISOString(),
                        staleness_score: 0,
                    };
                });

                const isAuthRequired = smgElements.some(e =>
                    e.label?.toLowerCase().includes('password') ||
                    e.label?.toLowerCase().includes('sign in')
                );

                const state: SMGState = {
                    id: sid,
                    label: domSig,
                    url_pattern: currentVC,
                    url_example: currentVC,
                    lynch_type: 'path',
                    visual_hash: visualHash,
                    dom_signature: domSig,
                    elements: smgElements,
                    inbound_count: 0,
                    outbound_count: 0,
                    last_crawled: new Date().toISOString(),
                    crawl_depth: item.depth,
                    is_auth_required: isAuthRequired,
                    metadata: {
                        bundle_id: bundleId,
                        view_controller: currentVC,
                        appium_device: deviceName,
                    },
                };

                states[sid] = state;

                if (item.fromStateId && item.fromElementId) {
                    const fromState = states[item.fromStateId];
                    if (fromState) {
                        const elem = fromState.elements.find(e => e.id === item.fromElementId);
                        if (elem) elem.transition_to = sid;
                    }
                    transitions.push({
                        id: transitionId(item.fromStateId, item.fromElementId),
                        from_state: item.fromStateId,
                        to_state: sid,
                        element_id: item.fromElementId,
                        action: 'click',
                        frequency: 1,
                        last_validated: new Date().toISOString(),
                        success_rate: 1.0,
                    });
                }

                // Tap clickable elements to discover new view controllers
                if (item.depth < maxDepth) {
                    for (const elem of smgElements.filter(e => e.action === 'click').slice(0, 6)) {
                        try {
                            if (elem.selector.startsWith('~')) {
                                const el = await driver.$(`accessibility id:${elem.selector.slice(1)}`);
                                await el.click();
                            } else {
                                const el = await driver.$(`//${elem.selector}`);
                                await el.click();
                            }
                            await driver.pause(delayMs);

                            const newVC = await getCurrentViewController(driver);
                            if (newVC !== currentVC && !visitedControllers.has(newVC)) {
                                queue.push({ controller: newVC, depth: item.depth + 1, fromStateId: sid, fromElementId: elem.id });
                                // Go back
                                try {
                                    const backBtn = await driver.$('~Back');
                                    await backBtn.click();
                                } catch {
                                    await driver.back();
                                }
                                await driver.pause(600);
                            }
                        } catch { /* Continue */ }
                    }
                }
            }
        } finally {
            await driver.deleteSession().catch(() => { });
        }

        // Lynch classification
        const classInput = Object.values(states).map(s => ({
            id: s.id, url_pattern: s.url_pattern, url_example: s.url_example,
            dom_signature: s.dom_signature, inbound_count: s.inbound_count,
            outbound_count: s.outbound_count, is_auth_required: s.is_auth_required,
            elements: s.elements,
        }));
        const lynchMap = await this.classifier.classify(classInput);
        for (const [sid, type] of lynchMap) {
            if (states[sid]) states[sid].lynch_type = type;
        }

        for (const t of transitions) {
            if (states[t.from_state]) states[t.from_state].outbound_count++;
            if (states[t.to_state]) states[t.to_state].inbound_count++;
        }

        const landmarkIds = Object.values(states).filter(s => s.lynch_type === 'landmark').map(s => s.id);

        const graph: SMGGraph = {
            id: graphId(bundleId, 'ios'),
            domain: bundleId,
            platform: 'ios',
            version: 1,
            crawled_at: new Date().toISOString(),
            coverage_score: Math.min(1, iteration / maxStates),
            total_states: Object.keys(states).length,
            total_transitions: transitions.length,
            crawl_depth_max: maxDepth,
            states, transitions,
            entry_state_id: entryStateId,
            landmark_ids: landmarkIds,
            district_clusters: {},
            staleness_score: 0,
            metadata: { bundle_id: bundleId, appium_url: appiumUrl, device: deviceName },
        };

        await smgStore.save(graph);
        console.log(`[GHOST/IOS] ✅ Complete: ${bundleId} — ${graph.total_states} states, ${graph.total_transitions} transitions`);
        return graph;
    }
}
