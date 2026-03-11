import { EventEmitter } from 'events';
import WebSocket from 'ws';
import type { AuraProfile } from '@inception/core';

class NasClient extends EventEmitter {
    private ws: WebSocket | null = null;
    private serverUrl = 'ws://127.0.0.1:5050/api/events';
    private reconnectTimer: NodeJS.Timeout | null = null;

    constructor() {
        super();
        this.connect();
    }

    private connect() {
        try {
            this.ws = new WebSocket(this.serverUrl);
            
            this.ws.on('open', () => {
                console.log('[PSI] Connected to Inception Dispatch Server (NAS)');
                if (this.reconnectTimer) clearInterval(this.reconnectTimer);
            });
            
            this.ws.on('message', (data: WebSocket.Data) => {
                const message = data.toString();
                if (message.startsWith('event: aura_update')) {
                    try {
                        // Very rough SSE parsing
                        const lines = message.split('\n');
                        const dataLine = lines.find(l => l.startsWith('data: '));
                        if (dataLine) {
                            const profile = JSON.parse(dataLine.substring(6)) as AuraProfile;
                            this.emit('aura_updated', profile);
                        }
                    } catch (e) {
                        console.error('[PSI] Failed to parse SSE Aura payload', e);
                    }
                }
            });
            
            this.ws.on('close', () => {
                console.log('[PSI] Disconnected from NAS. Reconnecting in 5s...');
                this.ws = null;
                this.reconnectTimer = setTimeout(() => this.connect(), 5000);
            });
            
            this.ws.on('error', (err: any) => {
                // Handle quietly
            });
        } catch (e) {
            console.error('[PSI] NAS connection failed:', e);
            this.reconnectTimer = setTimeout(() => this.connect(), 5000);
        }
    }

    public requestCurrentState(deviceClass: string) {
        // In a real implementation this would HTTP GET the current profile
        // For the MVP, we just emit a hardcoded fallback if the server is unreachable.
        fetch(`http://127.0.0.1:5050/api/psi/profile?class=${deviceClass}`)
            .then(res => res.json())
            .then(data => {
                this.emit('aura_updated', data as AuraProfile);
            })
            .catch(() => {
                // Temporary Hardcoded fallback Aura for dev
                this.emit('aura_updated', {
                    id: 'fallback-mouse-1',
                    name: 'Fallback Dev Navigation Aura',
                    device_class: 'mouse',
                    owner: 'system',
                    updated_at: new Date().toISOString(),
                    mappings: [
                        {
                            capability: 'side_button_1',
                            action: { type: 'os', value: 'browser_back' }
                        }
                    ]
                } as AuraProfile);
            });
    }
}

export const nasClient = new NasClient();
