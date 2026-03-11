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
import { type AgentCapability } from './agent-identity.js';
declare global {
    namespace Express {
        interface Request {
            agentId?: string;
            agentTier?: string;
        }
    }
}
/**
 * Require a valid agent token. Sets req.agentId and req.agentTier.
 * Use this on all authenticated routes.
 */
export declare function requireAgentAuth(req: Request, res: Response, next: NextFunction): void;
/**
 * Require a specific capability. Must be used AFTER requireAgentAuth.
 */
export declare function requireAgentCapability(capability: AgentCapability): (req: Request, res: Response, next: NextFunction) => void;
/**
 * Require system tier (AVERI Trinity only).
 */
export declare function requireSystemTier(req: Request, res: Response, next: NextFunction): void;
/**
 * Optional auth — attaches agent identity if present but doesn't require it.
 * Use for routes that behave differently for authenticated agents.
 */
export declare function optionalAgentAuth(req: Request, _res: Response, next: NextFunction): void;
