/**
 * @inception/cowork-bridge
 *
 * Barrel export for the cowork-bridge package.
 * Provides Claude Cowork integration layer for Creative Liberation Engine.
 */

export { ModelRouter, createModelRouter } from './model-router.js';
export { ContextGenerator, createContextGenerator } from './context-generator.js';
export type { ModelRouterConfig, ModelBackend, ModelProvider } from './types.js';
export * from './mcp-wrapper.js';
export type { AgentContext, ContextGeneratorConfig } from './context-generator.js';