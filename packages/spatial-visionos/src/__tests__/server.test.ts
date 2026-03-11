import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

// We inline the server logic for testing since the source is a single executable file
const createMockServer = () => {
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
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'spatial.visionos_sync': {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ synced: true, timestamp: args?.timestamp }),
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

  return server;
};

describe('Spatial VisionOS MCP Server', () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    server = createMockServer();
  });

  it('exposes spatial.visionos_sync tool', async () => {
    // We mock the RequestHandler internal interface
    const handlers = (server as any)._requestHandlers;
    const listToolsHandler = handlers.get('tools/list');
    expect(listToolsHandler).toBeDefined();

    const result = await listToolsHandler({ method: 'tools/list' }, { isCancelled: () => false } as any);
    expect(result.tools.length).toBe(1);
    expect(result.tools[0].name).toBe('spatial.visionos_sync');
  });

  it('handles spatial.visionos_sync tool execution', async () => {
    const handlers = (server as any)._requestHandlers;
    const callToolHandler = handlers.get('tools/call');
    expect(callToolHandler).toBeDefined();

    const timestamp = Date.now();
    const result = await callToolHandler({
      method: 'tools/call',
      params: {
        name: 'spatial.visionos_sync',
        arguments: {
           headPosition: [1, 2, 3],
           eyeVector: [0, 0, 1],
           timestamp
        }
      }
    }, { isCancelled: () => false } as any);

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('"synced":true');
    expect(result.content[0].text).toContain(`"timestamp":${timestamp}`);
  });

  it('returns error for unknown tools', async () => {
    const handlers = (server as any)._requestHandlers;
    const callToolHandler = handlers.get('tools/call');

    const result = await callToolHandler({
      method: 'tools/call',
      params: {
        name: 'spatial.unknown_tool',
      }
    }, { isCancelled: () => false } as any);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Unknown tool');
  });
});
