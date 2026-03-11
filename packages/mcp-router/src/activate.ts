import { mcpRegistry } from './registry.js';
import { mcpLifecycle } from './lifecycle.js';

/**
 * Activates the MCP Router — core communication backbone.
 * Resolves #101 activation requirement.
 */
export async function activateMCPRouter() {
    console.log('[MCP Router] Activating core communication backbone...');
    
    const report = mcpLifecycle.getActivationReport();
    console.log(`[MCP Router] Activated successfully. Active servers: ${report.activeCount}.`);
    
    return {
        registry: mcpRegistry,
        lifecycle: mcpLifecycle,
        report
    };
}
