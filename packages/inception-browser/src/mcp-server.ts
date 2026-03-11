/**
 * inception-browser MCP Server
 * Tools: COMET KI Suite (navigation, interaction, extraction, evaluation)
 * @package packages/inception-browser
 * @issue #30 HELIX C
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { 
    navigationTools, handleNavigationTool,
    interactionTools, handleInteractionTool,
    extractionTools, handleExtractionTool,
    evaluateTools, handleEvaluateTool,
    tabTools, handleTabTool,
    formTools, handleFormTool,
    fileTools, handleFileTool,
    networkTools, handleNetworkTool,
    intelligenceTools, handleIntelligenceTool,
    governanceTools, handleGovernanceTool,
    sessionTools, handleSessionTool,
    terminalTools, handleTerminalTool,
    engine,
    session
} from './index.js';

const server = new Server(
    { name: 'inception-browser', version: '0.1.0' },
    { capabilities: { tools: {} } }
);

const allTools = [
    ...navigationTools,
    ...interactionTools,
    ...extractionTools,
    ...evaluateTools,
    ...tabTools,
    ...formTools,
    ...fileTools,
    ...networkTools,
    ...intelligenceTools,
    ...governanceTools,
    ...sessionTools,
    ...terminalTools
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: allTools,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    
    try {
        if (navigationTools.some(t => t.name === name)) {
            return await handleNavigationTool(name, args || {}, engine);
        }
        if (interactionTools.some(t => t.name === name)) {
            return await handleInteractionTool(name, args || {}, engine);
        }
        if (extractionTools.some(t => t.name === name)) {
            return await handleExtractionTool(name, args || {}, engine);
        }
        if (evaluateTools.some(t => t.name === name)) {
            return await handleEvaluateTool(name, args || {}, engine);
        }
        if (tabTools.some(t => t.name === name)) {
            return await handleTabTool(name, args || {}, engine);
        }
        if (formTools.some(t => t.name === name)) {
            return await handleFormTool(name, args || {}, engine);
        }
        if (fileTools.some(t => t.name === name)) {
            return await handleFileTool(name, args || {}, engine);
        }
        if (networkTools.some(t => t.name === name)) {
            return await handleNetworkTool(name, args || {}, engine);
        }
        if (intelligenceTools.some(t => t.name === name)) {
            return await handleIntelligenceTool(name, args || {}, engine);
        }
        if (governanceTools.some(t => t.name === name)) {
            return await handleGovernanceTool(name, args || {}, engine);
        }
        if (sessionTools.some(t => t.name === name)) {
            return await handleSessionTool(name, args || {}, session, engine);
        }
        if (terminalTools.some(t => t.name === name)) {
            return await handleTerminalTool(request);
        }

        throw new Error(`Unknown tool: ${name}`);
    } catch (error) {
        return { 
            content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }], 
            isError: true 
        };
    }
});

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('inception-browser MCP server running on stdio');
}

main().catch(console.error);