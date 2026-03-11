/**
 * @module helix/schema
 * @description First-class schema definitions for Multi-Helix runtime orchestration
 */
import { z } from 'zod';

export const HelixTaskStatusSchema = z.enum([
  'PENDING',
  'RUNNING',
  'COMPLETED',
  'FAILED',
  'BLOCKED'
]);

export type HelixTaskStatus = z.infer<typeof HelixTaskStatusSchema>;

/**
 * Defines a single task unit within a Helix.
 */
export const HelixTaskSchema = z.object({
  id: z.string().describe('Unique identifier for this task within the Helix (e.g. T-101)'),
  description: z.string().describe('Human or agent readable instruction for this task'),
  status: HelixTaskStatusSchema.default('PENDING'),
  dependsOn: z.array(z.string()).optional().describe('List of Task IDs that must complete before this starts'),
  assignedAgent: z.string().optional().describe('Specific agent card or class targeted for execution'),
  autoRun: z.boolean().default(false).describe('If true, the orchestrator will auto-spawn an agent to fulfill it without user gate'),
  metadata: z.record(z.string(), z.unknown()).optional().describe('Arbitrary payload for tooling and contextual transfer')
});

export type HelixTask = z.infer<typeof HelixTaskSchema>;

/**
 * Defines a unified workstream (a 'Helix') representing an independent vector of execution.
 */
export const HelixDescriptorSchema = z.object({
  id: z.string().uuid().describe('Universal Identifier for this Helix'),
  name: z.string().describe('Human readable name for this workstream (e.g. iPhone Sensor Node)'),
  wave: z.number().int().describe('The architectural Wave this Helix belongs to'),
  description: z.string().describe('Summary of the objective of this orchestrator thread'),
  tasks: z.array(HelixTaskSchema).describe('The topologically sortable checklist of tasks'),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export type HelixDescriptor = z.infer<typeof HelixDescriptorSchema>;

/**
 * A Multi-Helix cluster definition, used by the Orchestrator to dispatch massively parallel waves.
 */
export const HelixClusterSchema = z.object({
  id: z.string().uuid(),
  wave: z.number().int(),
  helices: z.array(HelixDescriptorSchema),
  globalDependencies: z.record(z.string(), z.array(z.string())).optional().describe('Map of Helix ID to an array of other Helix IDs it depends on')
});

export type HelixCluster = z.infer<typeof HelixClusterSchema>;
