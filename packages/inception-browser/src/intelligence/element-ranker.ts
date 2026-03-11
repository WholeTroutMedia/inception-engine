/**
 * ElementRanker — Natural language element finding.
 * Uses DOM accessibility tree + optional vision to score elements
 * and return the best CSS selector for a natural language description.
 */

import type { Page } from "playwright";
import type { VisionModel } from "./vision-model.js";
import { DomAnalyzer } from "./dom-analyzer.js";

export interface ElementMatch {
    selector: string;
    ref: string;
    role: string;
    name: string;
    confidence: number;
    method: "exact" | "fuzzy" | "vision";
}

export class ElementRanker {
    private domAnalyzer = new DomAnalyzer();

    constructor(private visionModel: VisionModel) { }

    async find(page: Page, description: string): Promise<ElementMatch | null> {
        const descLower = description.toLowerCase();

        // 1. Try exact text match via Playwright
        const exactMatch = await this.tryExactTextMatch(page, description);
        if (exactMatch) return { ...exactMatch, confidence: 0.95, method: "exact" };

        // 2. Try DOM tree fuzzy match
        const tree = await this.domAnalyzer.analyze(page);
        const fuzzyMatch = this.fuzzyMatch(tree, descLower);
        if (fuzzyMatch && fuzzyMatch.confidence > 0.6) return { ...fuzzyMatch, method: "fuzzy" };

        // 3. Ask vision model to identify the element
        const screenshot = await page.screenshot({ type: "png" });
        const visionPrompt = `On this page, I need to find: "${description}". 
What CSS selector or text would best identify this element? 
Return ONLY a JSON object: {"selector": "...", "text": "...", "description": "..."}`;

        const visionResult = await this.visionModel.analyze(screenshot.toString("base64"), visionPrompt);

        try {
            const match = JSON.parse(visionResult.match(/\{[\s\S]*\}/)?.[0] ?? "{}") as {
                selector?: string;
                text?: string;
            };
            if (match.selector) {
                return {
                    selector: match.selector,
                    ref: "vision-ref",
                    role: "unknown",
                    name: description,
                    confidence: 0.7,
                    method: "vision",
                };
            }
        } catch { /* no match */ }

        return fuzzyMatch ? { ...fuzzyMatch, method: "fuzzy" } : null;
    }

    private async tryExactTextMatch(page: Page, description: string): Promise<Omit<ElementMatch, "confidence" | "method"> | null> {
        try {
            const el = page.getByText(description, { exact: false }).first();
            const count = await el.count();
            if (count > 0) {
                const tag = await el.evaluate(e => e.tagName.toLowerCase()).catch(() => "unknown");
                return { selector: `text=${description}`, ref: "exact", role: tag, name: description };
            }
        } catch { /* no match */ }

        // Try by role keywords
        const roleMap: Record<string, string> = {
            button: "button", submit: "button", link: "a", input: "input",
            checkbox: "checkbox", dropdown: "select", search: "searchbox",
        };
        for (const [keyword, role] of Object.entries(roleMap)) {
            if (description.toLowerCase().includes(keyword)) {
                try {
                    const el = page.getByRole(role as Parameters<Page["getByRole"]>[0]).first();
                    if (await el.count() > 0) {
                        return { selector: `[role="${role}"]`, ref: "role", role, name: description };
                    }
                } catch { /* continue */ }
            }
        }

        return null;
    }

    private fuzzyMatch(
        nodes: import("./dom-analyzer.js").SemanticNode[],
        query: string,
        acc: Array<Omit<ElementMatch, "method"> & { confidence: number }> = []
    ): (Omit<ElementMatch, "method"> & { confidence: number }) | null {
        for (const node of nodes) {
            if (node.name) {
                const nameLower = String(node.name).toLowerCase();
                const score = this.similarity(nameLower, query);
                if (score > 0.3) {
                    acc.push({
                        selector: `[aria-label="${node.name}"]`,
                        ref: node.ref,
                        role: node.role,
                        name: String(node.name),
                        confidence: score,
                    });
                }
            }
            if (node.children) this.fuzzyMatch(node.children, query, acc);
        }
        if (acc.length === 0) return null;
        acc.sort((a, b) => b.confidence - a.confidence);
        return acc[0] ?? null;
    }

    private similarity(a: string, b: string): number {
        if (a === b) return 1;
        if (a.includes(b) || b.includes(a)) return 0.8;
        const aWords = a.split(/\s+/);
        const bWords = b.split(/\s+/);
        const common = aWords.filter(w => bWords.includes(w)).length;
        return common / Math.max(aWords.length, bWords.length);
    }
}
