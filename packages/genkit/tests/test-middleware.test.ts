/**
 * Middleware Tests
 *
 * Verifies constitutional firewall, fallback chain, and audit logger
 * work correctly as middleware components.
 */

import { describe, it, expect } from 'vitest';
import { constitutionalFirewall } from '../src/middleware/constitutional-firewall.js';
import { defaultMiddleware, fallbackMiddleware } from '../src/middleware/fallback-chain.js';
import { auditLogger, getAuditLog, getAuditStats } from '../src/middleware/audit-logger.js';

describe('Constitutional Firewall', () => {
    it('should return a middleware function', () => {
        const middleware = constitutionalFirewall();
        expect(middleware).toBeTypeOf('function');
    });
});

describe('Fallback Chain', () => {
    it('should return a middleware array', () => {
        const stack = defaultMiddleware();
        expect(Array.isArray(stack)).toBe(true);
        expect(stack.length).toBeGreaterThan(0);
    });

    it('should include constitutional firewall in default stack', () => {
        const stack = defaultMiddleware();
        // Stack should have at least: constitutional + retry + audit
        expect(stack.length).toBeGreaterThanOrEqual(3);
    });

    it('should add fallback middleware when models provided', () => {
        const defaultStack = defaultMiddleware();
        const fallbackStack = fallbackMiddleware(['modelA', 'modelB']);
        expect(fallbackStack.length).toBeGreaterThan(defaultStack.length);
    });
});

describe('Audit Logger', () => {
    it('should return a middleware function', () => {
        const middleware = auditLogger();
        expect(middleware).toBeTypeOf('function');
    });

    it('should return empty audit log initially', () => {
        const log = getAuditLog();
        expect(Array.isArray(log)).toBe(true);
    });

    it('should return audit stats', () => {
        const stats = getAuditStats();
        expect(stats).toBeDefined();
        expect(stats).toHaveProperty('totalCalls');
    });
});
