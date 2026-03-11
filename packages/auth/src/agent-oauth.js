/**
 * AgentOAuth — W4 Agent Identity & Auth
 *
 * OAuth2-style token issuance for agent sessions.
 * Issues short-lived JWTs scoped to specific agent capabilities.
 * Tokens are verified using HMAC-SHA256 (no external JWT library needed).
 *
 * On Genkit server startup: all 40 agents are issued tokens automatically.
 */
import { createHmac, randomBytes } from 'node:crypto';
import { AGENT_ROSTER } from './agent-identity.js';
// ─── Config ───────────────────────────────────────────────────────────────────
const JWT_SECRET = process.env['AGENT_JWT_SECRET'] ?? randomBytes(32).toString('hex');
const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
function base64url(data) {
    return Buffer.from(data)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}
function sign(header, payload, secret) {
    return createHmac('sha256', secret)
        .update(`${header}.${payload}`)
        .digest('base64url');
}
function issueJWT(payload) {
    const now = Date.now();
    const fullPayload = {
        ...payload,
        iat: Math.floor(now / 1000),
        exp: Math.floor((now + TOKEN_TTL_MS) / 1000),
    };
    const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = base64url(JSON.stringify(fullPayload));
    const sig = sign(header, body, JWT_SECRET);
    return `${header}.${body}.${sig}`;
}
function verifyJWT(token) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3)
            return null;
        const [header, body, sig] = parts;
        const expectedSig = sign(header, body, JWT_SECRET);
        if (sig !== expectedSig)
            return null;
        const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
        if (payload.exp < Math.floor(Date.now() / 1000))
            return null; // expired
        return payload;
    }
    catch {
        return null;
    }
}
// ─── AgentOAuth ───────────────────────────────────────────────────────────────
export class AgentOAuth {
    activeTokens = new Map(); // agentId → token
    /**
     * Issue a scoped token for an agent.
     * Capabilities default to the agent's defined capability set.
     */
    issueAgentToken(agentId, identity, requestedCapabilities) {
        // Only grant capabilities the agent already has
        const grantedCaps = requestedCapabilities
            ? requestedCapabilities.filter(c => identity.capabilities.includes(c))
            : identity.capabilities;
        const token = issueJWT({
            agentId,
            tier: identity.tier,
            capabilities: grantedCaps,
        });
        this.activeTokens.set(agentId, token);
        return token;
    }
    /**
     * Verify and decode an agent token.
     */
    verifyToken(token) {
        return verifyJWT(token);
    }
    /**
     * Revoke an agent's active token.
     */
    revokeAgentToken(agentId) {
        this.activeTokens.delete(agentId);
    }
    /**
     * Get the current active token for an agent (or null if none issued).
     */
    getActiveToken(agentId) {
        return this.activeTokens.get(agentId) ?? null;
    }
    /**
     * Issue tokens for all agents in the roster.
     * Called on Genkit server startup.
     * Returns a map of agentId → token.
     */
    issueAllAgentTokens() {
        const tokens = new Map();
        for (const identity of AGENT_ROSTER) {
            const token = this.issueAgentToken(identity.agentId, identity);
            tokens.set(identity.agentId, token);
        }
        console.log(`[AgentOAuth] Issued tokens for ${tokens.size} agents`);
        return tokens;
    }
}
// Singleton
export const agentOAuth = new AgentOAuth();
