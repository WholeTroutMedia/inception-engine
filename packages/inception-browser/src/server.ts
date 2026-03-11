/**
 * Inception Browser MCP Server — v2.0 Full Tool Suite
 * T20260306-186 + HANDOFF VERIFY phase complete
 *
 * 11 tool modules — 60+ tools across:
 *   navigation, interaction, extraction, forms, tabs,
 *   network, evaluate, files, governance, intelligence, sessions
 *
 * Backed by SQLite session store (better-sqlite3)
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { BrowserEngine } from "./browser/engine.js";
import { SessionManager } from "./browser/session.js";

// ─── All tool modules ────────────────────────────────────────────────────────
import { sessionTools, handleSessionTool } from "./tools/sessions.js";
import { navigationTools, handleNavigationTool } from "./tools/navigation.js";
import { interactionTools, handleInteractionTool } from "./tools/interaction.js";
import { extractionTools, handleExtractionTool } from "./tools/extraction.js";
import { formTools, handleFormTool } from "./tools/forms.js";
import { tabTools, handleTabTool } from "./tools/tabs.js";
import { networkTools, handleNetworkTool } from "./tools/network.js";
import { evaluateTools, handleEvaluateTool } from "./tools/evaluate.js";
import { fileTools, handleFileTool } from "./tools/files.js";
import { governanceTools, handleGovernanceTool } from "./tools/governance.js";
import { intelligenceTools, handleIntelligenceTool } from "./tools/intelligence.js";
import { cdpTools, handleCdpTool } from "./tools/cdp.js";
import { startDispatchHeartbeat } from "./dispatch-heartbeat.js";

// ─── Singleton instances ─────────────────────────────────────────────────────
const engine = new BrowserEngine();
const sessions = new SessionManager();

// ─── Full tool registry ──────────────────────────────────────────────────────
const ALL_TOOLS = [
    ...sessionTools,
    ...navigationTools,
    ...interactionTools,
    ...extractionTools,
    ...formTools,
    ...tabTools,
    ...networkTools,
    ...evaluateTools,
    ...fileTools,
    ...governanceTools,
    ...intelligenceTools,
    ...cdpTools,
];

// ─── Tool set membership maps ─────────────────────────────────────────────────
const sessionSet = new Set(sessionTools.map(t => t.name));
const navigationSet = new Set(navigationTools.map(t => t.name));
const interactionSet = new Set(interactionTools.map(t => t.name));
const extractionSet = new Set(extractionTools.map(t => t.name));
const formSet = new Set(formTools.map(t => t.name));
const tabSet = new Set(tabTools.map(t => t.name));
const networkSet = new Set(networkTools.map(t => t.name));
const evaluateSet = new Set(evaluateTools.map(t => t.name));
const fileSet = new Set(fileTools.map(t => t.name));
const governanceSet = new Set(governanceTools.map(t => t.name));
const intelligenceSet = new Set(intelligenceTools.map(t => t.name));
const cdpSet = new Set(cdpTools.map(t => t.name));

// ─── MCP Server Factory ────────────────────────────────────────────────────────
export function createInceptionBrowserServer() {
    const server = new Server(
        { name: "inception-browser", version: "2.0.0" },
        { capabilities: { tools: {} } }
    );

    server.setRequestHandler(ListToolsRequestSchema, async () => ({
        tools: ALL_TOOLS,
    }));

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args = {} } = request.params;
        const a = args as Record<string, unknown>;

        try {
            if (sessionSet.has(name)) return handleSessionTool(name, a, sessions, engine);
            if (navigationSet.has(name)) return handleNavigationTool(name, a, engine);
            if (interactionSet.has(name)) return handleInteractionTool(name, a, engine);
            if (extractionSet.has(name)) return handleExtractionTool(name, a, engine);
            if (formSet.has(name)) return handleFormTool(name, a, engine);
            if (tabSet.has(name)) return handleTabTool(name, a, engine);
            if (networkSet.has(name)) return handleNetworkTool(name, a, engine);
            if (evaluateSet.has(name)) return handleEvaluateTool(name, a, engine);
            if (fileSet.has(name)) return handleFileTool(name, a, engine);
            if (governanceSet.has(name)) return handleGovernanceTool(name, a, engine);
            if (intelligenceSet.has(name)) return handleIntelligenceTool(name, a, engine);
            if (cdpSet.has(name)) return handleCdpTool(name, a);

            return {
                content: [{ type: "text" as const, text: `Unknown tool: ${name}` }],
                isError: true,
            };
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return {
                content: [{ type: "text" as const, text: `❌ Tool error (${name}): ${msg}` }],
                isError: true,
            };
        }
    });

    return { server, engine, sessions, toolCount: ALL_TOOLS.length };
}

// ─── Boot ────────────────────────────────────────────────────────────────────
async function main() {
    const transport = new StdioServerTransport();
    const { server, toolCount } = createInceptionBrowserServer();
    await server.connect(transport);
    // Register browser mesh with dispatch server (fire-and-forget)
    startDispatchHeartbeat();
    console.error(`🌐 Inception Browser MCP v2.0 — ${toolCount} tools live`);
    console.error(`   CDP Mesh: browser_attach_cdp | browser_detach_cdp | browser_mesh_nodes`);
    console.error(`   Sessions: ${sessionTools.length}  Navigation: ${navigationTools.length}  Interaction: ${interactionTools.length}`);
    console.error(`   Extraction: ${extractionTools.length}  Forms: ${formTools.length}  Tabs: ${tabTools.length}`);
    console.error(`   Network: ${networkTools.length}  Evaluate: ${evaluateTools.length}  Files: ${fileTools.length}`);
    console.error(`   Governance: ${governanceTools.length}  Intelligence: ${intelligenceTools.length}`);
}

main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});
