#!/usr/bin/env node
/**
 * sensor-mesh MCP Server Bridge
 *
 * Provides specialized tools for bridging iPhone ZigSim biometric/motion data
 * with the Creative Liberation Engine backend natively through MCP.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createMirror, ZigSimBridge } from './index.js';

const server = new Server(
  { name: 'inception-sensor-mesh', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// We keep a single global mirror reference for caching/streaming
let globalMirror: ZigSimBridge | null = null;
let latestBlendshapes: Record<string, number> = {};

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'sensor.start_mirror',
      description: 'Activates the sensor mesh bridge on port 5010 to begin ingesting UDP frames from ZigSim Pro.',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'sensor.read_biometrics',
      description: 'Reads the most recent biometrics / blendshapes array from the active sensor mesh.',
      inputSchema: { type: 'object', properties: {} },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name } = request.params;

  switch (name) {
    case 'sensor.start_mirror': {
      if (!globalMirror) {
        globalMirror = createMirror();
        globalMirror.on('frame', (f) => {
            // Cache the latest frame
            latestBlendshapes = f.blendshapes;
        });
        return {
          content: [{ type: 'text', text: 'Sensor Mesh Mirror Activated. Listening on UDP port 5010.' }],
        };
      }
      return {
          content: [{ type: 'text', text: 'Sensor Mesh is already active.' }],
      };
    }
    case 'sensor.read_biometrics': {
        if (!globalMirror) {
             return { content: [{ type: 'text', text: 'Error: Sensor Mesh has not been activated via sensor.start_mirror yet.' }], isError: true };
        }
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(latestBlendshapes),
          }],
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
  console.error('[SENSOR-MESH] MCP Bridge online');
}

main().catch(console.error);
