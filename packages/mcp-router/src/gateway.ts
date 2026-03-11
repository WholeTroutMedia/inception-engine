import express from 'express';
import { MCPServerRegistry } from './registry.js';
import { mcpLifecycle } from './lifecycle.js';

/**
 * Universal Protocol Gateway for MCP routing.
 * Maps incoming REST HTTP and WebSocket connections into internal MCP invocations
 * for the AVERI/COMPASS agent collective.
 */
export class ProtocolGateway {
    private app: express.Application;
    private registry: MCPServerRegistry;

    constructor(registry: MCPServerRegistry) {
        this.app = express();
        this.registry = registry;
        this.app.use(express.json());
        this.setupRoutes();
    }

    private setupRoutes() {
        // HTTP to MCP Proxy Route
        this.app.post('/api/mcp/:serverId/invoke', async (req, res) => {
            const { serverId } = req.params;
            const { toolName, args } = req.body;

            console.log(`[PROTOCOL GATEWAY] HTTP POST -> MCP Invoke | Server: ${serverId} | Tool: ${toolName}`);

            try {
                // In a full implementation, we resolve the client via mcpLifecycle and call the tool 
                // Currently simulating gateway pass-through.
                
                res.status(200).json({
                    success: true,
                    message: `Invoked ${toolName} on ${serverId}`,
                    data: { args }
                });
            } catch (error: any) {
                console.error('[PROTOCOL GATEWAY] Error mapping request:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // Health check for load balancers
        this.app.get('/health', (req, res) => {
            res.status(200).json({ status: 'healthy', active_connections: 0 });
        });
    }

    public getExpressApp(): express.Application {
        return this.app;
    }

    public start(port: number = 5555) {
        this.app.listen(port, () => {
             console.log(`[PROTOCOL GATEWAY] Traffic Controller active on port ${port}`);
        });
    }
}
