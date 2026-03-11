#!/usr/bin/env node
/**
 * mcp-server.ts — MCP Router stdio server
 * @inception/mcp-router
 *
 * Exposes the MCP routing, registry, lifecycle, and tenant routing system
 * as an MCP stdio server consumable by any MCP-compatible AI client.
 *
 * Tools:
 *   router.route        — Route a task to the best-fit MCP server for the domain
 *   router.classify     — Classify task domains from natural language
 *   router.tenant       — Resolve the correct service URL for a given tenant
 *   router.provision    — Provision a new Cloud Run tenant service
 *   router.servers      — List all registered MCP servers and their domains
 *   router.lifecycle    — Check server health / activate server for domains
 *
 * @agent AVERI (LENS, FORGE, HERALD can all call this)
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import {
  routeTask,
  classifyDomains,
  getServersForDomain,
  mcpRegistry,
  mcpLifecycle,
  resolveTenantService,
  extractTenantId,
  registerTenant,
  cloudRunProvisioner,
  buildCreativeDNA,
  extractMobbinPattern,
} from './index.js';

// ─── MCP Server ────────────────────────────────────────────────────────────────

const server = new Server(
  { name: 'inception-mcp-router', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'router.route',
      description:
        'Route a task description to the best-fit MCP server based on domain matching. ' +
        'Returns the server name, URL, and relevant tools. Use before dispatching any specialized task.',
      inputSchema: {
        type: 'object',
        properties: {
          task: { type: 'string', description: 'Natural language task description' },
          domain: { type: 'string', description: 'Override domain (e.g. "photography", "video", "memory")' },
          tenantId: { type: 'string', description: 'Tenant context for multi-tenant routing' },
        },
        required: ['task'],
      },
    },
    {
      name: 'router.classify',
      description:
        'Classify which domains a task touches (e.g. photography, memory, video-editing, orchestration). ' +
        'Returns ranked domain list with confidence scores.',
      inputSchema: {
        type: 'object',
        properties: {
          task: { type: 'string', description: 'Task or query to classify' },
        },
        required: ['task'],
      },
    },
    {
      name: 'router.tenant',
      description:
        'Resolve the sovereign Cloud Run service URL for a given tenant. ' +
        'Extracts tenant context from headers or explicit tenantId, returns base URL and auth headers.',
      inputSchema: {
        type: 'object',
        properties: {
          tenantId: { type: 'string', description: 'Tenant identifier (e.g. operator)' },
          domain: { type: 'string', description: 'Service domain to resolve (e.g. photography, genkit)' },
          headers: { type: 'object', description: 'Incoming request headers (for tenant extraction)' },
        },
        required: ['domain'],
      },
    },
    {
      name: 'router.provision',
      description:
        'Provision a new Cloud Run tenant service. Creates service, sets env vars, configures domain. ' +
        'Use when onboarding a new photographer client to their sovereign Creative Liberation Engine instance.',
      inputSchema: {
        type: 'object',
        properties: {
          tenantId: { type: 'string', description: 'Tenant identifier (slug, e.g. jane-smith)' },
          displayName: { type: 'string', description: 'Display name (default: tenantId)' },
          tier: { type: 'string', enum: ['free', 'studio', 'master'], description: 'Instance tier (default: free)' },
          imageName: { type: 'string', description: 'Container image to deploy (e.g. gcr.io/.../genkit:latest)' },
          region: { type: 'string', description: 'GCP region (default: us-central1)' },
          env: { type: 'object', description: 'Environment variables for this tenant' },
        },
        required: ['tenantId', 'imageName'],
      },
    },
    {
      name: 'router.servers',
      description:
        'List all registered MCP servers in the runtime registry, including their domains, tools, and status.',
      inputSchema: {
        type: 'object',
        properties: {
          domain: { type: 'string', description: 'Filter by domain (optional)' },
        },
      },
    },
    {
      name: 'router.lifecycle',
      description:
        'Check health of a registered MCP server, or activate servers for a set of domains. ' +
        'Use to ensure servers are warm before dispatching time-sensitive tasks.',
      inputSchema: {
        type: 'object',
        properties: {
          serverName: { type: 'string', description: 'Specific server to health-check' },
          domains: { type: 'array', items: { type: 'string' }, description: 'Domains to activate servers for' },
          action: { type: 'string', enum: ['health', 'activate'], description: 'Action to perform (default: health)' },
        },
      },
    },
    {
      name: 'router.creative_dna',
      description: 'Extract Creative DNA vectors from an unstructured natural language user profile or creator bio.',
      inputSchema: {
        type: 'object',
        properties: {
          tenantId: { type: 'string', description: 'Tenant ID' },
          bio: { type: 'string', description: 'Natural language biography, aesthetic preferences, or creator profile' },
        },
        required: ['tenantId', 'bio'],
      },
    },
    {
      name: 'router.mobbin_ingest',
      description: 'Ingest and extract structural UI patterns from Mobbin using the Mobbin API.',
      inputSchema: {
        type: 'object',
        properties: {
          category: { type: 'string', description: 'Category taxomony like onboarding, settings, checkout' },
          url: { type: 'string', description: 'Direct URL to a Mobbin screen or flow' },
          visionFallback: { type: 'boolean', description: 'Use vision-based fallback if API fails' }
        }
      }
    }
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'router.route': {
        const result = await routeTask(args?.task as string);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }

      case 'router.classify': {
        const domains = await classifyDomains(args?.task as string);
        return { content: [{ type: 'text', text: JSON.stringify({ domains }, null, 2) }] };
      }

      case 'router.tenant': {
        const tenantId = args?.tenantId as string | undefined;
        const domain = args?.domain as string;
        const headers = (args?.headers as Record<string, string>) || {};

        const resolvedTenantId = tenantId || extractTenantId({ headers } as any);
        if (!resolvedTenantId) {
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: 'Could not resolve tenantId from args or headers' }) }],
            isError: true,
          };
        }

        const result = await resolveTenantService(resolvedTenantId, domain);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }

      case 'router.provision': {
        const spec = {
          tenantId: args?.tenantId as string,
          displayName: (args?.displayName as string) || (args?.tenantId as string),
          tier: (args?.tier as 'free' | 'studio' | 'master') || 'free',
          imageUri: args?.imageName as string,
          region: (args?.region as string) || 'us-central1',
          envVars: (args?.env as Record<string, string>) || {},
        };
        const result = await cloudRunProvisioner.provisionTenant(spec);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }

      case 'router.servers': {
        const domain = args?.domain as any;
        if (domain) {
          const servers = getServersForDomain(domain);
          return { content: [{ type: 'text', text: JSON.stringify({ domain, servers }, null, 2) }] };
        }
        const allServers = mcpLifecycle.getActivationReport();
        return { content: [{ type: 'text', text: JSON.stringify({ servers: allServers }, null, 2) }] };
      }

      case 'router.lifecycle': {
        const action = (args?.action as string) || 'health';
        if (action === 'activate' && args?.domains) {
          const result = await mcpLifecycle.activateForTask(args.domains as any[]);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }
        // health check
        const serverName = args?.serverName as string | undefined;
        let status;
        if (serverName) {
          status = { server: serverName, status: mcpRegistry.getStatus(serverName) };
        } else {
          status = mcpLifecycle.getActivationReport();
        }
        return { content: [{ type: 'text', text: JSON.stringify(status, null, 2) }] };
      }

      case 'router.creative_dna': {
        const tenantId = (args?.tenantId as string) || 'anonymous';
        const bio = args?.bio as string;
        // Mocking structured extraction from bio for zero-day schema satisfaction
        const dna = await buildCreativeDNA(tenantId, {
          colors: { warm: bio.includes('warm') ? 0.8 : 0.2 },
          moods: { dramatic: bio.includes('drama') ? 0.9 : 0.1 },
          subjects: { portrait: bio.includes('face') ? 1.0 : 0.5 },
          technicalStyles: { 'bokeh-heavy': bio.includes('blur') ? 0.8 : 0.2 },
          compositions: { 'rule-of-thirds': 0.7 }
        }, bio.length);
        return { content: [{ type: 'text', text: JSON.stringify(dna, null, 2) }] };
      }

      case 'router.mobbin_ingest': {
        const pattern = await extractMobbinPattern({
          category: args?.category as string | undefined,
          url: args?.url as string | undefined,
          visionFallback: args?.visionFallback as boolean | undefined
        });
        return { content: [{ type: 'text', text: JSON.stringify(pattern, null, 2) }] };
      }

      default:
        return {
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: 'text', text: JSON.stringify({ error: msg, tool: name }) }],
      isError: true,
    };
  }
});

// ─── Boot ─────────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[MCP-ROUTER] ✅ Inception MCP Router server online');
  console.error(`[MCP-ROUTER] Registry active connections: ${mcpRegistry.getActiveCount()}`);
}

main().catch(console.error);
