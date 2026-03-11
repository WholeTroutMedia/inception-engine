import { TimeSeriesManager } from './store/TimeSeriesManager';
import { TouchDesignerOSCAdapter } from './adapters/TouchDesignerOSC';
import { SomaticFeedbackAdapter } from './adapters/SomaticFeedback';

export class ChronosEngine {
  private tsManager: TimeSeriesManager;
  private adapters: Array<{ start: () => Promise<void>; stop: () => Promise<void> }> = [];
  public isRunning: boolean = false;

  constructor() {
    this.tsManager = new TimeSeriesManager();

    // Register all modalities
    this.adapters.push(new TouchDesignerOSCAdapter(7400, this.tsManager));
    this.adapters.push(new SomaticFeedbackAdapter(this.tsManager));
  }

  /**
   * Boot the universal time indexer.
   * All registered adapters will begin ingesting data, tagging it with microsecond-precise 
   * timestamps via Node.js high-resolution time mappings.
   */
  async boot(): Promise<void> {
    if (this.isRunning) return;

    await this.tsManager.connect();

    console.log(`[ChronosEngine] Booting Omni-Modal Ingestion Core...`);

    // Start all adapters in parallel
    await Promise.all(this.adapters.map(adapter => adapter.start()));

    this.isRunning = true;
    console.log(`[ChronosEngine] Timeline active. Awaiting semantic payloads.`);
  }

  /**
   * Graceful shutdown of all adapters and database connections.
   */
  async shutdown(): Promise<void> {
    if (!this.isRunning) return;

    console.log(`[ChronosEngine] Shutting down timeline...`);
    await Promise.all(this.adapters.map(adapter => adapter.stop()));
    await this.tsManager.disconnect();
    
    this.isRunning = false;
    console.log(`[ChronosEngine] Offline.`);
  }
}
