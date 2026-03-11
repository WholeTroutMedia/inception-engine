import { createClient } from 'redis';
import { z } from 'zod';

// SMPTE precise timecode index payload
export const SemanticIndexPayload = z.object({
  modality: z.enum(['video', 'audio', 'finance', 'biometric']),
  source: z.string(),
  latencyMs: z.number().optional(),
  features: z.record(z.string(), z.any()),
});

export type SemanticIndexPayloadType = z.infer<typeof SemanticIndexPayload>;

export class TimeSeriesManager {
  private client: ReturnType<typeof createClient>;
  private _isConnected: boolean = false;

  get isConnected(): boolean {
    return this._isConnected;
  }

  constructor(redisUrl: string = 'redis://127.0.0.1:6379') {
    this.client = createClient({ url: redisUrl });
    this.client.on('error', (err) => console.error('Redis Client Error', err));
  }

  async connect(): Promise<void> {
    if (!this._isConnected) {
      await this.client.connect();
      this._isConnected = true;
    }
  }

  async disconnect(): Promise<void> {
    if (this._isConnected) {
      await this.client.quit();
      this._isConnected = false;
    }
  }

  /**
   * Initializes a Redis TimeSeries key if it doesn't already exist.
   * We store one timeseries per modality per source.
   */
  async ensureTimeSeries(key: string): Promise<void> {
    await this.connect();
    try {
      // TS.CREATE key RETENTION 86400000 DUPLICATE_POLICY LAST
      // 24-hour retention for high-frequency raw semantic ingestion
      await this.client.sendCommand([
        'TS.CREATE',
        key,
        'RETENTION',
        '86400000',
        'DUPLICATE_POLICY',
        'LAST'
      ]);
    } catch (error: unknown) {
      if (error instanceof Error && !error.message.includes('TSDB: key already exists')) {
        throw error;
      }
    }
  }

  /**
   * Ingest a semantic payload stamped with an exact timestamp.
   * Uses Redis TS.ADD
   * 
   * @param timestampMs The universal chronos time (Unix ms)
   * @param payload The semantic extraction payload
   * @param score Numerical approximation of value/intensity for the timeseries graph (e.g. volume, brightness, confidence)
   */
  async indexEvent(timestampMs: number, payload: SemanticIndexPayloadType, score: number): Promise<void> {
    await this.connect();
    
    // Validate payload against schema to ensure Article IV pristine typing
    const validated = SemanticIndexPayload.parse(payload);
    
    const tsKey = `chronos:${validated.modality}:${validated.source}`;
    await this.ensureTimeSeries(tsKey);

    // Add exactly to the millisecond
    await this.client.sendCommand([
      'TS.ADD',
      tsKey,
      timestampMs.toString(),
      score.toString(),
      'LABELS',
      'modality', validated.modality,
      'source', validated.source
    ]);

    // We also store the full rich semantic payload in a standard Redis string hash 
    // keyed by the exact timestamp, acting as the relational blob to the time-series tick
    const blobKey = `chronos:blob:${tsKey}:${timestampMs}`;
    await this.client.set(blobKey, JSON.stringify(validated.features), {
      EX: 86400 // Expire blob along with TS retention (24h)
    });
  }

  /**
   * Cross-modal query. Retrieves temporal overlaps where multiple series spiked.
   */
  async queryTimeRange(modality: string, source: string, startMs: number, endMs: number) {
    await this.connect();
    const tsKey = `chronos:${modality}:${source}`;
    
    // TS.RANGE key FROM TO
    const results = await this.client.sendCommand([
      'TS.RANGE',
      tsKey,
      startMs.toString(),
      endMs.toString()
    ]) as [number, string][];

    return results.map(r => ({
      timestampMs: r[0],
      score: parseFloat(r[1])
    }));
  }
}
