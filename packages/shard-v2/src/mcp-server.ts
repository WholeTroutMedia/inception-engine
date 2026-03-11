import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { ShardEngine } from "./index.js";

const engine = new ShardEngine();
engine.initialize().catch(console.error);

const server = new Server(
  {
    name: "shard-v2-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "shard.trigger_dream_cycle",
        description: "Trigger a memory compaction (dream) cycle across all active transcripts.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "shard.compact_session",
        description: "Compacts the memory for a specific active session.",
        inputSchema: {
          type: "object",
          properties: {
            sessionId: {
              type: "string",
              description: "The session ID of the transcript to compact",
            },
          },
          required: ["sessionId"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "shard.trigger_dream_cycle": {
        // Expose compactor through engine since index.ts exported MemoryCompactor
        // Wait, index.ts exports `compactor`? No, index.ts just exposes `triggerDreamCycle`.
        // I will use that directly or create a fresh compactor to get metrics.
        // Let's use the exported MemoryCompactor
        const { MemoryCompactor } = await import("./compactor.js");
        const compactor = new MemoryCompactor();
        const metrics = await compactor.runCompactionCycle();
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ success: true, metrics }, null, 2),
            },
          ],
        };
      }
      case "shard.compact_session": {
        const sessionId = (args as any).sessionId;
        const { MemoryCompactor } = await import("./compactor.js");
        const compactor = new MemoryCompactor();
        const bytesSaved = await compactor.compactSession(sessionId);
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ success: true, sessionId, bytesSaved }, null, 2),
            },
          ],
        };
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Error executing ${name}: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("SHARD v2 MCP server running on stdio");
}

run().catch((error) => {
  console.error("Fatal error running SHARD v2 MCP server:", error);
  process.exit(1);
});
