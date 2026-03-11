/**
 * DOM Analyzer — prunes Playwright accessibility tree from ~50K raw nodes
 * to ~500 semantically meaningful, actionable nodes.
 * Assigns stable ref IDs for element targeting.
 */

import type { Page } from "playwright";

export interface SemanticNode {
    ref: string;
    role: string;
    name?: string;
    value?: string | number | boolean;
    children?: SemanticNode[];
    interactive?: boolean;
}

// Roles that are useful for agents
const INTERACTIVE_ROLES = new Set([
    "button", "link", "textbox", "searchbox", "checkbox", "radio",
    "combobox", "listbox", "menuitem", "tab", "option", "slider",
    "switch", "spinbutton",
]);

const STRUCTURAL_ROLES = new Set([
    "heading", "main", "navigation", "banner", "contentinfo",
    "article", "section", "form", "dialog", "alert", "status",
    "list", "listitem", "table", "row", "cell", "columnheader",
    "rowheader", "grid",
]);

const SKIP_ROLES = new Set([
    "none", "presentation", "generic", "LineBreak",
]);

let refCounter = 0;

export class DomAnalyzer {
    /** Build a pruned semantic tree from the page's DOM. */
    async analyze(page: Page): Promise<SemanticNode[]> {
        refCounter = 0;
        const nodes = await page.evaluate(() => {
            function getRoleAndName(el: Element): { role: string; name?: string } {
                const role = el.getAttribute('role') ?? el.tagName.toLowerCase();
                const name = el.getAttribute('aria-label') ??
                    el.getAttribute('title') ??
                    (el as HTMLElement).innerText?.trim().slice(0, 80) ?? undefined;
                return { role, name: name || undefined };
            }
            function traverse(el: Element, depth: number): object | null {
                if (depth > 8) return null;
                const tag = el.tagName.toLowerCase();
                const skip = ['script', 'style', 'noscript', 'meta', 'head'];
                if (skip.includes(tag)) return null;
                const { role, name } = getRoleAndName(el);
                const children: object[] = [];
                for (const child of Array.from(el.children)) {
                    const c = traverse(child, depth + 1);
                    if (c) children.push(c);
                }
                if (!name && children.length === 0 && !['main', 'nav', 'form', 'header', 'footer', 'article', 'section'].includes(tag)) return null;
                return { role, name, children: children.length > 0 ? children : undefined };
            }
            return traverse(document.body, 0);
        });
        if (!nodes) return [];
        const pruned = this.pruneNode(nodes as any, 0);
        return pruned ? [pruned] : [];
    }

    private pruneNode(
        node: { role?: string; name?: string; value?: string | number | boolean; children?: unknown[] },
        depth: number
    ): SemanticNode | null {
        if (depth > 12) return null;
        const role = node.role ?? "generic";

        // Skip noisy roles
        if (SKIP_ROLES.has(role)) return null;

        const isInteractive = INTERACTIVE_ROLES.has(role);
        const isStructural = STRUCTURAL_ROLES.has(role);

        // Skip non-meaningful nodes with no name and no children
        if (!isInteractive && !isStructural && !node.name && !node.children?.length) return null;

        const ref = `r${++refCounter}`;
        const result: SemanticNode = { ref, role, interactive: isInteractive };
        if (node.name) result.name = node.name;
        if (node.value !== undefined) result.value = node.value;

        if (node.children?.length) {
            const children = (node.children as typeof node[])
                .map(child => this.pruneNode(child, depth + 1))
                .filter(Boolean) as SemanticNode[];
            // Cap interactive children to 50 per node to prevent explosion
            if (children.length > 0) result.children = children.slice(0, 50);
        }

        return result;
    }
}
