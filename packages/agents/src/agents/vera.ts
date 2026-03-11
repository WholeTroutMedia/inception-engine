/**
 * @inception/agents — VERA Agent Stub
 *
 * VERA — Truth Engine. Fact checking. Constitutional compliance. Guardrail enforcement.
 * Member of the AVERI Trinity.
 */

import type { AgentDefinition } from '../types.js';

export const VERA: AgentDefinition = {
    id: 'VERA',
    name: 'VERA',
    description: 'Truth engine — fact checking, constitutional compliance, guardrail enforcement',
    hive: 'AVERI',
    modes: ['PLAN', 'VALIDATE'],
    constitutionalAccess: true,
};
