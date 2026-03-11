import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { N8nBridge } from "./index.js";

// Basic scaffolding for the n8n-bridge MCP server
const server = new Server(
  {
    name: "n8n-bridge-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// We need an instance of N8nBridge configured with our webhook URL
// The URL should be passed via env variables like N8N_WEBHOOK_URL
const bridge = new N8nBridge();

// Wait for connection to n8n layer
bridge.connect().catch(console.error);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "trigger_n8n_workflow",
        description: "Triggers an external n8n workflow by its webhook ID or slug. Use this to kick off automations.",
        inputSchema: {
          type: "object",
          properties: {
            workflowIdOrSlug: {
              type: "string",
              description: "The n8n webhook ID or slug to trigger.",
            },
            payload: {
              type: "object",
              description: "JSON object containing data to pass to the workflow.",
              additionalProperties: true,
            },
          },
          required: ["workflowIdOrSlug", "payload"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "trigger_n8n_workflow") {
    const { workflowIdOrSlug, payload } = request.params.arguments as any;

    try {
      if (!workflowIdOrSlug) {
         throw new Error("workflowIdOrSlug is required.");
      }
      
      const result = await bridge.triggerWorkflow(workflowIdOrSlug, payload || {});
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to trigger workflow: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  throw new Error(`Tool not found: ${request.params.name}`);
});

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("n8n Bridge MCP server running on stdio");
}

run().catch((error) => {
  console.error("Fatal error running n8n Bridge MCP server:", error);
  process.exit(1);
});
