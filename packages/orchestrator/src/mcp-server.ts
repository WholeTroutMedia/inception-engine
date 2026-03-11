#!/usr/bin/env node
/**
 * Creative Liberation Engine Orchestrator MCP Server
 *
 * Exposes Pillar 3 core systems (Event Bus, Agent Discovery/Cards, and 
 * Multi-Helix orchestration primitives) to the wider agent collective.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Currently we use a singleton global event bus for the process
import { EventBus } from './EventBus.js';
const globalEventBus = new EventBus();

// Expose the A2A predefined cards directly (to satisfy Pillar 3)
// We dynamically import from mcp-router to share definitions
import { ALFRED_AGENT_CARD, INCEPTION_ORCHESTRATOR_CARD } from '../../mcp-router/src/a2a-protocol.js';

const server = new Server(
  { name: 'inception-orchestrator', version: '5.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'event_bus.publish',
      description: 'Publish an event to the Creative Liberation Engine Event Bus.',
      inputSchema: {
        type: 'object',
        properties: {
          topic: { type: 'string' },
          payload: { type: 'object' },
          source: { type: 'string' }
        },
        required: ['topic', 'payload', 'source']
      },
    },
    {
      name: 'event_bus.get_stats',
      description: 'Get the current metrics and health statistics from the universal event bus.',
      inputSchema: { type: 'object', properties: {} }
    },
    {
      name: 'discovery.get_agent_card',
      description: 'Retrieve the A2A Identity Card for a specific agent (e.g. ALFRED or Creative Liberation Engine Orchestrator).',
      inputSchema: {
          type: 'object',
          properties: {
              target: { type: 'string', description: 'Available: ALFRED, ORCHESTRATOR' }
          },
          required: ['target']
      }
    }
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'event_bus.publish': {
      const { topic, payload, source } = args as Record<string, any>;
      try {
          const envelope = await globalEventBus.emit(topic, payload, source);
          return {
              content: [{
                  type: 'text',
                  text: JSON.stringify({ success: true, eventId: envelope.eventId })
              }]
          };
      } catch (err: any) {
          return { content: [{ type: 'text', text: `Publish error: ${err.message}` }], isError: true };
      }
    }
    case 'event_bus.get_stats': {
        const stats = globalEventBus.getStats();
        return {
            content: [{
                type: 'text',
                text: JSON.stringify(stats, null, 2)
            }]
        };
    }
    case 'discovery.get_agent_card': {
        const target = args?.target as string;
        let card;
        
        switch (target.toUpperCase()) {
            case 'ALFRED': card = ALFRED_AGENT_CARD; break;
            case 'ORCHESTRATOR': card = INCEPTION_ORCHESTRATOR_CARD; break;
            default: return { content: [{ type: 'text', text: 'Agent currently not in discovery registry.' }], isError: true };
        }
        
        return {
            content: [{
                type: 'text',
                text: JSON.stringify(card, null, 2)
            }]
        };
    }
    default:
      return {
        content: [{ type: 'text', text: `Unknown tool: ${name}` }],
        isError: true,
      };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[ORCHESTRATOR] MCP Bridge (Event Bus + Agent Cards) online');
}

main().catch(console.error);
