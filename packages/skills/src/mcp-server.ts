import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { resolve, join } from "path";
import { readFileSync, readdirSync } from "fs";
import { SkillCompiler, SkillRegistry, SkillLoader } from "./index.js";

// Initialize core components
const compiler = new SkillCompiler();
const registry = new SkillRegistry();
const loader = new SkillLoader(registry);

// Load skills on boot
function loadCharters() {
  const chartersDir = resolve(process.cwd(), "../../charters");
  try {
    const files = readdirSync(chartersDir).filter((f) => f.endsWith(".md"));
    for (const file of files) {
      const content = readFileSync(join(chartersDir, file), "utf-8");
      const agentName = file.replace(".md", "");
      const pack = compiler.compile(content, agentName);
      registry.register(pack);
    }
    console.error(`[Skills MCP] Loaded ${files.length} skill packs`);
  } catch (err: any) {
    console.error(`[Skills MCP] Failed to load charters: ${err.message}`);
  }
}

loadCharters();

const server = new Server(
  {
    name: "skills-mcp",
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
        name: "skills.list",
        description: "List all available skills in the library.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "skills.get",
        description: "Retrieve a specific skill pack by name.",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Name of the skill to retrieve",
            },
            version: {
              type: "string",
              description: "Optional specific version to retrieve",
            },
          },
          required: ["name"],
        },
      },
      {
        name: "skills.search",
        description: "Search for skills by tag or capability.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "skills.resolve_dependencies",
        description: "Resolve the dependency tree for a specific skill.",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Name of the skill",
            },
          },
          required: ["name"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "skills.list": {
        const metadataList = registry.list();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(metadataList, null, 2),
            },
          ],
        };
      }
      case "skills.get": {
        const skillName = (args as any).name;
        const version = (args as any).version;
        const pack = registry.get(skillName, version);
        if (!pack) {
            throw new Error(`Skill not found: ${skillName}`);
        }
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(pack, null, 2),
            },
          ],
        };
      }
      case "skills.search": {
        const query = (args as any).query;
        const results = registry.search(query);
         return {
          content: [
            {
              type: "text",
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      }
      case "skills.resolve_dependencies": {
        const skillName = (args as any).name;
        const deps = registry.resolveDependencies(skillName);
         return {
          content: [
            {
              type: "text",
              text: JSON.stringify(deps, null, 2),
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
  console.error("Skills Library MCP server running on stdio");
}

run().catch((error) => {
  console.error("Fatal error running Skills Library MCP server:", error);
  process.exit(1);
});
