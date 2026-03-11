import { TimeSeriesManager, SemanticIndexPayloadType } from '../store/TimeSeriesManager';

// A mock local WebSocket ingestion layer for physiological / environmental data
export class SomaticFeedbackAdapter {
  private tsManager: TimeSeriesManager;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(tsManager?: TimeSeriesManager) {
    this.tsManager = tsManager || new TimeSeriesManager();
  }

  public async start(): Promise<void> {
    await this.tsManager.connect();
    
    console.log(`[Chronos] Somatic Feedback Adapter initialized`);

    // In a real Home Assistant integration, this would connect to the HA WebSocket API.
    // For this architectural implementation, we simulate continuous biological/environmental ingestion
    // over the internal IPC at exactly 10Hz (100ms precise chunks).
    
    this.intervalId = setInterval(async () => {
      const ingestTimeMs = Date.now();
      
      // Simulated Biological / Home proxy state
      const simulatedHeartRate = 60 + Math.sin(ingestTimeMs / 1000) * 15; // 45 - 75 BPM oscillating
      const simulatedRoomLux = 300 + Math.random() * 50;

      const payload: SemanticIndexPayloadType = {
        modality: 'biometric',
        source: 'home-assistant-mesh',
        latencyMs: Date.now() - ingestTimeMs,
        features: {
          bpm: simulatedHeartRate,
          lux: simulatedRoomLux,
          state: 'baseline'
        }
      };

      // Score = physiological arousal proxy (heart rate in this case)
      await this.tsManager.indexEvent(ingestTimeMs, payload, simulatedHeartRate);

    }, 100);
  }

  public async stop(): Promise<void> {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    await this.tsManager.disconnect();
    console.log(`[Chronos] Somatic Feedback Adapter stopped`);
  }
}
