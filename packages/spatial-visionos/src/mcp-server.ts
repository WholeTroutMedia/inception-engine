#!/usr/bin/env node
/**
 * spatial-visionos MCP Server Bridge
 *
 * Provides specialized tools for bridging visionOS / RealityKit spaces
 * with the Creative Liberation Engine backend (e.g. streaming TouchDesigner coordinates,
 * head-tracking overrides, boundary definitions).
 *
 * @package spatial-visionos
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const server = new Server(
  { name: 'inception-spatial-visionos', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'spatial.visionos_sync',
      description: 'Synchronize a set of coordinates or boundary definition from visionOS to the Inception Oracle.',
      inputSchema: {
        type: 'object',
        properties: {
          headPosition: { type: 'array', items: { type: 'number' }, description: '[x,y,z] from visionOS' },
          eyeVector: { type: 'array', items: { type: 'number' }, description: '[x,y,z] gaze vector' },
          timestamp: { type: 'number' },
        },
      },
    },
    {
      name: 'spatial.get_workspace_state',
      description: 'Retrieves the current physical layout and active boundaries from the NEXUS Spatial Workspace.',
      inputSchema: { type: 'object', properties: {} }
    }
  ],
}));

let latestSpatialState = {
    headPosition: [0, 0, 0],
    eyeVector: [0, 0, 1],
    boundaries: {
        width: 3.0,
        depth: 3.0,
        height: 2.5
    },
    lastSync: 0
};

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'spatial.visionos_sync': {
      if (args?.headPosition) latestSpatialState.headPosition = args.headPosition as number[];
      if (args?.eyeVector) latestSpatialState.eyeVector = args.eyeVector as number[];
      latestSpatialState.lastSync = args?.timestamp as number || Date.now();
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ synced: true, timestamp: latestSpatialState.lastSync }),
        }],
      };
    }
    case 'spatial.get_workspace_state': {
      return {
          content: [{
              type: 'text',
              text: JSON.stringify(latestSpatialState, null, 2)
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
  console.error('[SPATIAL-VISIONOS] MCP Bridge online');
}

main().catch(console.error);
