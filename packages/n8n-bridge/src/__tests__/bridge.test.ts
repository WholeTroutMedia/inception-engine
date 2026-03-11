import { describe, it, expect } from 'vitest';
import { N8nBridge } from '../index.js';

describe('N8nBridge', () => {
    it('should initialize with webhookUrl', () => {
        const bridge = new N8nBridge('http://localhost:5678/webhook');
        expect(bridge).toBeDefined();
    });

    it('should connect without throwing', async () => {
        const bridge = new N8nBridge('http://localhost:5678/webhook');
        await expect(bridge.connect()).resolves.toBeUndefined();
    });
});
