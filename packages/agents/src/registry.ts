/**
 * @inception/agents — Agent Registry
 *
 * Master registry of all 14 Creative Liberation Engine agents.
 * Constitutional: Article I — All agents must be registered and typed.
 */

import type { AgentDefinition } from './types.js';

export const AGENT_REGISTRY: AgentDefinition[] = [
    // ── AVERI Trinity ──────────────────────────────────────────────────────────
    {
        id: 'ATHENA',
        name: 'ATHENA',
        description: 'Strategic intelligence — planning, research, synthesis, cross-agent coordination',
        hive: 'AVERI',
        modes: ['IDEATE', 'PLAN', 'VALIDATE'],
        constitutionalAccess: true,
    },
    {
        id: 'VERA',
        name: 'VERA',
        description: 'Truth engine — fact checking, constitutional compliance, guardrail enforcement',
        hive: 'AVERI',
        modes: ['PLAN', 'VALIDATE'],
        constitutionalAccess: true,
    },
    {
        id: 'IRIS',
        name: 'IRIS',
        description: 'Creative director — UI generation, design vision, brand strategy execution',
        hive: 'AVERI',
        modes: ['IDEATE', 'SHIP'],
        constitutionalAccess: true,
    },

    // ── Supporting Hive ────────────────────────────────────────────────────────
    {
        id: 'KEEPER',
        name: 'KEEPER',
        description: 'Memory and context — SCRIBE coordination, session persistence, knowledge retrieval',
        hive: 'GUARDIAN',
        modes: ['IDEATE', 'PLAN', 'SHIP', 'VALIDATE'],
        constitutionalAccess: false,
    },
    {
        id: 'ATLAS',
        name: 'ATLAS',
        description: 'Live data — market feeds, real-time search, external API aggregation',
        hive: 'BUILDER',
        modes: ['PLAN', 'SHIP'],
        constitutionalAccess: false,
    },
    {
        id: 'COMPASS',
        name: 'COMPASS',
        description: 'Structural validation — schema enforcement, data quality, type checking',
        hive: 'GUARDIAN',
        modes: ['VALIDATE'],
        constitutionalAccess: false,
    },
    {
        id: 'SCRIBE',
        name: 'SCRIBE',
        description: 'Persistent memory — ChromaDB embeddings, Git memory, knowledge item authoring',
        hive: 'RELAY',
        modes: ['SHIP'],
        constitutionalAccess: false,
    },
    {
        id: 'RELAY',
        name: 'RELAY',
        description: 'Event bus and message routing — Redis stream management, cross-service pub/sub',
        hive: 'RELAY',
        modes: ['SHIP'],
        constitutionalAccess: false,
    },
    {
        id: 'SWITCHBOARD',
        name: 'SWITCHBOARD',
        description: 'LLM provider orchestration — Genkit routing, fallback, retry, cost optimization',
        hive: 'RELAY',
        modes: ['SHIP'],
        constitutionalAccess: false,
    },
    {
        id: 'GENKI',
        name: 'GENKI',
        description: 'Genkit flow executor — Firebase AI SDK, Gemini integration, prompt engineering',
        hive: 'BUILDER',
        modes: ['SHIP'],
        constitutionalAccess: false,
    },
    {
        id: 'CLAUDE',
        name: 'CLAUDE',
        description: 'Anthropic Claude agent — extended reasoning, long-context analysis',
        hive: 'BUILDER',
        modes: ['PLAN', 'SHIP'],
        constitutionalAccess: false,
    },
    {
        id: 'CHRONOS',
        name: 'CHRONOS',
        description: 'Temporal coordination — task scheduling, deadline enforcement, cron management',
        hive: 'GUARDIAN',
        modes: ['PLAN'],
        constitutionalAccess: false,
    },
    {
        id: 'NEXUS',
        name: 'NEXUS',
        description: 'Cross-repo orchestration — multi-project synthesis, dependency graph management',
        hive: 'BUILDER',
        modes: ['PLAN', 'SHIP'],
        constitutionalAccess: false,
    },
    {
        id: 'ZERO',
        name: 'ZERO',
        description: 'Zero-Day GTM agent — client intake, brief extraction, LEX contract initiation',
        hive: 'BUILDER',
        modes: ['SHIP'],
        constitutionalAccess: false,
    },
];

export function getAgent(id: string): AgentDefinition | undefined {
    return AGENT_REGISTRY.find((a) => a.id === id);
}
