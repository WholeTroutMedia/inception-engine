/**
 * COMET — Execution Agent
 * Three-stage pipeline: Sketch → Link → Compile
 *
 * SKETCH: Natural language instruction + SMG → IR sketch with @placeholders
 *   "Find the submit button in /checkout → click it"
 *   becomes: navigate_to(@state='checkout'), click(@element='submit_button')
 *
 * LINK: Resolve @placeholders to concrete SMG paths
 *   @state='checkout' → BFS through SMGGraph.transitions → stateId: 'a3f...'
 *   @element='submit_button' → SMGElement.id: 'b7d...'
 *
 * COMPILE: IR + resolved paths → typed MixedActionPlan
 *   Ready for PreflightReviewer + Executor
 */

import { createHash } from 'crypto';
import type { MixedActionPlan, UINode, PlanNode, SMGGraph, SMGState, SMGElement } from './types.js';

const GENKIT_URL = process.env.GENKIT_URL ?? 'http://genkit:4100';

// ─── SketchGenerator ──────────────────────────────────────────────────────────

interface IRStep {
    action: 'navigate_to' | 'click' | 'fill' | 'read' | 'scroll' | 'wait';
    target: string;       // '@placeholder' or concrete label
    input?: string;       // For fill actions
    output_var?: string;  // For read actions
    is_placeholder: boolean;
}

interface IRSketch {
    steps: IRStep[];
    requires_auth: boolean;
    touches_pii: boolean;
    writes_data: boolean;
}

/**
 * SketchGenerator — one LLM call, returns an unresolved IR sketch.
 * Costs O(1) tokens. The sketch uses @placeholders that the Linker resolves
 * against the SMG without additional LLM calls.
 */
