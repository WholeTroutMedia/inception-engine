/**
 * @inception/blueprints — Public Entry Point
 *
 * Creative Liberation Engine v5.0.0 (GENESIS)
 * Vertical Blueprint definitions for Finance, Healthcare, and Media industries.
 * Each Blueprint is a complete, portable agent configuration following the
 * NVIDIA Nemotron pattern: Domain LTM + reasoning traces + simulation validation.
 *
 * Constitutional: Article IX — No MVPs. Ship complete blueprints.
 */

// ── Core Types ────────────────────────────────────────────────────────────────
export type {
    Blueprint,
    BlueprintRunInput,
    BlueprintTraceOutput,
    BlueprintRunResult,
    ReasoningTrace,
    SimulationStep,
} from './types.js';

export {
    BlueprintSchema,
    BlueprintRunInputSchema,
    ReasoningTraceSchema,
    SimulationStepSchema,
    BlueprintDomainModelSchema,
} from './types.js';

// ── Vertical Definitions ──────────────────────────────────────────────────────
export { financeBlueprint } from './verticals/finance.js';
export { healthcareBlueprint } from './verticals/healthcare.js';
export { mediaBlueprint } from './verticals/media.js';

// ── Blueprint Registry ────────────────────────────────────────────────────────
import { financeBlueprint } from './verticals/finance.js';
import { healthcareBlueprint } from './verticals/healthcare.js';
import { mediaBlueprint } from './verticals/media.js';
import type { Blueprint } from './types.js';

/**
 * The canonical registry of all Creative Liberation Engine vertical blueprints.
 * Add new blueprints here to make them available to the runtime server.
 */
export const BLUEPRINT_REGISTRY: Blueprint[] = [
    financeBlueprint,
    healthcareBlueprint,
    mediaBlueprint,
];

/**
 * Retrieve a blueprint by its ID.
 */
export function getBlueprintById(id: string): Blueprint | undefined {
    return BLUEPRINT_REGISTRY.find((b) => b.id === id);
}

/**
 * Retrieve all blueprints for a specific vertical.
 */
export function getBlueprintsByVertical(
    vertical: Blueprint['vertical'],
): Blueprint[] {
    return BLUEPRINT_REGISTRY.filter((b) => b.vertical === vertical);
}
