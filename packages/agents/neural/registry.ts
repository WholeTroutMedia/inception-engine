/**
 * AgentRegistry
 * Dynamic discovery, loading, and lookup for all Creative Liberation Engine agents.
 *
 * Provides:
 *   - Register by name/hive/role/mode/tier
 *   - Dispatch task to best-fit agent
 *   - List all agents in a hive
 *   - Health check across all agents
 */

import type { InceptionAgent, AgentHive, AgentRole, AgentMode, AccessTier } from './agent.js';

class AgentRegistryClass {
    private agents = new Map<string, InceptionAgent>();

    /**
     * Register an agent. Called by each hive's index.ts on boot.
     */
    register(agent: InceptionAgent): void {
        this.agents.set(agent.name.toUpperCase(), agent);
        console.log(`[REGISTRY] Registered: ${agent.identity}`);
    }

    /**
     * Get agent by name (case-insensitive)
     */
    get(name: string): InceptionAgent | undefined {
        return this.agents.get(name.toUpperCase());
    }

    /**
     * Get all agents in a hive
     */
    getHive(hive: AgentHive): InceptionAgent[] {
        return [...this.agents.values()].filter(a => a.hive === hive);
    }

    /**
     * Get agents by role
     */
    getByRole(role: AgentRole): InceptionAgent[] {
        return [...this.agents.values()].filter(a => a.role === role);
    }

    /**
     * Get agents active in a given mode
     */
    getByMode(mode: AgentMode): InceptionAgent[] {
        return [...this.agents.values()].filter(
            a => a.activeModes.includes(mode) || a.activeModes.includes('all')
        );
    }

    /**
     * Get agents available at a given access tier
     */
    getByTier(tier: AccessTier): InceptionAgent[] {
        const tierOrder: AccessTier[] = ['studio', 'client', 'merch'];
        const tierIndex = tierOrder.indexOf(tier);
        return [...this.agents.values()].filter(
            a => tierOrder.indexOf(a.accessTier) <= tierIndex
        );
    }

    /**
     * Dispatch a task to a named agent
     */
    async dispatch(agentName: string, task: string, context?: string) {
        const agent = this.get(agentName);
        if (!agent) throw new Error(`[REGISTRY] Unknown agent: ${agentName}`);
        return agent.run({ task, context });
    }

    /**
     * List all registered agents
     */
    list(): { name: string; hive: AgentHive; role: AgentRole; model: string }[] {
        return [...this.agents.values()].map(a => ({
            name: a.name,
            hive: a.hive,
            role: a.role,
            model: a.model,
        }));
    }

    /**
     * Count of registered agents
     */
    get size(): number {
        return this.agents.size;
    }
}

// Singleton — shared across entire v5 runtime
export const AgentRegistry = new AgentRegistryClass();
