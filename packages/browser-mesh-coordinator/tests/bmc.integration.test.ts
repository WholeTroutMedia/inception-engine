import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { app } from '../src/server.js'; // The express app

describe('Browser Mesh Coordinator Integration', () => {
  let port: number;
  let serverModule: any;

  beforeAll(async () => {
    // Start dynamic server
    serverModule = await import('../src/server.js');
    const result = await serverModule.startServer(0); // random port
    port = result.port;
    
    // Give it a tiny bit of time to bind
    await new Promise(r => setTimeout(r, 200));
  });

  afterAll(() => {
    if (serverModule?.httpServer) {
        serverModule.httpServer.close();
    }
    if (serverModule?.wss) {
        serverModule.wss.close();
    }
  });

  it('should connect a mock WS agent and appear in /api/agents', async () => {
    // ws client
    const ws = new WebSocket(`ws://localhost:${port}/mock-agent-123`);
    
    await new Promise<void>((resolve) => {
      ws.on('open', resolve);
    });

    const connectMsg = JSON.stringify({
      type: 'CONNECT',
      payload: {
        agentId: 'mock-agent-123',
        capabilities: ['dom-extract'],
        windowId: 'TEST'
      }
    });

    ws.send(connectMsg);
    await new Promise(r => setTimeout(r, 100));

    // check API
    const res = await fetch(`http://localhost:${port}/api/agents`);
    const data = await res.json();
    expect(data.agents.some((a: any) => a.agentId === 'mock-agent-123')).toBe(true);

    const heartbeatMsg = JSON.stringify({
      type: 'HEARTBEAT',
      payload: {
        tab: { url: 'https://example.com', title: 'Test' }
      }
    });
    ws.send(heartbeatMsg);
    
    await new Promise(r => setTimeout(r, 100));
    
    const res2 = await fetch(`http://localhost:${port}/api/agents`);
    const data2 = await res2.json();
    const agent = data2.agents.find((a: any) => a.agentId === 'mock-agent-123');
    expect(agent.activeTab.url).toBe('https://example.com');

    ws.close();
  });

  it('should return 503 when missing agents and dispatching by specific ID', async () => {
    const response = await fetch(`http://localhost:${port}/api/tasks/dispatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: 'non-existent-agent',
        task: {
          taskId: 'T-100',
          action: 'extract',
          targetUrl: 'https://example.com'
        }
      })
    });

    // Currently the server round-robins if NOT provided, but if provided it uses target.
    // Wait, if target not found and no agents, it returns 503.
    expect(response.status).toBe(503);
    const data = await response.json();
    expect(data.error).toBe('No browser agents connected');
  });

  it('should route dispatch message to connected agent', async () => {
    const agentId = 'mock-agent-456';
    const ws = new WebSocket(`ws://localhost:${port}/${agentId}`);
    
    await new Promise<void>((resolve) => {
      ws.on('open', resolve);
    });

    await new Promise(r => setTimeout(r, 100));

    let receivedMessage: any = null;
    ws.on('message', (data) => {
      receivedMessage = JSON.parse(data.toString());
    });

    const response = await fetch(`http://localhost:${port}/api/tasks/dispatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId,
        task: {
          taskId: 'T-200',
          action: 'extract',
          targetUrl: 'https://test.com'
        }
      })
    });

    expect(response.status).toBe(200);

    // Wait for message to reach WS client
    await new Promise(r => setTimeout(r, 50));

    expect(receivedMessage).toBeDefined();
    expect(receivedMessage.type).toBe('TASK');
    expect(receivedMessage.payload.taskId).toBe('T-200');

    ws.close();
  });
});
