/**
 * GHOST — SMG Android Crawl Agent
 *
 * Builds State Machine Graphs for Android native apps via ADB + UIAutomator2.
 * Systematically traverses Activity/Fragment states by parsing the UI hierarchy.
 *
 * Requirements:
 *   - ADB in PATH (adb devices must return connected device)
 *   - Android device or AVD emulator
 *   - Target app installed
 *
 * The SMG it produces uses the same schema as the web crawler — same world model,
 * different execution layer. This is the Android hippocampus.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { parseStringPromise } from 'xml2js';
import { createHash } from 'crypto';
import { smgStore } from './smg-store.js';
import { LynchClassifier } from './lynch-classifier.js';
import {
    SMGGraph, SMGState, SMGElement, SMGTransition,
    stateId, elementId, graphId, transitionId,
} from './schema.js';

const execAsync = promisify(exec);

interface AndroidCrawlOptions {
    deviceId?: string;          // ADB device serial. Defaults to first device.
    maxDepth?: number;          // Max Activity traversal depth. Default: 2.
    maxStates?: number;         // Safety cap. Default: 60.
    delayMs?: number;           // Between taps. Default: 1200ms.
    excludeActivities?: string[]; // Activity names to skip.
}

interface AndroidElement {
    selector: string;   // 'resource-id:com.reddit.frontpage:id/post_title'
    contentDesc: string;
    className: string;
    bounds: string;     // '[x1,y1][x2,y2]'
    clickable: boolean;
    text: string;
    isInput: boolean;
}

// ─── ADB Helpers ──────────────────────────────────────────────────────────────

async function adb(deviceId: string, ...args: string[]): Promise<string> {
    const prefix = deviceId ? `-s ${deviceId}` : '';
    const { stdout, stderr } = await execAsync(`adb ${prefix} ${args.join(' ')}`);
    if (stderr && !stderr.includes('WARNING')) {
        throw new Error(`ADB error: ${stderr.trim()}`);
    }
    return stdout.trim();
}

async function getConnectedDevice(deviceId?: string): Promise<string> {
    if (deviceId) return deviceId;
    const output = await execAsync('adb devices');
    const lines = output.stdout.split('\n').slice(1).filter(l => l.includes('\tdevice'));
    if (lines.length === 0) throw new Error('[GHOST/ANDROID] No ADB devices connected. Run `adb devices` to check.');
    return lines[0].split('\t')[0].trim();
}

async function dumpUIHierarchy(device: string, localPath: string): Promise<string> {
    await adb(device, 'shell', 'uiautomator dump /sdcard/smg_dump.xml --compressed');
    await adb(device, 'pull', '/sdcard/smg_dump.xml', localPath);
    const { stdout } = await execAsync(`cat "${localPath}"`);
    return stdout;
}

async function getCurrentActivity(device: string): Promise<string> {
    const output = await adb(device, 'shell', 'dumpsys activity activities | grep mCurrentFocus');
    const match = output.match(/\{[^}]+ ([^}]+)\}/);
    return match?.[1] ?? 'unknown/.unknown';
}

async function tapElement(device: string, bounds: string): Promise<void> {
    // Parse '[x1,y1][x2,y2]' → center tap
    const match = bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    if (!match) throw new Error(`Invalid bounds: ${bounds}`);
    const cx = Math.round((parseInt(match[1]) + parseInt(match[3])) / 2);
    const cy = Math.round((parseInt(match[2]) + parseInt(match[4])) / 2);
    await adb(device, 'shell', `input tap ${cx} ${cy}`);
}

function parseHierarchy(xmlNode: any): AndroidElement[] {
    const elements: AndroidElement[] = [];

    function walk(node: any): void {
        if (!node) return;
        const attrs = node.$ ?? {};
        const clickable = attrs.clickable === 'true';
        const inputable = ['android.widget.EditText', 'android.widget.AutoCompleteTextView'].includes(attrs.class);

        if (clickable || inputable) {
            const resourceId = attrs['resource-id'] ?? '';
            const contentDesc = attrs['content-desc'] ?? '';
            const text = attrs.text ?? '';
            const selector = resourceId ? `resource-id:${resourceId}` :
                contentDesc ? `content-desc:${contentDesc}` :
                    `class:${attrs.class}:${text.slice(0, 20)}`;

            elements.push({
                selector,
                contentDesc,
                className: attrs.class ?? '',
                bounds: attrs.bounds ?? '[0,0][0,0]',
                clickable,
                text,
                isInput: inputable,
            });
        }

        // Recurse into children
        const children = Object.values(node).flat().filter((v: any) => typeof v === 'object' && v.$ !== undefined);
        for (const child of children) walk(child as any);
    }

    walk(xmlNode);
    return elements;
}

// ─── AndroidCrawlAgent ────────────────────────────────────────────────────────

export class AndroidCrawlAgent {
    private classifier: LynchClassifier;
    private options: Required<AndroidCrawlOptions>;

    constructor(options: AndroidCrawlOptions = {}) {
        this.classifier = new LynchClassifier(process.env.GENKIT_URL);
        this.options = {
            deviceId: options.deviceId ?? '',
            maxDepth: options.maxDepth ?? 2,
            maxStates: options.maxStates ?? 60,
            delayMs: options.delayMs ?? 1200,
            excludeActivities: options.excludeActivities ?? [
                'com.google.android', 'com.android.settings', 'com.android.launcher',
            ],
        };
    }

    /**
     * Crawl an Android app to build its SMGGraph.
     * Launches the app, dumps UI hierarchies, systematically taps interactive elements.
     *
     * @param packageName - App package, e.g. 'com.reddit.frontpage'
     * @param launchActivity - Entry activity, e.g. 'com.reddit.frontpage/.MainActivity'
     */
    async crawl(packageName: string, launchActivity: string): Promise<SMGGraph> {
        const device = await getConnectedDevice(this.options.deviceId || undefined);
        console.log(`\n[GHOST/ANDROID] 📱 Crawling ${packageName} on device ${device}`);

        // Launch app
        await adb(device, 'shell', `am start -n ${launchActivity}`);
        await new Promise(r => setTimeout(r, 2000)); // Wait for app to load

        const states: Record<string, SMGState> = {};
        const transitions: SMGTransition[] = [];
        const visitedActivities = new Set<string>();
        const dumpPath = `/tmp/ghost-android-${Date.now()}.xml`;
        let entryStateId = '';

        interface QueueItem {
            activity: string;
            depth: number;
            fromStateId?: string;
            fromElementId?: string;
        }

        const queue: QueueItem[] = [{ activity: launchActivity, depth: 0 }];
        let iteration = 0;

        while (queue.length > 0 && iteration < this.options.maxStates) {
            const item = queue.shift()!;
            const currentActivity = await getCurrentActivity(device).catch(() => launchActivity);

            if (visitedActivities.has(currentActivity)) continue;
            if (this.options.excludeActivities.some(e => currentActivity.includes(e))) continue;

            visitedActivities.add(currentActivity);
            iteration++;

            const sig = `${packageName}::${currentActivity}`;
            const sid = stateId(packageName, currentActivity);
            if (iteration === 1) entryStateId = sid;

            // Dump and parse UI
            let rawXml: string;
            try {
                rawXml = await dumpUIHierarchy(device, dumpPath);
            } catch {
                continue;
            }

            let parsedXml: any;
            try {
                parsedXml = await parseStringPromise(rawXml);
            } catch {
                continue;
            }

            const rawElements = parseHierarchy(parsedXml?.hierarchy ?? parsedXml);
            const visualHash = createHash('sha256').update(rawElements.map(e => e.selector).join(',')).digest('hex').slice(0, 16);
            const domSig = `${currentActivity} | ${rawElements.slice(0, 3).map(e => e.contentDesc || e.text).join(', ')}`;

            const smgElements: SMGElement[] = rawElements.map(raw => {
                const eid = elementId(sid, raw.selector);
                return {
                    id: eid,
                    selector: raw.selector,
                    text_content: raw.text || raw.contentDesc,
                    action: raw.isInput ? 'fill' : 'click',
                    label: raw.contentDesc || raw.text || raw.className.split('.').pop() || 'element',
                    transition_to: null,
                    input_required: raw.isInput,
                    input_placeholder: raw.isInput ? (raw.text || undefined) : undefined,
                    validated_at: new Date().toISOString(),
                    staleness_score: 0,
                };
            });

            const state: SMGState = {
                id: sid,
                label: domSig,
                url_pattern: currentActivity,
                url_example: currentActivity,
                lynch_type: 'path',
                visual_hash: visualHash,
                dom_signature: domSig,
                elements: smgElements,
                inbound_count: 0,
                outbound_count: 0,
                last_crawled: new Date().toISOString(),
                crawl_depth: item.depth,
                is_auth_required: smgElements.some(e => e.label?.toLowerCase().includes('password')),
                metadata: { package: packageName, activity: currentActivity },
            };

            states[sid] = state;

            if (item.fromStateId && item.fromElementId) {
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

            // Tap each clickable element and observe state changes (shallow)
            if (item.depth < this.options.maxDepth) {
                for (const elem of smgElements.filter(e => e.action === 'click').slice(0, 8)) {
                    const rawElem = rawElements.find(r => r.selector === elem.selector);
                    if (!rawElem?.clickable) continue;

                    try {
                        await tapElement(device, rawElem.bounds);
                        await new Promise(r => setTimeout(r, this.options.delayMs));

                        const newActivity = await getCurrentActivity(device);
                        if (newActivity !== currentActivity && !visitedActivities.has(newActivity)) {
                            queue.push({
                                activity: newActivity,
                                depth: item.depth + 1,
                                fromStateId: sid,
                                fromElementId: elem.id,
                            });
                        }
                        // Go back
                        await adb(device, 'shell', 'input keyevent KEYCODE_BACK');
                        await new Promise(r => setTimeout(r, 800));
                    } catch { /* Continue with next element */ }
                }
            }
        }

        // Lynch classification
        const classInput = Object.values(states).map(s => ({
            id: s.id,
            url_pattern: s.url_pattern,
            url_example: s.url_example,
            dom_signature: s.dom_signature,
            inbound_count: s.inbound_count,
            outbound_count: s.outbound_count,
            is_auth_required: s.is_auth_required,
            elements: s.elements,
        }));
        const lynchMap = await this.classifier.classify(classInput);
        for (const [sid, type] of lynchMap) {
            if (states[sid]) states[sid].lynch_type = type;
        }

        const landmarkIds = Object.values(states).filter(s => s.lynch_type === 'landmark').map(s => s.id);
        const districtClusters: Record<string, string[]> = {};

        const graph: SMGGraph = {
            id: graphId(packageName, 'android'),
            domain: packageName,
            platform: 'android',
            version: 1,
            crawled_at: new Date().toISOString(),
            coverage_score: Math.min(1, iteration / this.options.maxStates),
            total_states: Object.keys(states).length,
            total_transitions: transitions.length,
            crawl_depth_max: this.options.maxDepth,
            states,
            transitions,
            entry_state_id: entryStateId,
            landmark_ids: landmarkIds,
            district_clusters: districtClusters,
            staleness_score: 0,
            metadata: { package: packageName, device, launch_activity: launchActivity },
        };

        await smgStore.save(graph);
        console.log(`[GHOST/ANDROID] ✅ Complete: ${packageName} — ${graph.total_states} states`);
        return graph;
    }
}
