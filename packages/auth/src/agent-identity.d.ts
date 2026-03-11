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
export declare const AGENT_CAPABILITIES: readonly ["read:memory", "write:memory", "read:files", "write:files", "execute:genkit", "call:external-apis", "read:constitution", "modify:constitution", "deploy:production", "manage:agents", "approve:financial", "clinical:access"];
export type AgentCapability = typeof AGENT_CAPABILITIES[number];
export type AgentTier = 'system' | 'operator' | 'builder' | 'restricted';
export declare const AgentIdentitySchema: z.ZodObject<{
    agentId: z.ZodString;
    agentType: z.ZodEnum<{
        hive: "hive";
        service: "service";
        leadership: "leadership";
        validator: "validator";
        lora: "lora";
    }>;
    tier: z.ZodEnum<{
        system: "system";
        builder: "builder";
        operator: "operator";
        restricted: "restricted";
    }>;
    hive: z.ZodOptional<z.ZodString>;
    capabilities: z.ZodArray<z.ZodEnum<{
        "read:memory": "read:memory";
        "write:memory": "write:memory";
        "read:files": "read:files";
        "write:files": "write:files";
        "execute:genkit": "execute:genkit";
        "call:external-apis": "call:external-apis";
        "read:constitution": "read:constitution";
        "modify:constitution": "modify:constitution";
        "deploy:production": "deploy:production";
        "manage:agents": "manage:agents";
        "approve:financial": "approve:financial";
        "clinical:access": "clinical:access";
    }>>;
    restrictions: z.ZodDefault<z.ZodArray<z.ZodString>>;
    sessionToken: z.ZodOptional<z.ZodString>;
    lastActivated: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type AgentIdentity = z.infer<typeof AgentIdentitySchema>;
export declare const AGENT_ROSTER: AgentIdentity[];
export declare function getAgentIdentity(agentId: string): AgentIdentity | undefined;
export declare function agentCan(agentId: string, capability: AgentCapability): boolean;
