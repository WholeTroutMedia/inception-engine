/**
 * HybridPerception — DOM + Vision fusion.
 * Runs DomAnalyzer and VisionModel in parallel and merges into a unified
 * PageUnderstanding object that represents how a human sees the page.
 */

import type { Page } from "playwright";
import type { DomAnalyzer, SemanticNode } from "./dom-analyzer.js";
import type { VisionModel } from "./vision-model.js";

export interface PageUnderstanding {
    url: string;
    title: string;
    domTree: SemanticNode[];
    visualDescription: string;
    interactiveElements: InteractiveElement[];
    goal?: string;
}

export interface InteractiveElement {
    ref: string;
    role: string;
    name: string;
    description: string;
}

export class HybridPerception {
    constructor(
        private domAnalyzer: DomAnalyzer,
        private visionModel: VisionModel
    ) { }

    async perceive(page: Page, goal?: string): Promise<PageUnderstanding> {
        const [domTree, screenshot, url, title] = await Promise.all([
            this.domAnalyzer.analyze(page),
            page.screenshot({ type: "png" }),
            Promise.resolve(page.url()),
            page.title(),
        ]);

        const visionPrompt = goal
            ? `The user's goal is: "${goal}". Describe what's on this page and what elements are relevant to achieving this goal.`
            : "Describe this page's layout, main content, and all interactive elements visible.";

        const visualDescription = await this.visionModel.analyze(
            screenshot.toString("base64"),
            visionPrompt
        );

        // Extract interactive elements from domTree
        const interactiveElements = this.collectInteractive(domTree);

        return {
            url,
            title,
            domTree,
            visualDescription,
            interactiveElements,
            goal,
        };
    }

    private collectInteractive(nodes: SemanticNode[], acc: InteractiveElement[] = []): InteractiveElement[] {
        for (const node of nodes) {
            if (node.interactive && node.name) {
                acc.push({
                    ref: node.ref,
                    role: node.role,
                    name: String(node.name),
                    description: `${node.role}: "${node.name}"${node.value !== undefined ? ` (value: ${String(node.value)})` : ""}`,
                });
            }
            if (node.children) this.collectInteractive(node.children, acc);
        }
        return acc.slice(0, 100); // Cap at 100 interactive elements
    }
}
