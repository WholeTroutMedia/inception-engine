import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

async function main() {
    console.log("Connecting to MCP server...");
    const transport = new SSEClientTransport(new URL("http://127.0.0.1:5050/sse"));
    const client = new Client({ name: "cli", version: "1.0.0" }, { capabilities: {} });
    await client.connect(transport);
    console.log("Connected.");

    try {
        const result = await client.callTool({
            name: "get_secret",
            arguments: { name: "synology-admin" }
        });
        console.log("SECRET RESULT:", JSON.stringify(result, null, 2));
    } catch (e) {
        console.error("Error:", e);
    }

    process.exit(0);
}

main().catch(console.error);
