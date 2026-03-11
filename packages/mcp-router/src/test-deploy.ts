import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { URL } from "url";

async function run() {
    const transport = new SSEClientTransport(new URL("http://127.0.0.1:5100/sse"));
    const client = new Client({ name: "deploy-proxy", version: "1.0.0" }, { capabilities: {} });
    await client.connect(transport);
    
    console.log("Connected to NAS Relay MCP!");
    const tools = await client.listTools();
    console.log("Available tools:", tools.tools.map(t => t.name));
    
    // Find a command execution tool
    const cmdTool = tools.tools.find(t => t.name.includes("run") || t.name.includes("exec") || t.name.includes("command"));
    if (cmdTool) {
        console.log("Found execution tool:", cmdTool.name);
        const result = await client.callTool({
            name: cmdTool.name,
            arguments: {
                command: "cd /volume1/docker/genesis && git pull origin main && docker compose -f docker-compose.genesis.yml up -d --no-deps --build dispatch"
            }
        });
        console.log("Execution Result:", JSON.stringify(result, null, 2));
    } else {
        console.log("No execution tool found on NAS Relay.");
    }
    process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
