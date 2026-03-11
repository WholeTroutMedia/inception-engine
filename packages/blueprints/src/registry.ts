/**
 * BlueprintRegistry — W3 Inception Blueprints
 *
 * Central registry of all available Blueprint verticals.
 * Add new blueprints here to make them discoverable via the API.
 */

import type { Blueprint } from './types.js';
import { financeBlueprint } from './verticals/finance.js';
import { healthcareBlueprint } from './verticals/healthcare.js';
import { mediaBlueprint } from './verticals/media.js';

const ALL_BLUEPRINTS: Blueprint[] = [
    financeBlueprint,
    healthcareBlueprint,
    mediaBlueprint,
];

export class BlueprintRegistry {
    private blueprints = new Map<string, Blueprint>();

    constructor(blueprints: Blueprint[] = ALL_BLUEPRINTS) {
        for (const bp of blueprints) {
            this.blueprints.set(bp.id, bp);
        }
    }

    getAll(): Blueprint[] {
        return Array.from(this.blueprints.values());
    }

    getById(id: string): Blueprint | undefined {
        return this.blueprints.get(id);
    }

    getByVertical(vertical: Blueprint['vertical']): Blueprint[] {
        return this.getAll().filter(bp => bp.vertical === vertical);
    }

    exists(id: string): boolean {
        return this.blueprints.has(id);
    }

    register(blueprint: Blueprint): void {
        this.blueprints.set(blueprint.id, blueprint);
    }
}

// Singleton — shared across the service
export const blueprintRegistry = new BlueprintRegistry();
