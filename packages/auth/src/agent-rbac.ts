/**
 * AgentRBAC — W4 Agent Identity & Auth
 *
 * Express middleware that enforces capability-based access control
 * for all routes using agent identity tokens.
 *
 * Usage in Express:
 *   import { requireAgentCapability } from '@inception/auth';
 *   router.post('/generate', requireAgentCapability('execute:genkit'), handler);
 */

import type { Request, Response, NextFunction } from 'express';
import { agentCan, getAgentIdentity, type AgentCapability } from './agent-identity.js';
import { agentOAuth } from './agent-oauth.js';

// ─── Request extension ────────────────────────────────────────────────────────

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Request {
            agentId?: string;
            agentTier?: string;
        }
    }
}

// ─── Auth header parsing ──────────────────────────────────────────────────────

function extractAgentAuth(req: Request): { agentId: string; token: string } | null {
    const agentId = req.headers['x-agent-id'];
    const token = req.headers['x-agent-token'];

    if (!agentId || !token || Array.isArray(agentId) || Array.isArray(token)) {
        return null;
    }

    return { agentId, token };
}

// ─── Middleware factory ───────────────────────────────────────────────────────

/**
 * Require a valid agent token. Sets req.agentId and req.agentTier.
 * Use this on all authenticated routes.
 */
export function requireAgentAuth(req: Request, res: Response, next: NextFunction): void {
    const auth = extractAgentAuth(req);
    if (!auth) {
        res.status(401).json({
            error: 'Missing agent auth headers (X-Agent-Id and X-Agent-Token required)',
        });
        return;
    }

    const payload = agentOAuth.verifyToken(auth.token);
    if (!payload || payload.agentId !== auth.agentId) {
        res.status(401).json({ error: 'Invalid or expired agent token' });
        return;
    }

    const identity = getAgentIdentity(auth.agentId);
    if (!identity) {
        res.status(401).json({ error: `Unknown agent: ${auth.agentId}` });
        return;
    }

    req.agentId = auth.agentId;
    req.agentTier = identity.tier;
    next();
}

/**
 * Require a specific capability. Must be used AFTER requireAgentAuth.
 */
export function requireAgentCapability(capability: AgentCapability) {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.agentId) {
            res.status(401).json({ error: 'Agent not authenticated' });
            return;
        }

        if (!agentCan(req.agentId, capability)) {
            res.status(403).json({
                error: `Agent ${req.agentId} lacks capability: ${capability}`,
                agentId: req.agentId,
                required: capability,
            });
            return;
        }

        next();
    };
}

/**
 * Require system tier (AVERI Trinity only).
 */
export function requireSystemTier(req: Request, res: Response, next: NextFunction): void {
    if (req.agentTier !== 'system') {
        res.status(403).json({
            error: 'This route requires system-tier agents (AVERI Trinity)',
            agentTier: req.agentTier,
        });
        return;
    }
    next();
}

/**
 * Optional auth — attaches agent identity if present but doesn't require it.
 * Use for routes that behave differently for authenticated agents.
 */
export function optionalAgentAuth(req: Request, _res: Response, next: NextFunction): void {
    const auth = extractAgentAuth(req);
    if (auth) {
        const payload = agentOAuth.verifyToken(auth.token);
        if (payload?.agentId === auth.agentId) {
            req.agentId = auth.agentId;
            const identity = getAgentIdentity(auth.agentId);
            if (identity) req.agentTier = identity.tier;
        }
    }
    next();
}
