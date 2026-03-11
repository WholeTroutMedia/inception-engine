/**
 * AgentIdentity — W4 Agent Identity & Auth (RBAC)
 *
 * Defines the identity model for all 40 Creative Liberation Engine agents.
 * Each agent has a typed identity with scoped capabilities — similar to OAuth scopes
 * but applied at the AGENT level, not the user level.
 *
 * This is the governance gap no conference sponsor has solved.
 */

import { z } from 'zod';

// ─── Agent Capability Scopes ─────────────────────────────────────────────────

export const AGENT_CAPABILITIES = [
    'read:memory',           // Read from ChromaDB + MEMORY.md
    'write:memory',          // Write to ChromaDB + MEMORY.md
    'read:files',            // Read files from repo
    'write:files',           // Write/modify files in repo
    'execute:genkit',        // Invoke Genkit flows
    'call:external-apis',    // Make outbound API calls (Perplexity, Kling, etc.)
    'read:constitution',     // Read constitutional articles
    'modify:constitution',   // Add/modify constitutional articles (ATHENA + LEX only)
    'deploy:production',     // Trigger CI/CD or Cloud Run deployments (FORGE + IRIS only)
    'manage:agents',         // Create/modify agent configurations (ATHENA only)
    'approve:financial',     // Approve financial transactions (ATHENA + COMPASS only)
    'clinical:access',       // Access clinical decision support flows (HIPAA-scoped)
] as const;

export type AgentCapability = typeof AGENT_CAPABILITIES[number];

// ─── Agent Tier ───────────────────────────────────────────────────────────────

export type AgentTier =
    | 'system'      // AVERI Trinity — unrestricted within constitutional bounds
    | 'operator'    // Hive leads and validators — broad capability set
    | 'builder'     // Standard build agents — file access, genkit execution
    | 'restricted'; // External/client-facing agents — read-only memory, no deploys

// ─── Agent Identity Schema ────────────────────────────────────────────────────

export const AgentIdentitySchema = z.object({
    agentId: z.string().describe('Agent name from the catalog, e.g. VERA, BOLT'),
    agentType: z.enum(['leadership', 'hive', 'validator', 'lora', 'service']),
    tier: z.enum(['system', 'operator', 'builder', 'restricted']),
    hive: z.string().optional().describe('Which hive this agent belongs to'),
    capabilities: z.array(z.enum(AGENT_CAPABILITIES as unknown as [AgentCapability, ...AgentCapability[]])),
    restrictions: z.array(z.string()).default([]).describe('Explicit denials override capabilities'),
    sessionToken: z.string().optional().describe('Active JWT — set on activation'),
    lastActivated: z.string().optional(),
});

export type AgentIdentity = z.infer<typeof AgentIdentitySchema>;

// ─── Agent Roster ─────────────────────────────────────────────────────────────
// The canonical 40-agent roster with capability assignments

