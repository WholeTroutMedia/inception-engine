/**
 * AgentOAuth — W4 Agent Identity & Auth
 *
 * OAuth2-style token issuance for agent sessions.
 * Issues short-lived JWTs scoped to specific agent capabilities.
 * Tokens are verified using HMAC-SHA256 (no external JWT library needed).
 *
 * On Genkit server startup: all 40 agents are issued tokens automatically.
 */
import { type AgentCapability, type AgentIdentity } from './agent-identity.js';
interface JWTPayload {
    agentId: string;
    tier: string;
    capabilities: AgentCapability[];
    iat: number;
    exp: number;
}
export declare class AgentOAuth {
    private activeTokens;
    /**
     * Issue a scoped token for an agent.
     * Capabilities default to the agent's defined capability set.
     */
    issueAgentToken(agentId: string, identity: AgentIdentity, requestedCapabilities?: AgentCapability[]): string;
    /**
     * Verify and decode an agent token.
     */
    verifyToken(token: string): JWTPayload | null;
    /**
     * Revoke an agent's active token.
     */
    revokeAgentToken(agentId: string): void;
    /**
     * Get the current active token for an agent (or null if none issued).
     */
    getActiveToken(agentId: string): string | null;
    /**
     * Issue tokens for all agents in the roster.
     * Called on Genkit server startup.
     * Returns a map of agentId → token.
     */
    issueAllAgentTokens(): Map<string, string>;
}
export declare const agentOAuth: AgentOAuth;
export {};
