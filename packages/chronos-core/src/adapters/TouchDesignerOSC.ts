import dgram from 'dgram';
import { TimeSeriesManager, SemanticIndexPayloadType } from '../store/TimeSeriesManager';

export interface OSCMessage {
  address: string;
  args: any[];
}

export class TouchDesignerOSCAdapter {
  private server: dgram.Socket;
  private tsManager: TimeSeriesManager;
  private isListening: boolean = false;

  constructor(private port: number = 7400, tsManager?: TimeSeriesManager) {
    this.server = dgram.createSocket('udp4');
    this.tsManager = tsManager || new TimeSeriesManager();
  }

  /**
   * Very fast, rudimentary OSC path parser.
   * Assuming TD sends standard OSC formatting where the first string is the address, 
   * followed by comma-separated typetags, then the binary payload.
   * For the Chronos layer, we expect JSON payloads encoded as strings over OSC for semantic features.
   */
  private parseOSC(msg: Buffer): OSCMessage | null {
    try {
      // Simplified string extraction for high-throughput pipeline
      // In production with complex OSC, we'd use a robust parser like 'osc' npm package
      // But for pure strict TS microsecond speed locally, we extract the strings directly
      const str = msg.toString('utf8').replace(/\0/g, '');
      const parts = str.split(',');
      if (parts.length < 2) return null;

      const address = parts[0];
      const dataString = parts.slice(1).join(',').substring(1); // skip format string (e.g., 's')

      return {
        address,
        args: [dataString]
      };
    } catch {
      return null;
    }
  }

  public async start(): Promise<void> {
    if (this.isListening) return;

    await this.tsManager.connect();

    this.server.on('message', async (msg, rinfo) => {
      // 1. Capture Universal Index Time immediately on packet receipt
      const ingestTimeMs = Date.now();

      const parsed = this.parseOSC(msg);
      if (!parsed) return;

      if (parsed.address.startsWith('/chronos/td/video')) {
        try {
          // Expecting TouchDesigner to send a JSON string of semantic frame features
          // e.g., { "brightness": 0.8, "facesDetected": 1, "dominantColor": "#FF0000" }
          const featureBlob = JSON.parse(parsed.args[0]);
          
          const payload: SemanticIndexPayloadType = {
            modality: 'video',
            source: 'touchdesigner-main',
            latencyMs: Date.now() - ingestTimeMs,
            features: featureBlob
          };

          // Score is the sum intensity of the frame, used for graphing the time-series
          const intensityScore = featureBlob.brightness || 1.0;

          await this.tsManager.indexEvent(ingestTimeMs, payload, intensityScore);

        } catch (err) {
          // Drop malformed high-freq packets silently to maintain throughput
          // console.warn('Dropped malformed TD OSC frame', err);
        }
      }
    });

    this.server.on('listening', () => {
      const address = this.server.address();
      console.log(`[Chronos] TD OSC Adapter listening on ${address.address}:${address.port}`);
    });

    this.server.bind(this.port);
    this.isListening = true;
  }

  public async stop(): Promise<void> {
    if (this.isListening) {
      this.server.close();
      await this.tsManager.disconnect();
      this.isListening = false;
    }
  }
}
