import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { AgentSpawner } from "./spawner.js";

const spawner = new AgentSpawner();

const server = new Server(
  {
    name: "agent-spawner-mcp",
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
        name: "spawner.spawn_from_manifest",
        description: "Dynamically spin up a new operational agent based on a SkillManifest.",
        inputSchema: {
          type: "object",
          properties: {
            agent: {
              type: "string",
              description: "The name of the agent to spawn",
            },
            skills: {
              type: "array",
              description: "Array of skills the agent should have",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                },
                required: ["name"],
              },
            },
            port: {
              type: "number",
              description: "Optional port to run the agent on",
            },
            targetDir: {
              type: "string",
              description: "Optional target directory for the agent runtime files",
            },
          },
          required: ["agent", "skills"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "spawner.spawn_from_manifest": {
        const manifest = {
          agent: (args as any).agent,
          skills: (args as any).skills,
        };
        const options = {
          port: (args as any).port,
          targetDir: (args as any).targetDir,
        };

        const result = await spawner.spawnFromManifest(manifest, options);
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ success: true, result }, null, 2),
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
  console.error("Agent Spawner MCP server running on stdio");
}

run().catch((error) => {
  console.error("Fatal error running Agent Spawner MCP server:", error);
  process.exit(1);
});
