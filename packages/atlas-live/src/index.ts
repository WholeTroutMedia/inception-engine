/**
 * @inception/atlas-live — Live Data Feed
 * 
 * Real-time event streams and state synchronization for the Creative Liberation Engine.
 */

export const atlasLive = {};

export class AtlasLiveClient {
    private es: EventSource | null = null;
    
    constructor(private endpoint: string) {}

    subscribe<T>(onMessage: (data: T) => void, onError?: (err: Event) => void) {
        this.es = new EventSource(this.endpoint);
        this.es.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data) as T;
                onMessage(data);
            } catch (err) {
                console.error('[ATLAS-LIVE] Parse error:', err);
            }
        };
        if (onError) this.es.onerror = onError;
        return () => this.disconnect();
    }

    disconnect() {
        if (this.es) {
            this.es.close();
            this.es = null;
        }
    }
}
