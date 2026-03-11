/**
 * @module skills
 * Barrel exports for agent skills library
 */
export { SkillCompiler, type SkillPack, type SkillMetadata, type ToolDefinition, type PromptDefinition, type ResourceDefinition } from './skill-compiler';
export { SkillRegistry, type RegistryEntry, type VersionRecord, type DependencyRef, type RegistryConfig } from './skill-registry';
export { SkillLoader, type LoaderConfig, type LoadedSkill } from './skill-loader';
export { CoworkExporter, type CoworkSkill, type ExportConfig } from './cowork-exporter';