export class SketchGenerator {
    async generate(instruction: string, smg: SMGGraph): Promise<IRSketch> {
        // Build compact SMG summary for the prompt
        const topStates = (Object.values(smg.states) as SMGState[])
            .sort((a: SMGState, b: SMGState) => b.inbound_count - a.inbound_count)
            .slice(0, 20)
            .map((s: SMGState) => `  ${s.label} [${s.lynch_type}] — ${s.elements.length} elements — path: ${s.url_pattern}`)
            .join('\n');

        const prompt = `You are a GUI action planner for the COMET agentic browser.

Given the following instruction and site map, produce a minimal list of GUI steps to accomplish it.

INSTRUCTION: ${instruction}

SITE KNOWLEDGE (top states by connectivity):
${topStates}

RULES:
1. Use ONLY these action types: navigate_to, click, fill, read, scroll, wait
2. For each step, use the EXACT label from the site knowledge as the target. If the target matches a known state, wrap it: @state='exact label'
3. If the target is an element (button/input), use: @element='exact element label'
4. If you need to read content (extract data), use action=read with output_var='variable_name'
5. Write data writes (form submissions) as: writes_data: true
6. Be minimal. No unnecessary steps.

Return JSON only. No markdown:
{
  "steps": [
    { "action": "navigate_to", "target": "@state='Reddit front page'", "is_placeholder": true },
    { "action": "click", "target": "@element='Search button'", "is_placeholder": true },
    { "action": "fill", "target": "@element='Search input'", "input": "${'{'}search_query{'}'}", "is_placeholder": true },
    { "action": "read", "target": "@element='First result title'", "output_var": "result_title", "is_placeholder": true }
  ],
  "requires_auth": false,
  "touches_pii": false,
  "writes_data": false
}`;

        try {
            const res = await fetch(`${GENKIT_URL}/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'googleai/gemini-2.0-flash',
                    prompt,
                    output: { format: 'json' },
                }),
                signal: AbortSignal.timeout(30000),
            });

            if (!res.ok) throw new Error(`Genkit ${res.status}`);
            const data = await res.json();
            const sketch: IRSketch = JSON.parse(data.text ?? data.output ?? '{}');

            if (!sketch.steps || !Array.isArray(sketch.steps)) {
                throw new Error('Malformed sketch from Genkit');
            }

            return sketch;
        } catch (err: any) {
            console.warn(`[COMET/SKETCH] Genkit failed, using heuristic sketch: ${err.message}`);
            return this.fallbackSketch(instruction);
        }
    }

    /** Fallback: simple heuristic sketch when Genkit is unavailable */
    private fallbackSketch(instruction: string): IRSketch {
        const steps: IRStep[] = [
            { action: 'navigate_to', target: '@state=root', is_placeholder: true },
            { action: 'read', target: '@element=main content', output_var: 'content', is_placeholder: true },
        ];
        return { steps, requires_auth: false, touches_pii: false, writes_data: false };
    }
}

// ─── StaticLinker ─────────────────────────────────────────────────────────────

interface ResolvedStep {
    action: IRStep['action'];
    state: SMGState | null;
    element: SMGElement | null;
    input?: string;
    output_var?: string;
    label: string;
}

/**
 * StaticLinker — resolves @placeholder references to concrete SMG objects.
 * Zero LLM calls. Pure graph search.
 */
export class StaticLinker {
    resolve(sketch: IRSketch, smg: SMGGraph): ResolvedStep[] {
        const resolved: ResolvedStep[] = [];

        for (const step of sketch.steps) {
            if (!step.is_placeholder) {
                resolved.push({ action: step.action, state: null, element: null, input: step.input, output_var: step.output_var, label: step.target });
                continue;
            }

            const stateMatch = step.target.match(/@state='([^']+)'/);
            const elemMatch = step.target.match(/@element='([^']+)'/);

            if (stateMatch) {
                const targetLabel = stateMatch[1];
                const state = this.findState(smg, targetLabel);
                resolved.push({ action: step.action, state, element: null, input: step.input, output_var: step.output_var, label: targetLabel });
            } else if (elemMatch) {
                const targetLabel = elemMatch[1];
                const { state, element } = this.findElement(smg, targetLabel);
                resolved.push({ action: step.action, state, element, input: step.input, output_var: step.output_var, label: targetLabel });
            } else {
                resolved.push({ action: step.action, state: null, element: null, input: step.input, output_var: step.output_var, label: step.target });
            }
        }

        return resolved;
    }

    private findState(smg: SMGGraph, label: string): SMGState | null {
        const states = Object.values(smg.states) as SMGState[];
        // Exact match first
        const exact = states.find((s: SMGState) => s.label.toLowerCase() === label.toLowerCase());
        if (exact) return exact;
        // Fuzzy: contains
        const fuzzy = states.find((s: SMGState) =>
            s.label.toLowerCase().includes(label.toLowerCase()) ||
            label.toLowerCase().includes(s.label.toLowerCase().split(' ')[0])
        );
        return fuzzy ?? null;
    }

    private findElement(smg: SMGGraph, label: string): { state: SMGState | null; element: SMGElement | null } {
        for (const state of Object.values(smg.states) as SMGState[]) {
            const elem = state.elements.find((e: SMGElement) =>
                e.label.toLowerCase().includes(label.toLowerCase()) ||
                label.toLowerCase().includes(e.label.toLowerCase().replace(/\s+/g, '').slice(0, 10))
            );
            if (elem) return { state, element: elem };
        }
        return { state: null, element: null };
    }
}

// ─── PlanCompiler ─────────────────────────────────────────────────────────────

/**
 * PlanCompiler — converts resolved steps into a validated MixedActionPlan.
 * This is the final output before governance review and execution.
 */
export class PlanCompiler {
    compile(instruction: string, domain: string, resolved: ResolvedStep[], sketch: IRSketch, smgVersion?: number): MixedActionPlan {
        const planId = createHash('sha1').update(instruction + domain + Date.now()).digest('hex').slice(0, 16);
        const nodes: PlanNode[] = [];
        const executionOrder: string[] = [];
        const stepsRequiringConfirmation: string[] = [];

        for (let i = 0; i < resolved.length; i++) {
            const step = resolved[i];
            const nodeId = `node_${i.toString().padStart(3, '0')}`;

            // Determine selector
            let selector = '';
            if (step.element) {
                selector = step.element.selector;
            } else if (step.state) {
                selector = step.state.url_example;
            } else {
                selector = step.label;
            }

            const writesData = step.action === 'fill' || step.action === 'navigate_to';
            const readsPii = selector?.toLowerCase().includes('password') ||
                step.label?.toLowerCase().includes('private') ||
                step.label?.toLowerCase().includes('personal');

            const requiresConfirmation = writesData && (sketch.writes_data || readsPii);
            if (requiresConfirmation) stepsRequiringConfirmation.push(nodeId);

            const uiNode: UINode = {
                type: 'ui',
                node_id: nodeId,
                description: `${step.action} — ${step.label}`,
                selector,
                action: step.action === 'navigate_to' ? 'navigate' : step.action as UINode['action'],
                input: step.input,
                output_var: step.output_var,
                state_id: step.state?.id,
                element_id: step.element?.id,
                timeout_ms: 15000,
                retry_count: 2,
                reads_pii: readsPii,
                writes_data: writesData,
                requires_confirmation: requiresConfirmation,
            };

            nodes.push(uiNode);
            executionOrder.push(nodeId);
        }

        return {
            id: planId,
            created_at: new Date().toISOString(),
            instruction,
            domain,
            platform: 'web',
            smg_version: smgVersion,
            nodes,
            execution_order: executionOrder,
            estimated_reads_pii: sketch.touches_pii,
            estimated_writes_data: sketch.writes_data,
            steps_requiring_confirmation: stepsRequiringConfirmation,
        };
    }
}

// ─── ExecutionAgent (Orchestrator) ────────────────────────────────────────────

/**
 * Orchestrates the full Sketch → Link → Compile pipeline.
 * Returns a compiled MixedActionPlan ready for governance review + execution.
 */
export class ExecutionAgent {
    private sketch = new SketchGenerator();
    private linker = new StaticLinker();
    private compiler = new PlanCompiler();

    async synthesize(instruction: string, smg: SMGGraph): Promise<MixedActionPlan> {
        console.log(`[COMET/AGENT] Synthesizing plan for: "${instruction.slice(0, 60)}..."`);

        // 1. Sketch — one LLM call
        const ir = await this.sketch.generate(instruction, smg);
        console.log(`[COMET/AGENT] IR sketch: ${ir.steps.length} steps`);

        // 2. Link — zero LLM calls
        const resolved = this.linker.resolve(ir, smg);
        const resolved_count = resolved.filter(r => r.state || r.element).length;
        console.log(`[COMET/AGENT] Linked: ${resolved_count}/${resolved.length} steps resolved to SMG objects`);

        // 3. Compile — zero LLM calls
        const plan = this.compiler.compile(instruction, smg.domain, resolved, ir, smg.version);
        console.log(`[COMET/AGENT] Plan compiled: ${plan.nodes.length} nodes`);

        return plan;
    }
}
