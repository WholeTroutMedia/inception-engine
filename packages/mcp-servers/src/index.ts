/**
 * Creative Liberation Engine MCP Servers
 * Issue: #58 | HELIX G sub-module
 *
 * Four MCP server wrappers for Cowork/Claude Desktop integration:
 * - inception-dispatch: Task routing + queue management
 * - inception-scribe: 3-tier memory system
 * - inception-browser: Web automation + research
 * - inception-registry: Agent status + hive state
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { DispatchServer } from './servers/dispatch.js';
import { ScribeServer } from './servers/scribe.js';
import { BrowserServer } from './servers/browser.js';
import { RegistryServer } from './servers/registry.js';

export { DispatchServer, ScribeServer, BrowserServer, RegistryServer };

// ─── Server Factory ───────────────────────────────────────────
export type ServerType = 'dispatch' | 'scribe' | 'browser' | 'registry';

export function createMCPServer(type: ServerType): Server {
  switch (type) {
    case 'dispatch':
      return new DispatchServer().build();
    case 'scribe':
      return new ScribeServer().build();
    case 'browser':
      return new BrowserServer().build();
    case 'registry':
      return new RegistryServer().build();
    default:
      throw new Error(`Unknown server type: ${type}`);
  }
}

// ─── CLI Entry Point ──────────────────────────────────────────
async function main() {
  const serverType = (process.argv[2] || 'dispatch') as ServerType;
  const server = createMCPServer(serverType);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`[IE] MCP server '${serverType}' running on stdio`);
}

if (process.argv[1]?.includes('index')) {
  main().catch(console.error);
}