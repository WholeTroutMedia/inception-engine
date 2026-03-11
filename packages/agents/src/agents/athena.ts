/**
 * @inception/agents — ATHENA Agent Stub
 *
 * ATHENA — Strategic Intelligence. Planning. Research. Cross-agent synthesis.
 * Member of the AVERI Trinity.
 */

import type { AgentDefinition } from '../types.js';

export const ATHENA: AgentDefinition = {
    id: 'ATHENA',
    name: 'ATHENA',
    description: 'Strategic intelligence — planning, research, synthesis, cross-agent coordination',
    hive: 'AVERI',
    modes: ['IDEATE', 'PLAN', 'VALIDATE'],
    constitutionalAccess: true,
};
