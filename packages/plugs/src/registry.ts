import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const PlugAdapterSchema = z.object({
    id: z.string(),
    name: z.string(),
    category: z.string(),
    command: z.string(),
    args: z.array(z.string()),
    env_required: z.array(z.string()),
    agent_permissions: z.array(z.string()),
    description: z.string(),
});

export const PlugRegistrySchema = z.object({
    plug_version: z.string(),
    description: z.string(),
    updated: z.string(),
    adapters: z.array(PlugAdapterSchema),
});

export type PlugAdapter = z.infer<typeof PlugAdapterSchema>;
export type PlugRegistry = z.infer<typeof PlugRegistrySchema>;

// ─── Registry Loader ──────────────────────────────────────────────────────────

let _registry: PlugRegistry | null = null;

export function loadRegistry(registryPath?: string): PlugRegistry {
    if (_registry) return _registry;

    const path = registryPath ?? resolve(__dirname, '../plug.inception.json');
    const raw = JSON.parse(readFileSync(path, 'utf-8'));
    _registry = PlugRegistrySchema.parse(raw);
    return _registry;
}

// ─── Auto-Discovery ───────────────────────────────────────────────────────────

/**
 * Zero-config plug discovery.
 * Checks process.env for required keys and returns all adapters
 * whose env_required variables are all present.
 * 
 * This is the core of THE PLUG's zero-config UX:
 * if the key is in .env, the plug is live.
 */
export function discoverActivePlugs(registry?: PlugRegistry): PlugAdapter[] {
    const reg = registry ?? loadRegistry();

    return reg.adapters.filter((adapter) =>
        adapter.env_required.every((envVar) => {
            const val = process.env[envVar];
            return val !== undefined && val !== '';
        })
    );
}

// ─── Agent Permission Check ───────────────────────────────────────────────────

export function getPlugsForAgent(agentId: string, registry?: PlugRegistry): PlugAdapter[] {
    const reg = registry ?? loadRegistry();
    return reg.adapters.filter((adapter) =>
        adapter.agent_permissions.includes(agentId)
    );
}

export function canAgentUsePlugg(agentId: string, plugId: string, registry?: PlugRegistry): boolean {
    const reg = registry ?? loadRegistry();
    const adapter = reg.adapters.find((a) => a.id === plugId);
    if (!adapter) return false;
    return adapter.agent_permissions.includes(agentId);
}

// ─── Status Report ────────────────────────────────────────────────────────────

export interface PlugStatus {
    id: string;
    name: string;
    category: string;
    active: boolean;
    missing_env: string[];
}

export function getPlugStatus(registry?: PlugRegistry): PlugStatus[] {
    const reg = registry ?? loadRegistry();

    return reg.adapters.map((adapter) => {
        const missing = adapter.env_required.filter(
            (v) => !process.env[v] || process.env[v] === ''
        );
        return {
            id: adapter.id,
            name: adapter.name,
            category: adapter.category,
            active: missing.length === 0,
            missing_env: missing,
        };
    });
}

export function logPlugStatus(): void {
    const statuses = getPlugStatus();
    const active = statuses.filter((s) => s.active);
    const inactive = statuses.filter((s) => !s.active);

    console.log('\n🔌 THE PLUG — Adapter Status');
    console.log(`   Active: ${active.length} | Inactive: ${inactive.length}\n`);

    for (const s of active) {
        console.log(`   ✅ ${s.name} (${s.category})`);
    }
    if (inactive.length > 0) {
        console.log(`\n   Inactive (missing env vars):`);
        for (const s of inactive) {
            console.log(`   ○ ${s.name} — needs: ${s.missing_env.join(', ')}`);
        }
    }
    console.log('');
}
