/**
 * Capability Manifest — typed native TypeScript export (MCP-02)
 *
 * Exports the full manifest data as a strongly-typed CapabilityManifest object.
 * Using a .ts file avoids JSON import limitations in composite tsconfig mode (TS6307).
 *
 * To update the manifest, edit this file directly. The JSON file
 * (capability-manifest.json) is kept as the source of record for external tools
 * (Claude IDE, documentation, etc) — keep both in sync manually or via script.
 */

import type { CapabilityManifest } from './types.js';

export const manifest: CapabilityManifest = {
    version: '1.0.0',
    maxActiveConcurrent: 6,
    defaultEvictionPolicy: 'lru',
    domains: {
        cloud: [
            {
                id: 'cloud-run-mcp',
                name: 'Cloud Run MCP',
                description: 'Deploy and manage Google Cloud Run services',
                enabled: true,
                alwaysOn: false,
                priority: 1,
                keywords: ['cloud run', 'deploy', 'container', 'gcp', 'google cloud', 'cloud function', 'serverless', 'docker image', 'cloud build'],
                transport: 'stdio',
                command: 'npx',
                args: ['-y', '@google-cloud/cloud-run-mcp'],
            },
            {
                id: 'cloudrun',
                name: 'CloudRun Simple',
                description: 'Simplified Cloud Run deployment helper',
                enabled: true,
                alwaysOn: false,
                priority: 2,
                keywords: ['cloud run', 'deploy service', 'run deploy', 'list services', 'service url'],
                transport: 'stdio',
                command: 'npx',
                args: ['-y', 'cloudrun-mcp'],
            },
        ],
        compute: [
            {
                id: 'compute-mcp',
                name: 'Compute MCP',
                description: 'Manage Google Compute Engine VMs and resources',
                enabled: true,
                alwaysOn: false,
                priority: 1,
                keywords: ['compute engine', 'vm', 'virtual machine', 'gce', 'instance', 'disk', 'snapshot', 'machine type', 'mig', 'instance group'],
                transport: 'stdio',
                command: 'npx',
                args: ['-y', '@google-cloud/compute-mcp'],
            },
        ],
        data: [
            {
                id: 'bigquery-mcp',
                name: 'BigQuery MCP',
                description: 'Query and manage BigQuery datasets',
                enabled: true,
                alwaysOn: false,
                priority: 1,
                keywords: ['bigquery', 'bq', 'sql', 'data warehouse', 'dataset', 'table', 'query', 'analytics'],
                transport: 'stdio',
                command: 'npx',
                args: ['-y', '@google-cloud/bigquery-mcp'],
            },
            {
                id: 'firestore-mcp',
                name: 'Firestore MCP',
                description: 'Manage Firestore documents and collections',
                enabled: true,
                alwaysOn: false,
                priority: 1,
                keywords: ['firestore', 'document', 'collection', 'nosql', 'firebase database', 'realtime'],
                transport: 'stdio',
                command: 'npx',
                args: ['-y', '@google-cloud/firestore-mcp'],
            },
        ],
        logging: [
            {
                id: 'cloud-logging-mcp',
                name: 'Cloud Logging MCP',
                description: 'Query and manage Google Cloud Logging',
                enabled: true,
                alwaysOn: false,
                priority: 1,
                keywords: ['logs', 'logging', 'cloud logging', 'log entries', 'log bucket', 'stackdriver', 'monitoring', 'alerts'],
                transport: 'stdio',
                command: 'npx',
                args: ['-y', '@google-cloud/cloud-logging-mcp'],
            },
        ],
        design: [
            {
                id: 'figma-dev-mode-mcp-server',
                name: 'Figma Dev Mode MCP',
                description: 'Access Figma design files, components, and assets',
                enabled: true,
                alwaysOn: false,
                priority: 1,
                keywords: ['figma', 'design', 'component', 'frame', 'token', 'ui spec', 'mockup', 'wireframe', 'prototype', 'design file'],
                transport: 'stdio',
                command: 'npx',
                args: ['-y', 'figma-mcp'],
            },
            {
                id: 'StitchMCP',
                name: 'Stitch MCP',
                description: 'Generate and edit UI screens from prompts',
                enabled: true,
                alwaysOn: false,
                priority: 2,
                keywords: ['stitch', 'screen', 'generate ui', 'ui generation', 'design system', 'ui screen', 'generate screen'],
                transport: 'stdio',
                command: 'npx',
                args: ['-y', 'stitch-mcp'],
            },
        ],
        firebase: [
            {
                id: 'firebase-mcp-server',
                name: 'Firebase MCP',
                description: 'Manage Firebase projects, apps, and services',
                enabled: true,
                alwaysOn: false,
                priority: 1,
                keywords: ['firebase', 'hosting', 'firebase app', 'firebase project', 'auth', 'authentication', 'storage rules', 'security rules', 'functions'],
                transport: 'stdio',
                command: 'npx',
                args: ['-y', 'firebase-mcp'],
            },
        ],
        search: [
            {
                id: 'perplexity-ask',
                name: 'Perplexity Ask',
                description: 'Web search using Perplexity Sonar AI',
                enabled: true,
                alwaysOn: true,
                priority: 1,
                keywords: ['search', 'research', 'perplexity', 'web search', 'find information', 'look up', 'current events', 'news', 'documentation'],
                transport: 'stdio',
                command: 'npx',
                args: ['-y', 'perplexity-mcp'],
            },
        ],
        maps: [
            {
                id: 'gmp-code-assist',
                name: 'Google Maps Platform Code Assist',
                description: 'Google Maps Platform documentation and code assistance',
                enabled: true,
                alwaysOn: false,
                priority: 1,
                keywords: ['maps', 'google maps', 'places', 'geocoding', 'routing', 'location', 'geospatial', 'address', 'latitude', 'longitude', 'gmp'],
                transport: 'stdio',
                command: 'npx',
                args: ['-y', 'gmp-mcp'],
            },
        ],
        knowledge: [
            {
                id: 'developer-knowledge-mcp',
                name: 'Developer Knowledge MCP',
                description: 'Search Google developer documentation',
                enabled: true,
                alwaysOn: false,
                priority: 1,
                keywords: ['documentation', 'docs', 'api reference', 'google cloud docs', 'firebase docs', 'android', 'chrome', 'tensorflow'],
                transport: 'stdio',
                command: 'npx',
                args: ['-y', 'developer-knowledge-mcp'],
            },
        ],
        reasoning: [
            {
                id: 'sequential-thinking',
                name: 'Sequential Thinking',
                description: 'Step-by-step reasoning for complex problems',
                enabled: true,
                alwaysOn: false,
                priority: 1,
                keywords: ['think', 'reason', 'plan', 'analyze', 'problem solving', 'step by step', 'breakdown', 'sequential', 'complex problem'],
                transport: 'stdio',
                command: 'npx',
                args: ['-y', 'sequential-thinking-mcp'],
            },
        ],
    },
} as const satisfies CapabilityManifest;
