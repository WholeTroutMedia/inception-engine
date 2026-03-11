/**
 * @module orchestrator/schemas
 * @description Shared Zod schemas for the orchestrator pipeline
 */
import { z } from 'zod';

export const RouteContextSchema = z.object({
  taskId: z.string().uuid(),
  taskType: z.string(),
  agentId: z.string(),
  payload: z.record(z.unknown()),
  capabilities: z.instanceof(Map).optional(),
  metadata: z.record(z.unknown()).default({}),
  timestamp: z.union([z.string(), z.number()]),
  governanceApproved: z.boolean().default(false),
  dispatched: z.boolean().default(false),
  memoryLogged: z.boolean().default(false),
  blocked: z.boolean().default(false),
  result: z.record(z.unknown()).optional(),
  errors: z.array(z.string()).default([]),
  status: z.string().optional(),
});
export type RouteContext = z.infer<typeof RouteContextSchema>;

export const PipelineConfigSchema = z.object({
  name: z.string(),
  maxRetries: z.number().int().min(0).default(3),
  timeoutMs: z.number().positive().default(30_000),
  enableGovernance: z.boolean().default(true),
  enableMemoryLogging: z.boolean().default(true),
  enableMetrics: z.boolean().default(true),
});
export type PipelineConfig = z.infer<typeof PipelineConfigSchema>;

export interface PipelineMetrics {
  totalRouted: number;
  totalBlocked: number;
  totalErrors: number;
  avgDurationMs: number;
  durations: number[];
}

export const HelixDescriptorSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  priority: z.enum(['P0', 'P1', 'P2', 'P3']).default('P2'),
  dependsOn: z.array(z.string()).default([]),
  tasks: z.array(z.object({
    id: z.string(),
    action: z.string(),
    agent: z.string()
  })),
  active: z.boolean().default(true)
});
export type HelixDescriptor = z.infer<typeof HelixDescriptorSchema>;
