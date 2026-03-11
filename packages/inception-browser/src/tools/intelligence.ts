/**
 * Intelligence Tools — vision analysis, hybrid perception, action planning,
 * element finding, pattern learning.
 * Routes to intelligence/ modules.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { BrowserEngine } from "../browser/engine.js";
import { z } from "zod";
import { DomAnalyzer } from "../intelligence/dom-analyzer.js";
import { VisionModel } from "../intelligence/vision-model.js";
import { HybridPerception } from "../intelligence/hybrid-perception.js";
import { ActionPlanner } from "../intelligence/action-planner.js";
import { ElementRanker } from "../intelligence/element-ranker.js";

export const intelligenceTools: Tool[] = [
    {
        name: "browser_vision_analyze",
        description:
            "Take a screenshot and send it to Gemini Flash for visual analysis. Returns natural language description of what's on screen.",
        inputSchema: {
            type: "object",
            properties: {
                prompt: { type: "string", description: "Analysis prompt (default: 'What is on this page?')" },
                selector: { type: "string", description: "Capture only this element" },
            },
        },
    },
    {
        name: "browser_hybrid_perceive",
        description:
            "DOM + Vision fusion in a single call — understands layout, visual hierarchy, and semantic meaning simultaneously. Most powerful perception tool.",
        inputSchema: {
            type: "object",
            properties: {
                goal: { type: "string", description: "Current task goal to focus perception on" },
            },
        },
    },
    {
        name: "browser_plan_actions",
        description:
            "Given a goal and current page state, returns a step-by-step action plan as MCP tool calls.",
        inputSchema: {
            type: "object",
            properties: {
                goal: { type: "string", description: "What you want to achieve on this page" },
            },
            required: ["goal"],
        },
    },
    {
        name: "browser_find_element",
        description:
            "Find an element using natural language description ('the blue submit button', 'price of first item', 'email input field').",
        inputSchema: {
            type: "object",
            properties: {
                description: { type: "string", description: "Natural language description of the element" },
            },
            required: ["description"],
        },
    },
    {
        name: "browser_learn_pattern",
        description:
            "Record the current page interaction as a replayable named pattern for future sessions.",
        inputSchema: {
            type: "object",
            properties: {
                name: { type: "string", description: "Pattern name (e.g., 'github_login', 'stripe_checkout')" },
                steps: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            tool: { type: "string" },
                            args: { type: "object" },
                        },
                    },
                    description: "Ordered list of tool calls that form the pattern",
                },
            },
            required: ["name", "steps"],
        },
    },
];

export async function handleIntelligenceTool(
    name: string,
    args: Record<string, unknown>,
    engine: BrowserEngine
) {
    const page = await engine.getPage();

    switch (name) {
        case "browser_vision_analyze": {
            const { prompt, selector } = z.object({
                prompt: z.string().optional().default("What is on this page? Describe the layout, content, and interactive elements."),
                selector: z.string().optional(),
            }).parse(args);

            let buffer: Buffer<ArrayBufferLike>;
            if (selector) {
                buffer = await page.locator(selector).screenshot({ type: "png" });
            } else {
                buffer = await page.screenshot({ type: "png" });
            }
            const base64 = buffer.toString("base64");
            const vision = new VisionModel();
            const analysis = await vision.analyze(base64, prompt);
            return { content: [{ type: "text" as const, text: analysis }] };
        }

        case "browser_hybrid_perceive": {
            const { goal } = z.object({ goal: z.string().optional() }).parse(args);
            const perception = new HybridPerception(new DomAnalyzer(), new VisionModel());
            const result = await perception.perceive(page, goal);
            return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
        }

        case "browser_plan_actions": {
            const { goal } = z.object({ goal: z.string() }).parse(args);
            const perception = new HybridPerception(new DomAnalyzer(), new VisionModel());
            const pageState = await perception.perceive(page, goal);
            const planner = new ActionPlanner();
            const plan = await planner.plan(goal, pageState);
            return { content: [{ type: "text" as const, text: JSON.stringify(plan, null, 2) }] };
        }

        case "browser_find_element": {
            const { description } = z.object({ description: z.string() }).parse(args);
            const ranker = new ElementRanker(new VisionModel());
            const result = await ranker.find(page, description);
            return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
        }

        case "browser_learn_pattern": {
            const { name: patternName, steps } = z.object({
                name: z.string(),
                steps: z.array(z.object({ tool: z.string(), args: z.record(z.unknown()) })),
            }).parse(args);

            const { PatternLearner } = await import("../memory/pattern-learner.js");
            const learner = new PatternLearner();
            await learner.savePattern(patternName, steps);
            return { content: [{ type: "text" as const, text: `Pattern "${patternName}" saved with ${steps.length} steps.` }] };
        }

        default:
            throw new Error(`Unknown intelligence tool: ${name}`);
    }
}
