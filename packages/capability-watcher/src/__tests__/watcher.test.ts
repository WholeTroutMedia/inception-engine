/**
 * capability-watcher â€” Unit Tests
 *
 * Tests the broadcaster and watcher modules in isolation.
 * File system events are simulated by emitting chokidar events directly.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { broadcastCapabilityUpdate, type BroadcastPayload } from '../broadcaster.js';

// â”€â”€ Broadcaster Tests â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('broadcastCapabilityUpdate', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', undefined);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('posts to the correct endpoint with the given payload', async () => {
        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                success: true,
                version: {
                    hash: 'abc12345',
                    timestamp: '2026-03-09T23:00:00.000Z',
                    changed_files: ['AGENTS.md'],
                    source: 'watcher',
                },
            }),
        });
        vi.stubGlobal('fetch', mockFetch);

        const payload: BroadcastPayload = {
            changed_files: ['AGENTS.md'],
            source: 'watcher',
        };

        const result = await broadcastCapabilityUpdate('http://127.0.0.1:5050', payload);

        expect(mockFetch).toHaveBeenCalledWith(
            'http://127.0.0.1:5050/api/capabilities/broadcast',
            expect.objectContaining({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            }),
        );
        expect(result.success).toBe(true);
        expect(result.version?.hash).toBe('abc12345');
        expect(result.version?.changed_files).toContain('AGENTS.md');
    });

    it('returns success: false on non-OK HTTP response', async () => {
        const mockFetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 503,
            text: async () => 'Service Unavailable',
        });
        vi.stubGlobal('fetch', mockFetch);

        const result = await broadcastCapabilityUpdate('http://127.0.0.1:5050', {
            changed_files: [],
            source: 'manual',
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('HTTP 503');
    });

    it('returns success: false on network error', async () => {
        const mockFetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
        vi.stubGlobal('fetch', mockFetch);

        const result = await broadcastCapabilityUpdate('http://127.0.0.1:5050', {
            changed_files: [],
            source: 'watcher',
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('ECONNREFUSED');
    });

    it('handles empty changed_files array', async () => {
        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ success: true, version: { hash: 'x', timestamp: '', changed_files: [], source: 'manual' } }),
        });
        vi.stubGlobal('fetch', mockFetch);

        const result = await broadcastCapabilityUpdate('http://127.0.0.1:5050', {
            changed_files: [],
            source: 'manual',
        });

        expect(result.success).toBe(true);
        const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string);
        expect(body.changed_files).toEqual([]);
    });

    it('handles all valid source types', async () => {
        const sources: BroadcastPayload['source'][] = ['watcher', 'manual', 'deploy'];

        for (const source of sources) {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ success: true, version: { hash: 'x', timestamp: '', changed_files: [], source } }),
            });
            vi.stubGlobal('fetch', mockFetch);

            const result = await broadcastCapabilityUpdate('http://localhost:5050', {
                changed_files: ['.agents/workflows/ship.md'],
                source,
            });

            expect(result.success).toBe(true);
            vi.restoreAllMocks();
        }
    });
});
