/**
 * @module console/registry/components
 * @description Dynamic registry for tracking ingested and locally-authored components
 */
import { z } from 'zod';

export const ComponentSourceSchema = z.enum([
  'LOCAL',
  'FRAMER_INGEST',
  'MOBBIN_PATTERN',
  'VISION_RECONSTRUCT'
]);

export const ComponentMetadataSchema = z.object({
  id: z.string().describe('Unique registry identifier e.g., framer-hero-banner'),
  name: z.string(),
  source: ComponentSourceSchema,
  originalUrl: z.string().url().optional(),
  dependencies: z.array(z.string()).default([]).describe('List of other registry components required'),
  tags: z.array(z.string()).default([])
});

export type ComponentMetadata = z.infer<typeof ComponentMetadataSchema>;

/**
 * The Component Registry serves as the unified index for the Console UI.
 * When the Design Ingest pipeline extracts a new pattern, it is cataloged here.
 */
export class ComponentRegistry {
    private static instance: ComponentRegistry;
    private components = new Map<string, ComponentMetadata>();

    private constructor() {}

    static getInstance(): ComponentRegistry {
        if (!ComponentRegistry.instance) {
            ComponentRegistry.instance = new ComponentRegistry();
        }
        return ComponentRegistry.instance;
    }

    register(metadata: ComponentMetadata) {
        this.components.set(metadata.id, metadata);
    }

    get(id: string): ComponentMetadata | undefined {
        return this.components.get(id);
    }

    listAll(): ComponentMetadata[] {
        return Array.from(this.components.values());
    }

    listBySource(source: z.infer<typeof ComponentSourceSchema>): ComponentMetadata[] {
        return this.listAll().filter(c => c.source === source);
    }
}

export const registry = ComponentRegistry.getInstance();
