/**
 * @inception/browser-mesh-coordinator
 * 
 * Sovereign WebSocket bridge between MV3 browser extension agents and Inception Dispatch.
 * Enables live execution, DOM tracking, and two-way RPC for COMET instances.
 */

import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';

const PORT = parseInt(process.env.PORT || '4802', 10);
const DISPATCH_SERVER = process.env.DISPATCH_SERVER || 'http://localhost:5050';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());

// Maintain active connections
interface AgentState {
  agentId: string;
  capabilities: string[];
  windowId: string;
  activeTab?: any;
  ws: WebSocket;
}

const agents = new Map<string, AgentState>();
const connections = new Map<string, WebSocket>();

app.get('/health', (req, res) => {
  res.json({ status: 'ok', activeMeshNodes: connections.size, activeAgents: agents.size });
});

app.get('/api/agents', (req, res) => {
  const agentList = Array.from(agents.values()).map(a => ({
    agentId: a.agentId,
    capabilities: a.capabilities,
    windowId: a.windowId,
    activeTab: a.activeTab
  }));
  res.json({ agents: agentList });
});

app.post('/api/tasks/dispatch', (req, res) => {
  const { agentId, task } = req.body;
  if (agents.size === 0) {
    return res.status(503).json({ error: 'No browser agents connected' });
  }

  // Round-robin or specific agent
  let targetWs: WebSocket | undefined;
  if (agentId) {
    targetWs = agents.get(agentId)?.ws;
  } else {
    // Round robin fallback - grab first available
    const firstAgent = Array.from(agents.values())[0];
    if (firstAgent) targetWs = firstAgent.ws;
  }

  if (!targetWs || targetWs.readyState !== WebSocket.OPEN) {
    return res.status(404).json({ error: `Agent ${agentId || 'default'} not found or offline.` });
  }

  targetWs.send(JSON.stringify({ type: 'TASK', payload: task }));
  res.json({ success: true, dispatchedTo: agentId || 'round-robin' });
});

// Broadcast endpoint for Dispatch to reach all mesh nodes
app.post('/broadcast', (req, res) => {
  const { action, payload } = req.body;
  if (!action) {
    return res.status(400).json({ error: 'Action required' });
  }

  const message = JSON.stringify({ type: 'rpc', action, payload });
  let count = 0;
  for (const ws of connections.values()) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
      count++;
    }
  }

  res.json({ success: true, broadcastedTo: count });
});

wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress || 'unknown';
  
  // Attempt to read agentId from URL if present (e.g. /mock-agent-123)
  const urlPath = req.url ? req.url.slice(1) : '';
  const isAgentIdFallback = urlPath && urlPath !== '' && urlPath !== 'broadcast';
  const nodeId = isAgentIdFallback ? urlPath : `node-${Math.random().toString(36).slice(2, 9)}`;
  
  console.log(`[MeshCoordinator] 🌐 Node connected: ${nodeId} from ${ip}`);
  connections.set(nodeId, ws);
  
  // Auto-register so dispatch works even before CONNECT message 
  agents.set(nodeId, {
    agentId: nodeId,
    capabilities: [],
    windowId: '',
    ws
  });

  ws.send(JSON.stringify({ type: 'welcome', nodeId }));

  ws.on('message', async (data) => {
    try {
      const msg = JSON.parse(data.toString());
      
      console.log(`[MeshCoordinator] 📥 [${nodeId}] ${msg.type}`);
      
      if (msg.type === 'CONNECT') {
        const payload = msg.payload || {};
        const agentId = payload.agentId || nodeId;
        agents.set(agentId, {
          agentId,
          capabilities: payload.capabilities || [],
          windowId: payload.windowId || '',
          ws
        });
        console.log(`[MeshCoordinator] ✅ Agent registered: ${agentId}`);
      } else if (msg.type === 'HEARTBEAT') {
        const payload = msg.payload || {};
        // Find agent by WS
        for (const [aId, state] of agents.entries()) {
          if (state.ws === ws) {
            state.activeTab = payload.tab;
            agents.set(aId, state);
            break;
          }
        }
      } else if (msg.type === 'telemetry' || msg.type === 'task:result') {
        // Forward telemetry or task results to Dispatch
        const res = await fetch(`${DISPATCH_SERVER}/api/mesh-inbox`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nodeId, ...msg })
        });
        
        if (!res.ok) {
          console.warn(`[MeshCoordinator] Dispatch rejected message from ${nodeId}`);
        }
      }
    } catch (err) {
      console.error(`[MeshCoordinator] Error handling message from ${nodeId}:`, err);
    }
  });

  ws.on('close', () => {
    console.log(`[MeshCoordinator] 🔌 Node disconnected: ${nodeId}`);
    connections.delete(nodeId);
    
    // Remove from agents tracking
    for (const [aId, state] of agents.entries()) {
      if (state.ws === ws) {
        agents.delete(aId);
      }
    }
  });
});

export function startServer(targetPort: number = PORT) {
  return new Promise<{ port: number, server: import('http').Server }>((resolve) => {
    const s = server.listen(targetPort, () => {
      const addr = s.address();
      const actualPort = typeof addr === 'string' ? targetPort : addr?.port ?? targetPort;
      console.log(`[MeshCoordinator] 🚀 Listening for MV3 extensions on ws://localhost:${actualPort}`);
      resolve({ port: actualPort, server: s });
    });
  });
}

if (process.env.NODE_ENV !== 'test') {
  startServer(PORT);
}
