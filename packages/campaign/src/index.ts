/**
 * @inception/campaign — Barrel Export
 *
 * Brand campaign orchestration engine for the Creative Liberation Engine.
 * Handles intake → brief validation → creative DAG execution pipeline.
 */

// Event subscriber
export { BriefSubscriber } from './events/brief-subscriber.js';
export type { BriefCreatedEvent } from './events/brief-subscriber.js';

// Schema types
export type {
    CreativeBrief,
    Timeline,
    Deliverable,
    DeliverableType,
    BrandParameters,
    AudienceDefinition,
    ProjectType,
} from './brief/schema.js';

// DAG executor
export {
    executeCampaignDAG,
} from './dag/executor.js';
export type {
    CreativeVision,
    AssetJob,
    AssetResult,
    DAGExecutionResult,
} from './dag/executor.js';

// Compass validator
export { runCompassValidation } from './compass/validator.js';