export const AGENT_ROSTER: AgentIdentity[] = [
    // ── AVERI Trinity (system tier) ──────────────────────────────────────────
    {
        agentId: 'ATHENA',
        agentType: 'leadership',
        tier: 'system',
        hive: 'AVERI',
        capabilities: [
            'read:memory', 'write:memory', 'read:files', 'write:files',
            'execute:genkit', 'call:external-apis', 'read:constitution',
            'modify:constitution', 'deploy:production', 'manage:agents', 'approve:financial',
        ],
        restrictions: [],
    },
    {
        agentId: 'VERA',
        agentType: 'leadership',
        tier: 'system',
        hive: 'AVERI',
        capabilities: [
            'read:memory', 'write:memory', 'read:files',
            'execute:genkit', 'read:constitution',
        ],
        restrictions: ['modify:constitution', 'deploy:production'],
    },
    {
        agentId: 'IRIS',
        agentType: 'leadership',
        tier: 'system',
        hive: 'AVERI',
        capabilities: [
            'read:memory', 'write:memory', 'read:files', 'write:files',
            'execute:genkit', 'call:external-apis', 'read:constitution', 'deploy:production',
        ],
        restrictions: ['modify:constitution', 'manage:agents'],
    },

    // ── AURORA Hive (operator tier) ──────────────────────────────────────────
    {
        agentId: 'AURORA',
        agentType: 'hive',
        tier: 'operator',
        hive: 'AURORA',
        capabilities: [
            'read:memory', 'write:memory', 'read:files', 'write:files',
            'execute:genkit', 'call:external-apis', 'read:constitution',
        ],
        restrictions: ['deploy:production', 'modify:constitution'],
    },
    {
        agentId: 'BOLT',
        agentType: 'hive',
        tier: 'builder',
        hive: 'AURORA',
        capabilities: ['read:memory', 'write:memory', 'read:files', 'write:files', 'execute:genkit'],
        restrictions: [],
    },
    {
        agentId: 'COMMERCE',
        agentType: 'hive',
        tier: 'builder',
        hive: 'AURORA',
        capabilities: ['read:memory', 'read:files', 'execute:genkit', 'call:external-apis'],
        restrictions: ['write:files'],
    },

    // ── KEEPER Hive (operator tier) ──────────────────────────────────────────
    {
        agentId: 'KEEPER',
        agentType: 'hive',
        tier: 'operator',
        hive: 'KEEPER',
        capabilities: ['read:memory', 'write:memory', 'read:files', 'write:files', 'read:constitution'],
        restrictions: ['deploy:production'],
    },
    {
        agentId: 'ARCH',
        agentType: 'hive',
        tier: 'builder',
        hive: 'KEEPER',
        capabilities: ['read:memory', 'write:memory', 'read:files'],
        restrictions: [],
    },
    {
        agentId: 'CODEX',
        agentType: 'hive',
        tier: 'builder',
        hive: 'KEEPER',
        capabilities: ['read:memory', 'write:memory', 'read:files', 'write:files'],
        restrictions: [],
    },

    // ── LEX + COMPASS (validator tier — full read, restricted write) ─────────
    {
        agentId: 'LEX',
        agentType: 'validator',
        tier: 'operator',
        hive: 'LEX',
        capabilities: [
            'read:memory', 'write:memory', 'read:files',
            'read:constitution', 'modify:constitution',
        ],
        restrictions: ['deploy:production', 'write:files'],
    },
    {
        agentId: 'COMPASS',
        agentType: 'validator',
        tier: 'operator',
        hive: 'LEX',
        capabilities: ['read:memory', 'read:files', 'read:constitution', 'approve:financial'],
        restrictions: ['write:files', 'deploy:production'],
    },
    {
        agentId: 'SENTINEL',
        agentType: 'validator',
        tier: 'operator',
        hive: 'LEX',
        capabilities: ['read:memory', 'read:files', 'read:constitution'],
        restrictions: ['write:files', 'write:memory'],
    },

    // ── FORGE + v5 Agents (infra tier) ──────────────────────────────────────
    {
        agentId: 'FORGE',
        agentType: 'hive',
        tier: 'operator',
        hive: 'SWITCHBOARD',
        capabilities: [
            'read:memory', 'read:files', 'write:files',
            'deploy:production', 'read:constitution',
        ],
        restrictions: ['modify:constitution', 'approve:financial'],
    },
    {
        agentId: 'BEACON',
        agentType: 'hive',
        tier: 'builder',
        hive: 'SWITCHBOARD',
        capabilities: ['read:memory', 'call:external-apis'],
        restrictions: [],
    },
    {
        agentId: 'PRISM',
        agentType: 'hive',
        tier: 'builder',
        hive: 'SWITCHBOARD',
        capabilities: ['read:memory', 'write:memory', 'call:external-apis'],
        restrictions: [],
    },
    {
        agentId: 'FLUX',
        agentType: 'hive',
        tier: 'builder',
        hive: 'SWITCHBOARD',
        capabilities: ['read:memory', 'write:memory', 'call:external-apis', 'execute:genkit'],
        restrictions: [],
    },

    // ── ATLAS Broadcast Hive ─────────────────────────────────────────────────
    {
        agentId: 'ATLAS',
        agentType: 'hive',
        tier: 'operator',
        hive: 'BROADCAST',
        capabilities: ['read:memory', 'write:memory', 'read:files', 'write:files', 'execute:genkit', 'call:external-apis'],
        restrictions: ['deploy:production'],
    },
];

// Helper to look up an agent identity by ID
export function getAgentIdentity(agentId: string): AgentIdentity | undefined {
    return AGENT_ROSTER.find(a => a.agentId === agentId);
}

// Check if an agent has a specific capability
export function agentCan(agentId: string, capability: AgentCapability): boolean {
    const agent = getAgentIdentity(agentId);
    if (!agent) return false;
    if (agent.restrictions.includes(capability)) return false;
    return agent.capabilities.includes(capability);
}
