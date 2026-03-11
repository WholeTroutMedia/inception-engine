import { HID } from 'node-hid';
import { nasClient } from './nasClient.js';
import { applyMappings } from './mapper.js';
import type { AuraProfile } from '@inception/core';

const KNOWN_VID = 0x046d; // Logitech for testing
const KNOWN_PID = 0xc539; // Lightspeed receiver for testing

export class HiddenDeviceManager {
    private device: HID | null = null;
    private currentAura: AuraProfile | null = null;
    
    constructor() {
        console.log('[PSI] HID Manager initialized');
    }
    
    public start() {
        this.pollDevice();
        setInterval(() => this.pollDevice(), 2000);
        
        // Listen to NAS updates
        nasClient.on('aura_updated', (profile: AuraProfile) => {
            console.log(`[PSI] Aura updated from NAS: ${profile.name}`);
            this.currentAura = profile;
        });
    }
    
    private pollDevice() {
        if (!this.device) {
            try {
                // Try to open the preferred test device
                this.device = new HID(KNOWN_VID, KNOWN_PID);
                console.log(`[PSI] Connected to HID device VID:${KNOWN_VID.toString(16)} PID:${KNOWN_PID.toString(16)}`);
                
                // Fetch the initial state from NAS for this device class
                nasClient.requestCurrentState('mouse');
                
                this.device.on('data', (data: Buffer) => {
                    this.handleInput(data);
                });
                
                this.device.on('error', (err: any) => {
                    console.error('[PSI] HID Error:', err);
                    this.device = null;
                });
            } catch (e) {
                // Device not found, wait for next poll
            }
        }
    }
    
    private handleInput(data: Buffer) {
        if (!this.currentAura) return;
        
        // Convert buffer to array of numbers
        const rawInput = Array.from(data);
        
        // Very basic mapping layer - applyMappings handles the actual semantic translation
        applyMappings(rawInput, this.currentAura);
    }
}
