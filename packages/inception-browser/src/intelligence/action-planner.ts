/**
 * ActionPlanner — Given a goal + PageUnderstanding, calls Gemini to plan
 * a sequence of browser_* MCP tool calls to achieve the goal.
 */

import type { PageUnderstanding } from "./hybrid-perception.js";

export interface ActionStep {
    step: number;
    tool: string;
    args: Record<string, unknown>;
    reasoning: string;
}

const GENKIT_URL = process.env.GENKIT_URL ?? "http://localhost:4100";

export class ActionPlanner {
    async plan(goal: string, pageState: PageUnderstanding): Promise<ActionStep[]> {
        const systemPrompt = `You are an expert browser automation planner for the Creative Liberation Engine.
Given a goal and the current page state (DOM tree + visual description + interactive elements),
produce a precise, ordered sequence of browser tool calls to achieve the goal.

Available tools: browser_navigate, browser_click, browser_type, browser_fill, browser_select,
browser_scroll, browser_wait_for, browser_screenshot, browser_evaluate_js, browser_extract_data,
browser_vision_analyze.

Return ONLY a JSON array of action steps with this shape:
[{"step": 1, "tool": "browser_click", "args": {"selector": "..."}, "reasoning": "..."}]`;

        const userPrompt = `Goal: ${goal}

Current URL: ${pageState.url}
Page title: ${pageState.title}
Visual description: ${pageState.visualDescription}

Interactive elements (first 30):
${pageState.interactiveElements.slice(0, 30).map(e => `  [${e.ref}] ${e.description}`).join("\n")}

Plan the tool calls to achieve the goal.`;

        const planText = await this.callLLM(systemPrompt, userPrompt);

        try {
            // Extract JSON array from response
            const match = planText.match(/\[[\s\S]*\]/);
            if (!match) throw new Error("No JSON array in response");
            return JSON.parse(match[0]) as ActionStep[];
        } catch {
            // Return a single step with the raw plan as context
            return [{
                step: 1,
                tool: "browser_evaluate_js",
                args: { script: "return document.title" },
                reasoning: `Could not parse structured plan. Raw guidance: ${planText.slice(0, 500)}`,
            }];
        }
    }

    private async callLLM(system: string, user: string): Promise<string> {
        // Try Genkit server first
        for (const base of [GENKIT_URL]) {
            try {
                const res = await fetch(`${base}/generate`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ system, prompt: user, model: "gemini-flash" }),
                    signal: AbortSignal.timeout(20000),
                });
                if (res.ok) {
                    const data = await res.json() as { text?: string; response?: string };
                    return data.text ?? data.response ?? "";
                }
            } catch { /* try next */ }
        }

        // Fallback: direct Gemini API
        const apiKey = process.env.GOOGLE_AI_API_KEY ?? process.env.GEMINI_API_KEY;
        if (!apiKey) return "[Planner offline: no Genkit server and no GOOGLE_AI_API_KEY]";

        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    systemInstruction: { parts: [{ text: system }] },
                    contents: [{ parts: [{ text: user }] }],
                }),
                signal: AbortSignal.timeout(20000),
            }
        );
        const data = await res.json() as {
            candidates?: Array<{ content: { parts: Array<{ text?: string }> } }>;
        };
        return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "[No plan generated]";
    }
}
