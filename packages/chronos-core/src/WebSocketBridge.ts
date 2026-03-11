import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { Server as HttpServer } from 'http';
import { VisionOSAdapter, type VisionOSTimelineEntry } from './adapters/VisionOSAdapter.js';
import { TimeSeriesManager } from './store/TimeSeriesManager.js';

// ─── Chronos WebSocket Bridge ─────────────────────────────────────────────────
// Streams indexed Chronos timeline events to connected console clients in
// real-time. Supports topic subscriptions (all | visionos | biometric | etc.)
// Article IX: Complete implementation with full type safety.

export type BridgeEventType =
  | 'timeline.event'
  | 'timeline.visionos'
  | 'bridge.connected'
  | 'bridge.subscribed'
  | 'bridge.error'
  | 'bridge.ping';

export interface BridgeMessage {
  type: BridgeEventType;
  topic?: string;
  data?: unknown;
  timestamp: string;
}

export interface ClientSubscription {
  topics: Set<string>;
  connectedAt: string;
  id: string;
}

// ─── WebSocket Bridge ─────────────────────────────────────────────────────────

export class ChronosWebSocketBridge {
  private wss: WebSocketServer | null = null;
  private clients = new Map<WebSocket, ClientSubscription>();
  private visionOsAdapter: VisionOSAdapter | null = null;
  private readonly tsManager: TimeSeriesManager;
  private _running = false;

  constructor(tsManager: TimeSeriesManager) {
    this.tsManager = tsManager;
  }

  /**
   * Attach to an existing HTTP server (shared port with REST API).
   */
  attachToServer(server: HttpServer): void {
    this.wss = new WebSocketServer({ server, path: '/ws/timeline' });
    this.bindWSSEvents();
    console.log('[ChronosBridge] WebSocket bridge attached on /ws/timeline');
  }

  /**
   * Start on a dedicated port.
   */
  start(port: number = 7801): Promise<void> {
    return new Promise((resolve, reject) => {
      this.wss = new WebSocketServer({ port, path: '/ws/timeline' });
      this.wss.once('listening', () => {
        this.bindWSSEvents();
        this._running = true;
        console.log(`[ChronosBridge] WebSocket bridge listening on :${port}/ws/timeline`);
        resolve();
      });
      this.wss.once('error', reject);
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.wss) { resolve(); return; }
      this.wss.close(() => {
        this._running = false;
        console.log('[ChronosBridge] Stopped.');
        resolve();
      });
    });
  }

  get isRunning(): boolean { return this._running; }
  get connectedClients(): number { return this.clients.size; }

  /**
   * Attach a VisionOSAdapter and relay its ingested frames to subscribers.
   */
  connectVisionOSAdapter(adapter: VisionOSAdapter): void {
    this.visionOsAdapter = adapter;
    // Monkey-patch ingest to intercept real-time frames
    const originalIngest = adapter.ingest.bind(adapter);
    adapter.ingest = (frame) => {
      const entry = originalIngest(frame);
      this.broadcast({
        type: 'timeline.visionos',
        topic: 'visionos',
        data: entry,
        timestamp: new Date().toISOString(),
      }, 'visionos');
      return entry;
    };
    console.log('[ChronosBridge] VisionOS adapter connected — frames will be relayed.');
  }

  /**
   * Manually broadcast a timeline event to all subscribed clients.
   */
  broadcast(message: BridgeMessage, topic: string = 'all'): void {
    const payload = JSON.stringify(message);
    for (const [ws, sub] of this.clients) {
      if (ws.readyState !== WebSocket.OPEN) continue;
      if (!sub.topics.has('all') && !sub.topics.has(topic)) continue;
      ws.send(payload);
    }
  }

  /**
   * Push a custom timeline event (called by any Chronos adapter).
   */
  pushTimelineEvent(
    source: string,
    data: Record<string, unknown>,
    topic: string = 'all',
  ): void {
    this.broadcast(
      {
        type: 'timeline.event',
        topic,
        data: { source, ...data },
        timestamp: new Date().toISOString(),
      },
      topic,
    );
  }

  // ─── Internal ────────────────────────────────────────────────────────────────

  private bindWSSEvents(): void {
    if (!this.wss) return;

    this.wss.on('connection', (ws: WebSocket, _req: IncomingMessage) => {
      const clientId = `client-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const sub: ClientSubscription = {
        topics: new Set(['all']),
        connectedAt: new Date().toISOString(),
        id: clientId,
      };
      this.clients.set(ws, sub);

      ws.send(JSON.stringify({
        type: 'bridge.connected',
        data: { clientId, subscribedTo: ['all'] },
        timestamp: new Date().toISOString(),
      } satisfies BridgeMessage));

      console.log(`[ChronosBridge] Client connected: ${clientId} (total: ${this.clients.size})`);

      ws.on('message', (raw: Buffer) => {
        try {
          const msg = JSON.parse(raw.toString()) as { action?: string; topics?: string[] };
          if (msg.action === 'subscribe' && Array.isArray(msg.topics)) {
            sub.topics = new Set(msg.topics);
            ws.send(JSON.stringify({
              type: 'bridge.subscribed',
              data: { topics: msg.topics },
              timestamp: new Date().toISOString(),
            } satisfies BridgeMessage));
          } else if (msg.action === 'ping') {
            ws.send(JSON.stringify({
              type: 'bridge.ping',
              data: { pong: true },
              timestamp: new Date().toISOString(),
            } satisfies BridgeMessage));
          }
        } catch {
          ws.send(JSON.stringify({
            type: 'bridge.error',
            data: { message: 'Invalid JSON message' },
            timestamp: new Date().toISOString(),
          } satisfies BridgeMessage));
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
        console.log(`[ChronosBridge] Client disconnected: ${clientId} (total: ${this.clients.size})`);
      });

      ws.on('error', (err: Error) => {
        console.warn(`[ChronosBridge] Client error (${clientId}):`, err.message);
        this.clients.delete(ws);
      });
    });

    this.wss.on('error', (err: Error) => {
      console.error('[ChronosBridge] WSS error:', err.message);
    });
  }
}
